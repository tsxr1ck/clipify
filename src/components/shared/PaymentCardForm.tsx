import { useState, useEffect } from 'react';
import { initMercadoPago, Payment, StatusScreen } from '@mercadopago/sdk-react';
import { Loader2, CreditCard, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '@/services/api/client';

// Initialize MercadoPago with public key
const MP_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || '';

if (MP_PUBLIC_KEY) {
    initMercadoPago(MP_PUBLIC_KEY, { locale: 'es-MX' });
}

interface CreditPackage {
    id: string;
    name: string;
    amountMXN: number;
    totalCredits: number;
}

interface PaymentCardFormProps {
    selectedPackage: CreditPackage;
    onSuccess: () => void;
    onCancel: () => void;
}

type PaymentStep = 'payment' | 'status';

export function PaymentCardForm({ selectedPackage, onSuccess, onCancel }: PaymentCardFormProps) {
    const [preferenceId, setPreferenceId] = useState<string | null>(null);
    const [paymentId, setPaymentId] = useState<string | null>(null);
    const [step, setStep] = useState<PaymentStep>('payment');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Create preference when component mounts
    useEffect(() => {
        const createPreference = async () => {
            try {
                const response = await apiClient.post('/payments/create-preference', {
                    packageId: selectedPackage.id,
                });
                setPreferenceId(response.data.preferenceId);
            } catch (err) {
                console.error('Error creating preference:', err);
                setError('Failed to initialize payment. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        if (MP_PUBLIC_KEY) {
            createPreference();
        } else {
            setIsLoading(false);
            setError('Payment configuration is missing.');
        }
    }, [selectedPackage.id]);

    // Handle when payment is submitted
    // The Payment Brick passes the form data directly
    const handlePaymentSubmit = async (formData: unknown) => {
        console.log('Payment submitted:', formData);

        try {
            // Process the payment on our backend
            const response = await apiClient.post('/payments/process-brick', {
                packageId: selectedPackage.id,
                formData: formData,
            });

            if (response.data.paymentId) {
                setPaymentId(response.data.paymentId.toString());
                setStep('status');
            }
        } catch (err) {
            console.error('Payment processing error:', err);
            setError('Payment failed. Please try again.');
        }
    };

    const handlePaymentReady = () => {
        console.log('Payment Brick ready');
    };

    const handlePaymentError = (err: unknown) => {
        console.error('Payment Brick error:', err);
        setError('Error loading payment form. Please try again.');
    };

    // No public key configured
    if (!MP_PUBLIC_KEY) {
        return (
            <div className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <h3 className="font-semibold text-lg mb-2">Payment Not Available</h3>
                <p className="text-sm text-muted-foreground">
                    Payment configuration is missing. Please contact support.
                </p>
                <Button variant="outline" onClick={onCancel} className="mt-4">
                    Go Back
                </Button>
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="p-6 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Preparing payment...</p>
            </div>
        );
    }

    // Error state
    if (error && step === 'payment') {
        return (
            <div className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-3" />
                <h3 className="font-semibold text-lg mb-2">Error</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" onClick={onCancel} className="mt-4">
                    Go Back
                </Button>
            </div>
        );
    }

    // Status Screen step - show after payment is processed
    if (step === 'status' && paymentId) {
        return (
            <div className="space-y-4">
                <StatusScreen
                    initialization={{
                        paymentId: paymentId,
                    }}
                    customization={{
                        visual: {
                            style: {
                                theme: 'dark',
                            },
                        },
                    }}
                    onReady={() => console.log('Status Screen ready')}
                    onError={(err) => console.error('Status Screen error:', err)}
                />
                <div className="flex justify-center pt-4">
                    <Button onClick={onSuccess} className="gradient-btn">
                        Continue
                    </Button>
                </div>
            </div>
        );
    }

    // Payment step - show the Payment Brick
    return (
        <div className="space-y-4">
            {/* Package Summary */}
            <div className="p-3 rounded-lg glass border border-purple-500/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-purple-500" />
                        <span className="font-medium">{selectedPackage.name}</span>
                    </div>
                    <span className="text-lg font-bold text-purple-500">
                        ${selectedPackage.amountMXN} MXN
                    </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    You'll receive {selectedPackage.totalCredits} credits
                </p>
            </div>

            {/* Payment Brick */}
            {preferenceId && (
                <div className="min-h-[400px]">
                    <Payment
                        initialization={{
                            amount: selectedPackage.amountMXN,
                            preferenceId: preferenceId,
                        }}
                        customization={{
                            visual: {
                                style: {
                                    theme: 'dark',
                                },
                            },
                            paymentMethods: {
                                creditCard: 'all',
                                debitCard: 'all',
                                mercadoPago: 'all',
                                maxInstallments: 1,
                            },
                        }}
                        onReady={handlePaymentReady}
                        onSubmit={handlePaymentSubmit}
                        onError={handlePaymentError}
                    />
                </div>
            )}

            {/* Cancel Button */}
            <div className="flex justify-center pt-2">
                <Button
                    variant="ghost"
                    onClick={onCancel}
                    className="text-muted-foreground"
                >
                    Cancel
                </Button>
            </div>
        </div>
    );
}

export default PaymentCardForm;
