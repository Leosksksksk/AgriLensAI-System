CREATE POLICY "Users upload own profile photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = 'profile-pictures'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users read own profile photo objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = 'profile-pictures'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users replace own profile photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = 'profile-pictures'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = 'profile-pictures'
  AND (storage.foldername(name))[2] = auth.uid()::text
);