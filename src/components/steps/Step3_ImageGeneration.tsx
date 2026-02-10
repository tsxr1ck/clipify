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
    Wand2,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useApplication, useApiKey } from '@/context/ApplicationContext';
import { stylesService, charactersService, sceneBuilderService, sceneBuilderProService } from '@/services/api';
import type { Style } from '@/services/api/stylesService';
import type { Character } from '@/services/api/charactersService';
import { base64ToDataUrl } from '@/utils/imageProcessing';
import { generateImageWithLogging, buildImagePrompt } from '@/services/api/geminiService';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import { ImageGeneratingModal } from '@/components/shared/ImageGeneratingModal';
import { ImagePreviewModal } from '@/components/shared/ImagePreviewModal';
import { StyleSelectorModal } from '@/components/shared/StyleSelectorModal';
import { CharacterSelectorModal } from '@/components/shared/CharacterSelectorModal';
import { MobileStyleCharacterBar } from './MobileStyleCharacterBar';
import { MobileCostBar } from './MobileCostBar';
import type { AspectRatio } from '@/types';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const aspectRatioOptions: { value: AspectRatio; label: string }[] = [
    { value: '1:1', label: '1:1' },
    { value: '9:16', label: '9:16' },
    { value: '16:9', label: '16:9' },
    { value: '4:3', label: '4:3' },
    { value: '3:4', label: '3:4' },
];

const IMAGEN_COST_PER_IMAGE_USD = 0.075;
const USD_TO_MXN = 17.5;

