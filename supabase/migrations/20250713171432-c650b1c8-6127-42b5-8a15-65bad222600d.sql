-- Copy avatar file from one user to another (fixed version)
CREATE OR REPLACE FUNCTION copy_avatar_file(from_user_id uuid, to_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if source file exists
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects 
    WHERE bucket_id = 'avatars' 
    AND name = from_user_id::text || '/avatar.mp4'
  ) THEN
    RAISE EXCEPTION 'Source avatar file not found';
  END IF;

  -- Copy the storage object entry (excluding generated columns)
  INSERT INTO storage.objects (bucket_id, name, owner, metadata, created_at, updated_at, last_accessed_at, id)
  SELECT 
    bucket_id,
    to_user_id::text || '/avatar.mp4' as name,
    to_user_id as owner,
    metadata,
    now() as created_at,
    now() as updated_at,
    now() as last_accessed_at,
    gen_random_uuid() as id
  FROM storage.objects 
  WHERE bucket_id = 'avatars' 
  AND name = from_user_id::text || '/avatar.mp4'
  ON CONFLICT (bucket_id, name) DO UPDATE SET
    metadata = EXCLUDED.metadata,
    updated_at = now();

  RETURN true;
END;
$$;