-- Fix foreign key constraints to reference profiles table instead of user_profiles
-- Drop existing foreign key constraints
ALTER TABLE split_payment_requests 
DROP CONSTRAINT IF EXISTS split_payment_requests_requester_id_fkey;

ALTER TABLE split_payment_requests 
DROP CONSTRAINT IF EXISTS split_payment_requests_recipient_id_fkey;

ALTER TABLE payment_notifications 
DROP CONSTRAINT IF EXISTS payment_notifications_user_id_fkey;

-- Add new foreign key constraints referencing profiles table
ALTER TABLE split_payment_requests 
ADD CONSTRAINT split_payment_requests_requester_id_fkey 
FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE split_payment_requests 
ADD CONSTRAINT split_payment_requests_recipient_id_fkey 
FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE payment_notifications 
ADD CONSTRAINT payment_notifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE; 