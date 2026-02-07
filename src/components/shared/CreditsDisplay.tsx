import { useEffect, useState } from 'react';
import { Coins, AlertCircle, RefreshCw } from 'lucide-react';
import { creditsService, type CreditsBalance } from '@/services/api';
import { cn } from '@/lib/utils';

interface CreditsDisplayProps {
    className?: string;
    compact?: boolean;
}

export function CreditsDisplay({ className, compact = false }: CreditsDisplayProps) {
    const [balance, setBalance] = useState<CreditsBalance | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBalance = async () => {
        try {
            setIsLoading(true);
            const result = await creditsService.getBalance();
            setBalance(result);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load credits');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBalance();
        // Refresh balance every 30 seconds
        const interval = setInterval(fetchBalance, 30000);
        return () => clearInterval(interval);
    }, []);

    const isLowBalance = balance && balance.balance < balance.lowBalanceThreshold;

    if (compact) {
        return (
            <div
                className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg',
                    isLowBalance ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary',
                    className
                )}
            >
                <Coins className="w-4 h-4" />
                {isLoading ? (
                    <span className="text-sm animate-pulse">...</span>
                ) : error ? (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                ) : (
                    <span className="text-sm font-medium">
                        {balance?.currency} {balance?.balance.toFixed(2)}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div
            className={cn(
                'glass-card p-4 rounded-xl',
                isLowBalance ? 'border-amber-500/30' : '',
                className
            )}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        'p-2 rounded-lg',
                        isLowBalance ? 'bg-amber-500/10' : 'bg-primary/10'
                    )}>
                        <Coins className={cn(
                            'w-5 h-5',
                            isLowBalance ? 'text-amber-500' : 'text-primary'
                        )} />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Credits Balance</p>
                        {isLoading ? (
                            <p className="text-lg font-semibold animate-pulse">Loading...</p>
                        ) : error ? (
                            <p className="text-sm text-red-500">{error}</p>
                        ) : (
                            <p className={cn(
                                'text-lg font-semibold',
                                isLowBalance ? 'text-amber-500' : 'text-foreground'
                            )}>
                                {balance?.currency} {balance?.balance.toFixed(2)}
                            </p>
                        )}
                    </div>
                </div>
                <button
                    onClick={fetchBalance}
                    disabled={isLoading}
                    className="p-2 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50"
                    title="Refresh balance"
                >
                    <RefreshCw className={cn('w-4 h-4 text-muted-foreground', isLoading && 'animate-spin')} />
                </button>
            </div>

            {isLowBalance && (
                <div className="mt-3 pt-3 border-t border-amber-500/20">
                    <p className="text-sm text-amber-500 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Low balance - consider adding more credits
                    </p>
                </div>
            )}
        </div>
    );
}

export default CreditsDisplay;
