import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user authentication and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError || !roleData) {
      throw new Error('Admin access required');
    }

    const { fromUserId, toUserId } = await req.json();

    if (!fromUserId || !toUserId) {
      throw new Error('Missing fromUserId or toUserId');
    }

    console.log(`Admin ${user.id} copying avatar from ${fromUserId} to ${toUserId}`);

    // Use service role for storage operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // First, check if the source file exists
    const { data: sourceList, error: listError } = await supabaseService.storage
      .from('avatars')
      .list(fromUserId, { limit: 10 });

    if (listError) {
      console.error('Error listing source files:', listError);
      throw new Error(`Failed to list source files: ${listError.message}`);
    }

    const sourceFile = sourceList?.find(file => file.name === 'avatar.mp4');
    if (!sourceFile) {
      console.error('Source avatar.mp4 not found in:', sourceList);
      throw new Error('Source avatar.mp4 file not found');
    }

    console.log('Found source file:', sourceFile);

    // Use service role for storage operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Download the file from the source location
    const { data: downloadData, error: downloadError } = await supabaseService.storage
      .from('avatars')
      .download(`${fromUserId}/avatar.mp4`);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw new Error(`Failed to download source file: ${downloadError.message}`);
    }

    console.log('File downloaded successfully, size:', downloadData.size);

    // Use service role for storage operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Upload the file to the destination location
    const { data: uploadData, error: uploadError } = await supabaseService.storage
      .from('avatars')
      .upload(`${toUserId}/avatar.mp4`, downloadData, {
        upsert: true,
        contentType: 'video/mp4'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    console.log('File uploaded successfully:', uploadData);

    // Get the public URL to verify
    const { data: publicUrlData } = supabaseService.storage
      .from('avatars')
      .getPublicUrl(`${toUserId}/avatar.mp4`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Avatar copied from ${fromUserId} to ${toUserId}`,
      publicUrl: publicUrlData.publicUrl,
      path: uploadData.path
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error copying avatar:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});