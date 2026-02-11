import { NavLink } from 'react-router-dom';
import { Video, Image, Sparkles, ArrowRight, Wand2, Play, Zap, Headphones, ImagePlay } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export function Landing() {
    return (
        <div className="w-full space-y-10">
            {/* Welcome Bar */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
                        <Sparkles className="w-3 h-3" />
                        <span>New: AI Scene Builder Available</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                        Create stunning content <span className="gradient-text">powered by AI</span>
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Transform your ideas into professional videos and images.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button asChild size="default" variant="default" className="rounded-full px-6">
                        <NavLink to="/video">
                            <Play className="w-4 h-4 mr-2 fill-current" />
                            Start Creating
                        </NavLink>
                    </Button>
                    <Button asChild size="default" variant="outline" className="rounded-full px-6">
                        <NavLink to="/library">
                            View Library
                        </NavLink>
                    </Button>
                </div>
            </div>

            {/* Section: Creation Tools */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Creation Tools</h2>
                    <span className="text-sm text-muted-foreground">5 tools</span>
                </div>
                <div className="flex overflow-x-auto gap-4 pb-2 snap-x snap-mandatory scrollbar-hide">
                    {/* Video Generation */}
                    <NavLink to="/video" className="group snap-start shrink-0 w-[300px]">
                        <Card className="h-full hover:border-primary/50 transition-colors">
                            <CardHeader>
                                <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
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
                    <NavLink to="/image" className="group snap-start shrink-0 w-[300px]">
                        <Card className="h-full hover:border-cyan-500/50 transition-colors">
                            <CardHeader>
                                <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
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
                    <NavLink to="/scene-builder" className="group snap-start shrink-0 w-[300px]">
                        <Card className="h-full hover:border-amber-500/50 transition-colors">
                            <CardHeader>
                                <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
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

                    {/* ASMR Videos (Pro) */}
                    <NavLink to="/asmr" className="group snap-start shrink-0 w-[300px]">
                        <Card className="h-full hover:border-pink-500/50 transition-colors relative">
                            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-bold">PRO</div>
                            <CardHeader>
                                <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-pink-500 to-rose-600 flex items-center justify-center mb-4 shadow-lg shadow-pink-500/20 group-hover:scale-110 transition-transform">
                                    <Headphones className="w-6 h-6 text-white" />
                                </div>
                                <CardTitle>ASMR Videos</CardTitle>
                                <CardDescription>Satisfying ASMR content</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Pick from curated ASMR templates and generate satisfying, texture-focused videos.
                                </p>
                            </CardContent>
                            <CardFooter>
                                <span className="text-sm font-medium text-pink-500 flex items-center gap-1 group-hover:gap-2 transition-all">
                                    Create ASMR <ArrowRight className="w-4 h-4" />
                                </span>
                            </CardFooter>
                        </Card>
                    </NavLink>

                    {/* Image to Video (Pro) */}
                    <NavLink to="/video-ref" className="group snap-start shrink-0 w-[300px]">
                        <Card className="h-full hover:border-emerald-500/50 transition-colors relative">
                            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-bold">PRO</div>
                            <CardHeader>
                                <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                                    <ImagePlay className="w-6 h-6 text-white" />
                                </div>
                                <CardTitle>Image to Video</CardTitle>
                                <CardDescription>Animate any image</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Upload a reference image and bring it to life with AI-powered video generation.
                                </p>
                            </CardContent>
                            <CardFooter>
                                <span className="text-sm font-medium text-emerald-500 flex items-center gap-1 group-hover:gap-2 transition-all">
                                    Animate Image <ArrowRight className="w-4 h-4" />
                                </span>
                            </CardFooter>
                        </Card>
                    </NavLink>
                </div>
            </section>

            {/* Section: Quick Stats */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Quick Stats</h2>
                </div>
                <div className="flex overflow-x-auto gap-4 pb-2 snap-x snap-mandatory scrollbar-hide">
                    <div className="glass p-4 rounded-xl flex items-center gap-4 snap-start shrink-0 w-[240px]">
                        <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Credits Balance</p>
                            <p className="font-bold text-lg">Active</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section: Recent Creations */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Recent Creations</h2>
                    <NavLink to="/library" className="text-sm text-primary hover:underline flex items-center gap-1">
                        View all <ArrowRight className="w-3 h-3" />
                    </NavLink>
                </div>
                <div className="flex overflow-x-auto gap-4 pb-2 snap-x snap-mandatory scrollbar-hide">
                    <div className="glass p-6 rounded-xl flex items-center justify-center snap-start shrink-0 w-[300px] h-[180px] text-muted-foreground text-sm">
                        Your recent generations will appear here
                    </div>
                </div>
            </section>
        </div>
    );
}
