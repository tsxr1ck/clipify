import { useState, useRef } from 'react';
import {
    Headphones,
    Loader2,
    Sparkles,
    Download,
    RefreshCw,
    DollarSign,
    Film,
    Lock,
    Wand2,
    ChevronDown,
    ChevronUp,
    Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { base64ToDataUrl } from '@/utils/imageProcessing';
import { generateVideoWithLogging } from '@/services/api/geminiService';
import {
    ASMR_TEMPLATES,
    generateASMRSceneConfig,
    buildASMRVideoPrompt,
    type ASMRTemplate,
} from '@/services/api/asmrService';
import { VideoGeneratingModal } from '@/components/shared/VideoGeneratingModal';
import type { VideoDuration } from '@/types';
import { PRICING } from '@/config/constants';

const durationOptions: { value: VideoDuration; label: string }[] = [
    { value: 2, label: '2s' },
    { value: 4, label: '4s' },
    { value: 6, label: '6s' },
    { value: 8, label: '8s' },
];

const USD_TO_MXN = 17.5;

export function ASMRGenerator() {
    const { user } = useAuth();
    const isPro = user?.role === 'pro';

    // Template state
    const [selectedTemplate, setSelectedTemplate] = useState<ASMRTemplate | null>(null);

    // Scene builder state
    const [sceneBuilderOpen, setSceneBuilderOpen] = useState(true);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGeneratingScene, setIsGeneratingScene] = useState(false);
    const [sceneBuilderError, setSceneBuilderError] = useState<string | null>(null);
    const [lastSceneCost, setLastSceneCost] = useState<number | null>(null);

    // Form state
    const [escena, setEscena] = useState('');
    const [fondo, setFondo] = useState('');
    const [accion, setAccion] = useState('');
    const [movimiento, setMovimiento] = useState('');
    const [duration, setDuration] = useState<VideoDuration>(6);

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedVideo, setGeneratedVideo] = useState<{
        base64: string;
        mimeType: string;
        costMXN?: number;
    } | null>(null);
    const [progressMessage, setProgressMessage] = useState('');
    const [elapsedTime, setElapsedTime] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const estimatedCostMXN = duration * PRICING.VIDEO_PER_SECOND;
    const estimatedCostUSD = estimatedCostMXN / USD_TO_MXN;

    const isFormValid = Boolean(selectedTemplate && escena.trim() && accion.trim());

    const handleGenerateScene = async () => {
        if (!aiPrompt.trim() || !selectedTemplate) return;
        setIsGeneratingScene(true);
        setSceneBuilderError(null);
        setLastSceneCost(null);

        try {
            const result = await generateASMRSceneConfig(aiPrompt.trim(), selectedTemplate);
            setEscena(result.scene.escena);
            setFondo(result.scene.fondo || '');
            setAccion(result.scene.accion);
            setMovimiento(result.scene.movimiento || '');
            setDuration(result.scene.suggestedDuration);
            setLastSceneCost(result.costMXN);
            setSceneBuilderOpen(false);
            toast.success('ASMR scene configured!');
        } catch (err) {
            setSceneBuilderError(err instanceof Error ? err.message : 'Failed to generate scene');
        } finally {
            setIsGeneratingScene(false);
        }
    };

    const handleGenerate = async () => {
        if (!selectedTemplate || !isFormValid) return;
        setIsGenerating(true);
        setError(null);
        setProgressMessage('');
        setElapsedTime(0);

        timerRef.current = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);

        try {
            const prompt = buildASMRVideoPrompt(
                selectedTemplate,
                escena.trim(),
                fondo.trim() || undefined,
                accion.trim(),
                movimiento.trim() || undefined,
                duration
            );

            // ASMR videos don't use a character reference image, pass empty string
            const result = await generateVideoWithLogging(
                '',
                prompt,
                duration,
                {
                    title: `ASMR: ${selectedTemplate.name} - ${accion.substring(0, 30)}`,
                    sceneConfig: {
                        template: selectedTemplate.id,
                        escena,
                        fondo,
                        accion,
                        dialogo: '(empty)',
                        movimiento,
                        duration,
                        type: 'asmr',
                    },
                },
                (message) => setProgressMessage(message)
            );

            setGeneratedVideo({
                base64: result.videoBase64,
                mimeType: result.mimeType,
                costMXN: result.costMXN,
            });

            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => { });

            toast.success('ASMR video generated!');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to generate video';
            setError(msg);
            toast.error(msg);
        } finally {
            setIsGenerating(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const handleDownload = () => {
        if (!generatedVideo) return;
        const link = document.createElement('a');
        link.href = base64ToDataUrl(generatedVideo.base64, generatedVideo.mimeType);
        link.download = `clipify-asmr-${Date.now()}.mp4`;
        link.click();
    };

    const handleStartNew = () => {
        setGeneratedVideo(null);
        setError(null);
        setEscena('');
        setFondo('');
        setAccion('');
        setMovimiento('');
        setAiPrompt('');
        setSceneBuilderOpen(true);
    };

    if (!isPro) {
        return (
            <div className="w-full max-w-lg mx-auto text-center py-20">
                <div className="glass rounded-3xl p-12 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-pink-500 to-rose-600 flex items-center justify-center mx-auto shadow-lg">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold">Pro Feature</h2>
                    <p className="text-muted-foreground">
                        ASMR Videos Suite is a Pro feature. Upgrade to access template-based ASMR video generation.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto px-4 animate-scaleIn pb-24">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-500 text-xs font-medium mb-3">
                    <Headphones className="w-3 h-3" />
                    <span>Pro Feature</span>
                </div>
                <h2 className="text-3xl font-bold gradient-text">ASMR Videos</h2>
                <p className="text-muted-foreground mt-2">Create satisfying ASMR content with curated templates</p>
            </div>

            {/* Template Picker */}
            <div className="mb-8">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Select Template</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {ASMR_TEMPLATES.map(template => (
                        <button
                            key={template.id}
                            onClick={() => {
                                setSelectedTemplate(template);
                                setAiPrompt('');
                                setEscena('');
                                setFondo('');
                                setAccion('');
                                setMovimiento('');
                                setSceneBuilderOpen(true);
                            }}
                            className={`relative p-4 rounded-xl text-left transition-all ${selectedTemplate?.id === template.id
                                ? 'bg-pink-500/10 border-2 border-pink-500/40 shadow-lg shadow-pink-500/10'
                                : 'glass border-2 border-transparent hover:border-pink-500/20'
                                }`}
                        >
                            {selectedTemplate?.id === template.id && (
                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                </div>
                            )}
                            <span className="text-2xl mb-2 block">{template.icon}</span>
                            <p className="font-semibold text-sm">{template.name}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {selectedTemplate && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left: AI Builder + Form */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* AI Scene Builder */}
                        <div className="glass p-1 rounded-2xl bg-linear-to-br from-pink-500/10 to-rose-500/10">
                            <div className="bg-background/50 backdrop-blur-xl rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setSceneBuilderOpen(!sceneBuilderOpen)}
                                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-linear-to-br from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/20">
                                            <Wand2 className="w-4 h-4" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-semibold text-sm">AI ASMR Scene Builder</h3>
                                            <p className="text-xs text-muted-foreground">Auto-generate ASMR scene prompts</p>
                                        </div>
                                    </div>
                                    {sceneBuilderOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                                </button>

                                {sceneBuilderOpen && (
                                    <div className="px-5 pb-5 pt-2 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                        <div className="text-xs text-muted-foreground px-2 py-1.5 bg-muted/30 rounded-lg">
                                            Template: <span className="font-medium text-foreground">{selectedTemplate.icon} {selectedTemplate.name}</span>
                                        </div>

                                        {/* Suggestions */}
                                        <div className="flex flex-wrap gap-2">
                                            {selectedTemplate.suggestions.map((suggestion, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setAiPrompt(suggestion)}
                                                    className="text-xs px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {suggestion.substring(0, 40)}...
                                                </button>
                                            ))}
                                        </div>

                                        <div className="relative">
                                            <Textarea
                                                value={aiPrompt}
                                                onChange={(e) => setAiPrompt(e.target.value)}
                                                placeholder="Describe your ASMR scene..."
                                                className="min-h-[100px] resize-none pr-10 glass-input"
                                            />
                                            <div className="absolute bottom-2 right-2">
                                                <Button
                                                    size="sm"
                                                    onClick={handleGenerateScene}
                                                    disabled={!aiPrompt.trim() || isGeneratingScene}
                                                    className="h-8 text-xs bg-pink-500/20 hover:bg-pink-500/30 text-pink-600 dark:text-pink-400 border border-pink-500/20 backdrop-blur-sm"
                                                >
                                                    {isGeneratingScene ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                                                    Generate
                                                </Button>
                                            </div>
                                        </div>

                                        {sceneBuilderError && (
                                            <p className="text-xs text-destructive">{sceneBuilderError}</p>
                                        )}
                                        {lastSceneCost !== null && (
                                            <p className="text-xs text-muted-foreground text-right">Scene cost: ${lastSceneCost.toFixed(2)} MXN</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Parameters Form */}
                        <Card className="glass-card border-none space-y-4 p-6">
                            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                                <Film className="w-4 h-4" /> ASMR Parameters
                            </h3>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">
                                        Scene Description <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        value={escena}
                                        onChange={e => setEscena(e.target.value)}
                                        placeholder="Describe the environment, textures, materials..."
                                        className="glass-input h-20 text-sm"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">
                                        Action <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        value={accion}
                                        onChange={e => setAccion(e.target.value)}
                                        placeholder="What satisfying action is happening?"
                                        className="glass-input h-16 text-sm"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">Background Details (Optional)</Label>
                                    <Textarea
                                        value={fondo}
                                        onChange={e => setFondo(e.target.value)}
                                        placeholder="Background elements, lighting..."
                                        className="glass-input h-16 text-sm"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">Camera Movement (Optional)</Label>
                                    <Textarea
                                        value={movimiento}
                                        onChange={e => setMovimiento(e.target.value)}
                                        placeholder="Slow pan, gentle zoom, static close-up..."
                                        className="glass-input h-12 text-sm"
                                    />
                                </div>

                                <div className="space-y-3 pt-2">
                                    <Label className="text-xs">Duration</Label>
                                    <div className="flex gap-2">
                                        {durationOptions.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setDuration(opt.value)}
                                                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${duration === opt.value
                                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                                    : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                                                    }`}
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
                                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating...</>
                                ) : (
                                    <><Sparkles className="w-5 h-5 mr-2" /> Generate ASMR Video</>
                                )}
                            </Button>
                        </Card>
                    </div>

                    {/* Right: Cost + Preview */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Cost Card */}
                        <Card className="glass-card border-none p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" /> Cost Estimate
                                </h3>
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
                            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                <Film className="w-4 h-4" /> Preview
                            </h3>

                            <div className="flex-1 rounded-xl bg-black/5 dark:bg-black/40 border-2 border-dashed border-muted flex items-center justify-center relative overflow-hidden">
                                {generatedVideo ? (
                                    <div className="relative w-full h-full p-2">
                                        <video
                                            src={base64ToDataUrl(generatedVideo.base64, generatedVideo.mimeType)}
                                            controls
                                            className="w-full h-full rounded-lg object-contain bg-black"
                                            autoPlay
                                            loop
                                        />
                                        <div className="absolute top-4 right-4">
                                            <Button
                                                size="icon"
                                                variant="secondary"
                                                className="h-8 w-8 rounded-full backdrop-blur-md bg-white/10 hover:bg-white/20 text-white"
                                                onClick={handleDownload}
                                            >
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center p-6">
                                        {isGenerating ? (
                                            <div className="space-y-3">
                                                <Loader2 className="w-10 h-10 animate-spin text-pink-500 mx-auto" />
                                                <p className="text-sm text-foreground font-medium animate-pulse">
                                                    {progressMessage || 'Processing...'}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                                                    <Headphones className="w-6 h-6 text-muted-foreground" />
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    ASMR video will appear here
                                                </p>
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

            {error && !selectedTemplate && (
                <p className="text-sm text-destructive text-center mt-4">{error}</p>
            )}

            <VideoGeneratingModal isOpen={isGenerating} progressMessage={progressMessage} elapsedTime={elapsedTime} />
        </div>
    );
}
