-- Aggressive fix for venue_owners foreign key constraints
-- This will completely remove and recreate all foreign key constraints

-- Step 1: Find and drop ALL foreign key constraints on venue_owners
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    RAISE NOTICE '=== Dropping ALL foreign key constraints on venue_owners ===';
    FOR constraint_record IN 
        SELECT 
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            ccu.table_schema AS foreign_schema,
            ccu.table_name AS foreign_table_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'venue_owners'
    LOOP
        RAISE NOTICE 'Dropping constraint: % on column % -> %.%', 
            constraint_record.constraint_name,
            constraint_record.column_name,
            constraint_record.foreign_schema,
            constraint_record.foreign_table_name;
        
        EXECUTE 'ALTER TABLE venue_owners DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
    END LOOP;
END $$;

-- Step 2: Also drop ALL foreign key constraints on pending_venue_owner_requests
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    RAISE NOTICE '=== Dropping ALL foreign key constraints on pending_venue_owner_requests ===';
    FOR constraint_record IN 
        SELECT 
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            ccu.table_schema AS foreign_schema,
            ccu.table_name AS foreign_table_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'pending_venue_owner_requests'
    LOOP
        RAISE NOTICE 'Dropping constraint: % on column % -> %.%', 
            constraint_record.constraint_name,
            constraint_record.column_name,
            constraint_record.foreign_schema,
            constraint_record.foreign_table_name;
        
        EXECUTE 'ALTER TABLE pending_venue_owner_requests DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
    END LOOP;
END $$;

-- Step 3: Verify all foreign key constraints are gone
DO $$
DECLARE
    fk_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'venue_owners';
    
    RAISE NOTICE 'venue_owners table now has % foreign key constraints', fk_count;
    
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'pending_venue_owner_requests';
    
    RAISE NOTICE 'pending_venue_owner_requests table now has % foreign key constraints', fk_count;
END $$;

-- Step 4: Add the correct foreign key constraints
-- For venue_owners.user_id -> auth.users(id)
ALTER TABLE venue_owners 
ADD CONSTRAINT venue_owners_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- For venue_owners.venue_id -> venues(id) (if venues table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venues') THEN
        ALTER TABLE venue_owners 
        ADD CONSTRAINT venue_owners_venue_id_fkey 
        FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added foreign key constraint for venue_id -> venues(id)';
    ELSE
        RAISE NOTICE 'venues table does not exist, skipping venue_id foreign key';
    END IF;
END $$;

-- For pending_venue_owner_requests.user_id -> auth.users(id)
ALTER TABLE pending_venue_owner_requests 
ADD CONSTRAINT pending_venue_owner_requests_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 5: Verify the new constraints
DO $$
DECLARE
    fk_record RECORD;
BEGIN
    RAISE NOTICE '=== Final foreign key constraints ===';
    FOR fk_record IN 
        SELECT 
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            ccu.table_schema AS foreign_schema,
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
            AND (tc.table_name = 'venue_owners' OR tc.table_name = 'pending_venue_owner_requests')
        ORDER BY tc.table_name, kcu.column_name
    LOOP
        RAISE NOTICE '%: % -> %.%', 
            fk_record.table_name,
            fk_record.column_name,
            fk_record.foreign_schema,
            fk_record.foreign_table_name;
    END LOOP;
END $$; 