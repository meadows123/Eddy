-- Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    referrer_id UUID NOT NULL REFERENCES auth.users(id),
    referral_code TEXT NOT NULL UNIQUE,
    recipient_email TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'completed')),
    error_message TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT referrals_referral_code_key UNIQUE (referral_code)
);

-- Add RLS policies
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own referrals
CREATE POLICY "Users can view their own referrals"
    ON public.referrals FOR SELECT
    USING (auth.uid() = referrer_id);

-- Allow users to create referrals
CREATE POLICY "Users can create referrals"
    ON public.referrals FOR INSERT
    WITH CHECK (auth.uid() = referrer_id);

-- Allow users to update their own referrals
CREATE POLICY "Users can update their own referrals"
    ON public.referrals FOR UPDATE
    USING (auth.uid() = referrer_id)
    WITH CHECK (auth.uid() = referrer_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER handle_referrals_updated_at
    BEFORE UPDATE ON public.referrals
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
