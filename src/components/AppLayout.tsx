import { Outlet, NavLink } from 'react-router-dom';
import { Sun, Moon, Sparkles, Video, Image } from 'lucide-react';
import { useEffect, useState } from 'react';
import { themeStorage } from '@/utils/indexedDB';

export function AppLayout() {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

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
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="w-full py-4 px-6 flex items-center justify-between">
                {/* Logo */}
                <NavLink to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold gradient-text">Clipify</h1>
                        <p className="text-xs text-muted-foreground -mt-0.5">AI-powered content creation</p>
                    </div>
                </NavLink>

                {/* Navigation Tabs */}
                <nav className="flex items-center gap-1 p-1 rounded-xl glass">
                    <NavLink
                        to="/video"
                        className={({ isActive }) =>
                            `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                                : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
                            }`
                        }
                    >
                        <Video className="w-4 h-4" />
                        Video
                    </NavLink>
                    <NavLink
                        to="/image"
                        className={({ isActive }) =>
                            `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                                : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
                            }`
                        }
                    >
                        <Image className="w-4 h-4" />
                        Image
                    </NavLink>
                </nav>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-xl glass hover:bg-primary/10 transition-colors"
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {theme === 'dark' ? (
                        <Sun className="w-5 h-5 text-foreground" />
                    ) : (
                        <Moon className="w-5 h-5 text-foreground" />
                    )}
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full px-4 pb-12">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="w-full py-4 text-center text-xs text-muted-foreground">
                <p>
                    Powered by{' '}
                    <a
                        href="https://aistudio.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                    >
                        Google AI Studio
                    </a>
                    {' '}• BYOK Model • Your data stays local
                </p>
            </footer>
        </div>
    );
}
