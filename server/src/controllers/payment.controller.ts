import type { Request, Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../middleware/auth.js';
import { mercadoPagoService } from '../services/mercadopago.service.js';
import { prisma } from '../config/database.js';
import { getPackageWithBonus } from '../config/pricing.js';

// Validation schemas
export const createPreferenceSchema = z.object({
    packageId: z.string().min(1),
});

export const paymentController = {
    /**
     * POST /payments/create-preference
     * Create a checkout preference for Checkout Bricks
     */
    async createPreference(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { packageId } = req.body;

            // Validate package exists
            const packageInfo = getPackageWithBonus(packageId);
            if (!packageInfo) {
                res.status(400).json({ error: 'Invalid package' });
                return;
            }

            // Get user email
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true },
            });

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            // Create preference
            const result = await mercadoPagoService.createPreference({
                userId,
                packageId,
                userEmail: user.email,
            });

            res.json({
                preferenceId: result.preferenceId,
                initPoint: result.initPoint,
            });
        } catch (error) {
            console.error('Create preference error:', error);
            const message = error instanceof Error ? error.message : 'Failed to create preference';
            res.status(500).json({ error: message });
        }
    },

    /**
     * POST /payments/webhook
     * Handle Mercado Pago webhook notifications (public endpoint)
     */
    async webhook(req: Request, res: Response): Promise<void> {
        try {
            const { type, data } = req.body;

            console.log('MP Webhook received:', { type, data });

            // Only process payment events
            if (type !== 'payment') {
                res.sendStatus(200);
                return;
            }

            const paymentId = data?.id;
            if (!paymentId) {
                res.sendStatus(200);
                return;
            }

            // Get payment details from MP
            const payment = await mercadoPagoService.getPaymentDetails(String(paymentId));
            if (!payment) {
                console.warn(`Webhook: Payment ${paymentId} not found`);
                res.sendStatus(200);
                return;
            }

            console.log('MP Payment details:', payment);

            // If payment is approved, credit the user
            if (payment.status === 'approved' && payment.externalReference) {
                const refs = mercadoPagoService.parseExternalReference(payment.externalReference);

                if (refs) {
                    try {
                        await mercadoPagoService.creditUserAccount(
                            refs.userId,
                            refs.packageId,
                            String(paymentId),
                            'mercadopago'
                        );
                        console.log(`Webhook: Credited user ${refs.userId} for payment ${paymentId}`);
                    } catch (err) {
                        console.error('Error crediting user:', err);
                    }
                }
            }

            res.sendStatus(200);
        } catch (error) {
            console.error('Webhook error:', error);
            // Always return 200 to MP to prevent retries
            res.sendStatus(200);
        }
    },

    /**
     * GET /payments/:id
     * Get payment details
     */
    async getDetails(req: AuthRequest, res: Response): Promise<void> {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

            const payment = await mercadoPagoService.getPaymentDetails(id);
            if (!payment) {
                res.status(404).json({ error: 'Payment not found' });
                return;
            }

            res.json(payment);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to get payment';
            res.status(500).json({ error: message });
        }
    },

    /**
     * POST /payments/process-brick
     * Process a payment from Payment Brick
     */
    async processBrick(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { packageId, formData } = req.body;

            // Validate package exists
            const packageInfo = getPackageWithBonus(packageId);
            if (!packageInfo) {
                res.status(400).json({ error: 'Invalid package' });
                return;
            }

            // Get user email
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true },
            });

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            // Process payment with MP
            const result = await mercadoPagoService.processPaymentBrick({
                userId,
                packageId,
                userEmail: user.email,
                formData,
            });

            res.json({
                success: result.success,
                paymentId: result.paymentId,
                status: result.status,
            });
        } catch (error) {
            console.error('Process brick error:', error);
            const message = error instanceof Error ? error.message : 'Payment failed';
            res.status(500).json({ error: message });
        }
    },
};
