-- Diagnose why we're still getting "users" table error when constraints point to "auth.users"

-- Check if the user actually exists in auth.users
SELECT 
    'User exists in auth.users' as check_type,
    EXISTS(SELECT 1 FROM auth.users WHERE id = 'c1555b27-a9fd-46be-ba85-fdecd274ff34') as user_exists;

-- Check all constraint definitions using pg_constraint (more detailed)
SELECT 
    'Current constraints' as info,
    c.conname as constraint_name,
    c.conrelid::regclass as table_name,
    a.attname as column_name,
    c.confrelid::regclass as foreign_table_name,
    af.attname as foreign_column_name,
    c.confupdtype as on_update,
    c.confdeltype as on_delete
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.conrelid = 'venue_owners'::regclass
AND c.contype = 'f'
AND a.attname = 'user_id';

-- Check if there are any hidden constraints or triggers
SELECT 
    'Triggers on venue_owners' as info,
    tgname as trigger_name,
    tgtype as trigger_type,
    tgenabled as enabled
FROM pg_trigger 
WHERE tgrelid = 'venue_owners'::regclass;

-- Try to manually insert a test record to see exact error
DO $$
BEGIN
    -- Try to insert with a known good user ID
    INSERT INTO venue_owners (user_id, venue_name, owner_email, status) 
    VALUES ('c1555b27-a9fd-46be-ba85-fdecd274ff34', 'Test Venue', 'test@test.com', 'pending_approval');
    
    RAISE NOTICE 'Test insert succeeded!';
    
    -- Clean up the test record
    DELETE FROM venue_owners WHERE venue_name = 'Test Venue';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test insert failed with error: %', SQLERRM;
END $$;

-- Check if auth schema is accessible
SELECT 
    'auth.users table info' as info,
    schemaname, 
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'auth' AND tablename = 'users';

-- Check if there's a public.users table that shouldn't exist
SELECT 
    'public.users table check' as info,
    schemaname, 
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';