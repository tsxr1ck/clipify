import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { creditsService, type UsageSummary, type CreditTransaction } from '@/services/api/creditsService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    Loader2,
    CreditCard,
    Clock,
    Activity,
    Settings,
    LogOut,
    User,
    Coins,
    TrendingUp,
    Sparkles,
    Mail,
    Bell,
    Shield,
    ChevronRight,
    Calendar,
    Receipt
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CreditsPurchaseModal } from '@/components/shared/CreditsPurchaseModal';

export function ProfilePage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [usageStats, setUsageStats] = useState<UsageSummary | null>(null);
    const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'settings'>('overview');

    useEffect(() => {
        const loadData = async () => {
            try {
                const [stats, history] = await Promise.all([
                    creditsService.getUsageSummary(),
                    creditsService.getTransactions({ limit: 10 })
                ]);
                setUsageStats(stats);
                setTransactions(history.transactions);
            } catch (error) {
                console.error('Failed to load profile data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (user) {
            loadData();
        }
    }, [user]);

    const handleLogout = async () => {
        await logout();
        navigate('/auth/login');
    };

    if (!user) return null;

    const initials = user.profile?.displayName
        ? user.profile.displayName.substring(0, 2).toUpperCase()
        : user.email.substring(0, 2).toUpperCase();

    return (
        <div className="w-full max-w-7xl mx-auto px-4 pb-24 animate-scaleIn">
            {/* Profile Header */}
            <div className="relative glass-card rounded-3xl overflow-hidden mb-8 border-none p-0 group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/5 to-blue-500/10 pointer-events-none" />
                <div className="absolute top-0 right-0 p-32 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-center md:items-start gap-8">
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-br from-primary via-purple-500 to-blue-500 rounded-full blur opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
                        <Avatar className="w-32 h-32 border-4 border-black/20 relative shadow-2xl">
                            <AvatarImage src={user.profile?.avatarUrl} className="object-cover" />
                            <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-gray-800 to-black text-white">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <button className="absolute bottom-1 right-1 p-2 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-colors">
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-3">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-bold tracking-tight text-foreground">
                                {user.profile?.displayName || 'Creative User'}
                            </h1>
                            <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                                <Mail className="w-4 h-4" />
                                <span>{user.email}</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                            <Badge variant="secondary" className="glass bg-white/5 hover:bg-white/10 px-3 py-1.5 text-sm font-normal">
                                <Calendar className="w-3 h-3 mr-2 text-primary" />
                                Member since {format(new Date(user.createdAt), 'MMM yyyy')}
                            </Badge>
                            <Badge variant="outline" className="glass border-primary/20 text-primary px-3 py-1.5 text-sm font-normal uppercase tracking-wider">
                                {user.role} Plan
                            </Badge>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 w-full md:w-auto min-w-[200px]">
                        <Button
                            onClick={() => setShowPurchaseModal(true)}
                            className="btn-gradient w-full py-6 text-base font-semibold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
                        >
                            <Coins className="w-5 h-5 mr-2" />
                            Buy Credits
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleLogout}
                            className="w-full glass border-white/10 hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </div>

            {/* Custom Tabs */}
            <div className="flex justify-center mb-8">
                <div className="glass p-1.5 rounded-2xl inline-flex gap-1 bg-black/5 dark:bg-white/5 backdrop-blur-md border border-white/10">
                    <TabButton
                        active={activeTab === 'overview'}
                        onClick={() => setActiveTab('overview')}
                        icon={Activity}
                        label="Overview"
                    />
                    <TabButton
                        active={activeTab === 'history'}
                        onClick={() => setActiveTab('history')}
                        icon={Receipt}
                        label="Transactions"
                    />
                    <TabButton
                        active={activeTab === 'settings'}
                        onClick={() => setActiveTab('settings')}
                        icon={Settings}
                        label="Settings"
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <StatsCard
                                        icon={Coins}
                                        title="Current Balance"
                                        value={`$${Number(user.credits?.balance || 0).toFixed(2)}`}
                                        subtext={user.credits?.currency || 'MXN'}
                                        color="text-primary"
                                        bg="bg-primary/10"
                                    />
                                    <StatsCard
                                        icon={TrendingUp}
                                        title="Spent (30d)"
                                        value={`$${usageStats?.last30Days.costMxn.toFixed(2) || '0.00'}`}
                                        subtext="MXN"
                                        color="text-purple-400"
                                        bg="bg-purple-500/10"
                                    />
                                    <StatsCard
                                        icon={Sparkles}
                                        title="Generations (30d)"
                                        value={usageStats?.last30Days.generations || 0}
                                        subtext="Total"
                                        color="text-blue-400"
                                        bg="bg-blue-500/10"
                                    />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Usage By Type */}
                                    <Card className="glass-card border-none p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h3 className="text-lg font-semibold">Usage by Type</h3>
                                                <p className="text-sm text-muted-foreground">Breakdown of your creative output</p>
                                            </div>
                                            <div className="p-2 rounded-lg bg-white/5">
                                                <Activity className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {usageStats?.byType.map((stat) => (
                                                <div key={stat.type} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-black/20">
                                                            {stat.type === 'video' ? <Activity className="w-4 h-4 text-purple-400" /> : <Sparkles className="w-4 h-4 text-blue-400" />}
                                                        </div>
                                                        <span className="capitalize font-medium">{stat.type}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold">{stat.count}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            ${stat.costMxn.toFixed(2)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!usageStats?.byType || usageStats.byType.length === 0) && (
                                                <div className="text-center py-8 text-muted-foreground bg-white/5 rounded-xl border border-white/5 border-dashed">
                                                    No usage data available yet.
                                                </div>
                                            )}
                                        </div>
                                    </Card>

                                    {/* Recent Transactions Preview */}
                                    <Card className="glass-card border-none p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h3 className="text-lg font-semibold">Recent Activity</h3>
                                                <p className="text-sm text-muted-foreground">Latest financial movement</p>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => setActiveTab('history')} className="text-primary hover:text-primary/80">
                                                View All <ChevronRight className="w-4 h-4 ml-1" />
                                            </Button>
                                        </div>

                                        <div className="space-y-3">
                                            {transactions.slice(0, 5).map((tx) => (
                                                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2 h-2 rounded-full ${tx.amountMxn > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                        <div>
                                                            <div className="text-sm font-medium">{tx.description}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {format(new Date(tx.createdAt), 'MMM d')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={`font-mono text-sm ${tx.amountMxn > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {tx.amountMxn > 0 ? '+' : ''}${Math.abs(tx.amountMxn).toFixed(0)}
                                                    </div>
                                                </div>
                                            ))}
                                            {transactions.length === 0 && (
                                                <div className="text-center py-8 text-muted-foreground bg-white/5 rounded-xl border border-white/5 border-dashed">
                                                    No recent activity.
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        )}

                        {/* History Tab */}
                        {activeTab === 'history' && (
                            <Card className="glass-card border-none p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold">Transaction History</h3>
                                        <p className="text-muted-foreground">Complete record of credits and spending</p>
                                    </div>
                                    <Button variant="outline" className="glass">
                                        Export CSV
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {transactions.map((tx) => (
                                        <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-full ${tx.transactionType === 'purchase' || tx.transactionType === 'bonus'
                                                    ? 'bg-emerald-500/10 text-emerald-500'
                                                    : 'bg-rose-500/10 text-rose-500'
                                                    }`}>
                                                    {tx.transactionType === 'purchase' ? <CreditCard className="w-5 h-5" /> :
                                                        tx.transactionType === 'bonus' ? <Sparkles className="w-5 h-5" /> :
                                                            <Activity className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <div className="font-medium">{tx.description}</div>
                                                    <div className="text-xs text-muted-foreground capitalize flex gap-2">
                                                        <span>{tx.transactionType}</span>
                                                        <span>•</span>
                                                        <span>{format(new Date(tx.createdAt), 'PPP p')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`font-bold text-lg ${tx.amountMxn > 0 ? 'text-emerald-400' : 'text-rose-400'
                                                    }`}>
                                                    {tx.amountMxn > 0 ? '+' : ''}${Math.abs(Number(tx.amountMxn)).toFixed(2)}
                                                </div>
                                                <div className="text-xs text-muted-foreground font-mono">
                                                    Bal: ${Number(tx.balanceAfterMxn).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {transactions.length === 0 && (
                                        <div className="text-center py-20 text-muted-foreground">
                                            <Receipt className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                            <p>No transactions found on this account.</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )}

                        {/* Settings Tab */}
                        {activeTab === 'settings' && (
                            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <Card className="glass-card border-none p-6">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <Bell className="w-5 h-5 text-primary" /> Notifications
                                    </h3>
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>Email Notifications</Label>
                                                <p className="text-xs text-muted-foreground">Receive updates about your generations</p>
                                            </div>
                                            <Switch defaultChecked />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label>Marketing Emails</Label>
                                                <p className="text-xs text-muted-foreground">Receive offers and new feature updates</p>
                                            </div>
                                            <Switch />
                                        </div>
                                    </div>
                                </Card>

                                <Card className="glass-card border-none p-6">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-primary" /> Security
                                    </h3>
                                    <div className="space-y-4">
                                        <Button variant="outline" className="w-full justify-between glass h-12">
                                            Change Password
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        </Button>
                                        <Button variant="outline" className="w-full justify-between glass h-12">
                                            Two-Factor Authentication
                                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500">Enabled</Badge>
                                        </Button>
                                    </div>
                                </Card>

                                <Card className="glass-card border-none p-6 border-destructive/20 bg-destructive/5">
                                    <h3 className="text-lg font-semibold mb-4 text-destructive flex items-center gap-2">
                                        <LogOut className="w-5 h-5" /> Danger Zone
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Permanently delete your account and all of your content.
                                    </p>
                                    <Button variant="destructive" className="w-full">
                                        Delete Account
                                    </Button>
                                </Card>
                            </div>
                        )}
                    </>
                )}
            </div>

            <CreditsPurchaseModal
                open={showPurchaseModal}
                onOpenChange={setShowPurchaseModal}
            />
        </div>
    );
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden ${active
                ? 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
        >
            <Icon className="w-4 h-4 relative z-10" />
            <span className="relative z-10">{label}</span>
        </button>
    );
}

function StatsCard({ icon: Icon, title, value, subtext, color, bg }: any) {
    return (
        <Card className="glass-card border-none p-6 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-3 rounded-bl-2xl ${bg} ${color} transition-all group-hover:scale-110`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <div className="flex items-baseline gap-1">
                    <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
                    {subtext && <span className="text-sm text-muted-foreground">{subtext}</span>}
                </div>
            </div>
        </Card>
    );
}
