import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Palette, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { stylesService, type Style } from '@/services/api';

interface StyleSelectorModalProps {
    open: boolean;
    onClose: () => void;
    onSelect: (style: Style) => void;
    currentStyleId?: string;
}

export function StyleSelectorModal({
    open,
    onClose,
    onSelect,
    currentStyleId,
}: StyleSelectorModalProps) {
    const [styles, setStyles] = useState<Style[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!open) return;

        async function loadStyles() {
            setIsLoading(true);
            setError(null);
            try {
                const response = await stylesService.list({ limit: 50 });
                setStyles(response.styles);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load styles');
            } finally {
                setIsLoading(false);
            }
        }
        loadStyles();
    }, [open]);

    const filteredStyles = styles.filter(style =>
        style.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        style.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleSelect = (style: Style) => {
        onSelect(style);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="glass-modal max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold gradient-text flex items-center gap-2">
                        <Palette className="w-5 h-5" />
                        Select Style
                    </DialogTitle>
                </DialogHeader>

                {/* Search */}
                <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search styles..."
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
                    ) : filteredStyles.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            {searchQuery ? 'No styles match your search' : 'No styles saved yet'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {filteredStyles.map((style) => (
                                <button
                                    key={style.id}
                                    onClick={() => handleSelect(style)}
                                    className={`group relative rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:ring-2 hover:ring-primary/50 ${style.id === currentStyleId
                                            ? 'ring-2 ring-primary'
                                            : ''
                                        }`}
                                >
                                    <img
                                        src={style.referenceImageThumbUrl || style.referenceImageUrl}
                                        alt={style.name}
                                        className="w-full aspect-square object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                    <div className="absolute bottom-0 left-0 right-0 p-3">
                                        <p className="text-sm font-medium text-white truncate">
                                            {style.name}
                                        </p>
                                        {style.id === currentStyleId && (
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
