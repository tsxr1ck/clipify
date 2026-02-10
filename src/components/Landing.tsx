import { NavLink } from 'react-router-dom';
import { Video, Image, Sparkles, ArrowRight, Wand2, Play, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export function Landing() {
    return (
        <div className="w-full max-w-6xl mx-auto space-y-12">
            {/* Hero Section */}
            <div className="relative text-center py-16 lg:py-24 overflow-hidden rounded-3xl glass border-none">
                {/* Background Decorations */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float-up" />
                </div>

                <div className="relative z-10 px-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6 animate-scaleIn">
                        <Sparkles className="w-3 h-3" />
                        <span>New: AI Scene Builder Available</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight animate-scaleIn" style={{ animationDelay: '0.1s' }}>
                        Create stunning content <br />
                        <span className="gradient-text">powered by AI</span>
                    </h1>

                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-scaleIn" style={{ animationDelay: '0.2s' }}>
                        Transform your ideas into professional videos and images with our advanced AI tools.
                        Start creating in seconds.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-scaleIn" style={{ animationDelay: '0.3s' }}>
                        <Button asChild size="lg" variant="gradient" className="rounded-full px-8">
                            <NavLink to="/video">
                                <Play className="w-4 h-4 mr-2 fill-current" />
                                Start Creating
                            </NavLink>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="rounded-full px-8 glass border-white/10 hover:bg-white/5">
                            <NavLink to="/library">
                                View Library
                            </NavLink>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tools Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Video Generation */}
                <NavLink to="/video" className="group">
                    <Card className="h-full hover:border-primary/50 transition-colors">
                        <CardHeader>
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                                <Video className="w-6 h-6 text-white" />
                            </div>
                            <CardTitle>AI Video Generator</CardTitle>
                            <CardDescription>Create videos from text or images</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Generate cinematic videos with custom characters, consistent styles, and fluid motion using Veo 3.1.
                            </p>
                        </CardContent>
                        <CardFooter>
                            <span className="text-sm font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                                Create Video <ArrowRight className="w-4 h-4" />
                            </span>
                        </CardFooter>
                    </Card>
                </NavLink>

                {/* Image Generation */}
                <NavLink to="/image" className="group">
                    <Card className="h-full hover:border-cyan-500/50 transition-colors">
                        <CardHeader>
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
                                <Image className="w-6 h-6 text-white" />
                            </div>
                            <CardTitle>AI Image Generator</CardTitle>
                            <CardDescription>Generate high-quality visuals</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Create stunning illustrations, photorealistic images, and concept art with Imagen 4.0.
                            </p>
                        </CardContent>
                        <CardFooter>
                            <span className="text-sm font-medium text-cyan-500 flex items-center gap-1 group-hover:gap-2 transition-all">
                                Create Image <ArrowRight className="w-4 h-4" />
                            </span>
                        </CardFooter>
                    </Card>
                </NavLink>

                {/* Scene Builder */}
                <NavLink to="/scene-builder" className="group">
                    <Card className="h-full hover:border-amber-500/50 transition-colors">
                        <CardHeader>
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                                <Wand2 className="w-6 h-6 text-white" />
                            </div>
                            <CardTitle>Scene Builder</CardTitle>
                            <CardDescription>Compose complex scenes</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Build multi-shot scenes, storyboard your ideas, and manage complex video projects.
                            </p>
                        </CardContent>
                        <CardFooter>
                            <span className="text-sm font-medium text-amber-500 flex items-center gap-1 group-hover:gap-2 transition-all">
                                Build Scene <ArrowRight className="w-4 h-4" />
                            </span>
                        </CardFooter>
                    </Card>
                </NavLink>
            </div>

            {/* Quick Stats / Recent Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass p-4 rounded-xl flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                        <Zap className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Credits Balance</p>
                        <p className="font-bold text-lg">Active</p>
                    </div>
                </div>
                {/* Placeholders for other stats */}
            </div>
        </div>
    );
}
