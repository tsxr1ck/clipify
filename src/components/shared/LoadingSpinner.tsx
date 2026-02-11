import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    message?: string;
    className?: string;
}

const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
};

export function LoadingSpinner({ size = 'md', message, className }: LoadingSpinnerProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
            <div className="relative">
                {/* Gradient background glow */}
                <div
                    className={cn(
                        'absolute inset-0 rounded-full blur-md opacity-50',
                        'bg-linear-to-r from-purple-500 to-blue-500',
                    )}
                />
                {/* Spinner icon */}
                <Loader2
                    className={cn(
                        sizeClasses[size],
                        'relative animate-spin text-primary',
                    )}
                />
            </div>
            {message && (
                <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
            )}
        </div>
    );
}

interface LoadingOverlayProps {
    message?: string;
    progress?: number;
    subtitle?: string;
}

export function LoadingOverlay({ message, progress, subtitle }: LoadingOverlayProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="glass-card p-8 flex flex-col items-center gap-4 max-w-sm mx-4">
                <LoadingSpinner size="lg" />

                {message && (
                    <p className="text-lg font-medium text-foreground text-center">{message}</p>
                )}

                {progress !== undefined && (
                    <div className="w-full">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-linear-to-r from-purple-500 to-blue-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 text-center">{progress}%</p>
                    </div>
                )}

                {subtitle && (
                    <p className="text-sm text-muted-foreground text-center">{subtitle}</p>
                )}
            </div>
        </div>
    );
}
