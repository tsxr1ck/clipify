import { Palette, User } from 'lucide-react';
import type { Style } from '@/services/api/stylesService';
import type { Character } from '@/services/api/charactersService';

interface MobileStyleCharacterBarProps {
  style: Style | null;
  character: Character | null;
  onChangeStyle: () => void;
  onChangeCharacter: () => void;
}

export function MobileStyleCharacterBar({
  style,
  character,
  onChangeStyle,
  onChangeCharacter
}: MobileStyleCharacterBarProps) {
  return (
    <div className="lg:hidden sticky top-0 z-30 glass border-b border-border">
      <div className="flex items-center gap-3 p-3">
        {/* Style Selector */}
        <button
          onClick={onChangeStyle}
          className="flex items-center gap-2 flex-1 p-2 rounded-lg glass hover:bg-primary/10 transition-colors"
        >
          {style?.imageUrl ? (
            <img
              src={style.imageUrl}
              alt={style.name}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="flex-1 text-left">
            <p className="text-xs text-muted-foreground">Style</p>
            <p className="text-sm font-medium truncate">{style?.name || 'Select'}</p>
          </div>
        </button>

        {/* Character Selector */}
        <button
          onClick={onChangeCharacter}
          className="flex items-center gap-2 flex-1 p-2 rounded-lg glass hover:bg-primary/10 transition-colors"
        >
          {character?.imageUrl ? (
            <img
              src={character.imageUrl}
              alt={character.name}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="flex-1 text-left">
            <p className="text-xs text-muted-foreground">Character</p>
            <p className="text-sm font-medium truncate">{character?.name || 'Select'}</p>
          </div>
        </button>
      </div>
    </div>
  );
}
