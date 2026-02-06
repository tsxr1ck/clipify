import { useState, useEffect } from 'react';
import { ArrowRight, Palette, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApplication } from '@/context/ApplicationContext';
import { stylesStorage } from '@/utils/indexedDB';
import { LibraryCard, CreateNewCard } from '@/components/shared/LibraryCard';
import { StyleCreator } from '@/components/library/StyleCreator';
import type { SavedStyle } from '@/types';

export function Step1_StyleSelection() {
    const { state, setSelectedStyle, nextStep, prevStep } = useApplication();
    const [styles, setStyles] = useState<SavedStyle[]>([]);
    const [isCreatorOpen, setIsCreatorOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load styles from IndexedDB
    useEffect(() => {
        async function loadStyles() {
            const loadedStyles = await stylesStorage.getAll();
            setStyles(loadedStyles);
            setIsLoading(false);
        }
        loadStyles();
    }, []);

    const handleSelectStyle = (styleId: string) => {
        if (state.selectedStyleId === styleId) {
            setSelectedStyle(null);
        } else {
            setSelectedStyle(styleId);
        }
    };

    const handleDeleteStyle = async (id: string) => {
        if (deleteConfirmId === id) {
            await stylesStorage.remove(id);
            const updatedStyles = await stylesStorage.getAll();
            setStyles(updatedStyles);
            if (state.selectedStyleId === id) {
                setSelectedStyle(null);
            }
            setDeleteConfirmId(null);
        } else {
            setDeleteConfirmId(id);
            setTimeout(() => setDeleteConfirmId(null), 3000);
        }
    };

    const handleStyleCreated = async (newStyle: SavedStyle) => {
        const updatedStyles = await stylesStorage.getAll();
        setStyles(updatedStyles);
        setSelectedStyle(newStyle.id);
    };

    const handleContinue = () => {
        if (state.selectedStyleId) {
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

    return (
        <div className="w-full max-w-5xl mx-auto animate-fadeIn">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <Palette className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold gradient-text">Select a Visual Style</h2>
                <p className="text-muted-foreground mt-2">
                    Choose from your saved styles or create a new one
                </p>
            </div>

            {/* Styles Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                {/* Create New Card */}
                <CreateNewCard
                    label="Create New Style"
                    description="Extract style from any image"
                    onClick={() => setIsCreatorOpen(true)}
                />

                {/* Existing Styles */}
                {styles.map((style) => (
                    <LibraryCard
                        key={style.id}
                        id={style.id}
                        name={style.name}
                        imageBase64={style.referenceImage}
                        createdAt={style.createdAt}
                        tags={style.keywords.slice(0, 3)}
                        isSelected={state.selectedStyleId === style.id}
                        onSelect={handleSelectStyle}
                        onDelete={handleDeleteStyle}
                    />
                ))}
            </div>

            {/* Empty State */}
            {styles.length === 0 && (
                <div className="text-center py-12 glass-card">
                    <Palette className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">No styles yet</h3>
                    <p className="text-muted-foreground mt-1">
                        Create your first style by uploading a reference image
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
                    {state.selectedStyleId
                        ? `Selected: ${styles.find((s) => s.id === state.selectedStyleId)?.name}`
                        : 'Select a style to continue'}
                </div>

                <Button
                    onClick={handleContinue}
                    disabled={!state.selectedStyleId}
                    className="btn-gradient"
                >
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
            </div>

            {/* Style Creator Modal */}
            <StyleCreator
                open={isCreatorOpen}
                onClose={() => setIsCreatorOpen(false)}
                onStyleCreated={handleStyleCreated}
            />
        </div>
    );
}
