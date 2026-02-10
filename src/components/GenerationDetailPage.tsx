import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generationsService, type Generation } from '@/services/api/generationsService';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    Film,
    Image as ImageIcon,
    Star,
    Trash2,
    Download,
    Calendar,
    DollarSign,
    Clock,
    ExternalLink,
    Loader2,
    Sparkles,
    User,
    Palette,
    FileText,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

export function GenerationDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [generation, setGeneration] = useState<Generation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        const fetchGeneration = async () => {
            setLoading(true);
            try {
                const data = await generationsService.get(id);
                setGeneration(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load generation');
            } finally {
                setLoading(false);
            }
        };

        fetchGeneration();
    }, [id]);

    const handleToggleFavorite = async () => {
        if (!generation) return;
        try {
            const updated = await generationsService.update(generation.id, { isFavorite: !generation.isFavorite });
            setGeneration(updated);
            toast.success(updated.isFavorite ? 'Added to favorites' : 'Removed from favorites');
        } catch (err) {
            toast.error('Failed to update');
        }
    };

    const handleDelete = async () => {
        if (!generation) return;
        if (!confirm('Are you sure you want to delete this generation?')) return;

        try {
            await generationsService.delete(generation.id);
            toast.success('Generation deleted');
            navigate('/library');
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const handleDownload = () => {
        if (!generation?.outputUrl) return;
        const link = document.createElement('a');
        link.href = generation.outputUrl;
        link.download = `${generation.title || 'generation'}.${generation.generationType === 'video' ? 'mp4' : 'png'}`;
        link.click();
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !generation) {
        return (
            <div className="max-w-4xl mx-auto text-center py-20">
                <p className="text-destructive mb-4">{error || 'Generation not found'}</p>
                <Button onClick={() => navigate('/library')} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Library
                </Button>
            </div>
        );
    }

    const isVideo = generation.generationType === 'video';
    const hasOutput = !!generation.outputUrl;

    return (
        <div className="max-w-5xl mx-auto">
            {/* Back Button */}
            <button
                onClick={() => navigate('/library')}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Library
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Media Preview */}
                <div className="glass-card p-4">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black/20">
                        {hasOutput ? (
                            isVideo ? (
                                <video
                                    src={generation.outputUrl}
                                    controls
                                    className="w-full h-full object-contain"
                                    poster={generation.thumbnailUrl}
                                />
                            ) : (
                                <img
                                    src={generation.outputUrl}
                                    alt={generation.title}
                                    className="w-full h-full object-contain"
                                />
                            )
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                {isVideo ? <Film className="w-16 h-16 text-muted-foreground" /> : <ImageIcon className="w-16 h-16 text-muted-foreground" />}
                            </div>
                        )}

                        {/* Type Badge */}
                        <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-lg text-sm font-medium ${isVideo ? 'bg-purple-500/80' : 'bg-blue-500/80'} text-white backdrop-blur-sm flex items-center gap-1.5`}>
                            {isVideo ? <><Film className="w-4 h-4" /> Video</> : <><ImageIcon className="w-4 h-4" /> Image</>}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-4">
                        {hasOutput && (
                            <>
                                <Button
                                    onClick={() => window.open(generation.outputUrl, '_blank')}
                                    variant="outline"
                                    className="flex-1 glass"
                                >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Open
                                </Button>
                                <Button
                                    onClick={handleDownload}
                                    className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                </Button>
                            </>
                        )}
                        <Button
                            onClick={handleToggleFavorite}
                            variant="outline"
                            className={`glass ${generation.isFavorite ? 'text-yellow-500' : ''}`}
                        >
                            <Star className={`w-4 h-4 ${generation.isFavorite ? 'fill-current' : ''}`} />
                        </Button>
                        <Button
                            onClick={handleDelete}
                            variant="outline"
                            className="glass text-destructive hover:bg-destructive/10"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Details */}
                <div className="space-y-4">
                    {/* Title & Status */}
                    <div className="glass-card p-5">
                        <div className="flex items-start justify-between mb-3">
                            <h1 className="text-2xl font-bold">{generation.title}</h1>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${generation.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                generation.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                    'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                {generation.status}
                            </span>
                        </div>
                        {generation.description && (
                            <p className="text-muted-foreground text-sm">{generation.description}</p>
                        )}
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <MetadataCard icon={Calendar} label="Created" value={format(new Date(generation.createdAt), 'MMM d, yyyy HH:mm')} />
                        {generation.completedAt && (
                            <MetadataCard icon={Clock} label="Completed" value={formatDistanceToNow(new Date(generation.completedAt), { addSuffix: true })} />
                        )}
                        {generation.costMxn !== undefined && generation.costMxn > 0 && (
                            <MetadataCard icon={DollarSign} label="Cost" value={`$${Number(generation.costMxn).toFixed(2)} MXN`} />
                        )}
                        {generation.durationSeconds && (
                            <MetadataCard icon={Film} label="Duration" value={`${generation.durationSeconds}s`} />
                        )}
                        {generation.width && generation.height && (
                            <MetadataCard icon={ImageIcon} label="Resolution" value={`${generation.width}×${generation.height}`} />
                        )}
                        {generation.character && (
                            <MetadataCard icon={User} label="Character" value={generation.character.name} />
                        )}
                        {generation.style && (
                            <MetadataCard icon={Palette} label="Style" value={generation.style.name} />
                        )}
                    </div>

                    {/* Prompt */}
                    <div className="glass-card p-5">
                        <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                            <FileText className="w-4 h-4 text-primary" />
                            Prompt
                        </h3>
                        <p className="text-sm text-muted-foreground bg-black/20 rounded-lg p-3">
                            {generation.prompt}
                        </p>
                    </div>

                    {/* Scene Config (if available) */}
                    {generation.sceneConfig && (
                        <div className="glass-card p-5">
                            <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                                <Sparkles className="w-4 h-4 text-primary" />
                                Scene Configuration
                            </h3>
                            <div className="space-y-2 text-sm">
                                {Object.entries(generation.sceneConfig).map(([key, value]) => (
                                    <div key={key} className="flex gap-2">
                                        <span className="text-muted-foreground capitalize min-w-[80px]">{key}:</span>
                                        <span>{String(value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tags */}
                    {generation.tags && generation.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {generation.tags.map(tag => (
                                <span key={tag} className="px-3 py-1 rounded-full text-xs glass">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function MetadataCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>, label: string, value: string }) {
    return (
        <div className="glass rounded-xl p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Icon className="w-3 h-3" />
                {label}
            </div>
            <div className="text-sm font-medium">{value}</div>
        </div>
    );
}

export default GenerationDetailPage;
