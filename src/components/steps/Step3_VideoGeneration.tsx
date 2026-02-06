import { useState, useEffect } from 'react';
import {
    Video,
    Loader2,
    Download,
    AlertTriangle,
    RefreshCw,
    Sparkles,
    Palette,
    User,
    DollarSign,
    Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useApplication, useApiKey } from '@/context/ApplicationContext';
import { charactersStorage, stylesStorage } from '@/utils/indexedDB';
import { base64ToDataUrl } from '@/utils/imageProcessing';
import {
    checkVeoAccess,
    generateVideo,
    buildVideoPrompt,
} from '@/services/api/geminiService';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import { VideoGeneratingModal } from '@/components/shared/VideoGeneratingModal';
import type { SavedCharacter, SavedStyle, VideoDuration } from '@/types';

const durationOptions: { value: VideoDuration; label: string }[] = [
    { value: 2, label: '2s' },
    { value: 4, label: '4s' },
    { value: 6, label: '6s' },
    { value: 8, label: '8s' },
];

// Pricing constants
const VEO_COST_PER_SECOND_USD = 0.05;
const USD_TO_MXN = 17.5;

export function Step3_VideoGeneration() {
    const { state, prevStep, setStep } = useApplication();
    const { key: apiKey } = useApiKey();

    const [selectedStyle, setSelectedStyle] = useState<SavedStyle | null>(null);
    const [selectedCharacter, setSelectedCharacter] = useState<SavedCharacter | null>(null);
    const [veoAvailable, setVeoAvailable] = useState<boolean | null>(null);
    const [isCheckingVeo, setIsCheckingVeo] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    // Form state
    const [escena, setEscena] = useState('');
    const [fondo, setFondo] = useState('');
    const [accion, setAccion] = useState('');
    const [dialogo, setDialogo] = useState('');
    const [voiceStyle, setVoiceStyle] = useState('');
    const [movimiento, setMovimiento] = useState('');
    const [duration, setDuration] = useState<VideoDuration>(4);

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedVideo, setGeneratedVideo] = useState<{
        base64: string;
        mimeType: string;
        costMXN?: number;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState<string>('');
    const [elapsedTime, setElapsedTime] = useState(0);

    // Elapsed time timer during generation
    useEffect(() => {
        if (!isGenerating) {
            setElapsedTime(0);
            return;
        }
        const interval = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [isGenerating]);

    // Calculate estimated cost
    const estimatedCostUSD = duration * VEO_COST_PER_SECOND_USD;
    const estimatedCostMXN = estimatedCostUSD * USD_TO_MXN;

    // Load selected style and character
    useEffect(() => {
        async function loadData() {
            if (state.selectedStyleId) {
                const style = await stylesStorage.getById(state.selectedStyleId);
                setSelectedStyle(style);
            }
            if (state.selectedCharacterId) {
                const character = await charactersStorage.getById(state.selectedCharacterId);
                setSelectedCharacter(character);
            }
            setIsLoading(false);
        }
        loadData();
    }, [state.selectedStyleId, state.selectedCharacterId]);

    // Check Veo access on mount
    useEffect(() => {
        async function checkAccess() {
            if (apiKey) {
                const available = await checkVeoAccess(apiKey);
                setVeoAvailable(available);
            }
            setIsCheckingVeo(false);
        }
        checkAccess();
    }, [apiKey]);

    const isFormValid = escena.trim() && accion.trim() && dialogo.trim();

    const handleGenerate = async () => {
        if (!apiKey || !selectedStyle || !selectedCharacter || !isFormValid) return;

        setIsGenerating(true);
        setError(null);
        setProgressMessage('');

        try {
            const prompt = buildVideoPrompt(
                escena.trim(),
                fondo.trim() || undefined,
                accion.trim(),
                dialogo.trim(),
                voiceStyle.trim() || undefined,
                movimiento.trim() || undefined,
                selectedStyle.keywords,
                selectedStyle.parsedStyle,
                selectedCharacter.prompt,
                duration
            );

            const result = await generateVideo(
                selectedCharacter.imageBase64,
                prompt,
                duration,
                apiKey,
                (message) => setProgressMessage(message)
            );

            setGeneratedVideo({
                base64: result.videoBase64,
                mimeType: result.mimeType,
                costMXN: result.costMXN,
            });
            setProgressMessage('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate video');
            setProgressMessage('');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!generatedVideo) return;

        const link = document.createElement('a');
        link.href = base64ToDataUrl(generatedVideo.base64, generatedVideo.mimeType);
        link.download = `clipify-video-${Date.now()}.mp4`;
        link.click();
    };

    const handleDownloadCharacter = () => {
        if (!selectedCharacter) return;

        const link = document.createElement('a');
        link.href = base64ToDataUrl(selectedCharacter.imageBase64, 'image/png');
        link.download = `${selectedCharacter.name.replace(/\s+/g, '-')}.png`;
        link.click();
    };

    const handleStartNew = () => {
        setEscena('');
        setFondo('');
        setAccion('');
        setDialogo('');
        setVoiceStyle('');
        setMovimiento('');
        setDuration(4);
        setGeneratedVideo(null);
        setError(null);
    };

    if (isLoading) {
        return (
            <div className="w-full flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!selectedStyle || !selectedCharacter) {
        return (
            <div className="w-full max-w-lg mx-auto text-center py-12 glass-card">
                <p className="text-muted-foreground">Please select a style and character first</p>
                <Button onClick={() => setStep(1)} className="mt-4 btn-glass">
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto px-4 animate-fadeIn">
            {/* Header */}
            <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <Video className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold gradient-text">Video Generation</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                    Configure your scene and bring your character to life
                </p>
            </div>

            {/* Veo Unavailable Warning */}
            {!isCheckingVeo && !veoAvailable && (
                <div className="max-w-2xl mx-auto mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-amber-600 dark:text-amber-400">
                                Veo video generation is not available
                            </p>
                            <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-1">
                                Your API key doesn't have access to Veo yet. You can still download your character image.
                            </p>
                            <div className="mt-3 flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={handleDownloadCharacter}
                                    className="btn-glass text-amber-600"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download Character Image
                                </Button>
                                <a
                                    href="https://deepmind.google/technologies/veo/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-sm text-amber-600 hover:underline"
                                >
                                    Apply for Veo access →
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3-Column Layout */}
            {(veoAvailable === true || isCheckingVeo) && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Column 1: Style & Character */}
                    <div className="lg:col-span-3 space-y-4">
                        <div className="glass-card p-4">
                            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <Palette className="w-4 h-4" />
                                Style
                            </h3>
                            <div className="space-y-3">
                                <img
                                    src={base64ToDataUrl(selectedStyle.referenceImage, 'image/png')}
                                    alt={selectedStyle.name}
                                    className="w-full aspect-square rounded-xl object-cover"
                                />
                                <div>
                                    <p className="font-medium text-foreground">{selectedStyle.name}</p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {selectedStyle.keywords.slice(0, 4).map((keyword, i) => (
                                            <span
                                                key={i}
                                                className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary"
                                            >
                                                {keyword}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-4">
                            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Character
                            </h3>
                            <div className="space-y-3">
                                <img
                                    src={base64ToDataUrl(selectedCharacter.imageBase64, 'image/png')}
                                    alt={selectedCharacter.name}
                                    className="w-full aspect-square rounded-xl object-cover"
                                />
                                <div>
                                    <p className="font-medium text-foreground">{selectedCharacter.name}</p>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {selectedCharacter.prompt}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Back Button */}
                        <Button variant="ghost" onClick={prevStep} className="w-full btn-glass">
                            <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 17l-5-5m0 0l5-5m-5 5h12"
                                />
                            </svg>
                            Back
                        </Button>
                    </div>

                    {/* Column 2: Form Inputs */}
                    <div className="lg:col-span-5">
                        <div className="glass-card p-5">
                            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                📋 Scene Configuration
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Escena */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="escena" className="text-xs">
                                        Escena <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        id="escena"
                                        value={escena}
                                        onChange={(e) => setEscena(e.target.value)}
                                        placeholder="Escenario, iluminación..."
                                        className="glass-input min-h-[70px] text-sm"
                                        disabled={isGenerating}
                                    />
                                </div>

                                {/* Fondo */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="fondo" className="text-xs">
                                        Fondo <span className="text-muted-foreground">(opcional)</span>
                                    </Label>
                                    <Textarea
                                        id="fondo"
                                        value={fondo}
                                        onChange={(e) => setFondo(e.target.value)}
                                        placeholder="Cielo, ciudad, bosque..."
                                        className="glass-input min-h-[70px] text-sm"
                                        disabled={isGenerating}
                                    />
                                </div>

                                {/* Acción */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="accion" className="text-xs">
                                        Acción <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        id="accion"
                                        value={accion}
                                        onChange={(e) => setAccion(e.target.value)}
                                        placeholder="Qué sucede en la escena..."
                                        className="glass-input min-h-[70px] text-sm"
                                        disabled={isGenerating}
                                    />
                                </div>

                                {/* Diálogo */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="dialogo" className="text-xs">
                                        Diálogo <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        id="dialogo"
                                        value={dialogo}
                                        onChange={(e) => setDialogo(e.target.value)}
                                        placeholder='Lo que dice el personaje...'
                                        className="glass-input min-h-[70px] text-sm"
                                        disabled={isGenerating}
                                    />
                                </div>

                                {/* Voice Style */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="voiceStyle" className="text-xs">
                                        Estilo de Voz <span className="text-muted-foreground">(opcional)</span>
                                    </Label>
                                    <Input
                                        id="voiceStyle"
                                        value={voiceStyle}
                                        onChange={(e) => setVoiceStyle(e.target.value)}
                                        placeholder="ej: suave, enérgico, misterioso..."
                                        className="glass-input text-sm"
                                        disabled={isGenerating}
                                    />
                                </div>

                                {/* Movimiento - Full width */}
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label htmlFor="movimiento" className="text-xs">
                                        Movimiento <span className="text-muted-foreground">(opcional)</span>
                                    </Label>
                                    <Input
                                        id="movimiento"
                                        value={movimiento}
                                        onChange={(e) => setMovimiento(e.target.value)}
                                        placeholder="Cámara, animaciones del personaje..."
                                        className="glass-input text-sm"
                                        disabled={isGenerating}
                                    />
                                </div>

                                {/* Duration - Full width */}
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label className="text-xs">Duration</Label>
                                    <div className="flex gap-2">
                                        {durationOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => setDuration(option.value)}
                                                disabled={isGenerating}
                                                className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${duration === option.value
                                                    ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                                                    : 'glass hover:bg-primary/10'
                                                    }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="mt-4">
                                    <ErrorMessage message={error} onDismiss={() => setError(null)} />
                                </div>
                            )}

                            {/* Generate Button */}
                            <Button
                                onClick={handleGenerate}
                                disabled={!isFormValid || isGenerating || isCheckingVeo}
                                className="w-full btn-gradient py-5 mt-4"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        {progressMessage || 'Generating Video...'}
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5 mr-2" />
                                        Generate Video
                                    </>
                                )}
                            </Button>

                            {/* Status Text */}
                            <p className="text-center text-xs text-muted-foreground mt-2">
                                {isFormValid ? '✓ Ready to generate' : '• Fill in required fields'}
                            </p>
                        </div>
                    </div>

                    {/* Column 3: Video Preview & Cost */}
                    <div className="lg:col-span-4 space-y-4">
                        {/* Cost Estimator */}
                        <div className="glass-card p-4">
                            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                Cost Estimate
                            </h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        Duration
                                    </span>
                                    <span className="font-medium text-foreground">{duration}s</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Rate</span>
                                    <span className="font-medium text-foreground">$0.05 USD/s</span>
                                </div>
                                <div className="border-t border-border pt-2 mt-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground text-sm">Est. Cost (USD)</span>
                                        <span className="font-semibold text-foreground">
                                            ${estimatedCostUSD.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-muted-foreground text-sm">Est. Cost (MXN)</span>
                                        <span className="font-bold text-lg gradient-text">
                                            ${estimatedCostMXN.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Video Preview */}
                        <div className="glass-card p-4">
                            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <Video className="w-4 h-4" />
                                Video Preview
                            </h3>

                            {generatedVideo ? (
                                <div className="space-y-3">
                                    <div className="rounded-xl overflow-hidden bg-muted/20 aspect-[9/16]">
                                        <video
                                            src={base64ToDataUrl(generatedVideo.base64, generatedVideo.mimeType)}
                                            controls
                                            autoPlay
                                            loop
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    {generatedVideo.costMXN && (
                                        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                                            <p className="text-xs text-green-600 dark:text-green-400 text-center">
                                                ✓ Video generated • Cost: <span className="font-bold">${generatedVideo.costMXN.toFixed(2)} MXN</span>
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <Button onClick={handleDownload} className="flex-1 btn-gradient py-3">
                                            <Download className="w-4 h-4 mr-2" />
                                            Download
                                        </Button>
                                        <Button onClick={handleStartNew} variant="ghost" className="btn-glass">
                                            <RefreshCw className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl bg-muted/10 border-2 border-dashed border-muted-foreground/20 aspect-[9/16] flex items-center justify-center">
                                    <div className="text-center p-4">
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
                                                <p className="text-sm text-muted-foreground">
                                                    {progressMessage || 'Generating...'}
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <Video className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                                                <p className="text-sm text-muted-foreground">
                                                    Video preview will appear here
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Video Generating Modal */}
            <VideoGeneratingModal
                isOpen={isGenerating}
                progressMessage={progressMessage}
                elapsedTime={elapsedTime}
            />
        </div>
    );
}
