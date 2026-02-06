import { NavLink } from 'react-router-dom';
import { Video, Image, Sparkles, ArrowRight } from 'lucide-react';

export function Landing() {
    return (
        <div className="w-full max-w-4xl mx-auto py-12 animate-fadeIn">
            {/* Hero Section */}
            <div className="text-center mb-16">
                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 flex items-center justify-center animate-pulse-glow">
                    <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                    <span className="gradient-text">Create stunning content</span>
                    <br />
                    <span className="text-foreground">with AI</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                    Generate beautiful images and videos using your own styles and characters.
                    Powered by Google AI.
                </p>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Video Card */}
                <NavLink to="/video" className="group">
                    <div className="glass-card p-8 h-full transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10">
                        <div className="w-14 h-14 mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                            <Video className="w-7 h-7 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground mb-2">Generate Video</h2>
                        <p className="text-muted-foreground mb-4">
                            Create AI-powered videos with custom characters, scenes, and dialogue using Veo 3.1.
                        </p>
                        <div className="flex items-center text-primary font-medium group-hover:gap-2 transition-all">
                            Start creating
                            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </NavLink>

                {/* Image Card */}
                <NavLink to="/image" className="group">
                    <div className="glass-card p-8 h-full transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-cyan-500/10">
                        <div className="w-14 h-14 mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                            <Image className="w-7 h-7 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground mb-2">Generate Image</h2>
                        <p className="text-muted-foreground mb-4">
                            Create stunning images with your characters and styles using Imagen 3.
                        </p>
                        <div className="flex items-center text-primary font-medium group-hover:gap-2 transition-all">
                            Start creating
                            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </NavLink>
            </div>

            {/* Future Library Placeholder */}
            <div className="mt-16 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-muted-foreground text-sm">
                    <Sparkles className="w-4 h-4" />
                    Library & History coming soon
                </div>
            </div>
        </div>
    );
}
