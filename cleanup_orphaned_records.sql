-- Clean up orphaned venue owner records
-- This script removes records that have null user_id values

-- First, let's see what orphaned records exist
SELECT 
    id,
    user_id,
    venue_name,
    owner_email,
    created_at
FROM venue_owners 
WHERE user_id IS NULL;

-- Clean up orphaned venue owner records
DELETE FROM venue_owners WHERE user_id IS NULL;

-- Clean up orphaned pending venue owner requests
DELETE FROM pending_venue_owner_requests WHERE user_id IS NULL;

-- Verify the cleanup
SELECT 
    'venue_owners' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_user_records
FROM venue_owners
UNION ALL
SELECT 
    'pending_venue_owner_requests' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_user_records
FROM pending_venue_owner_requests; 