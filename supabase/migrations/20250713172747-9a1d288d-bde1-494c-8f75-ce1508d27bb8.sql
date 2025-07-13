-- Function to properly copy avatar file with actual content
CREATE OR REPLACE FUNCTION force_copy_avatar_content()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;