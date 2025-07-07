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

    const telegramUpdate = await req.json();
    console.log('Received Telegram update:', JSON.stringify(telegramUpdate, null, 2));

    // Extract message data
    const message = telegramUpdate.message;
    if (!message) {
      return new Response('No message found', { status: 200 });
    }

    const chatId = message.chat.id;
    const userId = message.from.id;
    const username = message.from.username || message.from.first_name;
    const text = message.text;

    console.log(`Message from ${username} (${userId}): ${text}`);

    // Check if bot is connected for this user
    const { data: connectedBot } = await supabase
      .from('connected_bots')
      .select('*')
      .eq('platform', 'telegram')
      .eq('platform_user_id', userId.toString())
      .eq('is_active', true)
      .single();

    if (!connectedBot) {
      console.log('Bot not connected for user:', userId);
      return new Response(JSON.stringify({ error: 'Bot not connected or not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create learning session
    const { error: sessionError } = await supabase
      .from('learning_sessions')
      .insert({
        user_id: connectedBot.user_id,
        session_type: 'telegram_chat',
        source: 'telegram',
        content: {
          message: text,
          telegram_user_id: userId,
          telegram_username: username,
          chat_id: chatId,
          response: "¡Hola! Estoy procesando tu mensaje de español..."
        },
        progress_data: {
          platform: 'telegram',
          message_type: 'text'
        }
      });

    if (sessionError) {
      console.error('Error creating learning session:', sessionError);
    }

    // Update last activity for connected bot
    await supabase
      .from('connected_bots')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', connectedBot.id);

    // Send response back to Telegram
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (botToken) {
      const response = "¡Hola! Soy tu tutor de español AI. ¿En qué puedo ayudarte hoy? 🇪🇸";
      
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: response,
        }),
      });
    }

    return new Response('OK', {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error('Error in telegram-webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});