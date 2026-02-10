import { NavLink } from 'react-router-dom';
import { Sparkles, Wallet, Sun, Moon, AlertCircle, Loader2 } from 'lucide-react';
import { useCredits } from '@/context/CreditsContext';

interface MobileHeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function MobileHeader({ theme, onToggleTheme }: MobileHeaderProps) {
  const { balance, isLoading: creditsLoading, isLowBalance } = useCredits();

  return (
    <header className="lg:hidden w-full py-3 px-4 flex items-center justify-between sticky top-0 z-40 glass border-b border-border">
      {/* Logo */}
      <NavLink to="/" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <h1 className="text-lg font-bold gradient-text">Clipify</h1>
      </NavLink>

      {/* Credits + Theme */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg glass ${
          isLowBalance ? 'ring-1 ring-amber-500/50' : ''
        }`}>
          <Wallet className={`w-3.5 h-3.5 ${isLowBalance ? 'text-amber-500' : 'text-primary'}`} />
          {creditsLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <span className={`text-xs font-semibold ${isLowBalance ? 'text-amber-500' : ''}`}>
              ${balance.toFixed(0)}
            </span>
          )}
          {isLowBalance && <AlertCircle className="w-3 h-3 text-amber-500" />}
        </div>

        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg glass"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  );
}
