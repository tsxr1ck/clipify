import { useState, useEffect } from 'react';
import { ArrowRight, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApplication } from '@/context/ApplicationContext';
import { charactersService, stylesService, type Character, type Style } from '@/services/api';
import { LibraryCard, CreateNewCard } from '@/components/shared/LibraryCard';
import { CharacterCreator } from '@/components/library/CharacterCreator';

export function Step2_CharacterSelection() {
    const { state, setSelectedCharacter, nextStep, prevStep } = useApplication();
    const [characters, setCharacters] = useState<Character[]>([]);
    const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
    const [isCreatorOpen, setIsCreatorOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load selected style and characters from API
    useEffect(() => {
        async function loadData() {
            try {
                if (state.selectedStyleId) {
                    const style = await stylesService.get(state.selectedStyleId);
                    setSelectedStyle(style);
                }
                const response = await charactersService.list({ limit: 100 });
                setCharacters(response.characters);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load data');
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [state.selectedStyleId]);

    const handleSelectCharacter = (characterId: string) => {
        if (state.selectedCharacterId === characterId) {
            setSelectedCharacter(null);
        } else {
            setSelectedCharacter(characterId);
        }
    };

    const handleDeleteCharacter = async (id: string) => {
        if (deleteConfirmId === id) {
            try {
                await charactersService.delete(id);
                setCharacters(prev => prev.filter(c => c.id !== id));
                if (state.selectedCharacterId === id) {
                    setSelectedCharacter(null);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to delete character');
            }
            setDeleteConfirmId(null);
        } else {
            setDeleteConfirmId(id);
            setTimeout(() => setDeleteConfirmId(null), 3000);
        }
    };

    const handleCharacterCreated = async (newCharacter: Character) => {
        setCharacters(prev => [newCharacter, ...prev]);
        setSelectedCharacter(newCharacter.id);
    };

    const handleContinue = () => {
        if (state.selectedCharacterId) {
            nextStep();
        }
    };

    if (isLoading) {
        return (
            <div className="w-full h-96 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!selectedStyle) {
        return (
            <div className="w-full max-w-lg mx-auto text-center py-20 glass rounded-3xl">
                <p className="text-muted-foreground text-lg mb-6">Please select a style first</p>
                <Button onClick={prevStep} variant="outline">
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto animate-scaleIn">
            {/* Header */}
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                    Select a Character
                </h2>
                <p className="text-muted-foreground mt-2 text-lg">
                    Choose who will star in your video
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex justify-between items-center">
                    <span>{error}</span>
                    <Button variant="ghost" size="sm" onClick={() => setError(null)} className="h-auto p-1 text-destructive hover:bg-destructive/10">
                        ✕
                    </Button>
                </div>
            )}

            {/* Selected Style Banner */}
            <div className="glass p-4 rounded-2xl mb-8 flex items-center gap-4 max-w-3xl mx-auto border-l-4 border-primary">
                <img
                    src={selectedStyle.referenceImageThumbUrl || selectedStyle.referenceImageUrl}
                    alt={selectedStyle.name}
                    className="w-16 h-16 rounded-xl object-cover shadow-sm"
                />
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Current Style</p>
                    <p className="font-bold text-lg text-foreground truncate">{selectedStyle.name}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={prevStep} className="text-muted-foreground hover:text-primary">
                    Change
                </Button>
            </div>

            {/* Characters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
                {/* Create New Card */}
                <CreateNewCard
                    label="Create New Character"
                    description="Generate with AI using your style"
                    onClick={() => setIsCreatorOpen(true)}
                />

                {/* Existing Characters */}
                {characters.map((character) => (
                    <LibraryCard
                        key={character.id}
                        id={character.id}
                        name={character.name}
                        imageUrl={character.thumbnailUrl || character.imageUrl}
                        createdAt={new Date(character.createdAt).getTime()}
                        subtitle={`Style: ${character.style?.name || 'Unknown'}`}
                        isSelected={state.selectedCharacterId === character.id}
                        onSelect={handleSelectCharacter}
                        onDelete={handleDeleteCharacter}
                    />
                ))}
            </div>

            {/* Empty State */}
            {characters.length === 0 && (
                <div className="text-center py-20 glass rounded-3xl mb-8">
                    <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
                        <User className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">No characters yet</h3>
                    <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                        Create your first character based on the <strong>{selectedStyle.name}</strong> style.
                    </p>
                </div>
            )}

            {/* Navigation Bar */}
            <div className="fixed bottom-0 left-0 lg:left-72 right-0 p-4 glass border-t border-border/50 z-40">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Button
                        variant="ghost"
                        onClick={prevStep}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        Back
                    </Button>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:block text-sm text-muted-foreground">
                            {state.selectedCharacterId
                                ? <span className="text-primary font-medium">1 Character Selected</span>
                                : 'Select a character to continue'}
                        </div>
                        <Button
                            onClick={handleContinue}
                            disabled={!state.selectedCharacterId}
                            variant="gradient"
                            size="lg"
                            className="px-8 rounded-full shadow-lg shadow-primary/25 disabled:shadow-none"
                        >
                            Continue
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Spacer for fixed footer */}
            <div className="h-24" />

            {/* Character Creator Modal */}
            {selectedStyle && (
                <CharacterCreator
                    open={isCreatorOpen}
                    onClose={() => setIsCreatorOpen(false)}
                    onCharacterCreated={handleCharacterCreated}
                    selectedStyle={selectedStyle}
                />
            )}

            {/* Delete Confirmation Toast Replacement */}
            {deleteConfirmId && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 glass px-6 py-4 rounded-full shadow-xl flex items-center gap-4 animate-float-up">
                    <span className="text-sm font-medium">Are you sure you want to delete this character?</span>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCharacter(deleteConfirmId)}
                        className="rounded-full h-8"
                    >
                        Delete
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmId(null)}
                        className="rounded-full h-8"
                    >
                        Cancel
                    </Button>
                </div>
            )}
        </div>
    );
}
