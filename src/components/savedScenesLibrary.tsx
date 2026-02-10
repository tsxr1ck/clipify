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
    MoreVertical,
    Download
} from 'lucide-react';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';

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

    // Filter generations by search locally since hook might not support it fully or for instant feedback
    const filteredGenerations = searchQuery
        ? generations.filter(g =>
            g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            g.prompt?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : generations;

    const handleDeleteGeneration = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this generation?')) return;
        try {
            await deleteGeneration(id);
            toast.success('Deleted successfully');
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const handleDeleteScene = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this scene template?')) return;
        try {
            await deleteScene(id);
            toast.success('Deleted successfully');
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const handleDeleteStory = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this story template?')) return;
        try {
            await deleteStory(id);
            toast.success('Deleted successfully');
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const loading = mainTab === 'generations' ? generationsLoading : mainTab === 'scenes' ? scenesLoading : storiesLoading;
    const error = mainTab === 'generations' ? generationsError : mainTab === 'scenes' ? scenesError : storiesError;



    return (
        <div className="w-full max-w-7xl mx-auto px-4 pb-24 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col items-center justify-center text-center mb-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
                    <Library className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight mb-2 gradient-text">Your Library</h1>
                <p className="text-muted-foreground max-w-lg">
                    Manage your creative portfolio, saved templates, and generation history.
                </p>
            </div>

            {/* Main Tabs */}
            <div className="flex justify-center mb-8">
                <div className="glass p-1.5 rounded-2xl inline-flex gap-1 bg-black/5 dark:bg-white/5 backdrop-blur-md border border-white/10">
                    <TabButton
                        active={mainTab === 'generations'}
                        onClick={() => setMainTab('generations')}
                        icon={Film}
                        label="Generations"
                        count={pagination.total}
                        activeColor="bg-gradient-to-br from-purple-600 to-blue-600"
                    />
                    <TabButton
                        active={mainTab === 'scenes'}
                        onClick={() => setMainTab('scenes')}
                        icon={Sparkles}
                        label="Scene Templates"
                        count={scenes.length}
                        activeColor="bg-gradient-to-br from-purple-600 to-pink-600"
                    />
                    <TabButton
                        active={mainTab === 'stories'}
                        onClick={() => setMainTab('stories')}
                        icon={BookOpen}
                        label="Stories"
                        count={stories.length}
                        activeColor="bg-gradient-to-br from-amber-500 to-orange-500"
                    />
                </div>
            </div>

            {/* Filters Toolbar */}
            <div className="glass-card p-4 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-4 z-40 backdrop-blur-xl">
                {/* Search */}
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder={`Search ${mainTab}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full glass-input pl-10 h-10 text-sm rounded-xl focus:ring-2 focus:ring-primary/50 transition-all border-white/10 bg-white/5 hover:bg-white/10 focus:bg-white/10"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                    {/* Filter Tabs (Only for Generations) */}
                    {mainTab === 'generations' && (
                        <div className="flex items-center p-1 rounded-lg glass border border-white/5 bg-black/5 dark:bg-white/5">
                            {(['all', 'video', 'image'] as GenerationFilter[]).map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setGenerationFilter(filter)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${generationFilter === filter
                                        ? 'bg-white/10 text-primary shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                        }`}
                                >
                                    {filter === 'video' && <Film className="w-3 h-3" />}
                                    {filter === 'image' && <ImageIcon className="w-3 h-3" />}
                                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="w-px h-6 bg-white/10 mx-1 hidden md:block" />

                    {/* Action Buttons */}
                    <button
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                        className={`p-2.5 rounded-xl transition-all border ${showFavoritesOnly
                            ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500'
                            : 'glass border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5'
                            }`}
                        title="Show Favorites"
                    >
                        <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                    </button>

                    <button
                        onClick={() => {
                            if (mainTab === 'generations') refetchGenerations();
                            else if (mainTab === 'scenes') refetchScenes();
                            else refetchStories();
                        }}
                        className="p-2.5 rounded-xl glass border border-transparent hover:bg-white/5 text-muted-foreground hover:text-primary transition-all"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {error && (
                <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-center mb-8">
                    <p className="text-destructive font-medium">Failed to load content</p>
                    <p className="text-sm text-destructive/80 mt-1">{error}</p>
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-4 border-destructive/30 text-destructive hover:bg-destructive/10">
                        Retry
                    </Button>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="aspect-[4/3] rounded-2xl glass animate-pulse" />
                    ))}
                </div>
            ) : (
                <>
                    {/* Generations Grid */}
                    {mainTab === 'generations' && (
                        <>
                            {filteredGenerations.length === 0 ? (
                                <EmptyState
                                    icon={Film}
                                    message={showFavoritesOnly ? "No favorite generations found" : "No generations yet"}
                                    subtitle={showFavoritesOnly ? "Mark items as favorite to see them here" : "Create your first video or image to get started"}
                                    action={!showFavoritesOnly ? () => navigate('/video') : undefined}
                                    actionLabel="Start Creating"
                                />
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredGenerations.map((gen) => (
                                        <GenerationCard
                                            key={gen.id}
                                            generation={gen}
                                            onToggleFavorite={() => toggleGenerationFavorite(gen.id)}
                                            onDelete={(e) => handleDeleteGeneration(gen.id, e)}
                                            onView={() => navigate(`/library/generation/${gen.id}`)}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="flex justify-center gap-2 mt-8">
                                    <Button variant="ghost" size="sm" onClick={() => fetchPage(pagination.page - 1)} disabled={pagination.page === 1} className="glass">Previous</Button>
                                    <div className="flex items-center px-4 rounded-lg glass text-sm font-medium">
                                        Page {pagination.page} of {pagination.totalPages}
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => fetchPage(pagination.page + 1)} disabled={pagination.page === pagination.totalPages} className="glass">Next</Button>
                                </div>
                            )}
                        </>
                    )}

                    {/* Scenes Grid */}
                    {mainTab === 'scenes' && (
                        scenes.length === 0 ? (
                            <EmptyState
                                icon={Sparkles}
                                message="No scene templates saved"
                                subtitle="Save scenes during generation to reuse them here"
                                action={() => navigate('/video')}
                                actionLabel="Create Scene"
                            />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {scenes.map((scene) => (
                                    <SceneCard
                                        key={scene.id}
                                        scene={scene}
                                        onToggleFavorite={() => toggleSceneFavorite(scene.id)}
                                        onDelete={(e) => handleDeleteScene(scene.id, e)}
                                        onView={() => navigate(`/library/scene/${scene.id}`)}
                                        onUse={() => navigate('/video', { state: { generatedScene: scene } })}
                                    />
                                ))}
                            </div>
                        )
                    )}

                    {/* Stories Grid */}
                    {mainTab === 'stories' && (
                        stories.length === 0 ? (
                            <EmptyState
                                icon={BookOpen}
                                message="No story templates saved"
                                subtitle="Save stories during generation to reuse them here"
                                action={() => navigate('/video')}
                                actionLabel="Create Story"
                            />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {stories.map((story) => (
                                    <StoryCard
                                        key={story.id}
                                        story={story}
                                        onToggleFavorite={() => toggleStoryFavorite(story.id)}
                                        onDelete={(e) => handleDeleteStory(story.id, e)}
                                        onView={() => navigate(`/library/story/${story.id}`)}
                                        onUse={() => navigate('/video', { state: { generatedStory: story } })}
                                    />
                                ))}
                            </div>
                        )
                    )}
                </>
            )}
        </div>
    );
}

function TabButton({ active, onClick, icon: Icon, label, count, activeColor }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden ${active
                ? `${activeColor} text-white shadow-lg`
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
        >
            <Icon className="w-4 h-4 relative z-10" />
            <span className="relative z-10">{label}</span>
            {count !== undefined && (
                <span className={`relative z-10 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${active ? 'bg-white/20' : 'bg-black/10 dark:bg-white/10'}`}>
                    {count}
                </span>
            )}
        </button>
    );
}

function EmptyState({ icon: Icon, message, subtitle, action, actionLabel }: any) {
    return (
        <div className="flex flex-col items-center justify-center py-20 animate-scaleIn">
            <div className="w-20 h-20 rounded-3xl bg-muted/30 flex items-center justify-center mb-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Icon className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">{message}</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-8">{subtitle}</p>
            {action && (
                <Button onClick={action} className="btn-gradient shadow-lg shadow-primary/20">
                    <Play className="w-4 h-4 mr-2" />
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}

function GenerationCard({ generation, onToggleFavorite, onDelete, onView }: { generation: Generation; onToggleFavorite: () => void; onDelete: (e: React.MouseEvent) => void; onView: () => void }) {
    const isVideo = generation.generationType === 'video';
    const hasOutput = !!generation.outputUrl;
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Card
            className="group overflow-hidden border-none glass-card hover:ring-2 hover:ring-primary/50 transition-all duration-300 cursor-pointer h-full flex flex-col"
            onClick={onView}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative aspect-video bg-black/40 overflow-hidden">
                {hasOutput ? (
                    isVideo ? (
                        <>
                            <video
                                src={generation.outputUrl}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                muted
                                loop
                                poster={generation.thumbnailUrl}
                                ref={(el) => {
                                    if (el) isHovered ? el.play().catch(() => { }) : el.pause();
                                }}
                            />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                        </>
                    ) : (
                        <img
                            src={generation.outputUrl}
                            alt={generation.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                    )
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground bg-muted/10">
                        {isVideo ? <Film className="w-8 h-8 opacity-50" /> : <ImageIcon className="w-8 h-8 opacity-50" />}
                        <span className="text-xs">Processing...</span>
                    </div>
                )}

                {/* Overlays */}
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                        className="p-1.5 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-yellow-500 hover:text-white transition-colors"
                    >
                        <Star className={`w-4 h-4 ${generation.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    </button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-white/20 transition-colors" onClick={e => e.stopPropagation()}>
                                <MoreVertical className="w-4 h-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass border-white/10">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                                <Eye className="w-4 h-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            {hasOutput && (
                                <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    const link = document.createElement('a');
                                    link.href = generation.outputUrl!;
                                    link.download = `download-${generation.id}`;
                                    link.click();
                                }}>
                                    <Download className="w-4 h-4 mr-2" /> Download
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-bold ${isVideo ? 'bg-gradient-to-r from-purple-500/90 to-blue-500/90' : 'bg-gradient-to-r from-pink-500/90 to-rose-500/90'} text-white backdrop-blur-md shadow-lg`}>
                    {isVideo ? 'VIDEO' : 'IMAGE'}
                </div>
            </div>

            <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">{generation.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">{generation.prompt}</p>

                <div className="flex items-center justify-between mt-auto text-xs text-muted-foreground border-t border-white/5 pt-3">
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(generation.createdAt).toLocaleDateString()}
                    </span>
                    {isVideo && generation.durationSeconds && (
                        <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded">
                            {generation.durationSeconds}s
                        </span>
                    )}
                </div>
            </div>
        </Card>
    );
}

function SceneCard({ scene, onToggleFavorite, onDelete, onView, onUse }: { scene: SavedScene; onToggleFavorite: () => void; onDelete: (e: React.MouseEvent) => void; onView: () => void; onUse: () => void }) {
    return (
        <Card
            onClick={onView}
            className="group border-none glass-card hover:ring-2 hover:ring-purple-500/50 transition-all duration-300 cursor-pointer h-full flex flex-col p-5"
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-base line-clamp-1 group-hover:text-purple-400 transition-colors">{scene.title}</h3>
                        <p className="text-xs text-muted-foreground">Scene Template</p>
                    </div>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                    className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                >
                    <Star className={`w-4 h-4 ${scene.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                </button>
            </div>

            <div className="flex-1 bg-white/5 rounded-xl p-3 mb-4 backdrop-blur-sm border border-white/5">
                <p className="text-xs text-muted-foreground line-clamp-3 italic">"{scene.dialogo}"</p>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {scene.suggestedDuration}s</span>
                <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Used {scene.timesUsed} times</span>
            </div>

            <div className="flex gap-2.5 mt-auto">
                <Button size="sm" className="flex-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20" onClick={(e) => { e.stopPropagation(); onUse(); }}>
                    <Play className="w-3 h-3 mr-1.5" /> Use Template
                </Button>
                <Button size="sm" variant="ghost" className="px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={onDelete}>
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </Card>
    );
}

function StoryCard({ story, onToggleFavorite, onDelete, onView, onUse }: { story: SavedStory; onToggleFavorite: () => void; onDelete: (e: React.MouseEvent) => void; onView: () => void; onUse: () => void }) {
    return (
        <Card
            onClick={onView}
            className="group border-none glass-card hover:ring-2 hover:ring-amber-500/50 transition-all duration-300 cursor-pointer h-full flex flex-col p-5"
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                        <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-base line-clamp-1 group-hover:text-amber-400 transition-colors">{story.storyTitle}</h3>
                        <p className="text-xs text-muted-foreground">Story Template</p>
                    </div>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                    className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                >
                    <Star className={`w-4 h-4 ${story.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                </button>
            </div>

            <div className="flex-1 bg-white/5 rounded-xl p-3 mb-4 backdrop-blur-sm border border-white/5">
                <p className="text-xs text-muted-foreground line-clamp-3">{story.storyDescription}</p>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5"><Film className="w-3 h-3" /> {story.segmentCount} segments</span>
                <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Used {story.timesUsed} times</span>
            </div>

            <div className="flex gap-2.5 mt-auto">
                <Button size="sm" className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20" onClick={(e) => { e.stopPropagation(); onUse(); }}>
                    <Play className="w-3 h-3 mr-1.5" /> Use Template
                </Button>
                <Button size="sm" variant="ghost" className="px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={onDelete}>
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </Card>
    );
}

export default GenerationsLibrary;