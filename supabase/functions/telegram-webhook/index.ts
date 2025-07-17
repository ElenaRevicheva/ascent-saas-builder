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
    console.log('=== TELEGRAM WEBHOOK TRIGGERED ===');
    console.log('Full update received:', JSON.stringify(telegramUpdate, null, 2));

    // Extract message data - handle both webhook and polling formats
    let message = telegramUpdate.message;
    
    // If no direct message, check if it's in a different format
    if (!message && telegramUpdate.update_id) {
      console.log('Checking for message in update format...');
      message = telegramUpdate.message;
    }

    if (!message) {
      console.log('❌ No message found in update');
      console.log('Update structure:', Object.keys(telegramUpdate));
      return new Response(JSON.stringify({ error: 'No message found', received: telegramUpdate }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const chatId = message.chat.id;
    const userId = message.from.id;
    const username = message.from.username || message.from.first_name || 'Unknown';
    const text = message.text || '';

    console.log(`📱 Processing message from ${username} (${userId}): "${text}"`);
    console.log(`Chat ID: ${chatId}`);

    // Check if bot is connected for this user
    console.log('🔍 Checking for connected bot...');
    const { data: connectedBot, error: botError } = await supabase
      .from('connected_bots')
      .select('*')
      .eq('platform', 'telegram')
      .eq('platform_user_id', userId.toString())
      .eq('is_active', true)
      .single();

    if (botError) {
      console.error('❌ Error checking connected bot:', botError);
      return new Response(JSON.stringify({ error: 'Database error', details: botError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!connectedBot) {
      console.log('❌ No connected bot found for user:', userId);
      return new Response(JSON.stringify({ 
        error: 'Bot not connected', 
        user_id: userId,
        platform_user_id: userId.toString()
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Found connected bot for user:', connectedBot.user_id);

    // Generate AI response for Spanish learning
    const botResponse = generateSpanishLearningResponse(text, username);
    console.log('🤖 Generated bot response:', botResponse.substring(0, 100) + '...');
    
    // Extract learning insights from the conversation
    const learningInsights = extractLearningInsights(text, botResponse);
    console.log('📊 Extracted learning insights:', learningInsights);

    // Create learning session with enhanced progress data
    const sessionData = {
      user_id: connectedBot.user_id,
      session_type: 'telegram_chat',
      source: 'telegram',
      duration_minutes: 2,
      content: {
        user_message: text,
        bot_response: botResponse,
        telegram_user_id: userId,
        telegram_username: username,
        chat_id: chatId,
        message_id: message.message_id,
        timestamp: new Date().toISOString()
      },
      progress_data: {
        platform: 'telegram',
        message_type: 'text',
        vocabulary_learned: learningInsights.vocabulary,
        phrases_practiced: learningInsights.phrases,
        topics_discussed: learningInsights.topics,
        learning_level: learningInsights.level,
        conversation_quality: learningInsights.quality,
        word_count: text.split(' ').length,
        response_word_count: botResponse.split(' ').length
      }
    };

    console.log('💾 Attempting to insert learning session...');
    console.log('Session data:', JSON.stringify(sessionData, null, 2));

    const { data: sessionResult, error: sessionError } = await supabase
      .from('learning_sessions')
      .insert(sessionData)
      .select();

    if (sessionError) {
      console.error('❌ ERROR creating learning session:', sessionError);
      console.error('Failed session data:', JSON.stringify(sessionData, null, 2));
      
      // Still continue to send response to user
    } else {
      console.log('✅ Learning session created successfully!');
      console.log('Session result:', sessionResult);
    }

    // Update last activity for connected bot
    console.log('🔄 Updating bot last activity...');
    const { error: updateError } = await supabase
      .from('connected_bots')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', connectedBot.id);

    if (updateError) {
      console.error('❌ Error updating bot activity:', updateError);
    } else {
      console.log('✅ Bot activity updated');
    }

    // Send response back to Telegram
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (botToken) {
      console.log('📤 Sending response to Telegram...');
      try {
        const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: botResponse,
            parse_mode: 'Markdown'
          }),
        });

        const responseData = await telegramResponse.json();
        
        if (!telegramResponse.ok) {
          console.error('❌ Failed to send Telegram message:', responseData);
        } else {
          console.log('✅ Successfully sent response to Telegram');
        }
      } catch (telegramError) {
        console.error('❌ Error sending Telegram message:', telegramError);
      }
    } else {
      console.log('⚠️ No Telegram bot token found - cannot send response');
    }

    console.log('=== WEBHOOK PROCESSING COMPLETE ===');
    
    return new Response(JSON.stringify({ 
      success: true, 
      session_created: !sessionError,
      user_id: connectedBot.user_id,
      message_processed: text.substring(0, 50)
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ CRITICAL ERROR in telegram-webhook:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      message: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateSpanishLearningResponse(userMessage: string, username: string): string {
  const lowerMessage = userMessage.toLowerCase();
  
  // Detect language learning context
  if (lowerMessage.includes('hola') || lowerMessage.includes('hello')) {
    return `¡Hola ${username}! 👋 \n\n**Spanish**: ¡Qué gusto conocerte!\n**English**: So nice to meet you!\n\n*Let's practice*: Try saying "Me llamo ${username}" (My name is ${username})`;
  }
  
  if (lowerMessage.includes('como estas') || lowerMessage.includes('how are you')) {
    return `¡Excelente pregunta! 😊\n\n**Spanish**: Estoy muy bien, ¿y tú?\n**English**: I'm very well, and you?\n\n*New vocabulary*:\n- **muy** = very\n- **bien** = well/good\n- **¿y tú?** = and you?`;
  }
  
  if (lowerMessage.includes('familia') || lowerMessage.includes('family')) {
    return `¡Me encanta hablar de familia! 👨‍👩‍👧‍👦\n\n**Spanish phrases**:\n- **Mi familia** = My family\n- **Mis padres** = My parents\n- **Mi hijo/hija** = My son/daughter\n\n*Practice*: Tell me about your family in Spanish! Start with "Mi familia tiene..." (My family has...)`;
  }
  
  if (lowerMessage.includes('cocinar') || lowerMessage.includes('cook') || lowerMessage.includes('comida')) {
    return `¡Qué rico! 🍽️ Let's talk about cooking!\n\n**Cooking vocabulary**:\n- **cocinar** = to cook\n- **preparar** = to prepare\n- **ingredientes** = ingredients\n- **receta** = recipe\n\n*Try this*: "Me gusta cocinar pasta" (I like to cook pasta)`;
  }
  
  // Default learning response
  return `¡Perfecto! Let me help you with Spanish! ✨\n\n*I understood*: "${userMessage}"\n\n**Let's practice**:\n- **"¿Puedes repetir?"** = Can you repeat?\n- **"No entiendo"** = I don't understand\n- **"Más despacio, por favor"** = Slower, please\n\n*What would you like to learn about*: familia (family), comida (food), or saludos (greetings)?`;
}

function extractLearningInsights(userMessage: string, botResponse: string) {
  const lowerUser = userMessage.toLowerCase();
  const vocabulary: string[] = [];
  const phrases: string[] = [];
  const topics: string[] = [];
  
  // Extract vocabulary from bot response
  const vocabMatches = botResponse.match(/\*\*(.*?)\*\*/g);
  if (vocabMatches) {
    vocabMatches.forEach(match => {
      const word = match.replace(/\*\*/g, '').trim();
      if (word.length > 1 && !vocabulary.includes(word)) {
        vocabulary.push(word);
      }
    });
  }
  
  // Extract phrases
  const phraseMatches = botResponse.match(/"(.*?)"/g);
  if (phraseMatches) {
    phraseMatches.forEach(match => {
      const phrase = match.replace(/"/g, '').trim();
      if (phrase.length > 2 && !phrases.includes(phrase)) {
        phrases.push(phrase);
      }
    });
  }
  
  // Determine topics
  if (lowerUser.includes('familia') || lowerUser.includes('family') || botResponse.includes('familia')) {
    topics.push('Family & Relationships');
  }
  if (lowerUser.includes('cocinar') || lowerUser.includes('cook') || lowerUser.includes('comida') || botResponse.includes('cocinar')) {
    topics.push('Cooking & Food');
  }
  if (lowerUser.includes('hola') || lowerUser.includes('hello') || botResponse.includes('hola')) {
    topics.push('Greetings & Introductions');
  }
  if (lowerUser.includes('como estas') || botResponse.includes('bien')) {
    topics.push('Feelings & Emotions');
  }
  
  // Determine learning level
  let level = 'beginner';
  if (vocabulary.length > 3 || phrases.length > 2) {
    level = 'intermediate';
  }
  if (userMessage.split(' ').length > 10) {
    level = 'advanced';
  }
  
  return {
    vocabulary: vocabulary.slice(0, 8),
    phrases: phrases.slice(0, 5),
    topics: topics.slice(0, 3),
    level,
    quality: vocabulary.length + phrases.length > 3 ? 'high' : 'medium'
  };
}
