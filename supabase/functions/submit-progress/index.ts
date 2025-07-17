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
        duration_minutes: requestData.duration_minutes || null,
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