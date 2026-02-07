import apiClient, { getErrorMessage } from './client';

// Types
export interface CreditsBalance {
    balance: number;
    currency: string;
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
    totalSpent: number;
    totalGenerated: number;
    byType: {
        image: number;
        video: number;
        style: number;
    };
    lastMonth: {
        spent: number;
        generated: number;
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
            return response.data;
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
            return response.data;
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
            return response.data.packages;
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
            return response.data;
        } catch (error) {
            throw new Error(getErrorMessage(error));
        }
    },
};

export default creditsService;
