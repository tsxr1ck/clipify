import { Trash2, Check, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base64ToDataUrl } from '@/utils/imageProcessing';

interface LibraryCardProps {
    id: string;
    name: string;
    imageBase64: string;
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

    const imageUrl = base64ToDataUrl(imageBase64, imageMimeType);

    return (
        <div
            className={cn(
                'group relative rounded-2xl overflow-hidden transition-all duration-300',
                'border-2',
                isSelected
                    ? 'border-transparent bg-gradient-to-br from-purple-500 to-blue-500 p-[2px]'
                    : 'border-transparent glass-card',
                className,
            )}
        >
            {/* Inner container for gradient border effect */}
            <div
                className={cn(
                    'relative h-full rounded-[14px] overflow-hidden',
                    isSelected ? 'bg-card' : '',
                )}
            >
                {/* Image */}
                <div className="relative aspect-square overflow-hidden">
                    <img
                        src={imageUrl}
                        alt={name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                    {/* View button on hover */}
                    {onView && (
                        <button
                            onClick={() => onView(id)}
                            className="absolute top-2 right-2 p-2 rounded-full bg-black/30 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/50"
                            aria-label="View details"
                        >
                            <Eye className="w-4 h-4 text-white" />
                        </button>
                    )}

                    {/* Selected checkmark */}
                    {isSelected && (
                        <div className="absolute top-2 left-2 p-1.5 rounded-full bg-gradient-to-br from-purple-500 to-blue-500">
                            <Check className="w-4 h-4 text-white" strokeWidth={3} />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-4">
                    {/* Name */}
                    <h3 className="font-semibold text-foreground truncate">{name}</h3>

                    {/* Subtitle (e.g., style name for characters) */}
                    {subtitle && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">{subtitle}</p>
                    )}

                    {/* Tags */}
                    {tags && tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {tags.slice(0, 3).map((tag, index) => (
                                <span
                                    key={index}
                                    className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary"
                                >
                                    {tag}
                                </span>
                            ))}
                            {tags.length > 3 && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                                    +{tags.length - 3}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Date */}
                    <p className="text-xs text-muted-foreground mt-2">📅 {formattedDate}</p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                        {onSelect && (
                            <button
                                onClick={() => onSelect(id)}
                                className={cn(
                                    'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200',
                                    isSelected
                                        ? 'btn-gradient'
                                        : 'btn-glass hover:bg-primary/10 hover:text-primary',
                                )}
                            >
                                {isSelected ? 'Selected' : 'Select'}
                            </button>
                        )}

                        {onDelete && (
                            <button
                                onClick={() => onDelete(id)}
                                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                aria-label="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
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
                'group relative rounded-2xl overflow-hidden transition-all duration-300',
                'border-2 border-dashed border-muted-foreground/30 hover:border-primary/50',
                'bg-transparent hover:bg-primary/5',
                'min-h-[280px] flex flex-col items-center justify-center gap-3 p-6',
                className,
            )}
        >
            {/* Plus icon */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center glass group-hover:bg-primary/10 transition-colors">
                <span className="text-3xl gradient-text font-light">+</span>
            </div>

            {/* Label */}
            <span className="text-lg font-semibold gradient-text">{label}</span>

            {/* Description */}
            {description && (
                <span className="text-sm text-muted-foreground text-center max-w-[180px]">
                    {description}
                </span>
            )}
        </button>
    );
}
