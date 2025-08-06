-- Check foreign key constraints on venue_owners table
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'venue_owners';

-- Check if auth.users table exists and has the user
SELECT 
    schemaname,
    tablename
FROM pg_tables 
WHERE tablename = 'users' OR tablename = 'auth.users';

-- Check the structure of venue_owners table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'venue_owners' 
AND table_schema = 'public'
ORDER BY ordinal_position; 