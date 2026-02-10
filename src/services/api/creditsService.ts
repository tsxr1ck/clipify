import apiClient, { getErrorMessage } from './client';

// Types
export interface CreditsBalance {
    balance: number;
    currency: string;
    lowBalanceThreshold: number;
}

export interface CreditTransaction {
    id: string;
    transactionType: 'purchase' | 'usage' | 'refund' | 'bonus';
    amountMxn: number;
    balanceBeforeMxn: number;
    balanceAfterMxn: number;
    description?: string;
    generationId?: string;
    paymentId?: string;
    createdAt: string;
    lowBalanceThreshold: number;
}

export interface TransactionsListParams {
    page?: number;
    limit?: number;
    type?: 'purchase' | 'usage' | 'refund' | 'bonus';
}

export interface TransactionsListResponse {
    transactions: CreditTransaction[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface CreditPackage {
    id: string;
    name: string;
    amountMxn: number;
    priceMxn: number;
    bonusMxn?: number;
    isPopular?: boolean;
}

export interface UsageSummary {
    byType: {
        type: string;
        count: number;
        tokens: number;
        costMxn: number;
    }[];
    last30Days: {
        generations: number;
        tokens: number;
        costMxn: number;
    };
}

// Credits Service
export const creditsService = {
    /**
     * Get current credits balance
     */
    async getBalance(): Promise<CreditsBalance> {
        try {
            const response = await apiClient.get('/credits/balance');
            return {
                ...response.data,
                balance: Number(response.data.balance),
                totalPurchased: Number(response.data.totalPurchased),
                totalSpent: Number(response.data.totalSpent),
                lowBalanceThreshold: Number(response.data.lowBalanceThreshold),
            };
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Get transaction history
     */
    async getTransactions(params: TransactionsListParams = {}): Promise<TransactionsListResponse> {
        try {
            const response = await apiClient.get('/credits/transactions', { params });
            return {
                ...response.data,
                transactions: response.data.transactions.map((tx: any) => ({
                    ...tx,
                    amountMxn: Number(tx.amountMxn),
                    balanceBeforeMxn: Number(tx.balanceBeforeMxn),
                    balanceAfterMxn: Number(tx.balanceAfterMxn),
                })),
            };
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Get available credit packages
     */
    async getPackages(): Promise<CreditPackage[]> {
        try {
            const response = await apiClient.get('/credits/packages');
            return response.data.packages.map((pkg: any) => ({
                id: pkg.id,
                name: pkg.name,
                amountMxn: Number(pkg.amountMXN), // Backend sends amountMXN (uppercase)
                priceMxn: Number(pkg.amountMXN),
                bonusMxn: pkg.bonusPercent ? Number(pkg.amountMXN * pkg.bonusPercent / 100) : 0,
            }));
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Purchase credits
     */
    async purchase(packageId: string): Promise<{ paymentUrl: string }> {
        try {
            const response = await apiClient.post('/credits/purchase', { packageId });
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

    /**
     * Get usage summary
     */
    async getUsageSummary(): Promise<UsageSummary> {
        try {
            const response = await apiClient.get('/credits/usage-summary');
            return {
                byType: response.data.byType.map((item: any) => ({
                    ...item,
                    costMxn: Number(item.costMxn),
                })),
                last30Days: {
                    ...response.data.last30Days,
                    costMxn: Number(response.data.last30Days.costMxn),
                },
            };
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },

};

export default creditsService;
