import { Check } from 'lucide-react';
import type { Step } from '../../types';
import { cn } from '@/lib/utils';

interface ProgressStepperProps {
    currentStep: Step;
    onStepClick?: (step: Step) => void;
}

const steps = [
    { id: 0 as Step, label: 'Style Library', shortLabel: 'Style' },
    { id: 1 as Step, label: 'Character Library', shortLabel: 'Character' },
    { id: 2 as Step, label: 'Video Generation', shortLabel: 'Video' },
];

export function ProgressStepper({ currentStep, onStepClick }: ProgressStepperProps) {
    return (
        <nav aria-label="Progress" className="w-full">
            {/* Desktop/Tablet view */}
            <ol className="hidden sm:flex items-center justify-center gap-0">
                {steps.map((step, index) => {
                    const isCompleted = step.id < currentStep;
                    const isCurrent = step.id === currentStep;
                    const isClickable = isCompleted && onStepClick;

                    return (
                        <li key={step.id} className="flex items-center">
                            {/* Step circle */}
                            <button
                                onClick={() => isClickable && onStepClick(step.id)}
                                disabled={!isClickable}
                                className={cn(
                                    'relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300',
                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                                    isCompleted && 'bg-gradient-to-br from-purple-500 to-blue-500 text-white cursor-pointer hover:scale-110',
                                    isCurrent && 'bg-gradient-to-br from-purple-500 to-blue-500 text-white animate-pulseGlow',
                                    !isCompleted && !isCurrent && 'glass border-2 border-muted-foreground/20 text-muted-foreground',
                                )}
                                aria-current={isCurrent ? 'step' : undefined}
                            >
                                {isCompleted ? (
                                    <Check className="w-5 h-5" strokeWidth={3} />
                                ) : (
                                    <span className="text-sm font-semibold">{step.id + 1}</span>
                                )}
                            </button>

                            {/* Step label */}
                            <span
                                className={cn(
                                    'ml-3 text-sm font-medium transition-colors duration-200',
                                    isCurrent && 'text-foreground',
                                    isCompleted && 'text-foreground',
                                    !isCompleted && !isCurrent && 'text-muted-foreground',
                                )}
                            >
                                {step.label}
                            </span>

                            {/* Connector line */}
                            {index < steps.length - 1 && (
                                <div
                                    className={cn(
                                        'mx-4 h-0.5 w-12 lg:w-20 transition-colors duration-300',
                                        isCompleted ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-muted-foreground/20',
                                    )}
                                />
                            )}
                        </li>
                    );
                })}
            </ol>

            {/* Mobile view */}
            <div className="flex sm:hidden items-center justify-between px-4">
                {steps.map((step, index) => {
                    const isCompleted = step.id < currentStep;
                    const isCurrent = step.id === currentStep;

                    return (
                        <div key={step.id} className="flex items-center">
                            {/* Step circle */}
                            <div
                                className={cn(
                                    'flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300',
                                    isCompleted && 'bg-gradient-to-br from-purple-500 to-blue-500 text-white',
                                    isCurrent && 'bg-gradient-to-br from-purple-500 to-blue-500 text-white animate-pulseGlow',
                                    !isCompleted && !isCurrent && 'glass border border-muted-foreground/20 text-muted-foreground',
                                )}
                            >
                                {isCompleted ? (
                                    <Check className="w-4 h-4" strokeWidth={3} />
                                ) : (
                                    <span className="text-xs font-semibold">{step.id + 1}</span>
                                )}
                            </div>

                            {/* Connector line (except for last item) */}
                            {index < steps.length - 1 && (
                                <div
                                    className={cn(
                                        'mx-1.5 h-0.5 w-6 transition-colors duration-300',
                                        isCompleted ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-muted-foreground/20',
                                    )}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Mobile current step label */}
            <p className="sm:hidden text-center mt-2 text-sm font-medium text-foreground">
                {steps.find((s) => s.id === currentStep)?.label}
            </p>
        </nav>
    );
}
