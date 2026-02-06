import { useState, useEffect } from 'react';
import { ArrowRight, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApplication } from '@/context/ApplicationContext';
import { charactersStorage, stylesStorage } from '@/utils/indexedDB';
import { LibraryCard, CreateNewCard } from '@/components/shared/LibraryCard';
import { CharacterCreator } from '@/components/library/CharacterCreator';
import { base64ToDataUrl } from '@/utils/imageProcessing';
import type { SavedCharacter, SavedStyle } from '@/types';

export function Step2_CharacterSelection() {
    const { state, setSelectedCharacter, nextStep, prevStep } = useApplication();
    const [characters, setCharacters] = useState<SavedCharacter[]>([]);
    const [selectedStyle, setSelectedStyle] = useState<SavedStyle | null>(null);
    const [isCreatorOpen, setIsCreatorOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load selected style and characters
    useEffect(() => {
        async function loadData() {
            if (state.selectedStyleId) {
                const style = await stylesStorage.getById(state.selectedStyleId);
                setSelectedStyle(style);
            }
            const loadedCharacters = await charactersStorage.getAll();
            setCharacters(loadedCharacters);
            setIsLoading(false);
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
            await charactersStorage.remove(id);
            const updatedCharacters = await charactersStorage.getAll();
            setCharacters(updatedCharacters);
            if (state.selectedCharacterId === id) {
                setSelectedCharacter(null);
            }
            setDeleteConfirmId(null);
        } else {
            setDeleteConfirmId(id);
            setTimeout(() => setDeleteConfirmId(null), 3000);
        }
    };

    const handleCharacterCreated = async (newCharacter: SavedCharacter) => {
        const updatedCharacters = await charactersStorage.getAll();
        setCharacters(updatedCharacters);
        setSelectedCharacter(newCharacter.id);
    };

    const handleContinue = () => {
        if (state.selectedCharacterId) {
            nextStep();
        }
    };

    if (isLoading) {
        return (
            <div className="w-full max-w-5xl mx-auto flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!selectedStyle) {
        return (
            <div className="w-full max-w-lg mx-auto text-center py-12 glass-card">
                <p className="text-muted-foreground">Please select a style first</p>
                <Button onClick={prevStep} className="mt-4 btn-glass">
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto animate-fadeIn">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold gradient-text">Select a Character</h2>
                <p className="text-muted-foreground mt-2">
                    Choose from your saved characters or create a new one
                </p>
            </div>

            {/* Selected Style Banner */}
            <div className="glass-card p-4 mb-6 flex items-center gap-4">
                <img
                    src={base64ToDataUrl(selectedStyle.referenceImage, 'image/png')}
                    alt={selectedStyle.name}
                    className="w-16 h-16 rounded-xl object-cover"
                />
                <div>
                    <p className="text-sm text-muted-foreground">Using Style</p>
                    <p className="font-semibold text-foreground">{selectedStyle.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {selectedStyle.keywords.slice(0, 3).map((keyword, index) => (
                            <span
                                key={index}
                                className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary"
                            >
                                {keyword}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Characters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
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
                        imageBase64={character.imageBase64}
                        createdAt={character.createdAt}
                        subtitle={character.styleName}
                        isSelected={state.selectedCharacterId === character.id}
                        onSelect={handleSelectCharacter}
                        onDelete={handleDeleteCharacter}
                    />
                ))}
            </div>

            {/* Empty State */}
            {characters.length === 0 && (
                <div className="text-center py-12 glass-card">
                    <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">No characters yet</h3>
                    <p className="text-muted-foreground mt-1">
                        Create your first character with your selected style
                    </p>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirmId && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 glass-card px-4 py-3 flex items-center gap-4">
                    <span className="text-sm">Click delete again to confirm</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmId(null)}
                    >
                        Cancel
                    </Button>
                </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between glass-card p-4">
                <Button
                    variant="ghost"
                    onClick={prevStep}
                    className="btn-glass"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                    </svg>
                    Back
                </Button>

                <div className="text-sm text-muted-foreground">
                    {state.selectedCharacterId
                        ? `Selected: ${characters.find((c) => c.id === state.selectedCharacterId)?.name}`
                        : 'Select a character to continue'}
                </div>

                <Button
                    onClick={handleContinue}
                    disabled={!state.selectedCharacterId}
                    className="btn-gradient"
                >
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
            </div>

            {/* Character Creator Modal */}
            {selectedStyle && (
                <CharacterCreator
                    open={isCreatorOpen}
                    onClose={() => setIsCreatorOpen(false)}
                    onCharacterCreated={handleCharacterCreated}
                    selectedStyle={selectedStyle}
                />
            )}
        </div>
    );
}
