import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '@/services/api/client';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    BookOpen,
    Star,
    Trash2,
    Clock,
    RefreshCw,
    Loader2,
    Sparkles,
    FileText,
    Play,
    ChevronLeft,
    ChevronRight,
    Calendar,
    MessageSquare,
    Move,
    Film,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface StorySegment {
    segmentNumber: number;
    title: string;
    escena: string;
    fondo?: string;
    accion: string;
    dialogo: string;
    voiceStyle?: string;
    movimiento?: string;
    suggestedDuration: number;
}

interface StoryTemplate {
    id: string;
    storyTitle: string;
    storyDescription?: string;
    originalPrompt: string;
    segmentCount: number;
    segments: StorySegment[];
    isFavorite: boolean;
    timesUsed: number;
    lastUsedAt?: string;
    createdAt: string;
    tags: string[];
}

export function StoryDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [story, setStory] = useState<StoryTemplate | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);

    useEffect(() => {
        if (!id) return;

        const fetchStory = async () => {
            setLoading(true);
            try {
                const response = await apiClient.get(`/stories/${id}`);
                setStory(response.data.story);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load story');
            } finally {
                setLoading(false);
            }
        };

        fetchStory();
    }, [id]);

    const handleToggleFavorite = async () => {
        if (!story) return;
        try {
            const response = await apiClient.put(`/stories/${story.id}`, { isFavorite: !story.isFavorite });
            setStory(response.data.story);
            toast.success(response.data.story.isFavorite ? 'Added to favorites' : 'Removed from favorites');
        } catch (err) {
            toast.error('Failed to update');
        }
    };

    const handleDelete = async () => {
        if (!story) return;
        if (!confirm('Are you sure you want to delete this story template?')) return;

        try {
            await apiClient.delete(`/stories/${story.id}`);
            toast.success('Story deleted');
            navigate('/library');
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const handleUseStory = () => {
        if (!story) return;
        // Navigate to video generator with story pre-filled
        navigate('/video', { state: { generatedStory: story } });
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !story) {
        return (
            <div className="max-w-4xl mx-auto text-center py-20">
                <p className="text-destructive mb-4">{error || 'Story not found'}</p>
                <Button onClick={() => navigate('/library')} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Library
                </Button>
            </div>
        );
    }

    const currentSegment = story.segments[currentSegmentIndex];
    const totalDuration = story.segments.reduce((sum, seg) => sum + seg.suggestedDuration, 0);

    return (
        <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <button
                onClick={() => navigate('/library')}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Library
            </button>

            {/* Header */}
            <div className="glass-card p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{story.storyTitle}</h1>
                            {story.storyDescription && (
                                <p className="text-muted-foreground text-sm mt-1">{story.storyDescription}</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleToggleFavorite}
                        className="hover:scale-110 transition"
                    >
                        <Star className={`w-6 h-6 ${story.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                    </button>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(story.createdAt), 'MMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1">
                        <Film className="w-4 h-4" />
                        {story.segmentCount} segments
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {totalDuration}s total
                    </span>
                    <span className="flex items-center gap-1">
                        <RefreshCw className="w-4 h-4" />
                        Used {story.timesUsed}x
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mb-6">
                <Button
                    onClick={handleUseStory}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white h-12"
                >
                    <Play className="w-5 h-5 mr-2" />
                    Generate All {story.segmentCount} Videos (Free)
                </Button>
                <Button
                    onClick={handleDelete}
                    variant="outline"
                    className="glass text-destructive hover:bg-destructive/10"
                >
                    <Trash2 className="w-5 h-5" />
                </Button>
            </div>

            {/* Segment Navigation Dots */}
            <div className="flex items-center justify-center gap-2 mb-4">
                {story.segments.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentSegmentIndex(idx)}
                        className={`w-3 h-3 rounded-full transition-all ${idx === currentSegmentIndex
                            ? 'bg-gradient-to-br from-purple-500 to-blue-500 scale-125'
                            : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                            }`}
                    />
                ))}
            </div>

            {/* Current Segment Card */}
            {currentSegment && (
                <div className="glass-card p-6 mb-4">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                            {currentSegment.segmentNumber}
                        </div>
                        <div>
                            <h3 className="font-semibold">{currentSegment.title}</h3>
                            <p className="text-xs text-muted-foreground">{currentSegment.suggestedDuration}s segment</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <SegmentField icon={Sparkles} label="Escena" value={currentSegment.escena} />
                        {currentSegment.fondo && <SegmentField icon={Film} label="Fondo" value={currentSegment.fondo} />}
                        <SegmentField icon={Move} label="Acción" value={currentSegment.accion} />
                        <SegmentField icon={MessageSquare} label="Diálogo" value={`"${currentSegment.dialogo}"`} />
                        {currentSegment.voiceStyle && <SegmentField icon={MessageSquare} label="Voz" value={currentSegment.voiceStyle} />}
                        {currentSegment.movimiento && <SegmentField icon={Move} label="Movimiento" value={currentSegment.movimiento} />}
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentSegmentIndex(Math.max(0, currentSegmentIndex - 1))}
                            disabled={currentSegmentIndex === 0}
                            className="glass"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            {currentSegmentIndex + 1} of {story.segments.length}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentSegmentIndex(Math.min(story.segments.length - 1, currentSegmentIndex + 1))}
                            disabled={currentSegmentIndex === story.segments.length - 1}
                            className="glass"
                        >
                            Next
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}

            {/* All Segments Overview */}
            <div className="glass-card p-5">
                <h3 className="text-sm font-medium mb-3">All Segments</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {story.segments.map((seg, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentSegmentIndex(idx)}
                            className={`p-3 rounded-lg text-left transition-all ${idx === currentSegmentIndex
                                ? 'ring-2 ring-primary bg-primary/10'
                                : 'glass hover:bg-primary/5'
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xs flex items-center justify-center font-medium">
                                    {seg.segmentNumber}
                                </span>
                                <span className="text-xs font-medium truncate">{seg.title}</span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{seg.dialogo}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Original Prompt */}
            <div className="glass-card p-5 mt-4">
                <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-primary" />
                    Original Prompt
                </h3>
                <p className="text-sm text-muted-foreground bg-black/20 rounded-lg p-3">
                    {story.originalPrompt}
                </p>
            </div>

            {/* Tags */}
            {story.tags && story.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                    {story.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 rounded-full text-xs glass">
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

function SegmentField({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>, label: string, value: string }) {
    return (
        <div className="glass rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Icon className="w-3 h-3" />
                {label}
            </div>
            <p className="text-sm">{value}</p>
        </div>
    );
}

export default StoryDetailPage;
