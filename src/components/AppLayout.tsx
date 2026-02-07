import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Sun, Moon, Sparkles, Video, Image, Wallet, LogOut, User, ChevronDown, AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { themeStorage } from '@/utils/indexedDB';
import { useAuth } from '@/context/AuthContext';
import { useCredits } from '@/context/CreditsContext';

export function AppLayout() {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const { user, logout } = useAuth();
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

    // Close menu on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleTheme = async () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        await themeStorage.set(newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    const handleLogout = async () => {
        setShowUserMenu(false);
        await logout();
        navigate('/login');
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

                {/* Right Section: Credits + Theme + User */}
                <div className="flex items-center gap-3">
                    {/* Credits Badge */}
                    <div className={`
                        flex items-center gap-2 px-3 py-2 rounded-xl glass
                        ${isLowBalance ? 'ring-1 ring-amber-500/50' : ''}
                        transition-all
                    `}>
                        <Wallet className={`w-4 h-4 ${isLowBalance ? 'text-amber-500' : 'text-primary'}`} />
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
                        className="p-2 rounded-xl glass hover:bg-primary/10 transition-colors"
                        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {theme === 'dark' ? (
                            <Sun className="w-5 h-5 text-foreground" />
                        ) : (
                            <Moon className="w-5 h-5 text-foreground" />
                        )}
                    </button>

                    {/* User Menu */}
                    <div className="relative" ref={userMenuRef}>
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl glass hover:bg-primary/10 transition-all"
                        >
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                                <User className="w-4 h-4 text-white" />
                            </div>
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {showUserMenu && (
                            <div className="absolute right-0 top-full mt-2 w-56 py-2 rounded-xl glass border border-border shadow-lg z-50 animate-scaleIn origin-top-right">
                                {/* User Info */}
                                <div className="px-4 py-2 border-b border-border">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {user?.email || 'User'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Balance: ${balance.toFixed(2)} MXN
                                    </p>
                                </div>

                                {/* Menu Items */}
                                <div className="py-1">
                                    <button
                                        onClick={() => {
                                            setShowUserMenu(false);
                                            navigate('/profile');
                                        }}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-primary/10 transition-colors"
                                    >
                                        <User className="w-4 h-4" />
                                        Profile
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
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

