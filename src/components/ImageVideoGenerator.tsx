import { Sun, Moon, Sparkles } from 'lucide-react';
import { useApplication } from '@/context/ApplicationContext';
import { themeStorage } from '@/utils/indexedDB';
import { ProgressStepper } from '@/components/shared/ProgressStepper';
import { Step0_ApiKeySetup } from '@/components/steps/Step0_ApiKeySetup';
import { Step1_StyleSelection } from '@/components/steps/Step1_StyleSelection';
import { Step2_CharacterSelection } from '@/components/steps/Step2_CharacterSelection';
import { Step3_VideoGeneration } from '@/components/steps/Step3_VideoGeneration';
import { useEffect, useState } from 'react';

export function ImageVideoGenerator() {
    const { state, setStep } = useApplication();
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    // Initialize theme
    useEffect(() => {
        async function loadTheme() {
            const savedTheme = await themeStorage.get();
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
            setTheme(initialTheme);
            document.documentElement.classList.toggle('dark', initialTheme === 'dark');
        }
        loadTheme();
    }, []);

    const toggleTheme = async () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        await themeStorage.set(newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    const renderStep = () => {
        switch (state.currentStep) {
            case 0:
                return <Step0_ApiKeySetup />;
            case 1:
                return <Step1_StyleSelection />;
            case 2:
                return <Step2_CharacterSelection />;
            case 3:
                return <Step3_VideoGeneration />;
            default:
                return <Step0_ApiKeySetup />;
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="w-full py-4 px-6 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold gradient-text">Clipify</h1>
                        <p className="text-xs text-muted-foreground -mt-0.5">Create AI videos with style</p>
                    </div>
                </div>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-xl glass hover:bg-primary/10 transition-colors"
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {theme === 'dark' ? (
                        <Sun className="w-5 h-5 text-foreground" />
                    ) : (
                        <Moon className="w-5 h-5 text-foreground" />
                    )}
                </button>
            </header>

            {/* Progress Stepper */}
            <div className="w-full max-w-4xl mx-auto px-4 py-6">
                <ProgressStepper currentStep={state.currentStep} onStepClick={setStep} />
            </div>

            {/* Main Content */}
            <main className="flex-1 w-full px-4 pb-12">
                {renderStep()}
            </main>

            {/* Footer */}
            <footer className="w-full py-4 text-center text-xs text-muted-foreground">
                <p>
                    Powered by{' '}
                    <a
                        href="https://aistudio.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                    >
                        Google AI Studio
                    </a>
                    {' '}• BYOK Model • Your data stays local
                </p>
            </footer>
        </div>
    );
}
