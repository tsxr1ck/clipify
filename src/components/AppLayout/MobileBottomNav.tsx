import { NavLink } from 'react-router-dom';
import { Video, Image, Wand2, Library, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const navItems = [
    { to: '/video', icon: Video, label: 'Video' },
    { to: '/image', icon: Image, label: 'Image' },
    { to: '/scene-builder', icon: Wand2, label: 'AI Scene' },
    { to: '/library', icon: Library, label: 'Library' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass bg-background/80 backdrop-blur-xl border-t border-white/10 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 active:scale-95 relative group",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute top-0 inset-x-0 h-0.5 bg-linear-to-r from-transparent via-primary to-transparent shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                )}
                {isActive && (
                  <div className="absolute inset-0 bg-primary/5 rounded-xl m-1" />
                )}
                <Icon className={cn(
                  "w-5 h-5 mb-1 transition-transform duration-200",
                  isActive && "scale-110"
                )} />
                <span className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-primary font-semibold" : ""
                )}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

