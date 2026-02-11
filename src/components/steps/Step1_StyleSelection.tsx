import { useState, useEffect } from 'react';
import { ArrowRight, Palette, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApplication } from '@/context/ApplicationContext';
import { stylesService, type Style } from '@/services/api';
import { LibraryCard, CreateNewCard } from '@/components/shared/LibraryCard';
import { StyleCreator } from '@/components/library/StyleCreator';


export function Step1_StyleSelection() {
    const { state, setSelectedStyle, nextStep, prevStep } = useApplication();
    const [styles, setStyles] = useState<Style[]>([]);
    const [isCreatorOpen, setIsCreatorOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load styles from API
    useEffect(() => {
        async function loadStyles() {
            try {
                const response = await stylesService.list({ limit: 100 });
                setStyles(response.styles);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to load styles';
                if (message) {
                    setError(message);
                }
            } finally {
                setIsLoading(false);
            }
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
            try {
                await stylesService.delete(id);
                setStyles(prev => prev.filter(s => s.id !== id));
                if (state.selectedStyleId === id) {
                    setSelectedStyle(null);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to delete style');
            }
            setDeleteConfirmId(null);
        } else {
            setDeleteConfirmId(id);
            setTimeout(() => setDeleteConfirmId(null), 3000);
        }
    };

    const handleStyleCreated = async (newStyle: Style) => {
        setStyles(prev => [newStyle, ...prev]);
        setSelectedStyle(newStyle.id);
    };

    const handleContinue = () => {
        if (state.selectedStyleId) {
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

    return (
        <div className="w-full max-w-6xl mx-auto animate-scaleIn">
            {/* Header */}
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/70">
                    Choose Your Visual Style
                </h2>
                <p className="text-muted-foreground mt-2 text-lg">
                    Select a style for your video or create a new one from an image
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

            {/* Styles Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
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
                        imageUrl={style.referenceImageThumbUrl || style.referenceImageUrl}
                        createdAt={new Date(style.createdAt).getTime()}
                        tags={style.keywords.slice(0, 3)}
                        isSelected={state.selectedStyleId === style.id}
                        onSelect={handleSelectStyle}
                        onDelete={handleDeleteStyle}
                    />
                ))}
            </div>

            {/* Empty State */}
            {styles.length === 0 && (
                <div className="text-center py-20 glass rounded-3xl mb-8">
                    <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
                        <Palette className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">No styles yet</h3>
                    <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                        Your library is empty. Create your first style by uploading a reference image to get started.
                    </p>
                </div>
            )}

            {/* Navigation Bar */}
            <div className="absolute w-full bottom-0 left-0 right-0 p-4 glass border-t border-border/50 z-40">
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
                            {state.selectedStyleId
                                ? <span className="text-primary font-medium">1 Style Selected</span>
                                : 'Select a style to continue'}
                        </div>
                        <Button
                            onClick={handleContinue}
                            disabled={!state.selectedStyleId}
                            variant="default"
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

            {/* Style Creator Modal */}
            <StyleCreator
                open={isCreatorOpen}
                onClose={() => setIsCreatorOpen(false)}
                onStyleCreated={handleStyleCreated}
            />

            {/* Delete Confirmation Toast/Dialog Replacement */}
            {deleteConfirmId && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 glass px-6 py-4 rounded-full shadow-xl flex items-center gap-4 animate-float-up">
                    <span className="text-sm font-medium">Are you sure you want to delete this style?</span>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteStyle(deleteConfirmId)}
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
