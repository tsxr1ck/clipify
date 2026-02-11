import { useLocation } from 'react-router-dom';
import {
    Sun,
    Moon,
    Wallet,
    Menu,
    Bell,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCredits } from '@/context/CreditsContext';
import { useAuth } from '@/context/AuthContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuGroup
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Check if exists

interface HeaderProps {
    onMenuClick?: () => void;
    toggleTheme: () => void;
    theme: 'dark' | 'light';
}

export function Header({ onMenuClick, toggleTheme, theme }: HeaderProps) {
    const location = useLocation();
    const { balance, isLoading: creditsLoading, isLowBalance } = useCredits();
    const { user, logout } = useAuth();

    // Get title from path
    const getTitle = () => {
        switch (location.pathname) {
            case '/': return 'Dashboard';
            case '/video': return 'Video Generator';
            case '/image': return 'Image Generator';
            case '/scene-builder': return 'Scene Builder';
            case '/library': return 'Library';
            case '/profile': return 'Profile';
            default: return 'Clipify';
        }
    };

    return (
        <header className="h-16 flex items-center justify-between px-6 border-b border-border/50 glass bg-background/50 sticky top-0 z-30 backdrop-blur-md">
            <div className="flex items-center gap-4">
                {/* Mobile Menu Trigger */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={onMenuClick}
                >
                    <Menu className="w-5 h-5" />
                </Button>

                {/* Page Title */}
                <h1 className="text-lg font-semibold tracking-tight text-foreground hidden sm:block">
                    {getTitle()}
                </h1>
            </div>

            <div className="flex items-center gap-3">
                {/* Credits Badge */}
                <div className={`
          hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full glass
          ${isLowBalance ? 'border-amber-500/50 bg-amber-500/10' : 'bg-primary/5 border-primary/20'}
          transition-all
        `}>
                    <Wallet className={`w-3.5 h-3.5 ${isLowBalance ? 'text-amber-500' : 'text-primary'}`} />
                    {creditsLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    ) : (
                        <span className={`text-xs font-semibold ${isLowBalance ? 'text-amber-500' : 'text-foreground'}`}>
                            ${balance.toFixed(2)}
                        </span>
                    )}
                </div>

                {/* Notifications (Placeholder) */}
                <Button variant="ghost" size="icon-sm" className="rounded-full">
                    <Bell className="w-4 h-4 text-muted-foreground" />
                </Button>

                {/* Theme Toggle */}
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={toggleTheme}
                    className="rounded-full"
                >
                    {theme === 'dark' ? (
                        <Sun className="w-4 h-4 text-foreground" />
                    ) : (
                        <Moon className="w-4 h-4 text-foreground" />
                    )}
                </Button>

                {/* Profile Dropdown */}
                {/* NOTE: We haven't implemented DropdownMenu UI component yet, using standard div for now or simple button */}
                {/* Profile Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full pointer-events-auto p-0 hover:scale-105 transition-transform">
                            <Avatar className="h-8 w-8 border border-primary/20 bg-background">
                                <AvatarImage src={user?.profile?.avatarUrl} alt={user?.email || 'User'} className="object-cover" />
                                <AvatarFallback className="bg-linear-to-br from-primary to-purple-500 text-white text-xs font-bold">
                                    {user?.email?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 glass border-white/10" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user?.profile?.displayName || 'User'}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user?.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => window.location.href = '/profile'}>
                                Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.location.href = '/profile?tab=history'}>
                                Billing
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.location.href = '/profile?tab=settings'}>
                                Settings
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
