import { Trash2, Check, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base64ToDataUrl } from '@/utils/imageProcessing';

interface LibraryCardProps {
    id: string;
    name: string;
    imageBase64?: string;
    imageUrl?: string;
    imageMimeType?: string;
    createdAt: number;
    tags?: string[];
    subtitle?: string;
    isSelected?: boolean;
    onSelect?: (id: string) => void;
    onDelete?: (id: string) => void;
    onView?: (id: string) => void;
    className?: string;
}

export function LibraryCard({
    id,
    name,
    imageBase64,
    imageUrl,
    imageMimeType = 'image/png',
    createdAt,
    tags,
    subtitle,
    isSelected,
    onSelect,
    onDelete,
    onView,
    className,
}: LibraryCardProps) {
    const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    const imageSrc = imageUrl || (imageBase64 ? base64ToDataUrl(imageBase64, imageMimeType) : '');

    return (
        <div
            className={cn(
                'group relative rounded-xl overflow-hidden transition-all duration-300',
                isSelected
                    ? 'ring-2 ring-primary shadow-lg shadow-primary/20 scale-[1.02]'
                    : 'glass-card hover:border-primary/50 hover:shadow-lg',
                className,
            )}
        >
            {/* Image Container */}
            <div className="relative aspect-square overflow-hidden bg-muted/30">
                <img
                    src={imageSrc}
                    alt={name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                {/* Actions Overlay */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20 backdrop-blur-[2px]">
                    {onView && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onView(id); }}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-transform hover:scale-110"
                            title="View"
                        >
                            <Eye className="w-5 h-5" />
                        </button>
                    )}
                    {onSelect && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSelect(id); }}
                            className={cn(
                                "py-2 px-4 rounded-full font-medium text-sm backdrop-blur-md transition-transform hover:scale-105",
                                isSelected
                                    ? "bg-primary text-primary-foreground shadow-lg"
                                    : "bg-white text-black hover:bg-white/90"
                            )}
                        >
                            {isSelected ? 'Selected' : 'Select'}
                        </button>
                    )}
                </div>

                {/* Selected Indicator */}
                {isSelected && (
                    <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg animate-scaleIn">
                        <Check className="w-5 h-5 text-white" strokeWidth={3} />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <div className="mb-2">
                    <h3 className="font-semibold text-foreground truncate text-base">{name}</h3>
                    {subtitle && (
                        <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
                    )}
                </div>

                {/* Tags */}
                {tags && tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {tags.slice(0, 3).map((tag, index) => (
                            <span
                                key={index}
                                className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md bg-primary/10 text-primary"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground/70">{formattedDate}</p>

                    {onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

interface CreateNewCardProps {
    label: string;
    description?: string;
    onClick: () => void;
    className?: string;
}

export function CreateNewCard({ label, description, onClick, className }: CreateNewCardProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'group relative rounded-xl overflow-hidden transition-all duration-300',
                'border-2 border-dashed border-border hover:border-primary/50',
                'bg-muted/5 hover:bg-primary/5',
                'aspect-[3/4] flex flex-col items-center justify-center gap-4 p-6 text-center',
                className,
            )}
        >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-4xl text-primary font-light">+</span>
            </div>

            <div className="space-y-1">
                <p className="font-semibold text-foreground">{label}</p>
                {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}
            </div>
        </button>
    );
}
