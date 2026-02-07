import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { creditsService, type UsageSummary, type CreditTransaction } from '@/services/api/creditsService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, Clock, Activity, Settings, LogOut, User, Coins, TrendingUp, Sparkles } from 'lucide-react';
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

        loadData();
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/auth/login');
    };

    if (!user) return null;

    const initials = user.profile?.displayName
        ? user.profile.displayName.substring(0, 2).toUpperCase()
        : user.email.substring(0, 2).toUpperCase();

    return (
        <div className="container max-w-6xl mx-auto py-8 px-4 space-y-8">
            {/* Header / User Card */}
            <div className="glass-card p-8 rounded-3xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />

                <Avatar className="w-24 h-24 border-4 border-white/10 shadow-xl">
                    <AvatarImage src={user.profile?.avatarUrl} />
                    <AvatarFallback className="text-2xl font-bold bg-primary/20 text-primary">
                        {initials}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 text-center md:text-left space-y-2">
                    <h1 className="text-3xl font-bold gradient-text">
                        {user.profile?.displayName || 'User Profile'}
                    </h1>
                    <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                        <User className="w-4 h-4" />
                        {user.email}
                    </p>
                    <div className="flex items-center justify-center md:justify-start gap-4 mt-2">
                        <Badge variant="secondary" className="glass bg-primary/5 hover:bg-primary/10 transition-colors">
                            Member since {format(new Date(user.createdAt), 'MMM yyyy')}
                        </Badge>
                        <Badge variant="outline" className="glass border-primary/20 text-primary">
                            {user.role} Plan
                        </Badge>
                    </div>
                </div>

                <div className="flex flex-col gap-3 min-w-[200px]">
                    <Button onClick={() => setShowPurchaseModal(true)} className="btn-gradient w-full py-6 text-lg shadow-lg shadow-primary/20">
                        <Coins className="w-5 h-5 mr-2" />
                        Buy Credits
                    </Button>
                    <Button variant="ghost" onClick={handleLogout} className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="glass p-1 rounded-xl bg-muted/20">
                    <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all">
                        <Activity className="w-4 h-4 mr-2" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all">
                        <Clock className="w-4 h-4 mr-2" />
                        History
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {isLoading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="glass-card border-primary/10">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <Coins className="w-4 h-4 text-primary" />
                                            Current Balance
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-3xl font-bold gradient-text">
                                            ${Number(user.credits?.balance || 0).toFixed(2)}
                                            <span className="text-sm text-muted-foreground ml-1">{user.credits?.currency || 'MXN'}</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="glass-card border-primary/10">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-purple-400" />
                                            Total Spent (30d)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-3xl font-bold">
                                            ${usageStats?.last30Days.costMxn.toFixed(2) || '0.00'}
                                            <span className="text-sm text-muted-foreground ml-1">MXN</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="glass-card border-primary/10">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-blue-400" />
                                            Generations (30d)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-3xl font-bold">
                                            {usageStats?.last30Days.generations || 0}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Detailed Usage */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="glass-card">
                                    <CardHeader>
                                        <CardTitle>Usage by Type</CardTitle>
                                        <CardDescription>Breakdown of your generations</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {usageStats?.byType.map((stat) => (
                                            <div key={stat.type} className="flex items-center justify-between p-3 rounded-lg bg-muted/10">
                                                <div className="capitalize font-medium">{stat.type}</div>
                                                <div className="text-right">
                                                    <div className="font-bold">{stat.count}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        ${stat.costMxn.toFixed(2)} MXN
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {(!usageStats?.byType || usageStats.byType.length === 0) && (
                                            <div className="text-center py-6 text-muted-foreground">
                                                No usage data available yet.
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="glass-card">
                                    <CardHeader>
                                        <CardTitle>Recent Activity</CardTitle>
                                        <CardDescription>Your latest transactions</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {transactions.slice(0, 5).map((tx) => (
                                                <div key={tx.id} className="flex items-center justify-between text-sm">
                                                    <div>
                                                        <div className="font-medium">{tx.description}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {format(new Date(tx.createdAt), 'MMM d, h:mm a')}
                                                        </div>
                                                    </div>
                                                    <div className={tx.amountMxn > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                                        {tx.amountMxn > 0 ? '+' : ''}${Math.abs(tx.amountMxn).toFixed(2)}
                                                    </div>
                                                </div>
                                            ))}
                                            {transactions.length === 0 && (
                                                <div className="text-center py-6 text-muted-foreground">
                                                    No recent activity.
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    )}
                </TabsContent>

                <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle>Transaction History</CardTitle>
                            <CardDescription>View all your credit purchases and usage</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {transactions.map((tx) => (
                                        <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/5 border border-white/5 hover:bg-muted/10 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-full ${tx.transactionType === 'purchase' || tx.transactionType === 'bonus'
                                                    ? 'bg-emerald-500/10 text-emerald-500'
                                                    : 'bg-rose-500/10 text-rose-500'
                                                    }`}>
                                                    {tx.transactionType === 'purchase' ? <CreditCard className="w-4 h-4" /> :
                                                        tx.transactionType === 'bonus' ? <Sparkles className="w-4 h-4" /> : // Wait Sparkles is missing imports?
                                                            <Activity className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <div className="font-medium">{tx.description}</div>
                                                    <div className="text-xs text-muted-foreground capitalize">
                                                        {tx.transactionType} • {format(new Date(tx.createdAt), 'PPP p')}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`font-bold ${tx.amountMxn > 0 ? 'text-emerald-400' : 'text-rose-400'
                                                    }`}>
                                                    {tx.amountMxn > 0 ? '+' : ''}${Math.abs(Number(tx.amountMxn)).toFixed(2)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Balance: ${Number(tx.balanceAfterMxn).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {transactions.length === 0 && (
                                        <div className="text-center py-12 text-muted-foreground">
                                            No transactions found.
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle>Account Settings</CardTitle>
                            <CardDescription>Manage your preferences</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-12 text-muted-foreground">
                                Settings coming soon...
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <CreditsPurchaseModal
                open={showPurchaseModal}
                onOpenChange={setShowPurchaseModal}
            />
        </div>
    );
}
