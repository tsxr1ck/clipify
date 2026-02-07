import { useState, useEffect } from 'react';
import {
    ImageIcon,
    Loader2,
    Download,
    RefreshCw,
    Sparkles,
    Palette,
    User,
    DollarSign,
    ArrowRightLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useApplication, useApiKey } from '@/context/ApplicationContext';
import { stylesService, charactersService } from '@/services/api';
import type { Style } from '@/services/api/stylesService';
import type { Character } from '@/services/api/charactersService';
import { base64ToDataUrl } from '@/utils/imageProcessing';
import { generateImageWithLogging, buildImagePrompt } from '@/services/api/geminiService';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import { ImageGeneratingModal } from '@/components/shared/ImageGeneratingModal';
import { ImagePreviewModal } from '@/components/shared/ImagePreviewModal';
import { StyleSelectorModal } from '@/components/shared/StyleSelectorModal';
import { CharacterSelectorModal } from '@/components/shared/CharacterSelectorModal';
import type { AspectRatio } from '@/types';

const aspectRatioOptions: { value: AspectRatio; label: string }[] = [
    { value: '1:1', label: '1:1' },
    { value: '9:16', label: '9:16' },
    { value: '16:9', label: '16:9' },
    { value: '4:3', label: '4:3' },
    { value: '3:4', label: '3:4' },
];

// Pricing constants
const IMAGEN_COST_PER_IMAGE_USD = 0.02;
const USD_TO_MXN = 17.5;

