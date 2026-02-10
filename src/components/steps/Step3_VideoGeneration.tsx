import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
    ArrowRightLeft,
    Wand2,
    ChevronDown,
    ChevronUp,
    Film,
    BookOpen,
    Import,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { useApplication } from '@/context/ApplicationContext';
import { useAuth } from '@/context/AuthContext';
import { stylesService, charactersService, generateSceneConfig, generateStoryConfig, calculateStoryCost, sceneBuilderProService } from '@/services/api';
import type { Style } from '@/services/api/stylesService';
import type { Character } from '@/services/api/charactersService';
import type { SceneBuilderResult, StorySegment } from '@/services/api/sceneBuilderService';
import { base64ToDataUrl } from '@/utils/imageProcessing';
import {
    checkVeoAccess,
    generateVideoWithLogging,
    buildVideoPrompt,
} from '@/services/api/geminiService';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import { VideoGeneratingModal } from '@/components/shared/VideoGeneratingModal';
import { StyleSelectorModal } from '@/components/shared/StyleSelectorModal';
import { CharacterSelectorModal } from '@/components/shared/CharacterSelectorModal';
import { MobileStyleCharacterBar } from './MobileStyleCharacterBar';
import { MobileCostBar } from './MobileCostBar';
import type { VideoDuration } from '@/types';
import { PRICING } from '@/config/constants';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

type BuilderMode = 'scene' | 'story';

interface LocationState {
    generatedScene?: SceneBuilderResult;
    generatedStory?: {
        title: string;
        description: string;
        segments: StorySegment[];
    };
}

const durationOptions: { value: VideoDuration; label: string }[] = [
    { value: 2, label: '2s' },
    { value: 4, label: '4s' },
    { value: 6, label: '6s' },
    { value: 8, label: '8s' },
];

const USD_TO_MXN = 17.5;

