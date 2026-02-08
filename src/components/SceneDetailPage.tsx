import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '@/services/api/client';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    Film,
    Star,
    Trash2,
    Clock,
    RefreshCw,
    Loader2,
    Sparkles,
    FileText,
    Play,
    Video,

    Calendar,
    MessageSquare,
    Move,
    Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SceneTemplate {
    id: string;
    title: string;
    description?: string;
    originalPrompt: string;
    escena: string;
    fondo: string;
    accion: string;
    dialogo: string;
    voiceStyle?: string;
    movimiento?: string;
    suggestedDuration: number;
    condicionesFisicas?: string;
    defectosTecnicos?: string;
    contextoInvisible?: string;
    isFavorite: boolean;
    timesUsed: number;
    lastUsedAt?: string;
    createdAt: string;
    tags: string[];
}

export function SceneDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [scene, setScene] = useState<SceneTemplate | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        const fetchScene = async () => {
            setLoading(true);
            try {
                const response = await apiClient.get(`/scenes/${id}`);
                setScene(response.data.scene);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load scene');
            } finally {
                setLoading(false);
            }
        };

        fetchScene();
    }, [id]);

    const handleToggleFavorite = async () => {
        if (!scene) return;
        try {
            const response = await apiClient.put(`/scenes/${scene.id}`, { isFavorite: !scene.isFavorite });
            setScene(response.data.scene);
            toast.success(response.data.scene.isFavorite ? 'Added to favorites' : 'Removed from favorites');
        } catch (err) {
            toast.error('Failed to update');
        }
    };

    const handleDelete = async () => {
        if (!scene) return;
        if (!confirm('Are you sure you want to delete this scene template?')) return;

        try {
            await apiClient.delete(`/scenes/${scene.id}`);
            toast.success('Scene deleted');
            navigate('/library');
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const handleUseScene = () => {
        if (!scene) return;
        // Navigate to video generator with scene pre-filled
        navigate('/video', { state: { generatedScene: scene } });
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !scene) {
        return (
            <div className="max-w-4xl mx-auto text-center py-20">
                <p className="text-destructive mb-4">{error || 'Scene not found'}</p>
                <Button onClick={() => navigate('/library')} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Library
                </Button>
            </div>
        );
    }

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
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                            <Film className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{scene.title}</h1>
                            {scene.description && (
                                <p className="text-muted-foreground text-sm mt-1">{scene.description}</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleToggleFavorite}
                        className="hover:scale-110 transition"
                    >
                        <Star className={`w-6 h-6 ${scene.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                    </button>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(scene.createdAt), 'MMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1">
                        <RefreshCw className="w-4 h-4" />
                        Used {scene.timesUsed}x
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {scene.suggestedDuration}s
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mb-6">
                <Button
                    onClick={handleUseScene}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white h-12"
                >
                    <Play className="w-5 h-5 mr-2" />
                    Use for Video Generation (Free)
                </Button>
                <Button
                    onClick={handleDelete}
                    variant="outline"
                    className="glass text-destructive hover:bg-destructive/10"
                >
                    <Trash2 className="w-5 h-5" />
                </Button>
            </div>

            {/* Scene Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SceneField icon={Sparkles} label="Escena (Setting)" value={scene.escena} />
                {scene.fondo && <SceneField icon={Video} label="Fondo (Background)" value={scene.fondo} />}
                <SceneField icon={Move} label="Acción (Action)" value={scene.accion} />
                <SceneField icon={MessageSquare} label="Diálogo" value={`"${scene.dialogo}"`} />
                {scene.voiceStyle && <SceneField icon={Users} label="Voice Style" value={scene.voiceStyle} />}
                {scene.movimiento && <SceneField icon={Move} label="Camera/Motion" value={scene.movimiento} />}
            </div>

            {/* Original Prompt */}
            <div className="glass-card p-5 mt-4">
                <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-primary" />
                    Original Prompt
                </h3>
                <p className="text-sm text-muted-foreground bg-black/20 rounded-lg p-3">
                    {scene.originalPrompt}
                </p>
            </div>

            {/* Tags */}
            {scene.tags && scene.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                    {scene.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 rounded-full text-xs glass">
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

function SceneField({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>, label: string, value: string }) {
    return (
        <div className="glass-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Icon className="w-3 h-3" />
                {label}
            </div>
            <p className="text-sm">{value}</p>
        </div>
    );
}

export default SceneDetailPage;