export function Step3_ImageGeneration() {
    const { state, prevStep, setStep, setSelectedStyle: setGlobalStyleId, setSelectedCharacter: setGlobalCharacterId } = useApplication();
    const { key: apiKey } = useApiKey();

    const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Modal state for swapping style/character
    const [showStyleSelector, setShowStyleSelector] = useState(false);
    const [showCharacterSelector, setShowCharacterSelector] = useState(false);

    // Form state
    const [escena, setEscena] = useState('');
    const [fondo, setFondo] = useState('');
    const [accion, setAccion] = useState('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<{
        base64: string;
        mimeType: string;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState<string>('');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Calculate estimated cost
    const estimatedCostUSD = IMAGEN_COST_PER_IMAGE_USD;
    const estimatedCostMXN = estimatedCostUSD * USD_TO_MXN;

    // Load selected style and character from API
    useEffect(() => {
        async function loadData() {
            try {
                if (state.selectedStyleId) {
                    const style = await stylesService.get(state.selectedStyleId);
                    setSelectedStyle(style);
                }
                if (state.selectedCharacterId) {
                    const character = await charactersService.get(state.selectedCharacterId);
                    setSelectedCharacter(character);
                }
            } catch (err) {
                console.error('Failed to load style/character:', err);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [state.selectedStyleId, state.selectedCharacterId]);

    // Handle swapping style
    const handleStyleSwap = (newStyle: Style) => {
        setSelectedStyle(newStyle);
        setGlobalStyleId(newStyle.id);
    };

    // Handle swapping character
    const handleCharacterSwap = (newCharacter: Character) => {
        setSelectedCharacter(newCharacter);
        setGlobalCharacterId(newCharacter.id);
    };

    const isFormValid = escena.trim() && accion.trim();

    const handleGenerate = async () => {
        if (!apiKey || !selectedStyle || !selectedCharacter || !isFormValid) return;

        setIsGenerating(true);
        setError(null);
        setProgressMessage('Generating image...');

        try {
            const prompt = buildImagePrompt(
                escena.trim(),
                fondo.trim() || undefined,
                accion.trim(),
                selectedStyle.keywords,
                selectedStyle.parsedStyle,
                selectedCharacter.prompt
            );

            const result = await generateImageWithLogging(
                prompt,
                aspectRatio,
                apiKey,
                {
                    styleId: selectedStyle.id,
                    characterId: selectedCharacter.id,
                    title: `Image: ${selectedCharacter.name} in ${escena.substring(0, 30)}`,
                    tags: selectedStyle.keywords
                }
            );

            setGeneratedImage({
                base64: result.data,
                mimeType: 'image/png',
            });
            setProgressMessage('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate image');
            setProgressMessage('');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!generatedImage) return;

        const link = document.createElement('a');
        link.href = base64ToDataUrl(generatedImage.base64, generatedImage.mimeType);
        link.download = `clipify-image-${Date.now()}.png`;
        link.click();
    };

    const handleStartNew = () => {
        setEscena('');
        setFondo('');
        setAccion('');
        setAspectRatio('1:1');
        setGeneratedImage(null);
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
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                    <ImageIcon className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold gradient-text">Image Generation</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                    Create stunning images with your character and style
                </p>
            </div>

            {/* 3-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Column 1: Style & Character */}
                <div className="lg:col-span-3 space-y-4">
                    {/* Style Card - Clickable */}
                    <button
                        onClick={() => setShowStyleSelector(true)}
                        className="w-full glass-card p-4 text-left hover:ring-2 hover:ring-primary/50 transition-all group"
                    >
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Palette className="w-4 h-4" />
                                Style
                            </span>
                            <ArrowRightLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </h3>
                        <div className="space-y-3">
                            <img
                                src={selectedStyle.referenceImageUrl}
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
                        <p className="text-xs text-muted-foreground mt-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to change style
                        </p>
                    </button>

                    {/* Character Card - Clickable */}
                    <button
                        onClick={() => setShowCharacterSelector(true)}
                        className="w-full glass-card p-4 text-left hover:ring-2 hover:ring-primary/50 transition-all group"
                    >
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Character
                            </span>
                            <ArrowRightLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </h3>
                        <div className="space-y-3">
                            <img
                                src={selectedCharacter.imageUrl}
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
                        <p className="text-xs text-muted-foreground mt-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to change character
                        </p>
                    </button>

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
                            🖼️ Image Configuration
                        </h3>

                        <div className="space-y-4">
                            {/* Escena */}
                            <div className="space-y-1.5">
                                <Label htmlFor="escena" className="text-xs">
                                    Escena <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="escena"
                                    value={escena}
                                    onChange={(e) => setEscena(e.target.value)}
                                    placeholder="Describe the scene setting, lighting, atmosphere..."
                                    className="glass-input min-h-[80px] text-sm"
                                    disabled={isGenerating}
                                />
                            </div>

                            {/* Fondo */}
                            <div className="space-y-1.5">
                                <Label htmlFor="fondo" className="text-xs">
                                    Fondo <span className="text-muted-foreground">(opcional)</span>
                                </Label>
                                <Input
                                    id="fondo"
                                    value={fondo}
                                    onChange={(e) => setFondo(e.target.value)}
                                    placeholder="Background: sky, city, forest..."
                                    className="glass-input text-sm"
                                    disabled={isGenerating}
                                />
                            </div>

                            {/* Acción */}
                            <div className="space-y-1.5">
                                <Label htmlFor="accion" className="text-xs">
                                    Acción / Pose <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="accion"
                                    value={accion}
                                    onChange={(e) => setAccion(e.target.value)}
                                    placeholder="What is the character doing? Their pose, expression..."
                                    className="glass-input min-h-[80px] text-sm"
                                    disabled={isGenerating}
                                />
                            </div>

                            {/* Aspect Ratio */}
                            <div className="space-y-1.5">
                                <Label className="text-xs">Aspect Ratio</Label>
                                <div className="flex gap-2 flex-wrap">
                                    {aspectRatioOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setAspectRatio(option.value)}
                                            disabled={isGenerating}
                                            className={`py-2 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${aspectRatio === option.value
                                                ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white'
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
                            disabled={!isFormValid || isGenerating}
                            className="w-full bg-gradient-to-br from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 py-5 mt-4"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    {progressMessage || 'Generating...'}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Generate Image
                                </>
                            )}
                        </Button>

                        {/* Status Text */}
                        <p className="text-center text-xs text-muted-foreground mt-2">
                            {isFormValid ? '✓ Ready to generate' : '• Fill in required fields'}
                        </p>
                    </div>
                </div>

                {/* Column 3: Image Preview & Cost */}
                <div className="lg:col-span-4 space-y-4">
                    {/* Cost Estimator */}
                    <div className="glass-card p-4">
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Cost Estimate
                        </h3>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Per Image</span>
                                <span className="font-medium text-foreground">$0.02 USD</span>
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

                    {/* Image Preview */}
                    <div className="glass-card p-4">
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            Image Preview
                        </h3>

                        {generatedImage ? (
                            <div className="space-y-3">
                                <div
                                    className="rounded-xl overflow-hidden bg-muted/20 cursor-pointer group relative"
                                    onClick={() => setIsPreviewOpen(true)}
                                >
                                    <img
                                        src={base64ToDataUrl(generatedImage.base64, generatedImage.mimeType)}
                                        alt="Generated"
                                        className="w-full object-contain transition-transform group-hover:scale-[1.02]"
                                    />
                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                        <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                                            Click to view fullscreen
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                                    <p className="text-xs text-green-600 dark:text-green-400 text-center">
                                        ✓ Image generated • Cost: <span className="font-bold">${estimatedCostMXN.toFixed(2)} MXN</span>
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleDownload} className="flex-1 bg-gradient-to-br from-cyan-500 to-blue-500 py-3">
                                        <Download className="w-4 h-4 mr-2" />
                                        Download
                                    </Button>
                                    <Button onClick={handleStartNew} variant="ghost" className="btn-glass">
                                        <RefreshCw className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl bg-muted/10 border-2 border-dashed border-muted-foreground/20 aspect-square flex items-center justify-center">
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
                                            <ImageIcon className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                                            <p className="text-sm text-muted-foreground">
                                                Image preview will appear here
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Image Generating Modal */}
            <ImageGeneratingModal
                isOpen={isGenerating}
                progressMessage={progressMessage}
            />

            {/* Fullscreen Image Preview Modal */}
            {generatedImage && (
                <ImagePreviewModal
                    isOpen={isPreviewOpen}
                    onClose={() => setIsPreviewOpen(false)}
                    imageSrc={base64ToDataUrl(generatedImage.base64, generatedImage.mimeType)}
                    onDownload={handleDownload}
                />
            )}

            {/* Style Selector Modal */}
            <StyleSelectorModal
                open={showStyleSelector}
                onClose={() => setShowStyleSelector(false)}
                onSelect={handleStyleSwap}
                currentStyleId={selectedStyle?.id}
            />

            {/* Character Selector Modal */}
            <CharacterSelectorModal
                open={showCharacterSelector}
                onClose={() => setShowCharacterSelector(false)}
                onSelect={handleCharacterSwap}
                currentCharacterId={selectedCharacter?.id}
            />
        </div>
    );
}
