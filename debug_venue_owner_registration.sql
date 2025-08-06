-- Debug venue owner registration issue
-- Check if the user exists in auth.users table

-- Check how many users are in auth.users
SELECT COUNT(*) as total_users FROM auth.users;

-- Check the most recent users in auth.users
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if there are any venue_owners records
SELECT COUNT(*) as total_venue_owners FROM venue_owners;

-- Check the most recent venue_owners records
SELECT 
    id,
    user_id,
    venue_name,
    owner_email,
    created_at
FROM venue_owners 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if there are any pending_venue_owner_requests
SELECT COUNT(*) as total_pending_requests FROM pending_venue_owner_requests;

-- Check the most recent pending requests
SELECT 
    id,
    user_id,
    email,
    venue_name,
    created_at
FROM pending_venue_owner_requests 
ORDER BY created_at DESC 
LIMIT 5;

-- Check for orphaned venue_owners (user_id not in auth.users)
SELECT 
    vo.id,
    vo.user_id,
    vo.venue_name,
    vo.owner_email
FROM venue_owners vo
LEFT JOIN auth.users au ON vo.user_id = au.id
WHERE au.id IS NULL;

-- Check for orphaned pending_venue_owner_requests (user_id not in auth.users)
SELECT 
    pvr.id,
    pvr.user_id,
    pvr.email,
    pvr.venue_name
FROM pending_venue_owner_requests pvr
LEFT JOIN auth.users au ON pvr.user_id = au.id
WHERE au.id IS NULL; 