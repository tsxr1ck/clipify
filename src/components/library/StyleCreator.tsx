import { useState, useCallback } from 'react';
import { Upload, X, Loader2, Sparkles } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
// import { useApiKey } from '@/context/ApplicationContext'; // Removed
import { fileToBase64 } from '@/utils/imageProcessing';
import { extractStyleFromImage } from '@/services/api/geminiService';
import { stylesService, uploadService, type Style } from '@/services/api';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import type { ParsedStyle } from '@/types';

interface StyleCreatorProps {
    open: boolean;
    onClose: () => void;
    onStyleCreated: (style: Style) => void;
}

export function StyleCreator({ open, onClose, onStyleCreated }: StyleCreatorProps) {
    // const { key: apiKey } = useApiKey(); // Removed
    const apiKey = 'dummy-key'; // Backend handles auth now

    const [styleName, setStyleName] = useState('');
    const [uploadedImage, setUploadedImage] = useState<{
        base64: string;
        mimeType: string;
        fileName: string;
    } | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [extractedStyle, setExtractedStyle] = useState<{
        keywords: string[];
        parsed: ParsedStyle;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileUpload = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setError('Image must be less than 10MB');
            return;
        }

        try {
            const base64 = await fileToBase64(file);
            setUploadedImage({
                base64,
                mimeType: file.type,
                fileName: file.name,
            });
            setExtractedStyle(null);
            setError(null);
        } catch {
            setError('Failed to read image file');
        }
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFileUpload(file);
        },
        [handleFileUpload]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    const handleExtractStyle = async () => {
        if (!apiKey || !uploadedImage) return;

        setIsExtracting(true);
        setError(null);

        try {
            const result = await extractStyleFromImage(
                uploadedImage.base64,
                uploadedImage.mimeType
            );
            setExtractedStyle({
                keywords: result.parsedStyle.keywords,
                parsed: result.parsedStyle,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to extract style');
        } finally {
            setIsExtracting(false);
        }
    };

    const handleSave = async () => {
        if (!styleName.trim() || !uploadedImage || !extractedStyle) return;

        setIsSaving(true);
        setError(null);

        try {
            // First, upload the image to the server
            const uploadResult = await uploadService.uploadStyleImage(
                uploadedImage.base64,
                uploadedImage.mimeType,
                uploadedImage.fileName
            );

            // Then create the style via API
            const newStyle = await stylesService.create({
                name: styleName.trim(),
                description: extractedStyle.parsed.overview,
                styleAnalysis: extractedStyle.parsed.overview,
                parsedStyle: extractedStyle.parsed,
                keywords: extractedStyle.keywords,
                referenceImageUrl: uploadResult.url,
                referenceImageKey: uploadResult.key,
                referenceImageThumbUrl: uploadResult.thumbnailUrl,
            });

            onStyleCreated(newStyle);
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save style');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setStyleName('');
        setUploadedImage(null);
        setExtractedStyle(null);
        setError(null);
        onClose();
    };

    const handleRemoveImage = () => {
        setUploadedImage(null);
        setExtractedStyle(null);
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
            <DialogContent className="glass-modal max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold gradient-text flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Create New Style
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* Style Name Input */}
                    <div className="space-y-2">
                        <Label htmlFor="style-name">Style Name *</Label>
                        <Input
                            id="style-name"
                            value={styleName}
                            onChange={(e) => setStyleName(e.target.value)}
                            placeholder="e.g., Pixar 3D, Anime Cute, Watercolor..."
                            className="glass-input"
                        />
                    </div>

                    {/* Image Upload Zone */}
                    {!uploadedImage ? (
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            className="border-2 border-dashed border-muted-foreground/30 rounded-2xl p-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                            onClick={() => document.getElementById('style-image-input')?.click()}
                        >
                            <input
                                type="file"
                                id="style-image-input"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileUpload(file);
                                }}
                            />
                            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-foreground font-medium">
                                Drop your reference image here
                            </p>
                            <p className="text-muted-foreground text-sm mt-1">
                                or click to browse • PNG, JPG up to 10MB
                            </p>
                        </div>
                    ) : (
                        <div className="relative">
                            <img
                                src={`data:${uploadedImage.mimeType};base64,${uploadedImage.base64}`}
                                alt="Uploaded reference"
                                className="w-full max-h-[300px] object-contain rounded-2xl"
                            />
                            <button
                                onClick={handleRemoveImage}
                                className="absolute top-2 right-2 p-2 rounded-full bg-background/80 backdrop-blur hover:bg-background transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

                    {/* Extracted Style Preview */}
                    {extractedStyle && (
                        <div className="space-y-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                            <p className="font-medium text-foreground">Extracted Style</p>
                            <div className="flex flex-wrap gap-2">
                                {extractedStyle.keywords.map((keyword, index) => (
                                    <span
                                        key={index}
                                        className="px-3 py-1 text-sm rounded-full bg-primary/10 text-primary"
                                    >
                                        {keyword}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        {!extractedStyle ? (
                            <Button
                                onClick={handleExtractStyle}
                                disabled={!uploadedImage || isExtracting}
                                className="flex-1 btn-gradient py-5"
                            >
                                {isExtracting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Analyzing Image...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5 mr-2" />
                                        Extract Style with AI
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSave}
                                disabled={!styleName.trim() || isSaving}
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
                        )}
                        <Button variant="ghost" onClick={handleClose} className="btn-glass">
                            Cancel
                        </Button>
                    </div>

                    {/* Cost Estimate */}
                    <p className="text-center text-xs text-muted-foreground">
                        Estimated cost: ~$0.015 USD per style extraction (Gemini 2.5 Flash)
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
