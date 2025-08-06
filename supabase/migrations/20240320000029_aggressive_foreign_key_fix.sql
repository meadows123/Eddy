-- Aggressively fix the foreign key constraint issue
-- The error shows it's still looking for "users" table instead of "auth.users"

-- First, let's see ALL constraints on venue_owners
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    a.attname as column_name,
    confrelid::regclass as foreign_table_name,
    af.attname as foreign_column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.conrelid = 'venue_owners'::regclass
AND c.contype = 'f';

-- Drop ALL foreign key constraints on venue_owners
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN 
        SELECT conname
        FROM pg_constraint 
        WHERE conrelid = 'venue_owners'::regclass 
        AND contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE venue_owners DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
        RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
    END LOOP;
END $$;

-- Drop ALL foreign key constraints on pending_venue_owner_requests
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN 
        SELECT conname
        FROM pg_constraint 
        WHERE conrelid = 'pending_venue_owner_requests'::regclass 
        AND contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE pending_venue_owner_requests DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
        RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
    END LOOP;
END $$;

-- Wait a moment for the drops to complete
SELECT pg_sleep(1);

-- Now add the correct foreign key constraints
-- For venue_owners.user_id -> auth.users(id)
ALTER TABLE venue_owners 
ADD CONSTRAINT venue_owners_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- For venue_owners.venue_id -> venues(id) (if venues table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venues') THEN
        ALTER TABLE venue_owners 
        ADD CONSTRAINT venue_owners_venue_id_fkey 
        FOREIGN KEY (venue_id) 
        REFERENCES venues(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- For pending_venue_owner_requests.user_id -> auth.users(id)
ALTER TABLE pending_venue_owner_requests 
ADD CONSTRAINT pending_venue_owner_requests_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Verify the final constraints
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    a.attname as column_name,
    confrelid::regclass as foreign_table_name,
    af.attname as foreign_column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.conrelid IN ('venue_owners'::regclass, 'pending_venue_owner_requests'::regclass)
AND c.contype = 'f'
ORDER BY table_name, constraint_name;