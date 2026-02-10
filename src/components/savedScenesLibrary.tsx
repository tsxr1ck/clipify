import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGenerations } from '@/hooks/useGenerations';
import { useSavedScenes, useSavedStories } from '@/hooks/useSavedScenes';
import type { Generation, GenerationType } from '@/services/api/generationsService';
import type { SavedScene, SavedStory } from '@/hooks/useSavedScenes';
import { Button } from '@/components/ui/button';
import {
    Film,
    Image as ImageIcon,
    Star,
    Trash2,
    Search,
    Clock,
    Library,
    RefreshCw,
    Play,
    BookOpen,
    Sparkles,
    Eye,
} from 'lucide-react';
import { toast } from 'sonner';

type MainTab = 'generations' | 'scenes' | 'stories';
type GenerationFilter = 'all' | 'video' | 'image';

export function GenerationsLibrary() {
    const navigate = useNavigate();
    const [mainTab, setMainTab] = useState<MainTab>('generations');
    const [generationFilter, setGenerationFilter] = useState<GenerationFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

    // Generations data
    const typeFilter: GenerationType | undefined = generationFilter === 'all' ? undefined : generationFilter;
    const {
        generations,
        loading: generationsLoading,
        error: generationsError,
        pagination,
        toggleFavorite: toggleGenerationFavorite,
        deleteGeneration,
        refetch: refetchGenerations,
        fetchPage,
    } = useGenerations({
        type: typeFilter,
        favorites: showFavoritesOnly,
        limit: 50,
    });

    // Scenes data
    const {
        scenes,
        loading: scenesLoading,
        error: scenesError,
        toggleFavorite: toggleSceneFavorite,
        deleteScene,
        refresh: refetchScenes,
    } = useSavedScenes({
        search: searchQuery,
        favorites: showFavoritesOnly,
    });

    // Stories data
    const {
        stories,
        loading: storiesLoading,
        error: storiesError,
        toggleFavorite: toggleStoryFavorite,
        deleteStory,
        refresh: refetchStories,
    } = useSavedStories({
        search: searchQuery,
        favorites: showFavoritesOnly,
    });

    // Filter generations by search
    const filteredGenerations = searchQuery
        ? generations.filter(g =>
            g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            g.prompt?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : generations;

    const handleDeleteGeneration = async (id: string) => {
        if (!confirm('Delete this generation?')) return;
        try {
            await deleteGeneration(id);
            toast.success('Deleted');
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const handleDeleteScene = async (id: string) => {
        if (!confirm('Delete this scene template?')) return;
        try {
            await deleteScene(id);
            toast.success('Deleted');
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const handleDeleteStory = async (id: string) => {
        if (!confirm('Delete this story template?')) return;
        try {
            await deleteStory(id);
            toast.success('Deleted');
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const loading = mainTab === 'generations' ? generationsLoading : mainTab === 'scenes' ? scenesLoading : storiesLoading;
    const error = mainTab === 'generations' ? generationsError : mainTab === 'scenes' ? scenesError : storiesError;

    const videoCount = generations.filter(g => g.generationType === 'video').length;
    const imageCount = generations.filter(g => g.generationType === 'image').length;

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 mb-4">
                    <Library className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold gradient-text mb-2">Your Library</h1>
                <p className="text-muted-foreground max-w-lg mx-auto">
                    Generated content and reusable templates
                </p>
            </div>

            {/* Main Card */}
            <div className="glass-card p-6">
                {/* Main Tabs */}
                <div className="flex justify-center mb-6">
                    <div className="inline-flex p-1 rounded-xl glass">
                        <button
                            onClick={() => setMainTab('generations')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${mainTab === 'generations'
                                ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Film className="w-4 h-4" />
                            Generations ({pagination.total})
                        </button>
                        <button
                            onClick={() => setMainTab('scenes')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${mainTab === 'scenes'
                                ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Sparkles className="w-4 h-4" />
                            Scene Templates ({scenes.length})
                        </button>
                        <button
                            onClick={() => setMainTab('stories')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${mainTab === 'stories'
                                ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <BookOpen className="w-4 h-4" />
                            Story Templates ({stories.length})
                        </button>
                    </div>
                </div>

                {/* Sub-tabs for Generations */}
                {mainTab === 'generations' && (
                    <div className="flex justify-center mb-4">
                        <div className="inline-flex p-1 rounded-lg glass">
                            {(['all', 'video', 'image'] as GenerationFilter[]).map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setGenerationFilter(filter)}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-all ${generationFilter === filter
                                        ? 'bg-primary/20 text-primary'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {filter === 'all' && <Library className="w-3 h-3" />}
                                    {filter === 'video' && <Film className="w-3 h-3" />}
                                    {filter === 'image' && <ImageIcon className="w-3 h-3" />}
                                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                                    {filter === 'video' && ` (${videoCount})`}
                                    {filter === 'image' && ` (${imageCount})`}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="flex gap-3 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full glass-input pl-10 pr-4 py-2.5 rounded-lg text-sm"
                        />
                    </div>
                    <button
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${showFavoritesOnly
                            ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white'
                            : 'glass text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                    </button>
                    <button
                        onClick={() => {
                            if (mainTab === 'generations') refetchGenerations();
                            else if (mainTab === 'scenes') refetchScenes();
                            else refetchStories();
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg glass text-muted-foreground hover:text-foreground transition-all"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-center">
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                )}

                {/* Generations Grid */}
                {mainTab === 'generations' && !loading && !error && (
                    <>
                        {filteredGenerations.length === 0 ? (
                            <EmptyState icon={Film} message="No generations yet" />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredGenerations.map((gen) => (
                                    <GenerationCard
                                        key={gen.id}
                                        generation={gen}
                                        onToggleFavorite={() => toggleGenerationFavorite(gen.id)}
                                        onDelete={() => handleDeleteGeneration(gen.id)}
                                        onView={() => navigate(`/library/generation/${gen.id}`)}
                                    />
                                ))}
                            </div>
                        )}
                        {pagination.totalPages > 1 && (
                            <div className="flex justify-center gap-2 mt-6">
                                <Button variant="outline" size="sm" onClick={() => fetchPage(pagination.page - 1)} disabled={pagination.page === 1} className="glass">Previous</Button>
                                <span className="px-4 py-2 text-sm text-muted-foreground">{pagination.page} / {pagination.totalPages}</span>
                                <Button variant="outline" size="sm" onClick={() => fetchPage(pagination.page + 1)} disabled={pagination.page === pagination.totalPages} className="glass">Next</Button>
                            </div>
                        )}
                    </>
                )}

                {/* Scenes Grid */}
                {mainTab === 'scenes' && !loading && !error && (
                    scenes.length === 0 ? (
                        <EmptyState icon={Sparkles} message="No scene templates yet" subtitle="Generate a scene to create a template" />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {scenes.map((scene) => (
                                <SceneCard
                                    key={scene.id}
                                    scene={scene}
                                    onToggleFavorite={() => toggleSceneFavorite(scene.id)}
                                    onDelete={() => handleDeleteScene(scene.id)}
                                    onView={() => navigate(`/library/scene/${scene.id}`)}
                                    onUse={() => navigate('/video', { state: { generatedScene: scene } })}
                                />
                            ))}
                        </div>
                    )
                )}

                {/* Stories Grid */}
                {mainTab === 'stories' && !loading && !error && (
                    stories.length === 0 ? (
                        <EmptyState icon={BookOpen} message="No story templates yet" subtitle="Generate a story to create a template" />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {stories.map((story) => (
                                <StoryCard
                                    key={story.id}
                                    story={story}
                                    onToggleFavorite={() => toggleStoryFavorite(story.id)}
                                    onDelete={() => handleDeleteStory(story.id)}
                                    onView={() => navigate(`/library/story/${story.id}`)}
                                    onUse={() => navigate('/video', { state: { generatedStory: story } })}
                                />
                            ))}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

function EmptyState({ icon: Icon, message, subtitle }: { icon: React.ComponentType<{ className?: string }>, message: string, subtitle?: string }) {
    return (
        <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl glass mb-4">
                <Icon className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">{message}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
    );
}

// Generation Card
function GenerationCard({ generation, onToggleFavorite, onDelete, onView }: { generation: Generation; onToggleFavorite: () => void; onDelete: () => void; onView: () => void }) {
    const isVideo = generation.generationType === 'video';
    const hasOutput = !!generation.outputUrl;

    return (
        <div onClick={onView} className="group rounded-xl border border-primary/10 bg-gradient-to-b from-primary/5 to-transparent overflow-hidden hover:border-primary/30 transition-all cursor-pointer">
            <div className="relative aspect-video bg-black/20">
                {hasOutput ? (
                    isVideo ? (
                        <video src={generation.outputUrl} className="w-full h-full object-cover" muted poster={generation.thumbnailUrl} />
                    ) : (
                        <img src={generation.outputUrl} alt={generation.title} className="w-full h-full object-cover" />
                    )
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        {isVideo ? <Film className="w-8 h-8 text-muted-foreground" /> : <ImageIcon className="w-8 h-8 text-muted-foreground" />}
                    </div>
                )}
                <div className={`absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-medium ${isVideo ? 'bg-purple-500/80' : 'bg-blue-500/80'} text-white`}>
                    {isVideo ? 'Video' : 'Image'}
                </div>
                {isVideo && generation.durationSeconds && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md text-xs bg-black/60 text-white">{generation.durationSeconds}s</div>
                )}
            </div>
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-sm line-clamp-1">{generation.title}</h3>
                    <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }} className="hover:scale-110 transition">
                        <Star className={`w-4 h-4 ${generation.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                    </button>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{generation.prompt}</p>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="flex-1 glass text-xs" onClick={(e) => { e.stopPropagation(); onView(); }}>
                        <Eye className="w-3 h-3 mr-1" /> View
                    </Button>
                    <Button size="sm" variant="outline" className="glass text-destructive px-2" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                        <Trash2 className="w-3 h-3" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

// Scene Card
function SceneCard({ scene, onToggleFavorite, onDelete, onView, onUse }: { scene: SavedScene; onToggleFavorite: () => void; onDelete: () => void; onView: () => void; onUse: () => void }) {
    return (
        <div onClick={onView} className="group rounded-xl border border-primary/10 bg-gradient-to-b from-primary/5 to-transparent p-4 hover:border-primary/30 transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-1">{scene.title}</h3>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}>
                    <Star className={`w-4 h-4 ${scene.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                </button>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">"{scene.dialogo}"</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <span><Clock className="w-3 h-3 inline mr-1" />{scene.suggestedDuration}s</span>
                <span><RefreshCw className="w-3 h-3 inline mr-1" />{scene.timesUsed}x</span>
            </div>
            <div className="flex gap-2">
                <Button size="sm" className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs" onClick={(e) => { e.stopPropagation(); onUse(); }}>
                    <Play className="w-3 h-3 mr-1" /> Use Free
                </Button>
                <Button size="sm" variant="outline" className="glass text-destructive px-2" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                    <Trash2 className="w-3 h-3" />
                </Button>
            </div>
        </div>
    );
}

// Story Card
function StoryCard({ story, onToggleFavorite, onDelete, onView, onUse }: { story: SavedStory; onToggleFavorite: () => void; onDelete: () => void; onView: () => void; onUse: () => void }) {
    return (
        <div onClick={onView} className="group rounded-xl border border-primary/10 bg-gradient-to-b from-primary/5 to-transparent p-4 hover:border-primary/30 transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-1">{story.storyTitle}</h3>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}>
                    <Star className={`w-4 h-4 ${story.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                </button>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{story.storyDescription}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <span className="px-2 py-1 rounded-full glass"><Film className="w-3 h-3 inline mr-1" />{story.segmentCount} segments</span>
                <span><RefreshCw className="w-3 h-3 inline mr-1" />{story.timesUsed}x</span>
            </div>
            <div className="flex gap-2">
                <Button size="sm" className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs" onClick={(e) => { e.stopPropagation(); onUse(); }}>
                    <Play className="w-3 h-3 mr-1" /> Use Free
                </Button>
                <Button size="sm" variant="outline" className="glass text-destructive px-2" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                    <Trash2 className="w-3 h-3" />
                </Button>
            </div>
        </div>
    );
}

export default GenerationsLibrary;