import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, User, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { charactersService, type Character } from '@/services/api';

interface CharacterSelectorModalProps {
    open: boolean;
    onClose: () => void;
    onSelect: (character: Character) => void;
    currentCharacterId?: string;
    styleId?: string; // Optionally filter by style
}

export function CharacterSelectorModal({
    open,
    onClose,
    onSelect,
    currentCharacterId,
    styleId,
}: CharacterSelectorModalProps) {
    const [characters, setCharacters] = useState<Character[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!open) return;

        async function loadCharacters() {
            setIsLoading(true);
            setError(null);
            try {
                const response = await charactersService.list({
                    limit: 50,
                    styleId: styleId,
                });
                setCharacters(response.characters);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load characters');
            } finally {
                setIsLoading(false);
            }
        }
        loadCharacters();
    }, [open, styleId]);

    const filteredCharacters = characters.filter(character =>
        character.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        character.prompt?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = (character: Character) => {
        onSelect(character);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="glass-modal max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold gradient-text flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Select Character
                    </DialogTitle>
                </DialogHeader>

                {/* Search */}
                <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search characters..."
                        className="glass-input pl-9"
                    />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto mt-4 -mx-6 px-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-muted-foreground">{error}</div>
                    ) : filteredCharacters.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            {searchQuery ? 'No characters match your search' : 'No characters saved yet'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {filteredCharacters.map((character) => (
                                <button
                                    key={character.id}
                                    onClick={() => handleSelect(character)}
                                    className={`group relative rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:ring-2 hover:ring-primary/50 ${character.id === currentCharacterId
                                            ? 'ring-2 ring-primary'
                                            : ''
                                        }`}
                                >
                                    <img
                                        src={character.thumbnailUrl || character.imageUrl}
                                        alt={character.name}
                                        className="w-full aspect-square object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                    <div className="absolute bottom-0 left-0 right-0 p-3">
                                        <p className="text-sm font-medium text-white truncate">
                                            {character.name}
                                        </p>
                                        {character.styleName && (
                                            <p className="text-xs text-white/70 truncate">
                                                {character.styleName}
                                            </p>
                                        )}
                                        {character.id === currentCharacterId && (
                                            <span className="text-xs text-primary-foreground bg-primary px-2 py-0.5 rounded-full mt-1 inline-block">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
