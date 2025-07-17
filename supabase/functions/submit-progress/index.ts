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

    console.log('📊 Raw request data:', JSON.stringify(requestData, null, 2))

    // Support multiple data formats from bot integration
    const userId = requestData.user_id || requestData.userId || requestData.telegram_user_id
    const userMessage = requestData.user_message || requestData.userMessage || requestData.message
    const botResponse = requestData.bot_response || requestData.botResponse || requestData.response
    const familyRole = requestData.family_role || requestData.familyRole || 'family_member'
    const emotionalState = requestData.emotional_state || requestData.emotionalState || 'neutral'
    const vocabularyLearned = requestData.vocabulary_learned || requestData.vocabularyLearned || []
    const learningLevel = requestData.learning_level || requestData.learningLevel || 'beginner'
    const sessionEmotions = requestData.session_emotions || requestData.sessionEmotions || []
    const spanishWordsTotal = requestData.spanish_words_total || requestData.spanishWordsTotal || 0
    const grammarPointsTotal = requestData.grammar_points_total || requestData.grammarPointsTotal || 0
    const messageCount = requestData.message_count || requestData.messageCount || 1

    if (!userId) {
      console.error('❌ Missing user_id field:', Object.keys(requestData))
      return new Response(
        JSON.stringify({ error: 'Missing user_id field. Available fields: ' + Object.keys(requestData).join(', ') }),
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
        user_id: userId,
        session_type: 'conversation',
        source: 'telegram',
        content: {
          user_message: userMessage || 'No message content',
          bot_response: botResponse || 'No response content',
          family_role: familyRole,
          emotional_state: emotionalState,
          message_count: messageCount
        },
        progress_data: {
          vocabulary_learned: vocabularyLearned,
          learning_level: learningLevel,
          session_emotions: sessionEmotions,
          spanish_words_total: spanishWordsTotal,
          grammar_points_total: grammarPointsTotal
        },
        emotional_tone: emotionalState,
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