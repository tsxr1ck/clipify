import { useState, useRef } from 'react';
import { Loader2, User, Sparkles, Image as ImageIcon, Type, Upload, X, Wand2, ScanSearch } from 'lucide-react';
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
// import { useApiKey } from '@/context/ApplicationContext'; // Removed
import { generateCharacterImageWithLogging, analyzeCharacterImageWithLogging } from '@/services/api/geminiService';
import { charactersService, uploadService, type Character, type Style } from '@/services/api';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import { DetailedCharacterAnalysis } from '@/components/shared/DetailedCharacterAnalysis';
import type { AspectRatio } from '@/types';

interface CharacterCreatorProps {
    open: boolean;
    onClose: () => void;
    onCharacterCreated: (character: Character) => void;
    selectedStyle: Style;
}

type CreationMode = 'prompt' | 'image';
type ImageWorkflowStep = 'upload' | 'analyzing' | 'edit' | 'generating' | 'done';

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
    // const { key: apiKey } = useApiKey(); // Removed
    const apiKey = 'dummy-key'; // Backend handles auth now
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Mode toggle
    const [creationMode, setCreationMode] = useState<CreationMode>('prompt');

    const [characterName, setCharacterName] = useState('');
    const [characterDescription, setCharacterDescription] = useState('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<{
        base64: string;
        mimeType: string;
    } | null>(null);
    const [combinedPrompt, setCombinedPrompt] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Image upload state
    const [uploadedImage, setUploadedImage] = useState<{
        base64: string;
        mimeType: string;
        file: File;
    } | null>(null);
    // Workflow step for image mode
    const [imageWorkflowStep, setImageWorkflowStep] = useState<ImageWorkflowStep>('upload');
    // Extracted description from uploaded image
    const [extractedDescription, setExtractedDescription] = useState<string>('');
    // Styled version of uploaded image
    const [styledImage, setStyledImage] = useState<{
        base64: string;
        mimeType: string;
    } | null>(null);

    // Generate character from prompt (prompt mode)
    const handleGenerate = async () => {
        if (!apiKey || !characterDescription.trim()) return;

        setIsGenerating(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const result = await generateCharacterImageWithLogging(
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

    // Analyze uploaded image to extract description
    const handleAnalyzeImage = async () => {
        if (!apiKey || !uploadedImage) return;

        setImageWorkflowStep('analyzing');
        setError(null);

        try {
            const result = await analyzeCharacterImageWithLogging(
                apiKey,
                uploadedImage.base64,
                uploadedImage.mimeType
            );
            setExtractedDescription(result.description);
            setCharacterDescription(result.description);
            setImageWorkflowStep('edit');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to analyze image');
            setImageWorkflowStep('upload');
        }
    };

    // Generate styled image using extracted/edited description (image mode)
    const handleGenerateStyled = async () => {
        if (!apiKey || !characterDescription.trim()) return;

        setIsGenerating(true);
        setImageWorkflowStep('generating');
        setError(null);
        setStyledImage(null);

        try {
            // Use the character description with the style to generate new image
            const result = await generateCharacterImageWithLogging(
                apiKey,
                characterDescription.trim(),
                selectedStyle.keywords,
                selectedStyle.parsedStyle,
                aspectRatio
            );
            setStyledImage(result);
            setCombinedPrompt(
                `${characterDescription.trim()}, rendered in the following visual style: ${selectedStyle.keywords.join(', ')}.`
            );
            setImageWorkflowStep('done');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate styled character');
            setImageWorkflowStep('edit');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('Image must be less than 10MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(',')[1];
            setUploadedImage({
                base64,
                mimeType: file.type,
                file,
            });
            setStyledImage(null);
            setExtractedDescription('');
            setImageWorkflowStep('upload');
            setError(null);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveUploadedImage = () => {
        setUploadedImage(null);
        setStyledImage(null);
        setExtractedDescription('');
        setImageWorkflowStep('upload');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        if (!characterName.trim()) return;

        // Determine which image to save based on mode
        const imageToSave = creationMode === 'prompt'
            ? generatedImage
            : styledImage;

        if (!imageToSave) return;

        setIsSaving(true);
        setError(null);

        try {
            // First, upload the image to the server
            const uploadResult = await uploadService.uploadCharacterImage(
                imageToSave.base64,
                imageToSave.mimeType,
                `${characterName.trim()}.png`
            );

            // Build prompt based on mode
            const promptText = characterDescription.trim();
            const combinedPromptText = combinedPrompt || `${promptText}, in the style of: ${selectedStyle.keywords.join(', ')}`;

            // Then create the character via API
            const newCharacter = await charactersService.create({
                name: characterName.trim(),
                description: characterDescription.trim() || undefined,
                styleId: selectedStyle.id,
                prompt: promptText,
                combinedPrompt: combinedPromptText,
                imageUrl: uploadResult.url,
                imageKey: uploadResult.key,
                thumbnailUrl: uploadResult.thumbnailUrl,
                aspectRatio,
            });

            onCharacterCreated(newCharacter);
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save character');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setCharacterName('');
        setCharacterDescription('');
        setAspectRatio('1:1');
        setGeneratedImage(null);
        setUploadedImage(null);
        setStyledImage(null);
        setExtractedDescription('');
        setCombinedPrompt('');
        setError(null);
        setCreationMode('prompt');
        setImageWorkflowStep('upload');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onClose();
    };

    const handleRegenerate = () => {
        if (creationMode === 'prompt') {
            setGeneratedImage(null);
            handleGenerate();
        } else {
            setStyledImage(null);
            setImageWorkflowStep('edit');
        }
    };

    // Determine if we have an image ready to save
    const hasImageReady = creationMode === 'prompt' ? !!generatedImage : !!styledImage;

    // Check if we can save
    const canSave = characterName.trim() && hasImageReady;

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
                            src={selectedStyle.referenceImageThumbUrl || selectedStyle.referenceImageUrl}
                            alt={selectedStyle.name}
                            className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div>
                            <p className="text-sm text-muted-foreground">Using Style</p>
                            <p className="font-medium text-foreground">{selectedStyle.name}</p>
                        </div>
                    </div>

                    {/* Mode Toggle */}
                    <div className="space-y-2">
                        <Label>Creation Method</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setCreationMode('prompt')}
                                className={`p-4 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${creationMode === 'prompt'
                                    ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                                    : 'glass hover:bg-primary/10'
                                    }`}
                            >
                                <Type className="w-4 h-4" />
                                From Prompt
                            </button>
                            <button
                                onClick={() => setCreationMode('image')}
                                className={`p-4 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${creationMode === 'image'
                                    ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                                    : 'glass hover:bg-primary/10'
                                    }`}
                            >
                                <ImageIcon className="w-4 h-4" />
                                From Image
                            </button>
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

                    {/* Prompt Mode: Character Description */}
                    {creationMode === 'prompt' && (
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
                    )}

                    {/* Image Mode: Upload and Workflow */}
                    {creationMode === 'image' && (
                        <div className="space-y-4">
                            {/* Step 1: Upload */}
                            <div className="space-y-2">
                                <Label>
                                    {imageWorkflowStep === 'upload' && 'Step 1: Upload Reference Image'}
                                    {imageWorkflowStep === 'analyzing' && 'Step 1: Analyzing Image...'}
                                    {(imageWorkflowStep === 'edit' || imageWorkflowStep === 'generating' || imageWorkflowStep === 'done') && 'Reference Image'}
                                </Label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />

                                {!uploadedImage ? (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full p-8 rounded-2xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-3 bg-muted/5"
                                    >
                                        <Upload className="w-10 h-10 text-muted-foreground/50" />
                                        <div className="text-center">
                                            <p className="text-sm font-medium text-foreground">Click to upload image</p>
                                            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP up to 10MB</p>
                                        </div>
                                    </button>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Original uploaded image */}
                                        <div className="space-y-2">
                                            <p className="text-xs text-muted-foreground font-medium">Original</p>
                                            <div className="relative rounded-xl overflow-hidden">
                                                <img
                                                    src={`data:${uploadedImage.mimeType};base64,${uploadedImage.base64}`}
                                                    alt="Uploaded character"
                                                    className="w-full aspect-square object-cover bg-muted/20"
                                                />
                                                <button
                                                    onClick={handleRemoveUploadedImage}
                                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/90 text-white hover:bg-destructive transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Styled result */}
                                        <div className="space-y-2">
                                            <p className="text-xs text-muted-foreground font-medium">Styled Result</p>
                                            <div className="relative rounded-xl overflow-hidden aspect-square bg-muted/10 border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                                                {styledImage ? (
                                                    <img
                                                        src={`data:${styledImage.mimeType};base64,${styledImage.base64}`}
                                                        alt="Styled character"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : imageWorkflowStep === 'generating' ? (
                                                    <div className="text-center p-4">
                                                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                                                        <p className="text-xs text-muted-foreground">Generating styled character...</p>
                                                    </div>
                                                ) : imageWorkflowStep === 'analyzing' ? (
                                                    <div className="text-center p-4">
                                                        <ScanSearch className="w-8 h-8 text-primary mx-auto mb-2 animate-pulse" />
                                                        <p className="text-xs text-muted-foreground">Analyzing image...</p>
                                                    </div>
                                                ) : (
                                                    <div className="text-center p-4">
                                                        <Wand2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                                                        <p className="text-xs text-muted-foreground">Will appear here</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Analyze Image Button - only show right after upload */}
                            {uploadedImage && imageWorkflowStep === 'upload' && (
                                <Button
                                    onClick={handleAnalyzeImage}
                                    className="w-full btn-gradient py-5"
                                >
                                    <ScanSearch className="w-5 h-5 mr-2" />
                                    Analyze Image
                                </Button>
                            )}

                            {/* Step 2: Edit Description (after analysis) */}
                            {(imageWorkflowStep === 'edit' || imageWorkflowStep === 'generating' || imageWorkflowStep === 'done') && (
                                <div className="space-y-4">
                                    <Label htmlFor="extracted-description">
                                        Step 2: Character Analysis & Description
                                    </Label>

                                    {/* Detailed Analysis View */}
                                    {extractedDescription && (
                                        <DetailedCharacterAnalysis
                                            analysis={extractedDescription}
                                            onUsePrompt={(prompt) => setCharacterDescription(prompt)}
                                        />
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="final-prompt" className="text-xs text-muted-foreground">
                                            Final Generation Prompt (Edit if needed)
                                        </Label>
                                        <Textarea
                                            id="final-prompt"
                                            value={characterDescription}
                                            onChange={(e) => setCharacterDescription(e.target.value)}
                                            placeholder="Character prompt..."
                                            className="glass-input min-h-[100px]"
                                            disabled={imageWorkflowStep === 'generating'}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Generate Styled (after editing) */}
                            {imageWorkflowStep === 'edit' && (
                                <Button
                                    onClick={handleGenerateStyled}
                                    disabled={!characterDescription.trim() || isGenerating}
                                    className="w-full btn-gradient py-5"
                                >
                                    <Wand2 className="w-5 h-5 mr-2" />
                                    Generate in {selectedStyle.name} Style
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Aspect Ratio - only show for prompt mode */}
                    {creationMode === 'prompt' && (
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
                    )}

                    {/* Error */}
                    {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

                    {/* Generated Image Preview (prompt mode only) */}
                    {creationMode === 'prompt' && generatedImage && (
                        <div className="space-y-3">
                            <Label>Generated Character</Label>
                            <div className="relative rounded-2xl overflow-hidden">
                                <img
                                    src={`data:${generatedImage.mimeType};base64,${generatedImage.base64}`}
                                    alt={characterName || 'Generated character'}
                                    className="w-full max-h-[400px] object-contain bg-muted/20"
                                />
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        {creationMode === 'prompt' && !generatedImage ? (
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
                        ) : hasImageReady ? (
                            <>
                                <Button
                                    variant="ghost"
                                    onClick={handleRegenerate}
                                    disabled={isGenerating || isSaving}
                                    className="btn-glass"
                                >
                                    Regenerate
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={!canSave || isSaving}
                                    className="flex-1 btn-gradient py-5"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save to Library'
                                    )}
                                </Button>
                            </>
                        ) : null}
                        <Button variant="ghost" onClick={handleClose} className="btn-glass">
                            Cancel
                        </Button>
                    </div>

                    {/* Cost Estimate */}
                    <p className="text-center text-xs text-muted-foreground">
                        {creationMode === 'prompt'
                            ? 'Estimated cost: ~$0.075 USD per generation (Imagen 4.0)'
                            : 'Estimated cost: ~$0.015 USD analysis + ~$0.075 USD generation'
                        }
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