export function Step3_ImageGeneration() {
    const { user } = useAuth();
    const { state, prevStep, setStep, setSelectedStyle: setGlobalStyleId, setSelectedCharacter: setGlobalCharacterId } = useApplication();
    const { key: apiKey } = useApiKey();

    const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Modal state
    const [showStyleSelector, setShowStyleSelector] = useState(false);
    const [showCharacterSelector, setShowCharacterSelector] = useState(false);

    // AI Scene Builder state
    const [showSceneBuilder, setShowSceneBuilder] = useState(true);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGeneratingScene, setIsGeneratingScene] = useState(false);

    // Pro Builder State
    const [useProBuilder, setUseProBuilder] = useState(false);
    const canUseProBuilder = user?.id === 'fb430091-ddba-4aa7-82d6-228528124087';

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

    const estimatedCostUSD = IMAGEN_COST_PER_IMAGE_USD;
    const estimatedCostMXN = estimatedCostUSD * USD_TO_MXN;

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
                console.error('Failed to load data:', err);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [state.selectedStyleId, state.selectedCharacterId]);

    const handleStyleSwap = (newStyle: Style) => {
        setSelectedStyle(newStyle);
        setGlobalStyleId(newStyle.id);
    };

    const handleCharacterSwap = (newCharacter: Character) => {
        setSelectedCharacter(newCharacter);
        setGlobalCharacterId(newCharacter.id);
    };

    const handleGenerateScene = async () => {
        if (!aiPrompt.trim()) return;
        setIsGeneratingScene(true);
        try {
            const result = useProBuilder
                ? await sceneBuilderProService.generateImageSceneConfig(aiPrompt)
                : await sceneBuilderService.generateImageSceneConfig(aiPrompt);

            setEscena(result.scene.escena);
            let fondoText = result.scene.fondo || '';
            const scene: any = result.scene;
            if (scene.lighting) fondoText += `\n\n[Lighting]: ${scene.lighting}`;
            if (scene.camera) fondoText += `\n[Camera]: ${scene.camera}`;
            if (scene.condicionesFisicas) fondoText += `\n[Physical]: ${scene.condicionesFisicas}`;

            setFondo(fondoText.trim());
            setAccion(result.scene.accion);
            toast.success('Scene configured successfully!');
            setShowSceneBuilder(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to generate scene');
        } finally {
            setIsGeneratingScene(false);
        }
    };

    const isFormValid = Boolean(escena.trim() && accion.trim());

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
            toast.success('Image generated successfully!');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to generate image';
            setError(msg);
            toast.error(msg);
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
        setEscena(''); setFondo(''); setAccion('');
        setAspectRatio('1:1'); setGeneratedImage(null); setError(null);
    };

    if (isLoading) {
        return <div className="w-full h-96 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
    }

    if (!selectedStyle || !selectedCharacter) {
        return (
            <div className="w-full max-w-lg mx-auto text-center py-20 glass rounded-3xl">
                <p className="text-muted-foreground text-lg mb-6">Missing selection data</p>
                <Button onClick={() => setStep(1)} variant="outline">Go Back</Button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto px-4 animate-scaleIn pb-24">
            {/* Header */}
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold gradient-text">Image Generation</h2>
                <p className="text-muted-foreground mt-2">Create stunning visuals in seconds</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Context */}
                <div className="lg:col-span-3 space-y-6">
                    <Card className="glass-card border-none">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">CONTEXT</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            {/* Style */}
                            <div
                                className="group relative rounded-xl overflow-hidden aspect-square cursor-pointer"
                                onClick={() => setShowStyleSelector(true)}
                            >
                                <img src={selectedStyle.referenceImageUrl} alt={selectedStyle.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-xs font-medium text-white flex items-center gap-1"><ArrowRightLeft className="w-3 h-3" /> Change</span>
                                </div>
                                <div className="absolute bottom-2 left-2 right-2">
                                    <span className="text-xs font-bold text-white bg-black/50 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1 w-fit">
                                        <Palette className="w-3 h-3" /> {selectedStyle.name}
                                    </span>
                                </div>
                            </div>

                            {/* Character */}
                            <div
                                className="group relative rounded-xl overflow-hidden aspect-square cursor-pointer"
                                onClick={() => setShowCharacterSelector(true)}
                            >
                                <img src={selectedCharacter.imageUrl} alt={selectedCharacter.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-xs font-medium text-white flex items-center gap-1"><ArrowRightLeft className="w-3 h-3" /> Change</span>
                                </div>
                                <div className="absolute bottom-2 left-2 right-2">
                                    <span className="text-xs font-bold text-white bg-black/50 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1 w-fit">
                                        <User className="w-3 h-3" /> {selectedCharacter.name}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Middle Column: Config */}
                <div className="lg:col-span-5 space-y-6">
                    {/* AI Builder */}
                    <div className="glass p-1 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10">
                        <div className="bg-background/50 backdrop-blur-xl rounded-xl overflow-hidden">
                            <button
                                onClick={() => setShowSceneBuilder(!showSceneBuilder)}
                                className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20">
                                        <Wand2 className="w-4 h-4" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-semibold text-sm">AI Scene Builder</h3>
                                        <p className="text-xs text-muted-foreground">Auto-generate image description</p>
                                    </div>
                                </div>
                                {showSceneBuilder ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            </button>

                            {showSceneBuilder && (
                                <div className="px-5 pb-5 pt-2 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                    {canUseProBuilder && (
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => setUseProBuilder(!useProBuilder)}
                                                className={`text-xs px-3 py-1 rounded-full border transition-all ${useProBuilder
                                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                                                    : 'bg-muted border-border text-muted-foreground'}`}
                                            >
                                                {useProBuilder ? '🔥 Hyper-Realism Active' : 'Enable Hyper-Realism'}
                                            </button>
                                        </div>
                                    )}

                                    <div className="relative">
                                        <Textarea
                                            value={aiPrompt}
                                            onChange={(e) => setAiPrompt(e.target.value)}
                                            placeholder="Describe your image idea..."
                                            className="min-h-[100px] resize-none pr-10 glass-input"
                                        />
                                        <div className="absolute bottom-2 right-2">
                                            <Button
                                                size="sm"
                                                onClick={handleGenerateScene}
                                                disabled={!aiPrompt.trim() || isGeneratingScene}
                                                className="h-8 text-xs bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20 border-cyan-500/20"
                                            >
                                                {isGeneratingScene ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                                                Generate
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Form */}
                    <Card className="glass-card border-none space-y-4 p-6">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                            <ImageIcon className="w-4 h-4" /> Parameters
                        </h3>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs">
                                    Scene Description <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    value={escena} onChange={e => setEscena(e.target.value)}
                                    placeholder="Environment, lighting, atmosphere..."
                                    className="glass-input h-20 text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs">
                                    Action / Pose <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    value={accion} onChange={e => setAccion(e.target.value)}
                                    placeholder="What is the character doing?"
                                    className="glass-input h-16 text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs">Background (Optional)</Label>
                                <Input
                                    value={fondo} onChange={e => setFondo(e.target.value)}
                                    placeholder="Specific background details"
                                    className="glass-input h-9 text-sm"
                                />
                            </div>

                            <div className="space-y-3 pt-2">
                                <Label className="text-xs">Aspect Ratio</Label>
                                <div className="flex gap-2 flex-wrap">
                                    {aspectRatioOptions.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setAspectRatio(opt.value)}
                                            className={`flex-1 min-w-[60px] py-2 rounded-xl text-xs font-medium transition-all ${aspectRatio === opt.value ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'bg-muted/50 hover:bg-muted text-muted-foreground'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleGenerate}
                            disabled={!isFormValid || isGenerating}
                            className="w-full mt-4 bg-gradient-to-br from-cyan-500 to-blue-500 py-6 text-base shadow-xl shadow-cyan-500/20 hover:scale-[1.02] transition-transform"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Generate Image
                                </>
                            )}
                        </Button>
                    </Card>
                </div>

                {/* Right Column: Preview */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="glass-card border-none p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4" /> Cost Estimate</h3>
                        </div>
                        <div className="flex items-end justify-between border-t border-border/50 pt-3">
                            <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground">Est. Cost (MXN)</p>
                                <p className="text-2xl font-bold gradient-text">${estimatedCostMXN.toFixed(2)}</p>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">${estimatedCostUSD.toFixed(3)} USD</p>
                        </div>
                    </Card>

                    <Card className="glass-card border-none p-5 flex flex-col h-fit min-h-[300px]">
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Preview</h3>

                        <div className="flex-1 rounded-xl bg-muted/20 border-2 border-dashed border-muted flex items-center justify-center relative overflow-hidden group min-h-[250px]">
                            {generatedImage ? (
                                <div
                                    className="relative w-full h-full cursor-pointer"
                                    onClick={() => setIsPreviewOpen(true)}
                                >
                                    <img
                                        src={base64ToDataUrl(generatedImage.base64, generatedImage.mimeType)}
                                        alt="Generated"
                                        className="w-full h-full object-contain"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <p className="text-white text-sm font-medium">Click to Expand</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center p-6">
                                    {isGenerating ? (
                                        <div className="space-y-3">
                                            <Loader2 className="w-10 h-10 animate-spin text-cyan-500 mx-auto" />
                                            <p className="text-sm text-foreground font-medium animate-pulse">{progressMessage || "Creating art..."}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <ImageIcon className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                                            <p className="text-sm text-muted-foreground">Image preview</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {generatedImage && (
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <Button onClick={handleDownload} variant="outline" className="w-full">
                                    <Download className="w-4 h-4 mr-2" /> Save
                                </Button>
                                <Button onClick={handleStartNew} variant="ghost" className="w-full">
                                    <RefreshCw className="w-4 h-4 mr-2" /> New
                                </Button>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            <ImageGeneratingModal isOpen={isGenerating} progressMessage={progressMessage} />

            {/* Mobile Actions */}
            <MobileStyleCharacterBar
                style={selectedStyle}
                character={selectedCharacter}
                onChangeStyle={() => setShowStyleSelector(true)}
                onChangeCharacter={() => setShowCharacterSelector(true)}
            />

            <MobileCostBar
                cost={estimatedCostMXN}
                isValid={isFormValid}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
            />

            {generatedImage && (
                <ImagePreviewModal
                    isOpen={isPreviewOpen}
                    onClose={() => setIsPreviewOpen(false)}
                    imageSrc={base64ToDataUrl(generatedImage.base64, generatedImage.mimeType)}
                    onDownload={handleDownload}
                />
            )}

            <StyleSelectorModal open={showStyleSelector} onClose={() => setShowStyleSelector(false)} onSelect={handleStyleSwap} currentStyleId={selectedStyle?.id} />
            <CharacterSelectorModal open={showCharacterSelector} onClose={() => setShowCharacterSelector(false)} onSelect={handleCharacterSwap} currentCharacterId={selectedCharacter?.id} />
        </div>
    );
}
