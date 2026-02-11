import { useState, useRef, useCallback } from 'react';
import {
    ImagePlay,
    Upload,
    X,
    Wand2,
    Loader2,
    Sparkles,
    Download,
    RefreshCw,
    DollarSign,
    Film,
    Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { processImageFile, base64ToDataUrl } from '@/utils/imageProcessing';
import {
    generateVideoWithLogging,
    analyzeReferenceImage,
} from '@/services/api/geminiService';
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

export function VideoFromReference() {
    const { user } = useAuth();
    const isPro = user?.role === 'pro';
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Image state
    const [uploadedImage, setUploadedImage] = useState<{ base64: string; mimeType: string } | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [imageAnalysis, setImageAnalysis] = useState<string | null>(null);

    // Form state
    const [actionDescription, setActionDescription] = useState('');
    const [duration, setDuration] = useState<VideoDuration>(4);

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

    // Timer
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const estimatedCostMXN = duration * PRICING.VIDEO_PER_SECOND;
    const estimatedCostUSD = estimatedCostMXN / USD_TO_MXN;

    const handleFileSelect = useCallback(async (file: File) => {
        try {
            const result = await processImageFile(file);
            setUploadedImage({ base64: result.base64, mimeType: result.mimeType });
            setImagePreviewUrl(base64ToDataUrl(result.base64, result.mimeType));
            setImageAnalysis(null);
            setError(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to process image');
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleFileSelect(file);
        }
    }, [handleFileSelect]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const clearImage = () => {
        setUploadedImage(null);
        setImagePreviewUrl(null);
        setImageAnalysis(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleAnalyzeImage = async () => {
        if (!uploadedImage) return;
        setIsAnalyzing(true);
        try {
            const result = await analyzeReferenceImage(uploadedImage.base64, uploadedImage.mimeType);
            setImageAnalysis(result.description);
            toast.success('Image analyzed successfully!');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to analyze image');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGenerate = async () => {
        if (!uploadedImage || !actionDescription.trim()) return;
        setIsGenerating(true);
        setError(null);
        setProgressMessage('');
        setElapsedTime(0);

        timerRef.current = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);

        try {
            const promptParts = [
                'REFERENCE IMAGE: This video should use the uploaded image as the starting frame and visual reference.',
            ];
            if (imageAnalysis) {
                promptParts.push(`IMAGE CONTEXT: ${imageAnalysis}`);
            }
            promptParts.push(`ACTION/MOTION: ${actionDescription.trim()}`);
            promptParts.push(`DURATION: ${duration} seconds`);
            promptParts.push('Create a smooth, natural video that brings this still image to life with the described action. Maintain visual consistency with the reference image throughout.');

            const prompt = promptParts.join('\n\n');

            const result = await generateVideoWithLogging(
                uploadedImage.base64,
                prompt,
                duration,
                {
                    title: `Ref Video: ${actionDescription.substring(0, 40)}`,
                    sceneConfig: { actionDescription, duration, hasReferenceImage: true }
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

            toast.success('Video generated successfully!');
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
        link.download = `clipify-ref-video-${Date.now()}.mp4`;
        link.click();
    };

    const handleStartNew = () => {
        setGeneratedVideo(null);
        setError(null);
        setActionDescription('');
    };

    if (!isPro) {
        return (
            <div className="w-full max-w-lg mx-auto text-center py-20">
                <div className="glass rounded-3xl p-12 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-lg">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold">Pro Feature</h2>
                    <p className="text-muted-foreground">
                        Video from Reference Image is a Pro feature. Upgrade to access image-to-video generation.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto px-4 animate-scaleIn pb-24">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium mb-3">
                    <ImagePlay className="w-3 h-3" />
                    <span>Pro Feature</span>
                </div>
                <h2 className="text-3xl font-bold gradient-text">Video from Reference Image</h2>
                <p className="text-muted-foreground mt-2">Upload an image and bring it to life with AI-powered video</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Image Upload */}
                <div className="space-y-4">
                    <Card className="glass-card border-none p-6">
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                            <Upload className="w-4 h-4" /> Reference Image
                        </h3>

                        {!uploadedImage ? (
                            <div
                                className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-12 text-center cursor-pointer hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all"
                                onClick={() => fileInputRef.current?.click()}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                            >
                                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                                <p className="text-sm text-foreground font-medium">Drop an image or click to upload</p>
                                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP up to 20MB</p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*"
                                    onChange={handleInputChange}
                                    className="hidden"
                                />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="relative rounded-xl overflow-hidden">
                                    <img
                                        src={imagePreviewUrl!}
                                        alt="Reference"
                                        className="w-full rounded-xl object-contain max-h-[400px] bg-black/5"
                                    />
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="absolute top-2 right-2 h-8 w-8 rounded-full backdrop-blur-md bg-black/40 hover:bg-black/60 text-white"
                                        onClick={clearImage}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>

                                <Button
                                    onClick={handleAnalyzeImage}
                                    variant="outline"
                                    className="w-full"
                                    disabled={isAnalyzing}
                                >
                                    {isAnalyzing ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                                    ) : (
                                        <><Wand2 className="w-4 h-4 mr-2" /> Analyze Image with AI</>
                                    )}
                                </Button>
                            </div>
                        )}
                    </Card>

                    {/* AI Analysis Result */}
                    {imageAnalysis && (
                        <Card className="glass-card border-none p-5">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                                    <Wand2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">AI Analysis</p>
                                    <p className="text-sm text-foreground">{imageAnalysis}</p>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Right: Controls */}
                <div className="space-y-6">
                    {/* Action Description */}
                    <Card className="glass-card border-none p-6 space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Film className="w-4 h-4" /> Video Configuration
                        </h3>

                        <div className="space-y-1.5">
                            <Label className="text-xs">
                                What should happen in the video? <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                                value={actionDescription}
                                onChange={e => setActionDescription(e.target.value)}
                                placeholder="Describe the motion, animation, or action you want to see..."
                                className="glass-input min-h-[120px] text-sm"
                            />
                        </div>

                        <div className="space-y-2">
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
                    </Card>

                    {/* Cost Estimate */}
                    <Card className="glass-card border-none p-5">
                        <div className="flex items-center justify-between mb-3">
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

                    {/* Generate Button */}
                    <Button
                        onClick={handleGenerate}
                        disabled={!uploadedImage || !actionDescription.trim() || isGenerating}
                        className="w-full btn-gradient py-6 text-base shadow-xl shadow-primary/20"
                    >
                        {isGenerating ? (
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating...</>
                        ) : (
                            <><Sparkles className="w-5 h-5 mr-2" /> Generate Video from Image</>
                        )}
                    </Button>

                    {error && (
                        <p className="text-sm text-destructive text-center">{error}</p>
                    )}
                </div>
            </div>

            {/* Video Preview */}
            {generatedVideo && (
                <Card className="glass-card border-none p-6 mt-8">
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                        <Film className="w-4 h-4" /> Generated Video
                    </h3>
                    <div className="rounded-xl overflow-hidden bg-black">
                        <video
                            src={base64ToDataUrl(generatedVideo.base64, generatedVideo.mimeType)}
                            controls
                            autoPlay
                            loop
                            className="w-full max-h-[500px] object-contain"
                        />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <Button onClick={handleDownload} variant="outline" className="w-full">
                            <Download className="w-4 h-4 mr-2" /> Save
                        </Button>
                        <Button onClick={handleStartNew} variant="ghost" className="w-full">
                            <RefreshCw className="w-4 h-4 mr-2" /> New
                        </Button>
                    </div>
                </Card>
            )}

            <VideoGeneratingModal isOpen={isGenerating} progressMessage={progressMessage} elapsedTime={elapsedTime} />
        </div>
    );
}
