import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { creditsService } from '@/services/api/creditsService';
import { useState, useEffect } from 'react';
import { Loader2, Check } from 'lucide-react';

interface CreditsPurchaseModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreditsPurchaseModal({ open, onOpenChange }: CreditsPurchaseModalProps) {
    const [packages, setPackages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            creditsService.getPackages().then(setPackages).catch(console.error);
        }
    }, [open]);

    const handlePurchase = async (pkgId: string) => {
        setLoading(true);
        try {
            await creditsService.purchase(pkgId);
            onOpenChange(false);
            window.location.reload(); // Simple refresh for now
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-modal max-w-lg">
                <DialogHeader>
                    <DialogTitle>Purchase Credits</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {packages.map((pkg) => (
                        <div key={pkg.id} className="flex items-center justify-between p-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
                            <div>
                                <h3 className="font-bold">{pkg.name}</h3>
                                <p className="text-sm text-muted-foreground">{pkg.totalCredits} credits</p>
                            </div>
                            <Button
                                onClick={() => handlePurchase(pkg.id)}
                                disabled={loading}
                                className="btn-gradient"
                            >
                                ${pkg.priceMxn} MXN
                            </Button>
                        </div>
                    ))}
                    {packages.length === 0 && (
                        <div className="text-center py-4">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
