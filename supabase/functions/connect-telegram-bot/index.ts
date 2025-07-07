import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { code, telegram_user_id, telegram_username } = await req.json();

    console.log('Attempting to connect Telegram bot with code:', code);

    // Find valid connection code
    const { data: connectionCode, error: codeError } = await supabase
      .from('bot_connection_codes')
      .select('*')
      .eq('code', code)
      .eq('platform', 'telegram')
      .gt('expires_at', new Date().toISOString())
      .is('used_at', null)
      .single();

    if (codeError || !connectionCode) {
      console.log('Invalid or expired connection code:', code);
      return new Response(JSON.stringify({ error: 'Invalid or expired connection code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark code as used
    await supabase
      .from('bot_connection_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', connectionCode.id);

    // Create or update connected bot
    const { error: botError } = await supabase
      .from('connected_bots')
      .upsert({
        user_id: connectionCode.user_id,
        platform: 'telegram',
        platform_user_id: telegram_user_id.toString(),
        platform_username: telegram_username,
        is_active: true,
        connected_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      }, {
        onConflict: 'platform,platform_user_id'
      });

    if (botError) {
      console.error('Error creating connected bot:', botError);
      return new Response(JSON.stringify({ error: 'Failed to connect bot' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Successfully connected Telegram bot for user:', connectionCode.user_id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: '¡Bot conectado exitosamente! Ahora puedes practicar español conmigo.' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in connect-telegram-bot:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});