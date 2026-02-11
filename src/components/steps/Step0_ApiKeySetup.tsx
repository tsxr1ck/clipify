import { useState, useEffect } from 'react';
import { Eye, EyeOff, Key, ExternalLink, Trash2, Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useApiKey, useApplication } from '@/context/ApplicationContext';
import { apiKeyStorage } from '@/utils/indexedDB';
import { validateApiKey } from '@/services/api/geminiService';
import { ErrorMessage, SuccessMessage } from '@/components/shared/ErrorMessage';

export function Step0_ApiKeySetup() {
    const { key, isValid, isValidating, error, setKey, clearKey, setValidating, setValid } = useApiKey();
    const { nextStep } = useApplication();

    const [inputValue, setInputValue] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [rememberKey, setRememberKey] = useState(true);
    const [localSuccess, setLocalSuccess] = useState(false);

    // Load saved key on mount
    useEffect(() => {
        async function loadSavedKey() {
            const savedKey = await apiKeyStorage.get();
            if (savedKey) {
                setInputValue(savedKey);
            }
        }
        loadSavedKey();
    }, []);

    // If key is already valid, show success and allow advancing
    useEffect(() => {
        if (isValid && key) {
            setLocalSuccess(true);
        }
    }, [isValid, key]);

    const handleValidate = async () => {
        if (!inputValue.trim()) return;

        setValidating(true);
        setLocalSuccess(false);

        const result = await validateApiKey(inputValue.trim());

        if (result.valid) {
            if (rememberKey) {
                setKey(inputValue.trim());
            }
            setValid(true);
            setLocalSuccess(true);
        } else {
            setValid(false, result.error);
        }
    };

    const handleClearKey = () => {
        clearKey();
        setInputValue('');
        setLocalSuccess(false);
    };

    const handleContinue = () => {
        if (isValid) {
            nextStep();
        }
    };

    return (
        <div className="w-full max-w-lg mx-auto animate-fadeIn">
            <div className="glass-card p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                        <Key className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold gradient-text">Connect Your API Key</h2>
                    <p className="text-muted-foreground mt-2">
                        Bring your own Google AI Studio API key to get started
                    </p>
                </div>

                {/* Info Card */}
                <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                            <Key className="w-4 h-4 text-primary" />
                        </div>
                        <div className="text-sm">
                            <p className="font-medium text-foreground">BYOK Model</p>
                            <p className="text-muted-foreground mt-1">
                                Your API key is stored locally in your browser. We never send it to any server.
                            </p>
                        </div>
                    </div>
                </div>

                {/* API Key Input */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="api-key">API Key</Label>
                        <div className="relative">
                            <Input
                                id="api-key"
                                type={showKey ? 'text' : 'password'}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="AIza..."
                                className="glass-input pr-12"
                                disabled={isValidating}
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                aria-label={showKey ? 'Hide API key' : 'Show API key'}
                            >
                                {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Remember checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={rememberKey}
                            onChange={(e) => setRememberKey(e.target.checked)}
                            className="w-4 h-4 rounded border-muted-foreground/30 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-muted-foreground">Remember API key</span>
                    </label>

                    {/* Error message */}
                    {error && !localSuccess && (
                        <ErrorMessage message={error} onDismiss={() => setValid(false)} />
                    )}

                    {/* Success message */}
                    {localSuccess && (
                        <SuccessMessage message="API key validated successfully!" />
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-3 pt-2">
                        {!localSuccess ? (
                            <Button
                                onClick={handleValidate}
                                disabled={!inputValue.trim() || isValidating}
                                className="w-full btn-gradient py-6"
                            >
                                {isValidating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Validating...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-5 h-5 mr-2" />
                                        Validate & Save
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button
                                onClick={handleContinue}
                                className="w-full btn-gradient py-6"
                            >
                                Continue to Style Selection
                                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </Button>
                        )}

                        {key && (
                            <Button
                                variant="ghost"
                                onClick={handleClearKey}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Clear Saved API Key
                            </Button>
                        )}
                    </div>
                </div>

                {/* Get API Key Link */}
                <div className="mt-6 pt-6 border-t border-border">
                    <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Get your free API key from Google AI Studio
                    </a>
                </div>
            </div>
        </div>
    );
}
