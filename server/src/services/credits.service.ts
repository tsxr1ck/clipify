import { prisma } from '../config/database.js';
import { Decimal } from '@prisma/client/runtime/library';

export class CreditsService {
    /**
     * Get user balance
     */
    async getBalance(userId: string): Promise<Decimal> {
        let credits = await prisma.credits.findUnique({ where: { userId } });

        if (!credits) {
            credits = await prisma.credits.create({
                data: { userId },
            });
        }

        return credits.balanceMxn;
    }

    /**
     * Deduct credits from user account
     * Throws error if insufficient balance
     */
    async deductCredits(
        userId: string,
        amount: number,
        description: string,
        metadata?: {
            generationId?: string;
            operationType?: string;
        }
    ): Promise<Decimal> {
        const balance = await this.getBalance(userId);
        const amountDecimal = new Decimal(amount);

        if (balance.lessThan(amountDecimal)) {
            throw new Error(`Insufficient credits. Required: $${amount.toFixed(2)} MXN, Available: $${balance.toFixed(2)} MXN`);
        }

        const newBalance = balance.minus(amountDecimal);

        // Update credits and create transaction
        const [updatedCredits] = await prisma.$transaction([
            prisma.credits.update({
                where: { userId },
                data: {
                    balanceMxn: newBalance,
                    totalSpentMxn: { increment: amountDecimal },
                },
            }),
            prisma.creditTransaction.create({
                data: {
                    userId,
                    transactionType: 'usage',
                    amountMxn: amountDecimal,
                    balanceBeforeMxn: balance,
                    balanceAfterMxn: newBalance,
                    description,
                    generationId: metadata?.generationId,
                    processedAt: new Date(),
                    status: 'completed',
                },
            }),
        ]);

        return updatedCredits.balanceMxn;
    }
}

export const creditsService = new CreditsService();
