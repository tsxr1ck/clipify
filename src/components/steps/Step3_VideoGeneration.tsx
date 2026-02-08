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
    Clock,
    ArrowRightLeft,
    Wand2,
    ChevronDown,
    ChevronUp,
    Film,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Import,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
import type { VideoDuration } from '@/types';
import { PRICING } from '@/config/constants';

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

// Pricing constants
const USD_TO_MXN = 17.5;

export function Step3_VideoGeneration() {
    const { user } = useAuth();
    const { state, prevStep, setStep, setSelectedStyle: setGlobalStyleId, setSelectedCharacter: setGlobalCharacterId } = useApplication();
    const location = useLocation();

    // Style and character from API
    const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

    // Modal state for swapping style/character
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
    // Story mode state
    const [storySegments, setStorySegments] = useState<StorySegment[]>([]);
    const [storyTitle, setStoryTitle] = useState('');
    const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);

    // Import Story State
    const [showImportModal, setShowImportModal] = useState(false);
    const [importJson, setImportJson] = useState('');
    const [importError, setImportError] = useState<string | null>(null);

    // Pro Builder State
    const [useProBuilder, setUseProBuilder] = useState(false);
    const canUseProBuilder = user?.id === 'fb430091-ddba-4aa7-82d6-228528124087';

    // Handle route state from /scene-builder navigation
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
            // Clear the location state to prevent re-filling on refresh
            window.history.replaceState({}, document.title);
        } else if (routeState?.generatedStory) {
            const story = routeState.generatedStory;
            setBuilderMode('story');
            setStoryTitle(story.title);
            setStorySegments(story.segments);
            setCurrentSegmentIndex(0);
            setSceneBuilderOpen(false);
            // Fill form with first segment
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
    const estimatedCostMXN = duration * PRICING.VIDEO_PER_SECOND;
    const estimatedCostUSD = estimatedCostMXN / USD_TO_MXN;

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

    // Check Veo access on mount
    useEffect(() => {
        async function checkAccess() {
            const available = await checkVeoAccess();
            setVeoAvailable(available);
            setIsCheckingVeo(false);
        }
        checkAccess();
    }, []);

    const isFormValid = escena.trim() && accion.trim() && dialogo.trim();

    // AI Scene Builder handler
    const handleGenerateScene = async () => {
        if (!aiPrompt.trim()) return;

        setIsGeneratingScene(true);
        setSceneBuilderError(null);
        setLastSceneCost(null);

        try {
            const result = useProBuilder
                ? await sceneBuilderProService.generateSceneConfig(aiPrompt.trim())
                : await generateSceneConfig(aiPrompt.trim());

            // Fill in the form fields with AI-generated values
            setEscena(result.scene.escena);

            // Handle Pro fields if available
            let fondoText = result.scene.fondo || '';
            if (result.scene.condicionesFisicas) {
                fondoText += `\n\n[Physical Conditions]: ${result.scene.condicionesFisicas}`;
            }
            if (result.scene.contextoInvisible) {
                fondoText += `\n[Invisible Context]: ${result.scene.contextoInvisible}`;
            }
            setFondo(fondoText);

            setAccion(result.scene.accion);
            setDialogo(result.scene.dialogo);
            setVoiceStyle(result.scene.voiceStyle || '');

            let movimientoText = result.scene.movimiento || '';
            if (result.scene.defectosTecnicos) {
                movimientoText += `\n[Technical Defects]: ${result.scene.defectosTecnicos}`;
            }
            setMovimiento(movimientoText);

            setDuration(result.scene.suggestedDuration);
            setLastSceneCost(result.costMXN);

            // Collapse the AI section after successful generation
            setSceneBuilderOpen(false);
        } catch (err) {
            setSceneBuilderError(err instanceof Error ? err.message : 'Failed to generate scene');
        } finally {
            setIsGeneratingScene(false);
        }
    };

    // AI Story Builder handler
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

            // Store story data
            setStoryTitle(result.storyTitle);
            setStorySegments(result.segments);
            setCurrentSegmentIndex(0);
            setLastSceneCost(result.costMXN);

            // Fill form with first segment
            if (result.segments.length > 0) {
                const firstSeg = result.segments[0];
                setEscena(firstSeg.escena);

                let fondoText = firstSeg.fondo || '';
                if (firstSeg.condicionesFisicas) {
                    fondoText += `\n\n[Physical Conditions]: ${firstSeg.condicionesFisicas}`;
                }
                if (firstSeg.contextoInvisible) {
                    fondoText += `\n[Invisible Context]: ${firstSeg.contextoInvisible}`;
                }
                setFondo(fondoText);

                setAccion(firstSeg.accion);
                setDialogo(firstSeg.dialogo);
                setVoiceStyle(firstSeg.voiceStyle || '');

                let movimientoText = firstSeg.movimiento || '';
                if (firstSeg.defectosTecnicos) {
                    movimientoText += `\n[Technical Defects]: ${firstSeg.defectosTecnicos}`;
                }
                setMovimiento(movimientoText);

                setDuration(8);
            }
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

            // Basic validation
            if (!parsed.segments || !Array.isArray(parsed.segments)) {
                throw new Error('Invalid JSON: Missing "segments" array.');
            }

            if (parsed.segments.length === 0) {
                throw new Error('Invalid JSON: "segments" array is empty.');
            }

            setStoryTitle(parsed.storyTitle || 'Imported Story');
            setStorySegments(parsed.segments);
            setLastSceneCost(parsed.costMXN || null);
            setBuilderMode('story');
            setSegmentCount(parsed.segments.length);
            setCurrentSegmentIndex(0);

            // Fill first segment
            const firstSeg = parsed.segments[0];
            setEscena(firstSeg.escena || '');

            let fondoText = firstSeg.fondo || '';
            if (firstSeg.condicionesFisicas) {
                fondoText += `\n\n[Physical Conditions]: ${firstSeg.condicionesFisicas}`;
            }
            if (firstSeg.contextoInvisible) {
                fondoText += `\n[Invisible Context]: ${firstSeg.contextoInvisible}`;
            }
            setFondo(fondoText);

            setAccion(firstSeg.accion || '');
            setDialogo(firstSeg.dialogo || '');
            setVoiceStyle(firstSeg.voiceStyle || '');

            let movimientoText = firstSeg.movimiento || '';
            if (firstSeg.defectosTecnicos) {
                movimientoText += `\n[Technical Defects]: ${firstSeg.defectosTecnicos}`;
            }
            setMovimiento(movimientoText);

            setDuration(firstSeg.suggestedDuration || 8);

            setShowImportModal(false);
            setImportJson('');
            setImportError(null);
            setSceneBuilderOpen(false);
            toast.success('Story imported successfully!');
        } catch (err) {
            console.error('Import failed:', err);
            setImportError(err instanceof Error ? err.message : 'Failed to parse JSON');
            toast.error('Failed to import story. Please check the JSON format.');
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
            // TODO: Video generation needs base64 image but we now have URL
            // For now, we need to fetch the image and convert to base64
            const imageResponse = await fetch(selectedCharacter.imageUrl);
            const imageBlob = await imageResponse.blob();
            const imageBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    resolve(base64);
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
                    sceneConfig: {
                        escena,
                        fondo,
                        accion,
                        dialogo,
                        voiceStyle,
                        movimiento,
                        duration
                    }
                },
                (message) => setProgressMessage(message)
            );

            setGeneratedVideo({
                base64: result.videoBase64,
                mimeType: result.mimeType,
                costMXN: result.costMXN,
            });

            // Play success sound
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Smooth chime
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Audio play failed (user interaction needed first):', e));

            setProgressMessage('');
            setProgressMessage('');
            toast.success('Video generated successfully!');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate video';
            setError(errorMessage);
            setProgressMessage('');

            // Special handling for high load error (code 8)
            // Using a simple heuristic or if the error object lets us check code, 
            // but here we likely have the message string.
            if (errorMessage.toLowerCase().includes('high load') || errorMessage.includes('code":8')) {
                // Friendly error message for Code 8 (Resource Exhausted)
                toast.error(
                    'Veo is currently experiencing very high demand! 🌟 Please wait a moment and try again. (Video Error Code: 8)',
                    {
                        duration: 6000,
                        icon: <Sparkles className="w-5 h-5 text-purple-500" />,
                    }
                );
            } else {
                toast.error(errorMessage);
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

        // Create a link to download the image from URL
        const link = document.createElement('a');
        link.href = selectedCharacter.imageUrl;
        link.download = `${selectedCharacter.name.replace(/\s+/g, '-')}.png`;
        link.target = '_blank';
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
                                📋 Scene Configuration
                            </h3>

                            {/* AI Scene/Story Builder */}
                            <div className="mb-4 rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-blue-500/5 overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setSceneBuilderOpen(!sceneBuilderOpen)}
                                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-primary/5 transition-colors"
                                >
                                    <span className="flex items-center gap-2 text-sm font-medium">
                                        <Wand2 className="w-4 h-4 text-purple-500" />
                                        ✨ AI {builderMode === 'scene' ? 'Scene' : 'Story'} Builder
                                        <span className="text-xs text-muted-foreground font-normal">
                                            ~${builderMode === 'scene'
                                                ? PRICING.SCENE_BUILDER.toFixed(2)
                                                : calculateStoryCost(segmentCount).toFixed(2)
                                            } MXN
                                        </span>
                                    </span>
                                    {sceneBuilderOpen ? (
                                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                    )}
                                </button>

                                {sceneBuilderOpen && (
                                    <div className="px-4 pb-4 space-y-3">
                                        {/* Pro Toggle - Only for specific user */}
                                        {canUseProBuilder && (
                                            <div className="flex justify-center mb-1">
                                                <div
                                                    className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full cursor-pointer hover:bg-amber-500/20 transition-colors"
                                                    onClick={() => setUseProBuilder(!useProBuilder)}
                                                >
                                                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                                        Hyper-Realism
                                                    </span>
                                                    <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${useProBuilder ? 'bg-amber-500' : 'bg-muted'}`}>
                                                        <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${useProBuilder ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Mode Toggle */}
                                        <div className="flex justify-center">
                                            <div className="inline-flex p-1 rounded-lg glass">
                                                <button
                                                    type="button"
                                                    onClick={() => setBuilderMode('scene')}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${builderMode === 'scene'
                                                        ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                        }`}
                                                >
                                                    <Film className="w-3 h-3" />
                                                    Scene
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setBuilderMode('story')}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${builderMode === 'story'
                                                        ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                        }`}
                                                >
                                                    <BookOpen className="w-3 h-3" />
                                                    Story
                                                </button>
                                            </div>
                                        </div>

                                        <p className="text-xs text-muted-foreground text-center">
                                            {builderMode === 'scene'
                                                ? 'Describe your video idea and AI will fill the form.'
                                                : 'Describe your story and AI will generate multiple segments.'
                                            }
                                        </p>

                                        {/* Segment Count (Story mode only) */}
                                        {builderMode === 'story' && (
                                            <div className="flex items-center justify-center gap-2 p-2 rounded-lg glass">
                                                <span className="text-xs font-medium">Segments:</span>
                                                {[2, 3, 4, 5, 6].map((count) => (
                                                    <button
                                                        key={count}
                                                        type="button"
                                                        onClick={() => setSegmentCount(count)}
                                                        disabled={isGeneratingScene}
                                                        className={`w-7 h-7 rounded-md text-xs font-medium transition-all ${segmentCount === count
                                                            ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                                                            : 'glass hover:bg-primary/10'
                                                            }`}
                                                    >
                                                        {count}
                                                    </button>
                                                ))}
                                                <span className="text-xs text-muted-foreground">
                                                    ({segmentCount * 8}s)
                                                </span>
                                            </div>
                                        )}

                                        {/* Import Button */}
                                        <div className="flex justify-end px-1">
                                            <button
                                                type="button"
                                                onClick={() => setShowImportModal(true)}
                                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                <Import className="w-3 h-3" />
                                                Import JSON
                                            </button>
                                        </div>

                                        <Textarea
                                            value={aiPrompt}
                                            onChange={(e) => setAiPrompt(e.target.value)}
                                            placeholder={builderMode === 'scene'
                                                ? "Ej: Un capybara bailando en una discoteca con luces neón..."
                                                : "Ej: Una historia de un gato samurai que aprende una lección de humildad..."
                                            }
                                            className="glass-input min-h-[70px] text-sm"
                                            disabled={isGeneratingScene || isGenerating}
                                        />

                                        {sceneBuilderError && (
                                            <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/30">
                                                <p className="text-xs text-destructive">{sceneBuilderError}</p>
                                            </div>
                                        )}

                                        {lastSceneCost && (
                                            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/30">
                                                <p className="text-xs text-green-600 dark:text-green-400">
                                                    ✓ {builderMode === 'scene' ? 'Scene' : 'Story'} generated • Cost: ${lastSceneCost.toFixed(2)} MXN
                                                </p>
                                            </div>
                                        )}

                                        <Button
                                            type="button"
                                            onClick={builderMode === 'scene' ? handleGenerateScene : handleGenerateStory}
                                            disabled={!aiPrompt.trim() || isGeneratingScene || isGenerating}
                                            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
                                        >
                                            {isGeneratingScene ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Generating {builderMode === 'scene' ? 'Scene' : 'Story'}...
                                                </>
                                            ) : (
                                                <>
                                                    <Wand2 className="w-4 h-4 mr-2" />
                                                    Generate {builderMode === 'scene' ? 'Scene' : `${segmentCount}-Segment Story`}
                                                </>
                                            )}
                                        </Button>

                                        {/* Story Segments Carousel (when story is generated) */}
                                        {builderMode === 'story' && storySegments.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-border">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-xs font-medium flex items-center gap-1.5">
                                                        📖 {storyTitle || 'Generated Story'}
                                                    </h4>
                                                    <span className="text-xs text-muted-foreground">
                                                        {storySegments.length} segments • {storySegments.length * 8}s
                                                    </span>
                                                </div>

                                                {/* Segment Pills */}
                                                <div className="flex flex-wrap gap-1.5 mb-2">
                                                    {storySegments.map((seg, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => {
                                                                setCurrentSegmentIndex(idx);
                                                                // Fill form with this segment
                                                                setEscena(seg.escena);

                                                                let fondoText = seg.fondo || '';
                                                                if (seg.condicionesFisicas) {
                                                                    fondoText += `\n\n[Physical Conditions]: ${seg.condicionesFisicas}`;
                                                                }
                                                                if (seg.contextoInvisible) {
                                                                    fondoText += `\n[Invisible Context]: ${seg.contextoInvisible}`;
                                                                }
                                                                setFondo(fondoText);

                                                                setAccion(seg.accion);
                                                                setDialogo(seg.dialogo);
                                                                setVoiceStyle(seg.voiceStyle || '');

                                                                let movimientoText = seg.movimiento || '';
                                                                if (seg.defectosTecnicos) {
                                                                    movimientoText += `\n[Technical Defects]: ${seg.defectosTecnicos}`;
                                                                }
                                                                setMovimiento(movimientoText);

                                                                setDuration(8);
                                                            }}
                                                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${idx === currentSegmentIndex
                                                                ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                                                                : 'glass hover:bg-primary/10'
                                                                }`}
                                                        >
                                                            <span className="font-medium">{idx + 1}</span>
                                                            <span className="truncate max-w-[80px]">{seg.title}</span>
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Navigation */}
                                                <div className="flex items-center justify-between">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            const newIdx = Math.max(0, currentSegmentIndex - 1);
                                                            setCurrentSegmentIndex(newIdx);
                                                            const seg = storySegments[newIdx];
                                                            setEscena(seg.escena);
                                                            setFondo(seg.fondo || '');
                                                            setAccion(seg.accion);
                                                            setDialogo(seg.dialogo);
                                                            setVoiceStyle(seg.voiceStyle || '');
                                                            setMovimiento(seg.movimiento || '');
                                                        }}
                                                        disabled={currentSegmentIndex === 0}
                                                        className="h-7 text-xs glass"
                                                    >
                                                        <ChevronLeft className="w-3 h-3 mr-1" />
                                                        Prev
                                                    </Button>
                                                    <span className="text-xs text-muted-foreground">
                                                        Segment {currentSegmentIndex + 1} / {storySegments.length}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            const newIdx = Math.min(storySegments.length - 1, currentSegmentIndex + 1);
                                                            setCurrentSegmentIndex(newIdx);
                                                            const seg = storySegments[newIdx];
                                                            setEscena(seg.escena);
                                                            setFondo(seg.fondo || '');
                                                            setAccion(seg.accion);
                                                            setDialogo(seg.dialogo);
                                                            setVoiceStyle(seg.voiceStyle || '');
                                                            setMovimiento(seg.movimiento || '');
                                                        }}
                                                        disabled={currentSegmentIndex === storySegments.length - 1}
                                                        className="h-7 text-xs glass"
                                                    >
                                                        Next
                                                        <ChevronRight className="w-3 h-3 ml-1" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

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
                                    <span className="font-medium text-foreground">$0.5425 USD/s</span>
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
            {/* Import Story Modal */}
            <Dialog open={showImportModal} onOpenChange={(open) => !open && setShowImportModal(false)}>
                <DialogContent className="glass-modal max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <Import className="w-5 h-5" />
                            Import Story JSON
                        </DialogTitle>
                        <DialogDescription>
                            Paste your scene or story JSON configuration below.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2 flex-1 overflow-y-auto px-1">
                        <Textarea
                            value={importJson}
                            onChange={(e) => {
                                setImportJson(e.target.value);
                                setImportError(null);
                            }}
                            placeholder='Paste JSON here... {"segments": [...]}'
                            className="font-mono text-xs min-h-[300px] glass-input resize-y"
                        />

                        {importError && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{importError}</span>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex-shrink-0 pt-2">
                        <Button variant="ghost" onClick={() => setShowImportModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleImportStory}
                            disabled={!importJson.trim()}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            Import Story
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
