import { useEffect, useState } from 'react';
import { Video, Sparkles, Wand2, Film, Clapperboard } from 'lucide-react';

interface VideoGeneratingModalProps {
    isOpen: boolean;
    progressMessage: string;
    elapsedTime: number;
}

const funFacts = [
    "🎬 Veo 3.1 generates videos frame by frame, each one rendered with AI magic",
    "🎨 Each frame is crafted to maintain visual consistency with your style",
    "🎭 Character expressions are dynamically generated to match the dialogue",
    "✨ The AI is carefully blending lighting and color to match your chosen aesthetic",
    "🎥 Motion is being interpolated to create smooth, natural movement",
    "🌟 Your video is being rendered at high quality - patience pays off!",
    "🎵 Audio and visuals are being synchronized for a seamless experience",
    "🔮 AI is working its magic to bring your vision to life",
];

const stages = [
    { label: "Preparing prompt", icon: Wand2, duration: 3 },
    { label: "Initializing model", icon: Sparkles, duration: 5 },
    { label: "Generating frames", icon: Film, duration: 30 },
    { label: "Rendering video", icon: Clapperboard, duration: 20 },
    { label: "Finalizing", icon: Video, duration: 10 },
];

export function VideoGeneratingModal({ isOpen, progressMessage, elapsedTime }: VideoGeneratingModalProps) {
    const [currentFactIndex, setCurrentFactIndex] = useState(0);
    const [dots, setDots] = useState('');

    // Rotate fun facts every 4 seconds
    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => {
            setCurrentFactIndex(prev => (prev + 1) % funFacts.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [isOpen]);

    // Animate dots
    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, [isOpen]);

    // Calculate current stage based on elapsed time
    const getCurrentStage = () => {
        let accumulated = 0;
        for (let i = 0; i < stages.length; i++) {
            accumulated += stages[i].duration;
            if (elapsedTime < accumulated) return i;
        }
        return stages.length - 1;
    };

    const currentStage = getCurrentStage();
    const CurrentIcon = stages[currentStage].icon;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 rounded-full bg-purple-500/30 animate-float"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${3 + Math.random() * 4}s`,
                        }}
                    />
                ))}
            </div>

            <div className="relative w-full max-w-lg mx-4 glass-card p-8 animate-scaleIn">
                {/* Glowing ring animation */}
                <div className="absolute -inset-1 bg-linear-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-3xl blur-lg opacity-30 animate-pulse-glow" />

                <div className="relative">
                    {/* Main icon with rotating ring */}
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        {/* Rotating outer ring */}
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 border-r-blue-500 animate-spin-slow" />
                        {/* Rotating inner ring (opposite direction) */}
                        <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-cyan-500 border-l-purple-500 animate-reverse-spin" />
                        {/* Center icon */}
                        <div className="absolute inset-4 rounded-full bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center animate-pulse">
                            <CurrentIcon className="w-8 h-8 text-white" />
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-center gradient-text mb-2">
                        Generating Video{dots}
                    </h3>

                    {/* Progress message */}
                    <p className="text-center text-foreground mb-4">
                        {progressMessage || stages[currentStage].label}
                    </p>

                    {/* Timer */}
                    <div className="flex justify-center items-center gap-2 mb-6">
                        <div className="px-4 py-2 rounded-xl bg-muted/30 font-mono text-lg">
                            {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}
                        </div>
                        <span className="text-muted-foreground text-sm">elapsed</span>
                    </div>

                    {/* Stage progress */}
                    <div className="flex justify-between mb-6">
                        {stages.map((stage, index) => {
                            const StageIcon = stage.icon;
                            const isActive = index === currentStage;
                            const isComplete = index < currentStage;
                            return (
                                <div
                                    key={index}
                                    className={`flex flex-col items-center transition-all duration-300 ${isActive ? 'scale-110' : 'opacity-50'
                                        }`}
                                >
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isComplete
                                            ? 'bg-green-500/20 text-green-400'
                                            : isActive
                                                ? 'bg-primary/20 text-primary animate-pulse'
                                                : 'bg-muted/20 text-muted-foreground'
                                            }`}
                                    >
                                        <StageIcon className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] mt-1 text-center max-w-[60px] leading-tight">
                                        {stage.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-muted/30 rounded-full overflow-hidden mb-6">
                        <div
                            className="h-full bg-linear-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-full transition-all duration-1000 animate-shimmer"
                            style={{
                                width: `${Math.min(100, (elapsedTime / 60) * 100)}%`,
                                backgroundSize: '200% 100%',
                            }}
                        />
                    </div>

                    {/* Fun fact */}
                    <div className="p-4 rounded-xl bg-muted/10 border border-muted/20">
                        <p className="text-sm text-muted-foreground text-center animate-fadeIn" key={currentFactIndex}>
                            {funFacts[currentFactIndex]}
                        </p>
                    </div>

                    {/* Warning text */}
                    <p className="text-xs text-muted-foreground text-center mt-4">
                        Please don't close this window. Video generation typically takes 30-60 seconds.
                    </p>
                </div>
            </div>
        </div>
    );
}
