import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { phrasesIn } from '../_shared/phrases.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestData = await req.json()

    // 15 Nov 2026 (Elena: "the app is the brain - it should collect WhatsApp, Telegram, the app and the classroom, with
    // true logs"): WhatsApp grown-up chats never reached the brain, and Telegram sent a 500-character cut of the reply,
    // an invented "30 minutes" and junk "words". The bots now come through THIS door with their shared secret and
    // send EspaLuz's reply; the brain keeps ONLY what is true and safe to show the whole family: the day, the channel,
    // who spoke (if the bot knows) and the Spanish phrases she taught - never the message text (a member's private
    // worry must not land on the family dashboard). Old Telegram callers without the secret still work below; the old
    // full-body log lines (they printed people's messages into the logs) are gone.
    const botSecret = Deno.env.get('ESPALUZ_BOT_SECRET')
    if (botSecret && req.headers.get('x-espaluz-bot-secret') === botSecret && requestData.reply !== undefined) {
      const platform = requestData.platform === 'whatsapp' ? 'whatsapp' : 'telegram'
      const pid = String(requestData.platform_user_id ?? '')
      const { data: link } = await supabase.from('connected_bots').select('user_id').eq('platform', platform)
        .eq('platform_user_id', pid).eq('is_active', true).order('connected_at', { ascending: false }).limit(1)
      const userId = link?.[0]?.user_id
      if (!userId) return new Response(JSON.stringify({ linked: false }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      const phrases = phrasesIn(String(requestData.reply).slice(0, 6000))
      const { error } = await supabase.from('learning_sessions').insert({ user_id: userId, session_type: 'conversation', source: platform,
        content: { channel: platform, phrases, member: String(requestData.member ?? '').slice(0, 60) || null, chars: String(requestData.reply).length },
        progress_data: {}, completed_at: new Date().toISOString() })
      if (error) { console.error('[brain] save failed', error.message); return new Response(JSON.stringify({ error: 'save' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
      console.log(`[brain] ${platform} turn saved phrases=${phrases.length}`)
      return new Response(JSON.stringify({ success: true, phrases: phrases.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get platform_user_id to lookup the actual user_id
    const platformUserId = requestData.platform_user_id || requestData.platformUserId
    
    if (!platformUserId) {
      console.error('❌ Missing platform_user_id field:', Object.keys(requestData))
      return new Response(
        JSON.stringify({ error: 'Missing platform_user_id field. Available fields: ' + Object.keys(requestData).join(', ') }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Look up the user_id from connected_bots table
    const { data: connectedBot, error: lookupError } = await supabase
      .from('connected_bots')
      .select('user_id')
      .eq('platform_user_id', platformUserId)
      .eq('platform', 'telegram')
      .eq('is_active', true)
      .single()

    if (lookupError || !connectedBot) {
      console.error('❌ Could not find user for platform_user_id:', platformUserId, lookupError)
      return new Response(
        JSON.stringify({ error: 'Could not find connected user for platform_user_id: ' + platformUserId }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const userId = connectedBot.user_id

    // Extract data from the request
    const content = requestData.content || {}
    const progressData = requestData.progress_data || {}
    
    // Convert duration to integer if provided
    let durationMinutes = null
    if (requestData.duration_minutes) {
      durationMinutes = Math.round(parseFloat(requestData.duration_minutes))
    }
    
    // Insert learning session - ensure source is valid
    const { data, error } = await supabase
      .from('learning_sessions')
      .insert({
        user_id: userId,
        session_type: requestData.session_type || 'conversation',
        source: 'telegram', // Force valid source value
        content: content,
        progress_data: progressData,
        emotional_tone: requestData.emotional_tone || 'neutral',
        duration_minutes: durationMinutes,
        completed_at: new Date().toISOString()
      })

    if (error) {
      console.error('❌ Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to save session', details: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Session saved (legacy telegram)')
    
    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})