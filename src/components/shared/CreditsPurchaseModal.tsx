import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { creditsService } from '@/services/api/creditsService';
import { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, Sparkles, Gift } from 'lucide-react';
import { PaymentCardForm } from './PaymentCardForm';

interface CreditPackage {
    id: string;
    name: string;
    amountMXN: number;
    totalCredits: number;
    bonusPercent?: number;
}

interface CreditsPurchaseModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreditsPurchaseModal({ open, onOpenChange }: CreditsPurchaseModalProps) {
    const [packages, setPackages] = useState<CreditPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
    const [step, setStep] = useState<'select' | 'payment'>('select');

    useEffect(() => {
        if (open) {
            setStep('select');
            setSelectedPackage(null);
            creditsService.getPackages()
                .then((pkgs) => {
                    // Map to our interface
                    setPackages(pkgs.map(p => ({
                        id: p.id,
                        name: p.name,
                        amountMXN: p.amountMxn,
                        totalCredits: p.amountMxn + (p.bonusMxn || 0),
                        bonusPercent: p.bonusMxn ? Math.round((p.bonusMxn / p.amountMxn) * 100) : 0,
                    })));
                    setLoading(false);
                })
                .catch(console.error);
        }
    }, [open]);

    const handleSelectPackage = (pkg: CreditPackage) => {
        setSelectedPackage(pkg);
        setStep('payment');
    };

    const handlePaymentSuccess = () => {
        onOpenChange(false);
        // Refresh page to update credits display
        window.location.reload();
    };

    const handleBack = () => {
        setStep('select');
        setSelectedPackage(null);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-modal max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {step === 'payment' && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBack}
                                className="h-7 w-7 p-0 mr-1"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        )}
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        {step === 'select' ? 'Purchase Credits' : 'Complete Payment'}
                    </DialogTitle>
                </DialogHeader>

                {step === 'select' && (
                    <div className="space-y-3 py-2">
                        {loading ? (
                            <div className="text-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                            </div>
                        ) : (
                            packages.map((pkg) => (
                                <button
                                    key={pkg.id}
                                    onClick={() => handleSelectPackage(pkg)}
                                    className="w-full flex items-center justify-between p-4 rounded-xl border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group"
                                >
                                    <div className="text-left">
                                        <h3 className="font-bold flex items-center gap-2">
                                            {pkg.name}
                                            {pkg.bonusPercent && pkg.bonusPercent > 0 && (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
                                                    <Gift className="w-3 h-3" />
                                                    +{pkg.bonusPercent}%
                                                </span>
                                            )}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            ${pkg.totalCredits} credits
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-bold text-purple-500 group-hover:text-purple-400 transition-colors">
                                            ${pkg.amountMXN} MXN
                                        </span>
                                    </div>
                                </button>
                            ))
                        )}

                        {packages.length === 0 && !loading && (
                            <p className="text-center text-muted-foreground py-4">
                                No packages available
                            </p>
                        )}
                    </div>
                )}

                {step === 'payment' && selectedPackage && (
                    <PaymentCardForm
                        selectedPackage={selectedPackage}
                        onSuccess={handlePaymentSuccess}
                        onCancel={handleBack}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

export default CreditsPurchaseModal;
