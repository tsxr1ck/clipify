import { useState } from 'react';
import { Loader2, User, Sparkles } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useApiKey } from '@/context/ApplicationContext';
import { charactersStorage, generateId } from '@/utils/indexedDB';
import { base64ToDataUrl } from '@/utils/imageProcessing';
import { generateCharacterImage } from '@/services/api/geminiService';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import type { SavedCharacter, SavedStyle, AspectRatio } from '@/types';

interface CharacterCreatorProps {
    open: boolean;
    onClose: () => void;
    onCharacterCreated: (character: SavedCharacter) => void;
    selectedStyle: SavedStyle;
}

const aspectRatioOptions: { value: AspectRatio; label: string }[] = [
    { value: '1:1', label: 'Square (1:1)' },
    { value: '16:9', label: 'Landscape (16:9)' },
    { value: '9:16', label: 'Portrait (9:16)' },
    { value: '4:3', label: 'Standard (4:3)' },
];

export function CharacterCreator({
    open,
    onClose,
    onCharacterCreated,
    selectedStyle,
}: CharacterCreatorProps) {
    const { key: apiKey } = useApiKey();

    const [characterName, setCharacterName] = useState('');
    const [characterDescription, setCharacterDescription] = useState('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<{
        base64: string;
        mimeType: string;
    } | null>(null);
    const [combinedPrompt, setCombinedPrompt] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!apiKey || !characterDescription.trim()) return;

        setIsGenerating(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const result = await generateCharacterImage(
                apiKey,
                characterDescription.trim(),
                selectedStyle.keywords,
                selectedStyle.parsedStyle,
                aspectRatio
            );
            setGeneratedImage(result);
            setCombinedPrompt(
                `${characterDescription.trim()}, rendered in the following visual style: ${selectedStyle.keywords.join(', ')}.`
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate character');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!characterName.trim() || !generatedImage) return;

        const newCharacter: SavedCharacter = {
            id: generateId(),
            name: characterName.trim(),
            createdAt: Date.now(),
            prompt: characterDescription.trim(),
            styleId: selectedStyle.id,
            styleName: selectedStyle.name,
            imageBase64: generatedImage.base64,
            aspectRatio,
            combinedPrompt,
        };

        try {
            await charactersStorage.add(newCharacter);
            onCharacterCreated(newCharacter);
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save character');
        }
    };

    const handleClose = () => {
        setCharacterName('');
        setCharacterDescription('');
        setAspectRatio('1:1');
        setGeneratedImage(null);
        setCombinedPrompt('');
        setError(null);
        onClose();
    };

    const handleRegenerate = () => {
        setGeneratedImage(null);
        handleGenerate();
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
            <DialogContent className="glass-modal max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold gradient-text flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Create New Character
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* Selected Style Badge */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <img
                            src={base64ToDataUrl(selectedStyle.referenceImage, 'image/png')}
                            alt={selectedStyle.name}
                            className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div>
                            <p className="text-sm text-muted-foreground">Using Style</p>
                            <p className="font-medium text-foreground">{selectedStyle.name}</p>
                        </div>
                    </div>

                    {/* Character Name */}
                    <div className="space-y-2">
                        <Label htmlFor="character-name">Character Name *</Label>
                        <Input
                            id="character-name"
                            value={characterName}
                            onChange={(e) => setCharacterName(e.target.value)}
                            placeholder="e.g., Capi the Capybara"
                            className="glass-input"
                        />
                    </div>

                    {/* Character Description */}
                    <div className="space-y-2">
                        <Label htmlFor="character-description">Character Description *</Label>
                        <Textarea
                            id="character-description"
                            value={characterDescription}
                            onChange={(e) => setCharacterDescription(e.target.value)}
                            placeholder="Describe your character in detail... e.g., Professional construction capybara wearing a safety helmet and reflective vest, friendly expression"
                            className="glass-input min-h-[120px]"
                        />
                    </div>

                    {/* Aspect Ratio */}
                    <div className="space-y-2">
                        <Label>Aspect Ratio</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {aspectRatioOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setAspectRatio(option.value)}
                                    className={`p-3 rounded-xl text-sm font-medium transition-all duration-200 ${aspectRatio === option.value
                                        ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                                        : 'glass hover:bg-primary/10'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Error */}
                    {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

                    {/* Generated Image Preview */}
                    {generatedImage && (
                        <div className="space-y-3">
                            <Label>Generated Character</Label>
                            <div className="relative rounded-2xl overflow-hidden">
                                <img
                                    src={base64ToDataUrl(generatedImage.base64, generatedImage.mimeType)}
                                    alt={characterName || 'Generated character'}
                                    className="w-full max-h-[400px] object-contain bg-muted/20"
                                />
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        {!generatedImage ? (
                            <Button
                                onClick={handleGenerate}
                                disabled={!characterDescription.trim() || isGenerating}
                                className="flex-1 btn-gradient py-5"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Generating Character...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5 mr-2" />
                                        Generate Character
                                    </>
                                )}
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="ghost"
                                    onClick={handleRegenerate}
                                    disabled={isGenerating}
                                    className="btn-glass"
                                >
                                    Regenerate
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={!characterName.trim()}
                                    className="flex-1 btn-gradient py-5"
                                >
                                    Save to Library
                                </Button>
                            </>
                        )}
                        <Button variant="ghost" onClick={handleClose} className="btn-glass">
                            Cancel
                        </Button>
                    </div>

                    {/* Cost Estimate */}
                    <p className="text-center text-xs text-muted-foreground">
                        Estimated cost: ~$0.04 per generation
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
