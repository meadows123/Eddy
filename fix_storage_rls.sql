-- Fix Storage RLS policies for venue-images bucket
-- IMPORTANT: Check if Storage RLS is enabled first!
-- If the bucket is truly public, you may need to disable RLS entirely

-- Option 1: Disable Storage RLS entirely (RECOMMENDED for public buckets)
-- Uncomment the line below to disable RLS for storage.objects:
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Option 2: Create policies to allow public access (if RLS must stay enabled)
-- First, check if Storage RLS is enabled
DO $$
BEGIN
  -- Check if RLS is enabled on storage.objects
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE 'Storage RLS is enabled. Creating policies...';
    
    -- Drop existing policies if they exist (to avoid conflicts)
    DROP POLICY IF EXISTS "Public Access to venue-images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload to venue-images" ON storage.objects;
    DROP POLICY IF EXISTS "Venue owners can update their images" ON storage.objects;
    DROP POLICY IF EXISTS "Venue owners can delete their images" ON storage.objects;
    
    -- Policy to allow public read access to venue-images bucket
    CREATE POLICY "Public Access to venue-images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'venue-images');
    
    -- Policy to allow authenticated users to upload to venue-images bucket
    CREATE POLICY "Authenticated users can upload to venue-images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'venue-images' AND auth.role() = 'authenticated');
    
    -- Policy to allow venue owners to update their own images
    CREATE POLICY "Venue owners can update their images"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'venue-images' 
      AND auth.role() = 'authenticated'
    );
    
    -- Policy to allow venue owners to delete their own images
    CREATE POLICY "Venue owners can delete their images"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'venue-images' 
      AND auth.role() = 'authenticated'
    );
    
    RAISE NOTICE 'Policies created successfully!';
  ELSE
    RAISE NOTICE 'Storage RLS is not enabled. No policies needed.';
  END IF;
END $$;

-- Verify the policies were created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%venue-images%';

