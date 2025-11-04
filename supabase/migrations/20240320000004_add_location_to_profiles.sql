-- Add city and country columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN city text,
ADD COLUMN country text;

-- Add credit_balance column if it doesn't exist (for consistency)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS credit_balance decimal(10,2) default 0.00; 