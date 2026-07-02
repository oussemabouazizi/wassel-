-- Create storage bucket for uploads (categories, products, avatars)
-- Run this in Supabase SQL Editor or as a migration

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Anyone can upload to uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');

-- Allow public read access
CREATE POLICY "Public read access for uploads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'uploads');

-- Allow users to update their own uploads
CREATE POLICY "Users can update own uploads"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'uploads')
WITH CHECK (bucket_id = 'uploads');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own uploads"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'uploads');
