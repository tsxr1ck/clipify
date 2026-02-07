import type { Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/database.js';
import { CREDIT_PACKAGES, getPackageWithBonus } from '../config/pricing.js';
import { Decimal } from '@prisma/client/runtime/library';

// Validation schemas
export const purchaseCreditsSchema = z.object({
    packageId: z.string().min(1),
    paymentId: z.string().optional(),
    paymentMethod: z.string().optional(),
});

export const listTransactionsSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    type: z.enum(['purchase', 'usage', 'refund', 'bonus']).optional(),
});

export const creditsController = {
    /**
     * GET /credits/balance
     */
    async getBalance(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;

            let credits = await prisma.credits.findUnique({ where: { userId } });

            // Create if doesn't exist
            if (!credits) {
                credits = await prisma.credits.create({
                    data: { userId },
                });
            }

            res.json({
                balance: credits.balanceMxn,
                currency: credits.currency,
                totalPurchased: credits.totalPurchasedMxn,
                totalSpent: credits.totalSpentMxn,
                lowBalanceThreshold: credits.lowBalanceThresholdMxn,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to get balance';
            res.status(500).json({ error: message });
        }
    },

    /**
     * GET /credits/transactions
     */
    async getTransactions(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { page: pageStr, limit: limitStr, type } = req.query as {
                page?: string; limit?: string; type?: string
            };
            const userId = req.user!.userId;

            // Parse query params
            const page = parseInt(pageStr || '1', 10) || 1;
            const limit = parseInt(limitStr || '20', 10) || 20;
            const skip = (page - 1) * limit;

            const where = {
                userId,
                ...(type && { transactionType: type }),
            };

            const [transactions, total] = await Promise.all([
                prisma.creditTransaction.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        transactionType: true,
                        amountMxn: true,
                        balanceBeforeMxn: true,
                        balanceAfterMxn: true,
                        description: true,
                        paymentMethod: true,
                        status: true,
                        createdAt: true,
                        generation: {
                            select: { id: true, title: true, generationType: true },
                        },
                    },
                }),
                prisma.creditTransaction.count({ where }),
            ]);

            res.json({
                transactions,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to get transactions';
            res.status(500).json({ error: message });
        }
    },

    /**
     * GET /credits/packages
     */
    async getPackages(_req: AuthRequest, res: Response): Promise<void> {
        const packages = CREDIT_PACKAGES.map(pkg => ({
            id: pkg.id,
            name: pkg.name,
            amountMXN: pkg.amountMXN,
            bonusPercent: pkg.bonusPercent,
            totalCredits: getPackageWithBonus(pkg.id)?.totalMXN || pkg.amountMXN,
        }));

        res.json({ packages });
    },

    /**
     * POST /credits/purchase
     */
    async purchase(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;
            const { packageId, paymentId, paymentMethod } = req.body;

            const packageInfo = getPackageWithBonus(packageId);
            if (!packageInfo) {
                res.status(400).json({ error: 'Invalid package' });
                return;
            }

            // Get current credits
            let credits = await prisma.credits.findUnique({ where: { userId } });
            if (!credits) {
                credits = await prisma.credits.create({ data: { userId } });
            }

            const balanceBefore = credits.balanceMxn;
            const balanceAfter = new Decimal(Number(balanceBefore) + packageInfo.totalMXN);

            // Update credits
            await prisma.credits.update({
                where: { userId },
                data: {
                    balanceMxn: balanceAfter,
                    totalPurchasedMxn: { increment: packageInfo.amountMXN },
                },
            });

            // Record purchase transaction
            await prisma.creditTransaction.create({
                data: {
                    userId,
                    transactionType: 'purchase',
                    amountMxn: new Decimal(packageInfo.amountMXN),
                    balanceBeforeMxn: balanceBefore,
                    balanceAfterMxn: balanceAfter,
                    paymentId,
                    paymentMethod,
                    description: `Credit purchase: ${packageId}`,
                    processedAt: new Date(),
                },
            });

            // Record bonus transaction if applicable
            if (packageInfo.bonusMXN > 0) {
                await prisma.creditTransaction.create({
                    data: {
                        userId,
                        transactionType: 'bonus',
                        amountMxn: new Decimal(packageInfo.bonusMXN),
                        balanceBeforeMxn: new Decimal(Number(balanceBefore) + packageInfo.amountMXN),
                        balanceAfterMxn: balanceAfter,
                        description: `Bonus credits for ${packageId} package`,
                        processedAt: new Date(),
                    },
                });
            }

            res.json({
                success: true,
                newBalance: balanceAfter,
                purchased: packageInfo.amountMXN,
                bonus: packageInfo.bonusMXN,
                total: packageInfo.totalMXN,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to purchase credits';
            res.status(500).json({ error: message });
        }
    },

    /**
     * GET /credits/usage-summary
     */
    async getUsageSummary(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.userId;

            // Get usage summary by type
            const summary = await prisma.usageMetric.groupBy({
                by: ['operationType'],
                where: { userId },
                _sum: {
                    totalTokens: true,
                    costMxn: true,
                },
                _count: true,
            });

            // Get monthly trend
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const monthlyUsage = await prisma.usageMetric.aggregate({
                where: {
                    userId,
                    createdAt: { gte: thirtyDaysAgo },
                },
                _sum: {
                    totalTokens: true,
                    costMxn: true,
                },
                _count: true,
            });

            res.json({
                byType: summary.map(s => ({
                    type: s.operationType,
                    count: s._count,
                    tokens: s._sum.totalTokens,
                    costMxn: s._sum.costMxn,
                })),
                last30Days: {
                    generations: monthlyUsage._count,
                    tokens: monthlyUsage._sum.totalTokens,
                    costMxn: monthlyUsage._sum.costMxn,
                },
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to get usage summary';
            res.status(500).json({ error: message });
        }
    },
};
