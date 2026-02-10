# Real-time Credits Not Updating - Debugging Guide

## Quick Fix - Most Common Issues

### Issue 1: RLS Policies Not Configured (MOST COMMON)

Supabase realtime requires **explicit RLS policies** even if your API endpoints work fine.

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable RLS if not already enabled
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT their own credits
CREATE POLICY IF NOT EXISTS "Users can view own credits realtime"
ON credits
FOR SELECT
TO authenticated, anon
USING (user_id::text = auth.uid()::text OR user_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')::text);

-- Verify realtime is enabled
ALTER PUBLICATION supabase_realtime ADD TABLE credits;
```

### Issue 2: User ID Format Mismatch

The filter might not be matching correctly. Let's check the user ID format.

**Open browser console and check:**
```javascript
// Should see the user ID being used
console.log('User ID:', user.id);
```

**Check your credits table structure:**
```sql
SELECT user_id, typeof(user_id) as user_id_type
FROM credits
LIMIT 1;
```

If `user_id` is UUID type but we're filtering with string, we need to adjust the filter.

### Issue 3: Subscription Not Connecting

Check browser console for these logs:
- ✅ `💰 Setting up realtime subscription for user: xxx`
- ✅ `💰 Realtime subscription status: SUBSCRIBED`

If you see `CHANNEL_ERROR` or `CLOSED`, there's a connection issue.

## Detailed Debugging Steps

### Step 1: Check Browser Console

Open DevTools Console (F12) and look for:

```
💰 Setting up realtime subscription for user: [USER_ID]
💰 Realtime subscription status: SUBSCRIBED
```

If you see `CHANNEL_ERROR`, proceed to Step 2.

### Step 2: Check Network Tab

1. Open Network tab in DevTools
2. Filter by `WS` (WebSocket)
3. Look for connection to `wss://kbyuabayotsbuzdrlten.supabase.co/realtime/v1/websocket`
4. If no WebSocket connection, check CORS and credentials

### Step 3: Test Realtime Manually

Run this in browser console:

```javascript
import { supabase } from '@/lib/supabase';

const channel = supabase
  .channel('test-credits')
  .on('postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'credits'
    },
    (payload) => {
      console.log('TEST: Change received!', payload);
    }
  )
  .subscribe((status) => {
    console.log('TEST: Subscription status:', status);
  });
```

Then manually update credits in Supabase dashboard and see if the console logs appear.

### Step 4: Check Supabase Dashboard

1. Go to **Database** → **Replication**
2. Ensure `credits` table has realtime enabled
3. Go to **Authentication** → **Policies**
4. Check if RLS policies exist for `credits` table

### Step 5: Verify Table Publication

Run this SQL:

```sql
-- Check if credits table is in the realtime publication
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'credits';
```

Should return 1 row. If empty, run:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE credits;
```

## Advanced Fixes

### Fix 1: Update Filter to Handle UUID

If your `user_id` is a UUID type, update the filter:

```typescript
filter: `user_id=eq.${user.id}`, // Try without ::text casting
```

### Fix 2: Remove User ID Filter Temporarily

Test without the filter to see if events come through:

```typescript
// Temporarily remove filter for testing
.on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'credits',
    // filter: `user_id=eq.${user.id}`, // Comment out
}, (payload) => {
    console.log('💰 ANY credit change:', payload);
})
```

If this works, the issue is with the filter format.

### Fix 3: Check Anon Key Permissions

Your anon key might not have the right permissions. Run this:

```sql
-- Grant SELECT on credits to anon role
GRANT SELECT ON credits TO anon;
GRANT SELECT ON credits TO authenticated;
```

## Common Error Messages

### "CHANNEL_ERROR"
**Cause**: RLS policies blocking access or table not in publication
**Fix**: Run the RLS policy SQL from Issue 1 above

### "CLOSED"
**Cause**: WebSocket connection failed
**Fix**: Check network connectivity, CORS settings

### No logs at all
**Cause**: Supabase client not initialized
**Fix**: Check `.env` file has correct credentials and restart dev server

### Events received but balance not updating
**Cause**: Payload structure different than expected
**Fix**: Log the payload and check the field names:

```typescript
console.log('Full payload:', JSON.stringify(payload, null, 2));
```

## Test SQL for Manual Update

To test if realtime is working, run this SQL:

```sql
-- Update credits for your user (replace with your user_id)
UPDATE credits
SET balance_mxn = balance_mxn - 10
WHERE user_id = 'YOUR_USER_ID_HERE';
```

You should see the balance update in your header immediately.

## Still Not Working?

If none of the above fixes work, we need to check:

1. Supabase project status (check status.supabase.com)
2. Firewall/network blocking WebSockets
3. Browser WebSocket support
4. Supabase plan limits (free tier has connection limits)

## Next Steps

1. Run the RLS policy SQL
2. Run the publication SQL
3. Restart your dev server
4. Clear browser cache
5. Test with the manual SQL update

If it's still not working after all this, share:
- Browser console logs
- Network tab screenshot (WebSocket connection)
- Result of the publication check SQL
