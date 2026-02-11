import { NavLink, useLocation } from 'react-router-dom';
import {
    Video,
    Image,
    Wand2,
    Library,
    Home,
    ChevronLeft,
    Menu,
    Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface SidebarProps {
    className?: string;
}

export function Sidebar({ className }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();

    const navItems = [
        { icon: Home, label: 'Dashboard', href: '/' },
        { icon: Video, label: 'Video Generator', href: '/video' },
        { icon: Image, label: 'Image Generator', href: '/image' },
        { icon: Wand2, label: 'Scene Builder', href: '/scene-builder' },
        { icon: Library, label: 'Library', href: '/library' },
    ];

    return (
        <aside
            className={cn(
                "hidden lg:flex flex-col h-screen fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out border-r border-border/50",
                collapsed ? "w-20" : "w-72",
                "glass bg-sidebar/50 backdrop-blur-xl",
                className
            )}
        >
            {/* Logo Area */}
            <div className={cn(
                "h-16 flex items-center px-6 border-b border-border/50",
                collapsed ? "justify-center px-0" : "justify-between"
            )}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-linear-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    {!collapsed && (
                        <div className="flex flex-col">
                            <span className="font-bold text-lg tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                                Clipify
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                AI Studio
                            </span>
                        </div>
                    )}
                </div>

                {!collapsed && (
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setCollapsed(true)}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* Navigation */}
            <div className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                        <NavLink
                            key={item.href}
                            to={item.href}
                            className={({ isActive: active }) => cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                                active
                                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 font-medium"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                                collapsed && "justify-center px-0 py-3"
                            )}
                        >
                            <item.icon className={cn(
                                "w-5 h-5 transition-transform duration-200",
                                !isActive && "group-hover:scale-110",
                                isActive && "animate-pulse"
                            )} />

                            {!collapsed && (
                                <span>{item.label}</span>
                            )}

                            {/* Tooltip for collapsed state */}
                            {collapsed && (
                                <div className="absolute left-full ml-4 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none border border-border">
                                    {item.label}
                                </div>
                            )}
                        </NavLink>
                    )
                })}
            </div>

            {/* Expand Button (only when collapsed) */}
            {collapsed && (
                <div className="p-3 border-t border-border/50 flex justify-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCollapsed(false)}
                    >
                        <Menu className="w-5 h-5" />
                    </Button>
                </div>
            )}

            {/* Footer / User Profile User Menu Placeholder */}
            {!collapsed && (
                <div className="p-4 border-t border-border/50">
                    {/* We can inject the user menu here via props or context in MainLayout */}
                </div>
            )}
        </aside>
    );
}
