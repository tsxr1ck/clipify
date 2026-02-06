import { useApplication, useApiKey } from '@/context/ApplicationContext';
import { ProgressStepper } from '@/components/shared/ProgressStepper';
import { Step0_ApiKeySetup } from '@/components/steps/Step0_ApiKeySetup';
import { Step1_StyleSelection } from '@/components/steps/Step1_StyleSelection';
import { Step2_CharacterSelection } from '@/components/steps/Step2_CharacterSelection';
import { Step3_VideoGeneration } from '@/components/steps/Step3_VideoGeneration';

export function VideoGenerator() {
    const { state, setStep } = useApplication();
    const { key: apiKey } = useApiKey();

    // If no API key, start at step 0
    const effectiveStep = !apiKey && state.currentStep > 0 ? 0 : state.currentStep;

    const renderStep = () => {
        switch (effectiveStep) {
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
        <div className="animate-fadeIn">
            {/* Progress Stepper */}
            <div className="w-full max-w-4xl mx-auto py-6">
                <ProgressStepper currentStep={effectiveStep} onStepClick={setStep} />
            </div>

            {/* Step Content */}
            {renderStep()}
        </div>
    );
}
