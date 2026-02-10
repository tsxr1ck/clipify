import { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

interface AuthLayoutProps {
    children: ReactNode;
    title: string;
    subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
    return (
        <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
            {/* Decorative Left Side */}
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r border-white/10">
                <div className="absolute inset-0 bg-zinc-900" />
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 animate-gradient-shift" />

                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-float" />
                    <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-float-up" style={{ animationDelay: '1s' }} />
                </div>

                <div className="relative z-20 flex items-center gap-2 text-lg font-medium">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white to-white/70 flex items-center justify-center shadow-lg">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="font-bold tracking-tight">Clipify</span>
                </div>

                <div className="relative z-20 mt-auto">
                    <blockquote className="space-y-2">
                        <p className="text-lg">
                            &ldquo;Unleash your creativity with AI-powered video generation. Transform your ideas into stunning visual stories in seconds.&rdquo;
                        </p>
                        <footer className="text-sm text-white/60">The Clipify Team</footer>
                    </blockquote>
                </div>
            </div>

            {/* Form Side */}
            <div className="lg:p-8 h-full flex items-center justify-center">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px] animate-scaleIn">
                    <div className="flex flex-col space-y-2 text-center">
                        {/* Mobile Logo */}
                        <div className="lg:hidden flex justify-center mb-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                        </div>

                        <h1 className="text-2xl font-semibold tracking-tight">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-sm text-muted-foreground">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    {children}

                    <p className="px-8 text-center text-sm text-muted-foreground">
                        By clicking continue, you agree to our{" "}
                        <a href="#" className="underline underline-offset-4 hover:text-primary">
                            Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="#" className="underline underline-offset-4 hover:text-primary">
                            Privacy Policy
                        </a>
                        .
                    </p>
                </div>
            </div>
        </div>
    );
}
