import { Check } from 'lucide-react';
import type { Step } from '../../types';
import { cn } from '@/lib/utils';

interface ProgressStepperProps {
    currentStep: Step;
    onStepClick?: (step: Step) => void;
}

const steps = [
    { id: 0 as Step, label: 'Style', shortLabel: 'Style' },
    { id: 1 as Step, label: 'Character', shortLabel: 'Character' },
    { id: 2 as Step, label: 'Generation', shortLabel: 'Video' },
];

export function ProgressStepper({ currentStep, onStepClick }: ProgressStepperProps) {
    return (
        <nav aria-label="Progress" className="w-full">
            {/* Desktop/Tablet view */}
            <ol className="hidden sm:flex items-center justify-center w-full">
                {steps.map((step, index) => {
                    const isCompleted = step.id < currentStep;
                    const isCurrent = step.id === currentStep;
                    const isClickable = isCompleted && onStepClick;

                    return (
                        <li key={step.id} className="flex items-center relative">
                            <div className="flex flex-col items-center group">
                                {/* Step circle */}
                                <button
                                    onClick={() => isClickable && onStepClick(step.id)}
                                    disabled={!isClickable}
                                    className={cn(
                                        'relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 z-10',
                                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background',
                                        isCompleted && 'bg-primary text-primary-foreground hover:scale-110 shadow-lg shadow-primary/25',
                                        isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110 shadow-lg shadow-primary/30',
                                        !isCompleted && !isCurrent && 'glass bg-muted/50 border-2 border-muted text-muted-foreground',
                                        isClickable && 'cursor-pointer hover:border-primary/50'
                                    )}
                                    aria-current={isCurrent ? 'step' : undefined}
                                >
                                    {isCompleted ? (
                                        <Check className="w-6 h-6 animate-scaleIn" strokeWidth={2.5} />
                                    ) : (
                                        <span className={cn("text-base font-bold", isCurrent && "animate-pulse")}>{step.id + 1}</span>
                                    )}
                                </button>

                                {/* Step label */}
                                <span
                                    className={cn(
                                        'absolute top-14 text-sm font-medium transition-all duration-300 whitespace-nowrap',
                                        isCurrent && 'text-primary font-bold trnaslate-y-0 opacity-100',
                                        isCompleted && 'text-foreground opacity-80',
                                        !isCompleted && !isCurrent && 'text-muted-foreground opacity-60'
                                    )}
                                >
                                    {step.label}
                                </span>
                            </div>

                            {/* Connector line */}
                            {index < steps.length - 1 && (
                                <div className="w-24 lg:w-40 h-[2px] mx-4 bg-muted overflow-hidden rounded-full">
                                    <div
                                        className={cn(
                                            'h-full transition-all duration-500 ease-in-out',
                                            isCompleted ? 'bg-primary w-full' : 'bg-transparent w-0'
                                        )}
                                    />
                                </div>
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
                        <div key={step.id} className="flex items-center flex-1">
                            {/* Step circle */}
                            <div
                                className={cn(
                                    'flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 z-10',
                                    isCompleted && 'bg-primary text-primary-foreground',
                                    isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                                    !isCompleted && !isCurrent && 'glass border border-muted text-muted-foreground',
                                )}
                            >
                                {isCompleted ? (
                                    <Check className="w-4 h-4" strokeWidth={2.5} />
                                ) : (
                                    <span className="text-xs font-bold">{step.id + 1}</span>
                                )}
                            </div>

                            {/* Connector line (except for last item) */}
                            {index < steps.length - 1 && (
                                <div className="flex-1 h-[2px] mx-2 bg-muted overflow-hidden rounded-full">
                                    <div
                                        className={cn(
                                            'h-full transition-all duration-300',
                                            isCompleted ? 'bg-primary w-full' : 'bg-transparent w-0'
                                        )}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <p className="sm:hidden text-center mt-4 text-sm font-medium text-foreground">
                {steps.find((s) => s.id === currentStep)?.label}
            </p>
        </nav>
    );
}
