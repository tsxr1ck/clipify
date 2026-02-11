import { AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorMessageProps {
    message: string;
    details?: string;
    onRetry?: () => void;
    onDismiss?: () => void;
    className?: string;
}

export function ErrorMessage({
    message,
    details,
    onRetry,
    onDismiss,
    className
}: ErrorMessageProps) {
    return (
        <div
            className={cn(
                'relative rounded-xl p-4',
                'bg-destructive/10 border border-destructive/30',
                'animate-fadeIn',
                className,
            )}
            role="alert"
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="shrink-0">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-destructive">{message}</p>
                    {details && (
                        <p className="mt-1 text-sm text-destructive/80">{details}</p>
                    )}

                    {/* Actions */}
                    {onRetry && (
                        <div className="mt-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onRetry}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Try Again
                            </Button>
                        </div>
                    )}
                </div>

                {/* Dismiss button */}
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="shrink-0 p-1 rounded-md hover:bg-destructive/10 transition-colors"
                        aria-label="Dismiss error"
                    >
                        <XCircle className="w-5 h-5 text-destructive/70 hover:text-destructive" />
                    </button>
                )}
            </div>
        </div>
    );
}

interface SuccessMessageProps {
    message: string;
    details?: string;
    onDismiss?: () => void;
    className?: string;
}

export function SuccessMessage({
    message,
    details,
    onDismiss,
    className
}: SuccessMessageProps) {
    return (
        <div
            className={cn(
                'relative rounded-xl p-4',
                'bg-emerald-500/10 border border-emerald-500/30',
                'animate-fadeIn',
                className,
            )}
            role="status"
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="shrink-0">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{message}</p>
                    {details && (
                        <p className="mt-1 text-sm text-emerald-600/80 dark:text-emerald-400/80">{details}</p>
                    )}
                </div>

                {/* Dismiss button */}
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="shrink-0 p-1 rounded-md hover:bg-emerald-500/10 transition-colors"
                        aria-label="Dismiss"
                    >
                        <XCircle className="w-5 h-5 text-emerald-500/70 hover:text-emerald-500" />
                    </button>
                )}
            </div>
        </div>
    );
}
