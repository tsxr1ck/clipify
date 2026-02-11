import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Video,
    Loader2,
    Download,
    AlertTriangle,
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
    ImagePlus,
    Link2,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
import { stylesService, charactersService, generateSceneConfig, generateStoryConfig, sceneBuilderProService } from '@/services/api';
import type { Style } from '@/services/api/stylesService';
import type { Character } from '@/services/api/charactersService';
import type { SceneBuilderResult, StorySegment } from '@/services/api/sceneBuilderService';
import { base64ToDataUrl } from '@/utils/imageProcessing';
import {
    checkVeoAccess,
    generateVideoWithLogging,
    buildVideoPrompt,
    generateStoryVideoChain,
    type StorySegmentInput,
} from '@/services/api/geminiService';
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
    const { state, setStep, setSelectedStyle: setGlobalStyleId, setSelectedCharacter: setGlobalCharacterId } = useApplication();
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

    // Unified Segments state (used for BOTH single scene and multi-segment story)
    const [storySegments, setStorySegments] = useState<StorySegment[]>([]);

    // Generation state per segment index
    const [generatingIndices, setGeneratingIndices] = useState<Set<number>>(new Set());
    const [generatedVideos, setGeneratedVideos] = useState<Record<number, {
        base64: string;
        mimeType: string;
        costMXN?: number;
    }>>({});
    const [error, setError] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState<string>('');
    const [elapsedTime, setElapsedTime] = useState(0);

    // AI Scene/Story Builder state
    const [builderMode, setBuilderMode] = useState<BuilderMode>('scene');
    const [segmentCount, setSegmentCount] = useState(3);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGeneratingScene, setIsGeneratingScene] = useState(false);
    const [sceneBuilderOpen, setSceneBuilderOpen] = useState(true);

    // Import Story State
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [showImportModal, setShowImportModal] = useState(false);
    const [importJson, setImportJson] = useState('');
    const [importError, setImportError] = useState<string | null>(null);

    // Chain mode — TEST: extends each segment from previous video for continuity
    const [chainMode, setChainMode] = useState(false);

    // Pro Builder State
    const [useProBuilder, setUseProBuilder] = useState(false);
    const canUseProBuilder = user?.id === 'fb430091-ddba-4aa7-82d6-228528124087';

    // Handle route state & default initialization
    useEffect(() => {
        const routeState = location.state as LocationState | undefined;

        if (routeState?.generatedScene) {
            const scene = routeState.generatedScene;
            setStorySegments([{
                segmentNumber: 1,
                title: 'Scene 1',
                escena: scene.escena,
                fondo: scene.fondo || '',
                accion: scene.accion,
                dialogo: scene.dialogo,
                voiceStyle: scene.voiceStyle || '',
                movimiento: scene.movimiento || '',
                suggestedDuration: scene.suggestedDuration || 4
            }]);
            setSceneBuilderOpen(false);
            window.history.replaceState({}, document.title);
        } else if (routeState?.generatedStory) {
            const story = routeState.generatedStory;
            setBuilderMode('story');
            setStorySegments(story.segments);
            setSceneBuilderOpen(false);
            window.history.replaceState({}, document.title);
        } else if (storySegments.length === 0) {
            // Default empty segment
            setStorySegments([{
                segmentNumber: 1,
                title: 'Scene 1',
                escena: '',
                fondo: '',
                accion: '',
                dialogo: '',
                voiceStyle: '',
                movimiento: '',
                suggestedDuration: 8
            }]);
        }
    }, [location.state]);

    // Timer
    useEffect(() => {
        if (generatingIndices.size === 0) {
            setElapsedTime(0);
            return;
        }
        const interval = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [generatingIndices.size]);

    // Cost Estimates
    const totalDuration = storySegments.reduce((sum, seg) => sum + (seg.suggestedDuration || 8), 0);
    const estimatedCostMXN = totalDuration * PRICING.VIDEO_PER_SECOND;
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
    useEffect(() => {
        console.log(error)
    }, [error])
    // Handlers
    const handleGenerateScene = async () => {
        if (!aiPrompt.trim()) return;
        setIsGeneratingScene(true);

        try {
            const result = useProBuilder
                ? await sceneBuilderProService.generateSceneConfig(aiPrompt.trim())
                : await generateSceneConfig(aiPrompt.trim());

            setStorySegments([{
                segmentNumber: 1,
                title: 'Scene 1',
                escena: result.scene.escena,
                fondo: result.scene.fondo || '',
                accion: result.scene.accion,
                dialogo: result.scene.dialogo,
                voiceStyle: result.scene.voiceStyle || '',
                movimiento: result.scene.movimiento || '',
                suggestedDuration: result.scene.suggestedDuration
            }]);
            setSceneBuilderOpen(false);
            toast.success('Scene configured successfully!');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to generate scene');
        } finally {
            setIsGeneratingScene(false);
        }
    };

    const handleGenerateStory = async () => {
        if (!aiPrompt.trim()) return;
        setIsGeneratingScene(true);
        try {
            const result = await generateStoryConfig(aiPrompt.trim(), segmentCount);
            setStorySegments(result.segments);
            setSceneBuilderOpen(false);
            toast.success('Story configured successfully!');
        } catch (err) {
            // Error handled by UI/Toast
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
            setStorySegments(parsed.segments);
            setBuilderMode('story');
            setSegmentCount(parsed.segments.length);

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

    const updateSegment = (index: number, updates: Partial<StorySegment>) => {
        setStorySegments(prev => prev.map((seg, i) =>
            i === index ? { ...seg, ...updates } : seg
        ));
    };

    const handleGenerate = async (index: number) => {
        const segment = storySegments[index];
        if (!selectedStyle || !selectedCharacter || !segment) return;
        if (!segment.escena.trim() || !segment.accion.trim() || !segment.dialogo.trim()) {
            toast.error(`Please fill all required fields for Segment ${index + 1}`);
            return;
        }

        setGeneratingIndices(prev => {
            const next = new Set(prev);
            next.add(index);
            return next;
        });
        setError(null);
        setProgressMessage(`Generating Segment ${index + 1}...`);

        try {
            const prompt = buildVideoPrompt(
                segment.escena.trim(),
                segment.fondo?.trim() || undefined,
                segment.accion.trim(),
                segment.dialogo.trim(),
                segment.voiceStyle?.trim() || undefined,
                segment.movimiento?.trim() || undefined,
                selectedStyle.keywords,
                selectedStyle.parsedStyle,
                selectedCharacter.prompt,
                segment.suggestedDuration || 8
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
                segment.suggestedDuration || 8,
                {
                    styleId: selectedStyle.id,
                    characterId: selectedCharacter.id,
                    title: `Video: ${selectedCharacter.name} - ${segment.accion.substring(0, 30)}`,
                    sceneConfig: {
                        ...segment,
                        duration: segment.suggestedDuration || 8
                    },
                    useReferenceImage: segment.useReferenceImage,
                    referenceImageBase64: segment.referenceImageBase64
                },
                (message) => setProgressMessage(message)
            );

            setGeneratedVideos(prev => ({
                ...prev,
                [index]: {
                    base64: result.videoBase64,
                    mimeType: result.mimeType,
                    costMXN: result.costMXN,
                }
            }));

            // Use audio safely
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => { }); // Ignore interaction error

            toast.success(`Segment ${index + 1} generated successfully!`);
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
            setGeneratingIndices(prev => {
                const next = new Set(prev);
                next.delete(index);
                return next;
            });
        }
    };

    const handleGenerateAll = async () => {
        if (chainMode) {
            return handleGenerateAllChained();
        }
        for (let i = 0; i < storySegments.length; i++) {
            await handleGenerate(i);
        }
    };

    /**
     * TEST — Chained generation: segment 1 generated normally,
     * segments 2+ extend from the previous segment's video for continuity.
     */
    const handleGenerateAllChained = async () => {
        if (!selectedStyle || !selectedCharacter) return;

        // Validate all segments
        for (let i = 0; i < storySegments.length; i++) {
            const seg = storySegments[i];
            if (!seg.escena.trim() || !seg.accion.trim() || !seg.dialogo.trim()) {
                toast.error(`Please fill all required fields for Segment ${i + 1}`);
                return;
            }
        }

        // Mark all as generating
        setGeneratingIndices(new Set(storySegments.map((_, i) => i)));
        setError(null);
        setProgressMessage('Preparing chained generation...');

        try {
            // Build segment inputs with full prompts
            const segmentInputs: StorySegmentInput[] = storySegments.map((segment, index) => ({
                segmentNumber: index + 1,
                title: segment.title || `Segment ${index + 1}`,
                prompt: buildVideoPrompt(
                    segment.escena.trim(),
                    segment.fondo?.trim() || undefined,
                    segment.accion.trim(),
                    segment.dialogo.trim(),
                    segment.voiceStyle?.trim() || undefined,
                    segment.movimiento?.trim() || undefined,
                    selectedStyle.keywords,
                    selectedStyle.parsedStyle,
                    selectedCharacter.prompt,
                    segment.suggestedDuration || 8
                ),
            }));

            // Use reference image for first segment if available
            let firstSegmentImage: string | undefined;
            const firstSeg = storySegments[0];
            if (firstSeg.useReferenceImage && firstSeg.referenceImageBase64) {
                firstSegmentImage = firstSeg.referenceImageBase64;
            }

            await generateStoryVideoChain(
                segmentInputs,
                firstSegmentImage,
                (segNum, title) => {
                    setProgressMessage(`${segNum > 1 ? '(Extending) ' : ''}Generating Segment ${segNum}: ${title}...`);
                },
                (result) => {
                    const idx = result.segmentNumber - 1;
                    setGeneratedVideos(prev => ({
                        ...prev,
                        [idx]: {
                            base64: result.videoBase64,
                            mimeType: result.mimeType,
                            costMXN: result.costMXN,
                        }
                    }));
                    setGeneratingIndices(prev => {
                        const next = new Set(prev);
                        next.delete(idx);
                        return next;
                    });
                    toast.success(`Segment ${result.segmentNumber} generated${result.wasExtended ? ' (extended from previous)' : ''}!`);
                }
            );

            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});

            toast.success('All segments generated with chained continuity!');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to generate chained video';
            setError(msg);
            toast.error(msg);
        } finally {
            setGeneratingIndices(new Set());
        }
    };

    const handleDownload = (index: number) => {
        const video = generatedVideos[index];
        if (!video) return;
        const link = document.createElement('a');
        link.href = base64ToDataUrl(video.base64, video.mimeType);
        link.download = `clipify-video-seg-${index + 1}-${Date.now()}.mp4`;
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
        setStorySegments([]);
        setGeneratedVideos({});
        setError(null);
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
                        <div className="glass p-1 rounded-2xl bg-linear-to-br from-primary/10 to-purple-500/10">
                            <div className="bg-background/50 backdrop-blur-xl rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setSceneBuilderOpen(!sceneBuilderOpen)}
                                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-linear-to-br from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/20">
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

                        {/* Parameters Forms */}
                        <div className="space-y-8">
                            {storySegments.length === 0 && (
                                <Card className="glass-card border-none p-12 text-center">
                                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                        <BookOpen className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="font-semibold text-lg mb-2">No segments yet</h3>
                                    <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                                        Use the AI Scene Builder above to generate your first scene or story.
                                    </p>
                                </Card>
                            )}

                            {storySegments.map((segment, index) => (
                                <Card key={index} className="glass-card border-none space-y-4 p-6 relative overflow-hidden group">
                                    {storySegments.length > 1 && (
                                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                                    )}

                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                            <Film className="w-4 h-4" />
                                            {storySegments.length > 1 ? `Segment ${index + 1}: ${segment.title || 'Untitled'}` : 'Parameters'}
                                        </h3>
                                        {generatedVideos[index] && (
                                            <div className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 font-bold uppercase tracking-wider">
                                                Generated
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">
                                                Scene Description <span className="text-destructive">*</span>
                                            </Label>
                                            <Textarea
                                                value={segment.escena}
                                                onChange={e => updateSegment(index, { escena: e.target.value })}
                                                placeholder="Detailed description of the environment..."
                                                className="glass-input h-20 text-sm"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Action <span className="text-destructive">*</span></Label>
                                                <Input
                                                    value={segment.accion}
                                                    onChange={e => updateSegment(index, { accion: e.target.value })}
                                                    placeholder="What happens?"
                                                    className="glass-input h-9 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Dialogue <span className="text-destructive">*</span></Label>
                                                <Input
                                                    value={segment.dialogo}
                                                    onChange={e => updateSegment(index, { dialogo: e.target.value })}
                                                    placeholder="Spoken text..."
                                                    className="glass-input h-9 text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Secondary Details (Optional)</Label>
                                            <Textarea
                                                value={segment.fondo}
                                                onChange={e => updateSegment(index, { fondo: e.target.value })}
                                                placeholder="Background details, lighting, camera angles..."
                                                className="glass-input h-16 text-sm"
                                            />
                                        </div>

                                        <Separator className="bg-border/50" />

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <Label className="text-xs font-semibold">Reference Image</Label>
                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Recommended for better results</p>
                                                </div>
                                                <Switch
                                                    checked={segment.useReferenceImage}
                                                    onCheckedChange={(checked) => updateSegment(index, { useReferenceImage: checked })}
                                                />
                                            </div>

                                            {segment.useReferenceImage && (
                                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <div className="relative group/upload">
                                                        {segment.referenceImageBase64 ? (
                                                            <div className="relative rounded-xl overflow-hidden aspect-video border border-border/50 group/preview">
                                                                <img
                                                                    src={`data:image/png;base64,${segment.referenceImageBase64}`}
                                                                    alt="Reference"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="secondary"
                                                                        className="h-8 text-[10px] font-bold uppercase tracking-widest"
                                                                        onClick={() => {
                                                                            const input = document.getElementById(`ref-image-${index}`) as HTMLInputElement;
                                                                            input?.click();
                                                                        }}
                                                                    >
                                                                        Change
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        className="h-8 text-[10px] font-bold uppercase tracking-widest"
                                                                        onClick={() => updateSegment(index, { referenceImageBase64: undefined })}
                                                                    >
                                                                        Remove
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    const input = document.getElementById(`ref-image-${index}`) as HTMLInputElement;
                                                                    input?.click();
                                                                }}
                                                                className="w-full aspect-video rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 group/btn"
                                                            >
                                                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                                                                    <ImagePlus className="w-5 h-5 text-muted-foreground group-hover/btn:text-primary" />
                                                                </div>
                                                                <div className="text-center">
                                                                    <p className="text-xs font-semibold">Upload Reference Image</p>
                                                                    <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG up to 10MB</p>
                                                                </div>
                                                            </button>
                                                        )}
                                                        <input
                                                            id={`ref-image-${index}`}
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;
                                                                if (file.size > 10 * 1024 * 1024) {
                                                                    toast.error('Image too large (max 10MB)');
                                                                    return;
                                                                }

                                                                const reader = new FileReader();
                                                                reader.onloadend = () => {
                                                                    const base64 = (reader.result as string).split(',')[1];
                                                                    updateSegment(index, { referenceImageBase64: base64 });
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3 pt-2">
                                            <Label className="text-xs">Duration</Label>
                                            <div className="flex gap-2">
                                                {durationOptions.map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => updateSegment(index, { suggestedDuration: opt.value })}
                                                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${segment.suggestedDuration === opt.value ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted/50 hover:bg-muted text-muted-foreground'}`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => handleGenerate(index)}
                                        disabled={!segment.escena.trim() || !segment.accion.trim() || generatingIndices.has(index)}
                                        className="w-full mt-4 btn-gradient py-6 text-base shadow-xl shadow-primary/20"
                                    >
                                        {generatingIndices.has(index) ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                Generating Segment {index + 1}...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-5 h-5 mr-2" />
                                                {generatedVideos[index] ? 'Regenerate Segment' : `Generate Segment ${index + 1}`}
                                            </>
                                        )}
                                    </Button>
                                </Card>
                            ))}

                            {storySegments.length > 1 && (
                                <div className="space-y-3">
                                    {/* Chain Mode Toggle */}
                                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/50">
                                        <div className="flex items-center gap-2">
                                            <Link2 className={`w-4 h-4 ${chainMode ? 'text-primary' : 'text-muted-foreground'}`} />
                                            <div>
                                                <Label className="text-xs font-semibold cursor-pointer" htmlFor="chain-toggle">Chain Mode</Label>
                                                <p className="text-[10px] text-muted-foreground">Each segment extends from the previous video</p>
                                            </div>
                                        </div>
                                        <Switch
                                            id="chain-toggle"
                                            checked={chainMode}
                                            onCheckedChange={setChainMode}
                                        />
                                    </div>

                                    <Button
                                        onClick={handleGenerateAll}
                                        disabled={generatingIndices.size > 0}
                                        variant="outline"
                                        className={`w-full py-8 text-lg border-2 border-dashed rounded-2xl transition-all ${chainMode
                                            ? 'border-primary/40 hover:border-primary/60 hover:bg-primary/10'
                                            : 'border-primary/20 hover:border-primary/40 hover:bg-primary/5'
                                        }`}
                                    >
                                        {chainMode
                                            ? <><Link2 className="w-6 h-6 mr-3 text-primary" /> Generate All (Chained)</>
                                            : <><Sparkles className="w-6 h-6 mr-3 text-primary" /> Generate All Segments</>
                                        }
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Preview Cards */}
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

                        {/* Story Summary / Progress */}
                        {storySegments.length > 0 && (
                            <Card className="glass-card border-none p-5">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Generation Progress</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-xs">
                                        <span>Segments Generated</span>
                                        <span>{Object.keys(generatedVideos).length} / {storySegments.length}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-500"
                                            style={{ width: `${(Object.keys(generatedVideos).length / storySegments.length) * 100}%` }}
                                        />
                                    </div>
                                    {generatingIndices.size > 0 && (
                                        <p className="text-[10px] text-primary animate-pulse flex items-center gap-2">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            Currently generating {generatingIndices.size} segment(s)...
                                        </p>
                                    )}
                                    <Button
                                        onClick={handleStartNew}
                                        variant="ghost"
                                        size="sm"
                                        className="w-full mt-4 text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-foreground"
                                    >
                                        Start Over
                                    </Button>
                                </div>
                            </Card>
                        )}

                        {/* Video List */}
                        <div className="space-y-4">
                            {storySegments.map((segment, index) => (
                                <Card key={index} className="glass-card border-none overflow-hidden group">
                                    <div className="p-3 bg-muted/30 border-b border-border/50 flex items-center justify-between">
                                        <h4 className="text-xs font-bold truncate">
                                            {index + 1}. {segment.title || 'Untitled'}
                                        </h4>
                                        {generatedVideos[index] && (
                                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDownload(index)}>
                                                <Download className="w-3 h-3" />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="aspect-video bg-black/40 relative flex items-center justify-center">
                                        {generatedVideos[index] ? (
                                            <video
                                                src={base64ToDataUrl(generatedVideos[index].base64, generatedVideos[index].mimeType)}
                                                controls
                                                className="w-full h-full object-contain"
                                            />
                                        ) : generatingIndices.has(index) ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{progressMessage}</p>
                                                <p className="text-xs font-mono">{elapsedTime}s elapsed</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 opacity-40">
                                                <Video className="w-8 h-8" />
                                                <p className="text-[10px] uppercase font-bold tracking-widest">Ready to generate</p>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>
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
                isValid={storySegments.length > 0 && storySegments.every(s => s.escena.trim() && s.accion.trim())}
                onGenerate={handleGenerateAll}
                isGenerating={generatingIndices.size > 0}
            />

            {/* Modals */}
            <VideoGeneratingModal isOpen={generatingIndices.size > 0} progressMessage={progressMessage} elapsedTime={elapsedTime} />
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
