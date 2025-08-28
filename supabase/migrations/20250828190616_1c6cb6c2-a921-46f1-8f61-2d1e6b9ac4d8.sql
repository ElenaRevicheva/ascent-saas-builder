-- Fix remaining functions with search path issues
-- These were likely missed in the previous migration

-- Fix copy_avatar_file and force_copy_avatar_content functions
CREATE OR REPLACE FUNCTION public.copy_avatar_file(from_user_id uuid, to_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.force_copy_avatar_content()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    source_id uuid := '5fa36928-3201-4c2f-bc27-c30b7a6d36c6';
    target_id uuid := '47ba0628-27a4-4cd8-9d10-38bc91baf8eb';
    source_metadata jsonb;
BEGIN
    -- Get the metadata from the source file
    SELECT metadata INTO source_metadata
    FROM storage.objects 
    WHERE bucket_id = 'avatars' 
    AND name = source_id::text || '/avatar.mp4';
    
    IF source_metadata IS NULL THEN
        RAISE EXCEPTION 'Source avatar file not found';
    END IF;
    
    -- Delete existing target file if it exists
    DELETE FROM storage.objects 
    WHERE bucket_id = 'avatars' 
    AND name = target_id::text || '/avatar.mp4';
    
    -- Insert new record for target file
    INSERT INTO storage.objects (
        bucket_id, 
        name, 
        owner, 
        metadata, 
        created_at, 
        updated_at, 
        last_accessed_at, 
        id
    ) VALUES (
        'avatars',
        target_id::text || '/avatar.mp4',
        target_id,
        source_metadata,
        now(),
        now(),
        now(),
        gen_random_uuid()
    );
    
    RETURN true;
END;
$function$;