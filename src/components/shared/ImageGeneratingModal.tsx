import { useEffect, useState } from 'react';
import { ImageIcon, Sparkles, Wand2, Palette, Brush } from 'lucide-react';

interface ImageGeneratingModalProps {
    isOpen: boolean;
    progressMessage: string;
}

const creativeMessages = [
    "🎨 Mixing the perfect color palette...",
    "✨ Sprinkling some AI magic dust...",
    "🖌️ Adding the finishing brushstrokes...",
    "🌈 Bringing colors to life...",
    "💫 Crafting every pixel with care...",
    "🎭 Capturing the perfect expression...",
    "🔮 Channeling creative energy...",
    "🌟 Almost there, patience creates perfection...",
];

const artStyles = [
    { name: "Rendering", color: "from-pink-500 to-rose-500" },
    { name: "Composing", color: "from-cyan-500 to-blue-500" },
    { name: "Styling", color: "from-purple-500 to-violet-500" },
    { name: "Polishing", color: "from-amber-500 to-orange-500" },
];

export function ImageGeneratingModal({ isOpen, progressMessage }: ImageGeneratingModalProps) {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    const [currentStyleIndex, setCurrentStyleIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    // Rotate messages every 2 seconds
    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => {
            setCurrentMessageIndex(prev => (prev + 1) % creativeMessages.length);
        }, 2000);
        return () => clearInterval(interval);
    }, [isOpen]);

    // Cycle through art styles
    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => {
            setCurrentStyleIndex(prev => (prev + 1) % artStyles.length);
        }, 1500);
        return () => clearInterval(interval);
    }, [isOpen]);

    // Animate progress
    useEffect(() => {
        if (!isOpen) {
            setProgress(0);
            return;
        }
        const interval = setInterval(() => {
            setProgress(prev => prev >= 95 ? 95 : prev + Math.random() * 5);
        }, 500);
        return () => clearInterval(interval);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
            {/* Animated gradient background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-linear-to-br from-cyan-500/10 via-transparent to-purple-500/10 animate-gradient-shift" />

                {/* Floating paint drops */}
                {[...Array(15)].map((_, i) => (
                    <div
                        key={i}
                        className={`absolute w-4 h-4 rounded-full blur-sm animate-float-up bg-linear-to-br ${['from-cyan-400 to-blue-500', 'from-purple-400 to-pink-500', 'from-amber-400 to-orange-500'][i % 3]
                            }`}
                        style={{
                            left: `${10 + (i * 6)}%`,
                            animationDelay: `${i * 0.3}s`,
                            animationDuration: `${3 + Math.random() * 2}s`,
                        }}
                    />
                ))}
            </div>

            <div className="relative w-full max-w-md mx-4">
                {/* Outer glow */}
                <div className={`absolute -inset-2 rounded-3xl blur-xl opacity-40 animate-pulse bg-linear-to-r ${artStyles[currentStyleIndex].color}`} />

                <div className="relative glass-card p-8 animate-scaleIn">
                    {/* Animated brush/palette icon */}
                    <div className="relative w-32 h-32 mx-auto mb-6">
                        {/* Rotating color wheel */}
                        <div className="absolute inset-0 animate-spin-slow">
                            {[0, 60, 120, 180, 240, 300].map((rotation, i) => (
                                <div
                                    key={i}
                                    className="absolute w-4 h-12 origin-bottom left-1/2 -ml-2"
                                    style={{
                                        transform: `rotate(${rotation}deg)`,
                                        bottom: '50%',
                                    }}
                                >
                                    <div
                                        className={`w-4 h-4 rounded-full ${['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500', 'bg-purple-500'][i]
                                            } animate-pulse`}
                                        style={{ animationDelay: `${i * 0.1}s` }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Center canvas icon */}
                        <div className="absolute inset-8 rounded-2xl bg-linear-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                            <ImageIcon className="w-10 h-10 text-white animate-pulse" />
                        </div>

                        {/* Orbiting elements */}
                        <div className="absolute inset-0 animate-orbit">
                            <Brush className="absolute -top-1 left-1/2 -ml-3 w-6 h-6 text-pink-400" />
                        </div>
                        <div className="absolute inset-0 animate-orbit-reverse">
                            <Palette className="absolute -bottom-1 left-1/2 -ml-3 w-6 h-6 text-purple-400" />
                        </div>
                    </div>

                    {/* Title with animated gradient */}
                    <h3 className={`text-2xl font-bold text-center mb-2 bg-clip-text text-transparent bg-linear-to-r ${artStyles[currentStyleIndex].color} transition-all duration-500`}>
                        Creating Your Image
                    </h3>

                    {/* Current action */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                        <span className="text-foreground font-medium">
                            {progressMessage || artStyles[currentStyleIndex].name}
                        </span>
                    </div>

                    {/* Progress bar with gradient */}
                    <div className="relative h-3 bg-muted/30 rounded-full overflow-hidden mb-4">
                        <div
                            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 bg-linear-to-r ${artStyles[currentStyleIndex].color}`}
                            style={{ width: `${progress}%` }}
                        />
                        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                    </div>

                    {/* Animated creative message */}
                    <div className="min-h-[48px] flex items-center justify-center">
                        <p
                            className="text-sm text-muted-foreground text-center animate-fadeIn"
                            key={currentMessageIndex}
                        >
                            {creativeMessages[currentMessageIndex]}
                        </p>
                    </div>

                    {/* Wand animation */}
                    <div className="flex justify-center mt-4">
                        <Wand2 className="w-6 h-6 text-primary animate-wand" />
                    </div>

                    {/* Info text */}
                    <p className="text-xs text-muted-foreground text-center mt-4 opacity-70">
                        Image generation typically takes 10-30 seconds
                    </p>
                </div>
            </div>
        </div>
    );
}