export function Step3_VideoGeneration() {
    const { user } = useAuth();
    const { state, prevStep, setStep, setSelectedStyle: setGlobalStyleId, setSelectedCharacter: setGlobalCharacterId } = useApplication();
    const location = useLocation();

    // Style and character from API
    const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

    // Modal state for swapping
    const [showStyleSelector, setShowStyleSelector] = useState(false);
    const [showCharacterSelector, setShowCharacterSelector] = useState(false);
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

    // AI Scene/Story Builder state
    const [builderMode, setBuilderMode] = useState<BuilderMode>('scene');
    const [segmentCount, setSegmentCount] = useState(3);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGeneratingScene, setIsGeneratingScene] = useState(false);
    const [sceneBuilderOpen, setSceneBuilderOpen] = useState(true);
    const [sceneBuilderError, setSceneBuilderError] = useState<string | null>(null);
    const [lastSceneCost, setLastSceneCost] = useState<number | null>(null);

    // Story mode state
    const [storySegments, setStorySegments] = useState<StorySegment[]>([]);
    const [storyTitle, setStoryTitle] = useState('');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);

    // Import Story State
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [showImportModal, setShowImportModal] = useState(false);
    const [importJson, setImportJson] = useState('');
    const [importError, setImportError] = useState<string | null>(null);

    // Pro Builder State
    const [useProBuilder, setUseProBuilder] = useState(false);
    const canUseProBuilder = user?.id === 'fb430091-ddba-4aa7-82d6-228528124087';

    // Handle route state
    useEffect(() => {
        const routeState = location.state as LocationState | undefined;
        if (routeState?.generatedScene) {
            const scene = routeState.generatedScene;
            setEscena(scene.escena);
            setFondo(scene.fondo || '');
            setAccion(scene.accion);
            setDialogo(scene.dialogo);
            setVoiceStyle(scene.voiceStyle || '');
            setMovimiento(scene.movimiento || '');
            setDuration(scene.suggestedDuration);
            setSceneBuilderOpen(false);
            window.history.replaceState({}, document.title);
        } else if (routeState?.generatedStory) {
            const story = routeState.generatedStory;
            setBuilderMode('story');
            setStoryTitle(story.title);
            setStorySegments(story.segments);
            setCurrentSegmentIndex(0);
            setSceneBuilderOpen(false);
            if (story.segments.length > 0) {
                const firstSeg = story.segments[0];
                setEscena(firstSeg.escena);
                setFondo(firstSeg.fondo || '');
                setAccion(firstSeg.accion);
                setDialogo(firstSeg.dialogo);
                setVoiceStyle(firstSeg.voiceStyle || '');
                setMovimiento(firstSeg.movimiento || '');
                setDuration(8);
            }
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Timer
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

    const estimatedCostMXN = duration * PRICING.VIDEO_PER_SECOND;
    const estimatedCostUSD = estimatedCostMXN / USD_TO_MXN;

    // Load data
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

    // Check Veo
    useEffect(() => {
        async function checkAccess() {
            const available = await checkVeoAccess();
            setVeoAvailable(available);
            setIsCheckingVeo(false);
        }
        checkAccess();
    }, []);

    const isFormValid = Boolean(escena.trim() && accion.trim() && dialogo.trim());

    // Handlers
    const handleGenerateScene = async () => {
        if (!aiPrompt.trim()) return;
        setIsGeneratingScene(true);
        setSceneBuilderError(null);
        setLastSceneCost(null);

        try {
            const result = useProBuilder
                ? await sceneBuilderProService.generateSceneConfig(aiPrompt.trim())
                : await generateSceneConfig(aiPrompt.trim());

            setEscena(result.scene.escena);
            let fondoText = result.scene.fondo || '';
            if (result.scene.condicionesFisicas) fondoText += `\n\n[Physical]: ${result.scene.condicionesFisicas}`;
            if (result.scene.contextoInvisible) fondoText += `\n[Context]: ${result.scene.contextoInvisible}`;
            setFondo(fondoText);
            setAccion(result.scene.accion);
            setDialogo(result.scene.dialogo);
            setVoiceStyle(result.scene.voiceStyle || '');
            let movimientoText = result.scene.movimiento || '';
            if (result.scene.defectosTecnicos) movimientoText += `\n[Defects]: ${result.scene.defectosTecnicos}`;
            setMovimiento(movimientoText);
            setDuration(result.scene.suggestedDuration);
            setLastSceneCost(result.costMXN);
            setSceneBuilderOpen(false);
            toast.success('Scene configured successfully!');
        } catch (err) {
            setSceneBuilderError(err instanceof Error ? err.message : 'Failed to generate scene');
        } finally {
            setIsGeneratingScene(false);
        }
    };

    const handleGenerateStory = async () => {
        if (!aiPrompt.trim()) return;
        setIsGeneratingScene(true);
        setSceneBuilderError(null);
        setLastSceneCost(null);
        setStorySegments([]);

        try {
            const result = useProBuilder
                ? await sceneBuilderProService.generateStoryConfig(aiPrompt.trim(), segmentCount)
                : await generateStoryConfig(aiPrompt.trim(), segmentCount);

            setStoryTitle(result.storyTitle);
            setStorySegments(result.segments);
            setCurrentSegmentIndex(0);
            setLastSceneCost(result.costMXN);

            if (result.segments.length > 0) {
                const firstSeg = result.segments[0];
                setEscena(firstSeg.escena);
                let fondoText = firstSeg.fondo || '';
                if (firstSeg.condicionesFisicas) fondoText += `\n\n[Physical]: ${firstSeg.condicionesFisicas}`;
                setFondo(fondoText);
                setAccion(firstSeg.accion);
                setDialogo(firstSeg.dialogo);
                setVoiceStyle(firstSeg.voiceStyle || '');
                setMovimiento(firstSeg.movimiento || '');
                setDuration(8);
            }
            toast.success('Story generated successfully!');
        } catch (err) {
            setSceneBuilderError(err instanceof Error ? err.message : 'Failed to generate story');
        } finally {
            setIsGeneratingScene(false);
        }
    };

    const handleImportStory = () => {
        if (!importJson.trim()) return;
        try {
            const parsed = JSON.parse(importJson);
            if (!parsed.segments || !Array.isArray(parsed.segments) || parsed.segments.length === 0) {
                throw new Error('Invalid JSON: Segments missing or empty.');
            }
            setStoryTitle(parsed.storyTitle || 'Imported Story');
            setStorySegments(parsed.segments);
            setLastSceneCost(parsed.costMXN || null);
            setBuilderMode('story');
            setSegmentCount(parsed.segments.length);
            setCurrentSegmentIndex(0);

            const firstSeg = parsed.segments[0];
            setEscena(firstSeg.escena || '');
            setFondo(firstSeg.fondo || '');
            setAccion(firstSeg.accion || '');
            setDialogo(firstSeg.dialogo || '');
            setVoiceStyle(firstSeg.voiceStyle || '');
            setMovimiento(firstSeg.movimiento || '');
            setDuration(firstSeg.suggestedDuration || 8);

            setShowImportModal(false);
            setImportJson('');
            setImportError(null);
            setSceneBuilderOpen(false);
            toast.success('Story imported successfully!');
        } catch (err) {
            setImportError(err instanceof Error ? err.message : 'Failed to parse JSON');
            toast.error('Failed to import story');
        }
    };

    const handleGenerate = async () => {
        if (!selectedStyle || !selectedCharacter || !isFormValid) return;
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

            // Fetch image as base64
            const imageResponse = await fetch(selectedCharacter.imageUrl);
            const imageBlob = await imageResponse.blob();
            const imageBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve((reader.result as string).split(',')[1]);
                };
                reader.readAsDataURL(imageBlob);
            });

            const result = await generateVideoWithLogging(
                imageBase64,
                prompt,
                duration,
                {
                    styleId: selectedStyle.id,
                    characterId: selectedCharacter.id,
                    title: `Video: ${selectedCharacter.name} - ${accion.substring(0, 30)}`,
                    sceneConfig: { escena, fondo, accion, dialogo, voiceStyle, movimiento, duration }
                },
                (message) => setProgressMessage(message)
            );

            setGeneratedVideo({
                base64: result.videoBase64,
                mimeType: result.mimeType,
                costMXN: result.costMXN,
            });

            // Use audio safely
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => { }); // Ignore interaction error

            toast.success('Video generated successfully!');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to generate video';
            setError(msg);
            if (msg.toLowerCase().includes('high load') || msg.includes('code":8')) {
                toast.error('Veo is constantly high demand! Please try again later.', {
                    icon: <Sparkles className="w-5 h-5 text-purple-500" />,
                    duration: 6000
                });
            } else {
                toast.error(msg);
            }
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
        link.href = selectedCharacter.imageUrl;
        link.download = `${selectedCharacter.name.replace(/\s+/g, '-')}.png`;
        link.target = '_blank';
        link.click();
    };

    const handleStartNew = () => {
        setEscena(''); setFondo(''); setAccion(''); setDialogo(''); setVoiceStyle(''); setMovimiento('');
        setDuration(4); setGeneratedVideo(null); setError(null);
    };

    const handleStyleSwap = (newStyle: Style) => {
        setSelectedStyle(newStyle);
        setGlobalStyleId(newStyle.id);
    };

    const handleCharacterSwap = (newCharacter: Character) => {
        setSelectedCharacter(newCharacter);
        setGlobalCharacterId(newCharacter.id);
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
                <h2 className="text-3xl font-bold gradient-text">Video Generation</h2>
                <p className="text-muted-foreground mt-2">Bring your creative vision to life</p>
            </div>

            {/* Veo Unavailable Warning */}
            {!isCheckingVeo && !veoAvailable && (
                <div className="max-w-3xl mx-auto mb-8 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row gap-4">
                    <div className="p-3 bg-amber-500/20 rounded-full h-fit"><AlertTriangle className="w-6 h-6 text-amber-500" /></div>
                    <div>
                        <h3 className="font-semibold text-amber-600 dark:text-amber-400 text-lg">Veo Access Required</h3>
                        <p className="text-amber-600/80 dark:text-amber-400/80 mt-1 mb-4">
                            Video generation is currently restricted. You can still download your character assets.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Button size="sm" onClick={handleDownloadCharacter} variant="outline" className="text-amber-600 border-amber-500/30 hover:bg-amber-500/10">
                                <Download className="w-4 h-4 mr-2" /> Download Character
                            </Button>
                            <Button size="sm" asChild variant="link" className="text-amber-600">
                                <a href="https://deepmind.google/technologies/veo/" target="_blank" rel="noopener noreferrer">Apply for Access →</a>
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Grid */}
            {(veoAvailable === true || isCheckingVeo) && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Context (Style/Character) */}
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

                    {/* Middle Column: Configuration */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* AI Builder Section */}
                        <div className="glass p-1 rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10">
                            <div className="bg-background/50 backdrop-blur-xl rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setSceneBuilderOpen(!sceneBuilderOpen)}
                                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/20">
                                            <Wand2 className="w-4 h-4" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-semibold text-sm">AI Scene Builder</h3>
                                            <p className="text-xs text-muted-foreground">Auto-generate cinematic prompts</p>
                                        </div>
                                    </div>
                                    {sceneBuilderOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                                </button>

                                {sceneBuilderOpen && (
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

                                        <div className="flex justify-center gap-2 p-1 bg-muted/50 rounded-lg w-fit mx-auto">
                                            <button
                                                onClick={() => setBuilderMode('scene')}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${builderMode === 'scene' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                            >Scene Mode</button>
                                            <button
                                                onClick={() => setBuilderMode('story')}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${builderMode === 'story' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                            >Story Mode</button>
                                        </div>

                                        <div className="relative">
                                            <Textarea
                                                value={aiPrompt}
                                                onChange={(e) => setAiPrompt(e.target.value)}
                                                placeholder={builderMode === 'scene' ? "Describe your scene..." : "Describe your story plot..."}
                                                className="min-h-[100px] resize-none pr-10 glass-input"
                                            />
                                            <div className="absolute bottom-2 right-2">
                                                <Button
                                                    size="sm"
                                                    onClick={builderMode === 'scene' ? handleGenerateScene : handleGenerateStory}
                                                    disabled={!aiPrompt.trim() || isGeneratingScene}
                                                    className="h-8 text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 backdrop-blur-sm"
                                                >
                                                    {isGeneratingScene ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                                                    Generate
                                                </Button>
                                            </div>
                                        </div>

                                        {builderMode === 'story' && (
                                            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                                                <span>Segments:</span>
                                                <div className="flex gap-1">
                                                    {[2, 3, 4, 5, 6].map(n => (
                                                        <button
                                                            key={n}
                                                            onClick={() => setSegmentCount(n)}
                                                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${segmentCount === n ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                                                        >
                                                            {n}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => setShowImportModal(true)}
                                                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                                            >
                                                <Import className="w-3 h-3" /> Import JSON
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Parameters Form */}
                        <Card className="glass-card border-none space-y-4 p-6">
                            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                                <Film className="w-4 h-4" /> Parameters
                            </h3>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">
                                        Scene Description <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        value={escena} onChange={e => setEscena(e.target.value)}
                                        placeholder="Detailed description of the environment..."
                                        className="glass-input h-20 text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Action <span className="text-destructive">*</span></Label>
                                        <Input
                                            value={accion} onChange={e => setAccion(e.target.value)}
                                            placeholder="What happens?"
                                            className="glass-input h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Dialogue <span className="text-destructive">*</span></Label>
                                        <Input
                                            value={dialogo} onChange={e => setDialogo(e.target.value)}
                                            placeholder="Spoken text..."
                                            className="glass-input h-9 text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">Secondary Details (Optional)</Label>
                                    <Textarea
                                        value={fondo} onChange={e => setFondo(e.target.value)}
                                        placeholder="Background details, lighting, camera angles..."
                                        className="glass-input h-16 text-sm"
                                    />
                                </div>

                                <div className="space-y-3 pt-2">
                                    <Label className="text-xs">Duration</Label>
                                    <div className="flex gap-2">
                                        {durationOptions.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setDuration(opt.value)}
                                                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${duration === opt.value ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted/50 hover:bg-muted text-muted-foreground'}`}
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
                                className="w-full mt-4 btn-gradient py-6 text-base shadow-xl shadow-primary/20"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5 mr-2" />
                                        Generate Video
                                    </>
                                )}
                            </Button>
                        </Card>
                    </div>

                    {/* Right Column: Preview & Status */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Cost Card */}
                        <Card className="glass-card border-none p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4" /> Cost Estimate</h3>
                                <div className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium">USD base</div>
                            </div>
                            <div className="flex items-end justify-between border-t border-border/50 pt-3">
                                <div className="space-y-0.5">
                                    <p className="text-xs text-muted-foreground">Est. Cost (MXN)</p>
                                    <p className="text-2xl font-bold gradient-text">${estimatedCostMXN.toFixed(2)}</p>
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">${estimatedCostUSD.toFixed(2)} USD</p>
                            </div>
                        </Card>

                        {/* Preview Card */}
                        <Card className="glass-card border-none p-5 flex flex-col h-fit min-h-[300px]">
                            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Film className="w-4 h-4" /> Preview</h3>

                            <div className="flex-1 rounded-xl bg-black/5 dark:bg-black/40 border-2 border-dashed border-muted flex items-center justify-center relative overflow-hidden group">
                                {generatedVideo ? (
                                    <div className="relative w-full h-full p-2">
                                        <video
                                            src={base64ToDataUrl(generatedVideo.base64, generatedVideo.mimeType)}
                                            controls
                                            className="w-full h-full rounded-lg object-contain bg-black"
                                            autoPlay
                                            loop
                                        />
                                        <div className="absolute top-4 right-4 flex gap-2">
                                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 text-white" onClick={handleDownload}>
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center p-6">
                                        {isGenerating ? (
                                            <div className="space-y-3">
                                                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                                                <p className="text-sm text-foreground font-medium animate-pulse">{progressMessage || "Processing..."}</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                                                    <Video className="w-6 h-6 text-muted-foreground" />
                                                </div>
                                                <p className="text-sm text-muted-foreground">Generated video will appear here</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {generatedVideo && (
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
            )}

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

            {/* Modals */}
            <VideoGeneratingModal isOpen={isGenerating} progressMessage={progressMessage} elapsedTime={elapsedTime} />
            <StyleSelectorModal open={showStyleSelector} onClose={() => setShowStyleSelector(false)} onSelect={handleStyleSwap} currentStyleId={selectedStyle?.id} />
            <CharacterSelectorModal open={showCharacterSelector} onClose={() => setShowCharacterSelector(false)} onSelect={handleCharacterSwap} currentCharacterId={selectedCharacter?.id} />

            <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Import Story JSON</DialogTitle>
                        <DialogDescription>Paste your structured story JSON to auto-populate the wizard.</DialogDescription>
                    </DialogHeader>
                    <Textarea
                        value={importJson} onChange={e => setImportJson(e.target.value)}
                        placeholder='{ "storyTitle": "...", "segments": [...] }'
                        className="h-48 font-mono text-xs"
                    />
                    {importError && <p className="text-xs text-destructive">{importError}</p>}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowImportModal(false)}>Cancel</Button>
                        <Button onClick={handleImportStory}>Import</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
