# Real-time Credits Setup Guide

This guide will help you set up real-time credit balance updates in the header component.

## What Was Implemented

✅ Created Supabase client for frontend ([src/lib/supabase.ts](src/lib/supabase.ts))
✅ Added realtime subscription to CreditsContext ([src/context/CreditsContext.tsx](src/context/CreditsContext.tsx))
✅ Header component automatically reacts to credit changes
✅ Graceful degradation if Supabase is not configured

## Setup Steps

### 1. Enable Realtime on Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Replication**
3. Find the **credits** table
4. Toggle **Enable Realtime** to ON
5. Save changes

Alternatively, you can enable it via SQL:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE credits;
```

### 2. Configure Environment Variables

Create a `.env` file in the root of your frontend project:

```bash
cp .env.example .env
```

Update the `.env` file with your Supabase credentials:

```env
# API Configuration
VITE_API_URL=http://localhost:3001/api

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# MercadoPago (Payment)
VITE_MERCADOPAGO_PUBLIC_KEY=your-mercadopago-public-key
```

**Where to find your Supabase credentials:**
1. Go to Supabase Dashboard
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

### 3. Restart Your Dev Server

```bash
npm run dev
```

## How It Works

### Real-time Flow

1. **User generates content** (image/video)
2. **Backend deducts credits** from database
3. **Supabase realtime** detects the change
4. **Frontend receives** update via WebSocket
5. **Header component** updates balance automatically
6. **User sees** new balance without refresh

### Implementation Details

**CreditsContext** ([src/context/CreditsContext.tsx](src/context/CreditsContext.tsx)):
- Creates a realtime channel subscription for the authenticated user
- Listens for `INSERT`, `UPDATE`, and `DELETE` events on the `credits` table
- Filters by `user_id` to only receive relevant updates
- Updates state immediately when changes are detected
- Automatically cleans up subscription on unmount

**Supabase Client** ([src/lib/supabase.ts](src/lib/supabase.ts)):
- Creates a Supabase client with realtime enabled
- Disables auth persistence (we use JWT tokens)
- Gracefully handles missing credentials

**Header Component** ([src/components/layout/Header.tsx](src/components/layout/Header.tsx)):
- Uses `useCredits()` hook
- Automatically displays updated balance
- No changes needed - works out of the box!

## Testing

### Test Real-time Updates

1. Open your app in the browser
2. Open browser console (F12)
3. Generate an image or video
4. Watch for console logs:
   ```
   💰 Setting up realtime subscription for user: xxx
   💰 Realtime subscription status: SUBSCRIBED
   💰 Credit change detected: {...}
   💰 Updating balance to: xxx
   ```
5. Balance should update immediately in header without refresh

### Test with Multiple Tabs

1. Open app in two browser tabs
2. Generate content in one tab
3. Watch balance update in BOTH tabs simultaneously
4. This proves realtime is working across sessions

## Troubleshooting

### Balance not updating

1. **Check Supabase credentials**:
   ```bash
   echo $VITE_SUPABASE_URL
   echo $VITE_SUPABASE_ANON_KEY
   ```

2. **Check browser console** for errors:
   - Look for connection errors
   - Check subscription status logs

3. **Verify realtime is enabled** on credits table in Supabase dashboard

4. **Check network tab**:
   - Look for WebSocket connection to Supabase
   - Should see `wss://your-project.supabase.co/realtime/v1/websocket`

### Subscription status is "CLOSED" or "CHANNEL_ERROR"

1. Verify anon key has correct permissions
2. Check Row Level Security (RLS) policies on credits table:
   ```sql
   -- Users should be able to read their own credits
   CREATE POLICY "Users can view own credits"
   ON credits FOR SELECT
   USING (auth.uid()::text = user_id);
   ```

3. Ensure realtime replication is enabled for the credits table

### Credits update but with delay

- This is normal - Supabase realtime typically has 100-500ms latency
- If delay is > 1 second, check:
  - Network connection
  - Supabase service status
  - Database load

## Advanced Configuration

### Adjust Realtime Settings

In [src/lib/supabase.ts](src/lib/supabase.ts), you can configure:

```typescript
realtime: {
    params: {
        eventsPerSecond: 10, // Throttle events (default: 10)
    },
}
```

### Listen to Specific Events Only

In [src/context/CreditsContext.tsx](src/context/CreditsContext.tsx), change:

```typescript
event: '*', // All events
```

To:

```typescript
event: 'UPDATE', // Only updates
```

### Add Toast Notifications

Add a toast when credits change:

```typescript
if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
    const newBalance = ...;

    setState(prev => {
        const oldBalance = prev.balance;
        const difference = newBalance - oldBalance;

        if (difference < 0) {
            toast.info(`Credits deducted: $${Math.abs(difference).toFixed(2)}`);
        } else if (difference > 0) {
            toast.success(`Credits added: $${difference.toFixed(2)}`);
        }

        return {
            ...prev,
            balance: newBalance,
            // ...
        };
    });
}
```

## Security Considerations

- ✅ Using **anon key** (public) - safe for client-side
- ✅ Row Level Security (RLS) enforces access control
- ✅ Users can only see their own credits
- ✅ Realtime only sends changes they have permission to see
- ⚠️ Never commit `.env` file to git
- ⚠️ Always use environment variables for credentials

## Production Deployment

### Vercel/Netlify

Add environment variables in deployment settings:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL`
- `VITE_MERCADOPAGO_PUBLIC_KEY`

### Docker

Add to `docker-compose.yml`:

```yaml
environment:
  - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
  - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
```

## Benefits

✅ **Instant feedback** - Users see balance changes immediately
✅ **Better UX** - No need to refresh page or manually check balance
✅ **Multi-tab support** - Works across multiple browser tabs
✅ **Reliable** - WebSocket with automatic reconnection
✅ **Scalable** - Supabase handles millions of concurrent connections
✅ **Graceful degradation** - Works without realtime (falls back to manual refresh)

## Cost Considerations

Supabase realtime is included in all plans:
- **Free tier**: 200 concurrent connections
- **Pro tier**: 500 concurrent connections
- **Team/Enterprise**: Unlimited

Each user typically uses 1 connection, so this should be sufficient for most apps.
