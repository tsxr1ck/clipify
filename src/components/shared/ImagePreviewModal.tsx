import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ImagePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string;
    onDownload?: () => void;
}

export function ImagePreviewModal({ isOpen, onClose, imageSrc, onDownload }: ImagePreviewModalProps) {
    const [zoom, setZoom] = useState(1);

    if (!isOpen) return null;

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
    const handleResetZoom = () => setZoom(1);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fadeIn"
            onClick={onClose}
        >
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-3 rounded-full glass hover:bg-white/20 transition-colors z-10"
                aria-label="Close"
            >
                <X className="w-6 h-6 text-white" />
            </button>

            {/* Controls */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-xl glass z-10">
                <button
                    onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
                    className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                    aria-label="Zoom out"
                >
                    <ZoomOut className="w-5 h-5 text-white" />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); handleResetZoom(); }}
                    className="px-3 py-1 rounded-lg hover:bg-white/20 transition-colors text-white text-sm font-medium"
                >
                    {Math.round(zoom * 100)}%
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
                    className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                    aria-label="Zoom in"
                >
                    <ZoomIn className="w-5 h-5 text-white" />
                </button>
            </div>

            {/* Image container */}
            <div
                className="relative max-w-[90vw] max-h-[85vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={imageSrc}
                    alt="Preview"
                    className="rounded-xl shadow-2xl transition-transform duration-200"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                />
            </div>

            {/* Download button */}
            {onDownload && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                    <Button
                        onClick={(e) => { e.stopPropagation(); onDownload(); }}
                        className="bg-gradient-to-br from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 px-6"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download Image
                    </Button>
                </div>
            )}

            {/* Hint text */}
            <p className="absolute bottom-4 right-4 text-xs text-white/50">
                Click outside or press ESC to close
            </p>
        </div>
    );
}
