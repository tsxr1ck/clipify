import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Sun, Moon, Wallet, Loader2, AlertCircle } from 'lucide-react';
import { AppSidebar } from '../app-sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { MobileBottomNav } from '../AppLayout/MobileBottomNav';
import { themeStorage } from '@/utils/indexedDB';
import { useCredits } from '@/context/CreditsContext';

export function MainLayout() {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const { balance, isLoading: creditsLoading, isLowBalance } = useCredits();

    // Initialize theme
    useEffect(() => {
        async function loadTheme() {
            const savedTheme = await themeStorage.get();
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
            setTheme(initialTheme);
            document.documentElement.classList.toggle('dark', initialTheme === 'dark');
        }
        loadTheme();
    }, []);

    const toggleTheme = async () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        await themeStorage.set(newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    return (
        <SidebarProvider defaultOpen={true}>
            <AppSidebar />

            <SidebarInset className="flex flex-col  max-h-[calc(100vh-5rem)] lg:max-h-[calc(100vh-1rem)] overflow-y-auto m-2 rounded-lg bg-slate-100 border-2 border-slate-200">
                {/* Header */}
                <header className="sticky top-0 z-10 flex h-20 md:h-16 items-center gap-4 border-b border-border/50 backdrop-blur-lg supports-backdrop-filter:bg-background/60 p-2 px-4 md:px-6">
                    <SidebarTrigger />

                    <div className="flex-1" />

                    {/* Credits Badge */}
                    <div className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-lg border
                        ${isLowBalance ? 'border-amber-500/50 bg-amber-500/10' : 'bg-muted/50'}
                        transition-all
                    `}>
                        <Wallet className={`w-4 h-4 ${isLowBalance ? 'text-amber-500' : 'text-muted-foreground'}`} />
                        {creditsLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : (
                            <span className={`text-sm font-semibold ${isLowBalance ? 'text-amber-500' : 'text-foreground'}`}>
                                ${balance.toFixed(2)}
                            </span>
                        )}
                        {isLowBalance && !creditsLoading && (
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        )}
                    </div>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg border bg-muted/50 hover:bg-muted transition-colors"
                        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {theme === 'dark' ? (
                            <Sun className="w-4 h-4" />
                        ) : (
                            <Moon className="w-4 h-4" />
                        )}
                    </button>
                </header>

                {/* Main Content Area */}
                <div className="flex overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-8 max-h-[calc(100vh-4rem)] lg:max-h-[calc(100vh-6rem)]">
                    <div className="flex flex-col w-full max-w-xl lg:max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </div>
            </SidebarInset>

            {/* Mobile Bottom Nav */}
            <MobileBottomNav />
        </SidebarProvider>
    );
}
