import { Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileBottomNav } from '../AppLayout/MobileBottomNav';
import { themeStorage } from '@/utils/indexedDB'; // Reusing from existing AppLayout logic

export function MainLayout() {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [sidebarOpen, setSidebarOpen] = useState(false); // For mobile

    // Initialize theme (copied logic to maintain preferences)
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
        <div className="min-h-screen flex bg-background text-foreground transition-colors duration-300">
            {/* Sidebar - Desktop */}
            <Sidebar className="hidden lg:flex" />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 lg:ml-72 transition-all duration-300">
                <Header
                    theme={theme}
                    toggleTheme={toggleTheme}
                    onMenuClick={() => setSidebarOpen(true)}
                />

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
                    <div className="max-w-7xl mx-auto w-full animate-scaleIn">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Mobile Bottom Nav */}
            <MobileBottomNav />
            {/* Note: Mobile Sidebar Drawer could be implemented here too using a Dialog/Drawer component */}
        </div>
    );
}
