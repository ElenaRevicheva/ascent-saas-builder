import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    console.log('📊 Received progress data:', requestData)

    const {
      user_id,
      user_message,
      bot_response,
      family_role,
      emotional_state,
      vocabulary_learned = [],
      learning_level = 'beginner',
      session_emotions = [],
      spanish_words_total = 0,
      grammar_points_total = 0,
      message_count = 1
    } = requestData

    if (!user_id || !user_message || !bot_response) {
      console.error('❌ Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, user_message, bot_response' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Insert learning session
    const { data, error } = await supabase
      .from('learning_sessions')
      .insert({
        user_id,
        session_type: 'conversation',
        source: 'telegram',
        content: {
          user_message,
          bot_response,
          family_role,
          emotional_state,
          message_count
        },
        progress_data: {
          vocabulary_learned,
          learning_level,
          session_emotions,
          spanish_words_total,
          grammar_points_total
        },
        emotional_tone: emotional_state,
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

    console.log('✅ Session saved successfully:', data)
    
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