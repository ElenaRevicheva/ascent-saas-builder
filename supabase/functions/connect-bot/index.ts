import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { code, telegram_user_id, telegram_username, whatsapp_user_id } = await req.json();
    // 31 Oct 2026 (Elena: "everything in Telegram must be possible in WhatsApp - in LATAM WhatsApp is the winner"): the
    // WhatsApp bot links with `connect CODE` too. It sends a one-way hash of the phone number, never the number.
    const platform = whatsapp_user_id ? 'whatsapp' : 'telegram';
    const platformUserId = String(whatsapp_user_id ?? telegram_user_id ?? '');
    if (!code || !platformUserId) {
      return new Response(JSON.stringify({ error: 'code and a platform user id are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Connect bot request:', { code, platform, telegram_username });

    // Find valid connection code
    const { data: connectionCode, error: codeError } = await supabase
      .from('bot_connection_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      // The web page's code works for either app: it is a one-time secret of the parent's account.
      .in('platform', ['telegram', 'whatsapp'])
      .gt('expires_at', new Date().toISOString())
      .is('used_at', null)
      .single();

    if (codeError || !connectionCode) {
      console.log('Invalid connection code:', code, codeError);
      return new Response(JSON.stringify({ error: 'Invalid or expired connection code' }), {
        status: 404,
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
        platform,
        platform_user_id: platformUserId,
        platform_username: platform === 'telegram' ? telegram_username : null,
        is_active: true,
        connected_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      }, {
        onConflict: 'platform,platform_user_id'
      });

    if (botError) {
      console.error('Bot connection error:', botError);
      return new Response(JSON.stringify({ error: 'Failed to connect bot' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Successfully connected bot for user:', connectionCode.user_id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: '¡Bot conectado exitosamente! Ahora puedes practicar español.' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Connect bot error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});