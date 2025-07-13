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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { fromUserId, toUserId } = await req.json();

    if (!fromUserId || !toUserId) {
      throw new Error('Missing fromUserId or toUserId');
    }

    console.log(`Copying avatar from ${fromUserId} to ${toUserId}`);

    // Download the file from the source location
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('avatars')
      .download(`${fromUserId}/avatar.mp4`);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw new Error(`Failed to download source file: ${downloadError.message}`);
    }

    console.log('File downloaded successfully, size:', downloadData.size);

    // Upload the file to the destination location
    const { data: uploadData, error: uploadError } = await supabase.storage
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
    const { data: publicUrlData } = supabase.storage
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