/**
 * Temporary component to test Supabase Realtime
 * Add this to your app temporarily to debug realtime issues
 *
 * Usage: Import and add <RealtimeTest /> to your app
 */

import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';

export function RealtimeTest() {
    const { user } = useAuth();
    const [status, setStatus] = useState<string>('Not connected');
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        if (!user?.id || !isSupabaseConfigured()) {
            setStatus('Not configured or no user');
            return;
        }

        console.log('🧪 TEST: Setting up test channel for user:', user.id);

        const channel = supabase
            ?.channel('test-credits-debug')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'credits',
                filter: `user_id=eq.${user.id}`,
            }, (payload) => {
                console.log('🧪 TEST: Event received!', payload);
                setEvents(prev => [...prev, {
                    time: new Date().toISOString(),
                    type: payload.eventType,
                    data: payload.new
                }]);
            })
            .subscribe((status, err) => {
                console.log('🧪 TEST: Status:', status, err);
                setStatus(status);
            });

        return () => {
            console.log('🧪 TEST: Cleaning up');
            supabase?.removeChannel(channel!);
        };
    }, [user?.id]);

    if (!isSupabaseConfigured()) {
        return (
            <Card className="p-4 bg-destructive/10 border-destructive">
                <h3 className="font-bold text-destructive">❌ Supabase Not Configured</h3>
                <p className="text-sm mt-2">Check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY</p>
            </Card>
        );
    }

    return (
        <Card className="p-4 fixed bottom-4 right-4 max-w-md z-50 bg-background/95 backdrop-blur">
            <h3 className="font-bold text-lg mb-2">🧪 Realtime Test</h3>

            <div className="space-y-2">
                <div>
                    <span className="text-xs text-muted-foreground">Status:</span>
                    <span className={`ml-2 text-sm font-semibold ${
                        status === 'SUBSCRIBED' ? 'text-green-500' :
                        status === 'CHANNEL_ERROR' ? 'text-destructive' :
                        'text-yellow-500'
                    }`}>
                        {status}
                    </span>
                </div>

                <div>
                    <span className="text-xs text-muted-foreground">User ID:</span>
                    <span className="ml-2 text-xs font-mono">{user?.id}</span>
                </div>

                <div className="pt-2 border-t">
                    <h4 className="text-xs font-semibold mb-1">Events Received: {events.length}</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                        {events.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">
                                No events yet. Try generating content or manually updating credits in Supabase.
                            </p>
                        ) : (
                            events.reverse().map((event, i) => (
                                <div key={i} className="text-xs bg-muted p-2 rounded">
                                    <div className="font-semibold">{event.type}</div>
                                    <div className="text-muted-foreground">{event.time}</div>
                                    <div className="font-mono text-[10px] mt-1 overflow-x-auto">
                                        {JSON.stringify(event.data, null, 2)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-3 pt-3 border-t text-xs space-y-1">
                <p className="font-semibold">Test Steps:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Check if status is "SUBSCRIBED" ✅</li>
                    <li>Generate an image/video</li>
                    <li>Watch for events to appear above</li>
                    <li>Or manually update credits in Supabase SQL Editor</li>
                </ol>
            </div>
        </Card>
    );
}
