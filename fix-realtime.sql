-- =========================================
-- Fix Supabase Realtime for Credits Table
-- =========================================
-- Run this in your Supabase SQL Editor
--
-- This script will:
-- 1. Enable Row Level Security (RLS)
-- 2. Create policies for realtime access
-- 3. Enable realtime replication
-- 4. Grant necessary permissions

-- Step 1: Enable RLS on credits table
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own credits" ON credits;
DROP POLICY IF EXISTS "Users can view own credits realtime" ON credits;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON credits;

-- Step 3: Create policy for authenticated users to view their own credits
CREATE POLICY "Users can view own credits realtime"
ON credits
FOR SELECT
TO authenticated, anon
USING (
    user_id::text = auth.uid()::text
    OR user_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')::text
);

-- Step 4: Grant SELECT permission to anon and authenticated roles
GRANT SELECT ON credits TO anon;
GRANT SELECT ON credits TO authenticated;

-- Step 5: Enable realtime for credits table
ALTER PUBLICATION supabase_realtime ADD TABLE credits;

-- Step 6: Verify the setup
-- Check if realtime is enabled
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'credits';

-- Check RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'credits';

-- =========================================
-- Test Query (Optional)
-- =========================================
-- Replace 'YOUR_USER_ID' with your actual user ID to test
-- UPDATE credits
-- SET balance_mxn = balance_mxn - 1
-- WHERE user_id = 'YOUR_USER_ID';

-- Expected result: Your app should show the balance update instantly!
