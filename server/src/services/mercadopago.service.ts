import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { prisma } from '../config/database.js';
import { getPackageWithBonus, CREDIT_PACKAGES } from '../config/pricing.js';
import { Decimal } from '@prisma/client/runtime/library';

// Initialize MP client
const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!mpAccessToken) {
    console.warn('MERCADOPAGO_ACCESS_TOKEN not set - payments will fail');
}

const client = new MercadoPagoConfig({
    accessToken: mpAccessToken || '',
});

const preferenceClient = new Preference(client);
const paymentClient = new Payment(client);

export interface CreatePreferenceParams {
    userId: string;
    packageId: string;
    userEmail: string;
}

export interface PreferenceResult {
    preferenceId: string;
    initPoint: string; // Checkout URL (for Checkout Pro fallback)
}

export const mercadoPagoService = {
    /**
     * Create a checkout preference for Checkout Bricks
     */
    async createPreference(params: CreatePreferenceParams): Promise<PreferenceResult> {
        const { userId, packageId, userEmail } = params;

        const packageInfo = getPackageWithBonus(packageId);
        const pkgDetails = CREDIT_PACKAGES.find(p => p.id === packageId);

        if (!packageInfo || !pkgDetails) {
            throw new Error('Invalid package');
        }

        const appUrl = process.env.APP_URL || 'http://localhost:5173';

        try {
            const preference = await preferenceClient.create({
                body: {
                    items: [
                        {
                            id: packageId,
                            title: `Clipify Credits: ${pkgDetails.name}`,
                            description: `${packageInfo.totalMXN} credits (includes ${packageInfo.bonusMXN} bonus)`,
                            quantity: 1,
                            unit_price: packageInfo.amountMXN,
                            currency_id: 'MXN',
                        },
                    ],
                    payer: {
                        email: userEmail,
                    },
                    external_reference: `${userId}:${packageId}`,
                    metadata: {
                        userId,
                        packageId,
                        totalCredits: packageInfo.totalMXN,
                    },
                },
            });

            if (!preference.id || !preference.init_point) {
                console.error('MP Preference response missing fields:', preference);
                throw new Error('Failed to create preference - missing id or init_point');
            }

            return {
                preferenceId: preference.id,
                initPoint: preference.init_point,
            };
        } catch (error: unknown) {
            console.error('MP create preference error:', error);
            // Log more details if it's an error with response
            if (error && typeof error === 'object' && 'cause' in error) {
                console.error('MP error cause:', (error as any).cause);
            }
            if (error && typeof error === 'object' && 'message' in error) {
                console.error('MP error message:', (error as any).message);
            }
            throw new Error(`Failed to create MP preference: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },

    /**
     * Credit user account after successful payment
     */
    async creditUserAccount(
        userId: string,
        packageId: string,
        paymentId: string,
        paymentMethod: string
    ): Promise<number> {
        const packageInfo = getPackageWithBonus(packageId);
        if (!packageInfo) {
            throw new Error('Invalid package');
        }

        // Check if already processed
        const existingTx = await prisma.creditTransaction.findFirst({
            where: { paymentId },
        });

        if (existingTx) {
            console.log(`Payment ${paymentId} already processed`);
            const credits = await prisma.credits.findUnique({ where: { userId } });
            return Number(credits?.balanceMxn || 0);
        }

        // Get or create credits
        let credits = await prisma.credits.findUnique({ where: { userId } });
        if (!credits) {
            credits = await prisma.credits.create({ data: { userId } });
        }

        const balanceBefore = credits.balanceMxn;
        const balanceAfter = new Decimal(Number(balanceBefore) + packageInfo.totalMXN);

        // Update credits in transaction
        await prisma.$transaction([
            prisma.credits.update({
                where: { userId },
                data: {
                    balanceMxn: balanceAfter,
                    totalPurchasedMxn: { increment: packageInfo.amountMXN },
                },
            }),
            prisma.creditTransaction.create({
                data: {
                    userId,
                    transactionType: 'purchase',
                    amountMxn: new Decimal(packageInfo.amountMXN),
                    balanceBeforeMxn: balanceBefore,
                    balanceAfterMxn: balanceAfter,
                    paymentId,
                    paymentMethod,
                    description: `Credit purchase: ${packageId}`,
                    status: 'completed',
                    processedAt: new Date(),
                },
            }),
            ...(packageInfo.bonusMXN > 0
                ? [
                    prisma.creditTransaction.create({
                        data: {
                            userId,
                            transactionType: 'bonus',
                            amountMxn: new Decimal(packageInfo.bonusMXN),
                            balanceBeforeMxn: new Decimal(Number(balanceBefore) + packageInfo.amountMXN),
                            balanceAfterMxn: balanceAfter,
                            paymentId,
                            description: `Bonus credits for ${packageId} package`,
                            status: 'completed',
                            processedAt: new Date(),
                        },
                    }),
                ]
                : []),
        ]);

        return Number(balanceAfter);
    },

    /**
     * Get payment details from MP
     */
    async getPaymentDetails(paymentId: string) {
        try {
            const payment = await paymentClient.get({ id: paymentId });
            return {
                id: payment.id,
                status: payment.status,
                statusDetail: payment.status_detail,
                transactionAmount: payment.transaction_amount,
                externalReference: payment.external_reference,
                metadata: payment.metadata,
            };
        } catch (error) {
            console.error('MP Get payment error:', error);
            return null;
        }
    },

    /**
     * Parse external reference (userId:packageId)
     */
    parseExternalReference(externalReference: string): { userId: string; packageId: string } | null {
        const parts = externalReference?.split(':');
        if (parts?.length === 2) {
            return { userId: parts[0], packageId: parts[1] };
        }
        return null;
    },

    /**
     * Process payment from Payment Brick form data
     */
    async processPaymentBrick(params: {
        userId: string;
        packageId: string;
        userEmail: string;
        formData: any;
    }): Promise<{ success: boolean; paymentId: number | string; status: string }> {
        const { userId, packageId, userEmail, formData } = params;

        console.log('Processing Payment Brick form data:', JSON.stringify(formData, null, 2));

        const packageInfo = getPackageWithBonus(packageId);
        const pkgDetails = CREDIT_PACKAGES.find(p => p.id === packageId);

        if (!packageInfo || !pkgDetails) {
            throw new Error('Invalid package');
        }

        try {
            // Payment Brick sends formData with these fields directly:
            // - token, payment_method_id, issuer_id, installments, payer, etc.
            const paymentBody = {
                transaction_amount: packageInfo.amountMXN,
                token: formData.token || formData.formData?.token,
                description: `Clipify Credits: ${pkgDetails.name}`,
                installments: formData.installments || formData.formData?.installments || 1,
                payment_method_id: formData.payment_method_id || formData.formData?.payment_method_id,
                issuer_id: formData.issuer_id || formData.formData?.issuer_id,
                payer: {
                    email: userEmail,
                    identification: formData.payer?.identification || formData.formData?.payer?.identification,
                },
                external_reference: `${userId}:${packageId}`,
                metadata: {
                    userId,
                    packageId,
                    totalCredits: packageInfo.totalMXN,
                },
            };

            console.log('Creating MP payment with:', JSON.stringify(paymentBody, null, 2));

            // Create payment using form data from Payment Brick
            const payment = await paymentClient.create({
                body: paymentBody,
            });

            console.log('MP Payment created:', payment.id, payment.status);

            // If approved, credit the user immediately
            if (payment.status === 'approved' && payment.id) {
                await this.creditUserAccount(
                    userId,
                    packageId,
                    String(payment.id),
                    formData.payment_method_id || 'card'
                );
            }

            return {
                success: payment.status === 'approved',
                paymentId: payment.id || 0,
                status: payment.status || 'unknown',
            };
        } catch (error: unknown) {
            console.error('MP process payment error:', error);
            if (error && typeof error === 'object' && 'cause' in error) {
                console.error('MP error cause:', (error as any).cause);
            }
            throw new Error(`Failed to process payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },
};

export default mercadoPagoService;
