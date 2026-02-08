import { useState } from 'react';
import {
    Wand2,
    Loader2,
    Sparkles,
    ArrowRight,
    Film,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { generateSceneConfig, generateStoryConfig, calculateStoryCost } from '@/services/api';
import { PRICING } from '@/config/constants';
import { useNavigate } from 'react-router-dom';
import type { SceneBuilderResult, StorySegment } from '@/services/api/sceneBuilderService';

type BuilderMode = 'scene' | 'story';

export function SceneBuilder() {
    const navigate = useNavigate();

    // Mode toggle
    const [mode, setMode] = useState<BuilderMode>('scene');
    const [segmentCount, setSegmentCount] = useState(3);

    // Common state
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastCost, setLastCost] = useState<number | null>(null);

    // Scene mode state
    const [generatedScene, setGeneratedScene] = useState<SceneBuilderResult | null>(null);

    // Story mode state
    const [generatedStory, setGeneratedStory] = useState<{
        title: string;
        description: string;
        segments: StorySegment[];
    } | null>(null);
    const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);

    // Suggestions
    const sceneSuggestions = [
        "Un capybara bailando en una discoteca con luces neón, diciendo '¡Vamos a bailar!'",
        "A cute robot exploring a futuristic city at sunset, saying 'The future looks beautiful!'",
    ];

    const storySuggestions = [
        "Una historia de un gato samurai que aprende una lección de humildad",
        "A magical adventure of a tiny robot finding its way home through various obstacles",
    ];

    const handleGenerate = async () => {
        if (!aiPrompt.trim()) return;

        setIsGenerating(true);
        setError(null);
        setGeneratedScene(null);
        setGeneratedStory(null);
        setCurrentSegmentIndex(0);

        try {
            if (mode === 'scene') {
                const result = await generateSceneConfig(aiPrompt.trim());
                setGeneratedScene(result.scene);
                setLastCost(result.costMXN);
            } else {
                const result = await generateStoryConfig(aiPrompt.trim(), segmentCount);
                setGeneratedStory({
                    title: result.storyTitle,
                    description: result.storyDescription,
                    segments: result.segments,
                });
                setLastCost(result.costMXN);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUseScene = () => {
        navigate('/video', { state: { generatedScene } });
    };

    const handleUseStory = () => {
        // Navigate to video generator with story data
        navigate('/video', { state: { generatedStory } });
    };

    const estimatedCost = mode === 'scene'
        ? PRICING.SCENE_BUILDER
        : calculateStoryCost(segmentCount);

    const currentSegment = generatedStory?.segments[currentSegmentIndex];

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 mb-4">
                    <Wand2 className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold gradient-text mb-2">AI Content Builder</h1>
                <p className="text-muted-foreground max-w-lg mx-auto">
                    {mode === 'scene'
                        ? 'Create a single scene for your video'
                        : 'Generate a complete multi-segment story'
                    }
                </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex justify-center mb-6">
                <div className="inline-flex p-1 rounded-xl glass">
                    <button
                        onClick={() => setMode('scene')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'scene'
                            ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Film className="w-4 h-4" />
                        Single Scene
                    </button>
                    <button
                        onClick={() => setMode('story')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'story'
                            ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <BookOpen className="w-4 h-4" />
                        Story (Multi-Segment)
                    </button>
                </div>
            </div>

            {/* Main Card */}
            <div className="glass-card p-6 mb-6">
                {/* Prompt Input */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">
                            {mode === 'scene' ? 'Your Video Idea' : 'Your Story Idea'}
                        </label>
                        <span className="text-xs text-muted-foreground">
                            ~${estimatedCost.toFixed(2)} MXN
                        </span>
                    </div>

                    <Textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder={mode === 'scene'
                            ? "Describe your video scene in detail..."
                            : "Describe your story idea - the AI will create a multi-segment narrative..."
                        }
                        className="glass-input min-h-[100px] text-sm"
                        disabled={isGenerating}
                    />

                    {/* Segment Count Selector (Story Mode Only) */}
                    {mode === 'story' && (
                        <div className="flex items-center gap-4 p-3 rounded-lg glass">
                            <span className="text-sm font-medium">Number of Segments:</span>
                            <div className="flex items-center gap-2">
                                {[2, 3, 4, 5, 6].map((count) => (
                                    <button
                                        key={count}
                                        onClick={() => setSegmentCount(count)}
                                        disabled={isGenerating}
                                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${segmentCount === count
                                            ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                                            : 'glass hover:bg-primary/10'
                                            }`}
                                    >
                                        {count}
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs text-muted-foreground ml-auto">
                                {segmentCount * 8}s total
                            </span>
                        </div>
                    )}

                    {/* Quick Suggestions */}
                    <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Try an example:</p>
                        <div className="flex flex-wrap gap-2">
                            {(mode === 'scene' ? sceneSuggestions : storySuggestions).map((suggestion, i) => (
                                <button
                                    key={i}
                                    onClick={() => setAiPrompt(suggestion)}
                                    className="text-xs px-3 py-1.5 rounded-lg glass hover:bg-primary/10 transition-colors text-left truncate max-w-[320px]"
                                    disabled={isGenerating}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}

                    {/* Generate Button */}
                    <Button
                        onClick={handleGenerate}
                        disabled={!aiPrompt.trim() || isGenerating}
                        className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white h-12"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                {mode === 'scene' ? 'Generating Scene...' : 'Generating Story...'}
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5 mr-2" />
                                Generate {mode === 'scene' ? 'Scene' : `${segmentCount}-Segment Story`}
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Generated Scene Preview (Scene Mode) */}
            {mode === 'scene' && generatedScene && (
                <div className="glass-card p-6 animate-scaleIn">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            ✨ Generated Scene
                        </h3>
                        {lastCost && (
                            <span className="text-xs text-green-500">
                                Cost: ${lastCost.toFixed(2)} MXN
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <SceneField label="Escena (Setting)" value={generatedScene.escena} />
                        {generatedScene.fondo && <SceneField label="Fondo (Background)" value={generatedScene.fondo} />}
                        <SceneField label="Acción (Action)" value={generatedScene.accion} />
                        <SceneField label="Diálogo" value={`"${generatedScene.dialogo}"`} />
                        {generatedScene.voiceStyle && <SceneField label="Voice Style" value={generatedScene.voiceStyle} />}
                        {generatedScene.movimiento && <SceneField label="Motion/Camera" value={generatedScene.movimiento} />}
                        <SceneField label="Duration" value={`${generatedScene.suggestedDuration}s`} />
                    </div>

                    <Button
                        onClick={handleUseScene}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                    >
                        Use This Scene for Video Generation
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            )}

            {/* Generated Story Preview (Story Mode) - Carousel */}
            {mode === 'story' && generatedStory && (
                <div className="glass-card p-6 animate-scaleIn">
                    {/* Story Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                📖 {generatedStory.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">{generatedStory.description}</p>
                        </div>
                        {lastCost && (
                            <span className="text-xs text-green-500">
                                Cost: ${lastCost.toFixed(2)} MXN
                            </span>
                        )}
                    </div>

                    {/* Segment Navigation Dots */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                        {generatedStory.segments.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentSegmentIndex(idx)}
                                className={`w-3 h-3 rounded-full transition-all ${idx === currentSegmentIndex
                                    ? 'bg-gradient-to-br from-purple-500 to-blue-500 scale-125'
                                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Segment Carousel */}
                    {currentSegment && (
                        <div className="relative">
                            {/* Segment Card */}
                            <div className="rounded-xl border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent p-5 mb-4">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                                        {currentSegment.segmentNumber}
                                    </div>
                                    <div>
                                        <h4 className="font-medium">{currentSegment.title}</h4>
                                        <p className="text-xs text-muted-foreground">{currentSegment.suggestedDuration}s segment</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <SceneField label="Escena" value={currentSegment.escena} compact />
                                    {currentSegment.fondo && <SceneField label="Fondo" value={currentSegment.fondo} compact />}
                                    <SceneField label="Acción" value={currentSegment.accion} compact />
                                    <SceneField label="Diálogo" value={`"${currentSegment.dialogo}"`} compact />
                                    {currentSegment.voiceStyle && <SceneField label="Voz" value={currentSegment.voiceStyle} compact />}
                                    {currentSegment.movimiento && <SceneField label="Movimiento" value={currentSegment.movimiento} compact />}
                                </div>
                            </div>

                            {/* Carousel Navigation */}
                            <div className="flex items-center justify-between">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentSegmentIndex(Math.max(0, currentSegmentIndex - 1))}
                                    disabled={currentSegmentIndex === 0}
                                    className="glass"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    Previous
                                </Button>

                                <span className="text-sm text-muted-foreground">
                                    Segment {currentSegmentIndex + 1} of {generatedStory.segments.length}
                                </span>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentSegmentIndex(Math.min(generatedStory.segments.length - 1, currentSegmentIndex + 1))}
                                    disabled={currentSegmentIndex === generatedStory.segments.length - 1}
                                    className="glass"
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Story Summary Cards */}
                    <div className="mt-6 pt-4 border-t border-border">
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <Play className="w-4 h-4" />
                            All Segments ({generatedStory.segments.length * 8}s total)
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                            {generatedStory.segments.map((seg, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentSegmentIndex(idx)}
                                    className={`p-3 rounded-lg text-left transition-all ${idx === currentSegmentIndex
                                        ? 'ring-2 ring-primary bg-primary/10'
                                        : 'glass hover:bg-primary/5'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xs flex items-center justify-center font-medium">
                                            {seg.segmentNumber}
                                        </span>
                                        <span className="text-xs font-medium truncate">{seg.title}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2">{seg.dialogo}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Generate All Videos Button */}
                    <div className="mt-6 space-y-3">
                        <Button
                            onClick={handleUseStory}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white h-12"
                        >
                            <Play className="w-5 h-5 mr-2" />
                            Generate All {generatedStory.segments.length} Videos
                            <span className="ml-2 text-xs opacity-80">
                                (~${(generatedStory.segments.length * 8 * PRICING.VIDEO_PER_SECOND).toFixed(2)} MXN)
                            </span>
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                            This will generate videos for all segments sequentially
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper component for displaying scene fields
function SceneField({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
    return (
        <div className="space-y-1">
            <label className={`text-muted-foreground ${compact ? 'text-xs' : 'text-xs'}`}>{label}</label>
            <p className={`glass p-2 rounded-lg ${compact ? 'text-xs' : 'text-sm'}`}>{value}</p>
        </div>
    );
}
