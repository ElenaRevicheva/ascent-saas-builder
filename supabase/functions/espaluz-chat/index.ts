import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Family member profiles from the Telegram bot
const FAMILY_MEMBERS = {
  "alisa": {
    role: "child",
    age: 4,
    learning_level: "beginner",
    interests: ["animals", "colors", "games", "songs"],
    tone: "playful",
    language_balance: { spanish: 0.6, english: 0.4 },
    russian_variants: ["алиса", "алисочка", "алисa"]
  },
  "marina": {
    role: "elder", 
    age: 65,
    learning_level: "beginner",
    interests: ["cooking", "culture", "daily life", "health"],
    tone: "patient",
    language_balance: { spanish: 0.7, english: 0.3 },
    russian_variants: ["марина", "маринa"]
  },
  "elena": {
    role: "parent",
    age: 39,
    learning_level: "intermediate", 
    interests: ["work", "travel", "parenting", "culture"],
    tone: "conversational",
    language_balance: { spanish: 0.5, english: 0.5 },
    russian_variants: ["елена", "еленa", "лена"]
  }
};

function detectEmotion(text: string) {
  const emotions = {
    happy: ["happy", "glad", "joy", "excited", "feliz", "contento", "alegre", "радость", "счастье", "рада", "рад", "!"],
    sad: ["sad", "upset", "unhappy", "triste", "грустно", "печально", ":("],
    confused: ["confused", "don't understand", "no entiendo", "confundido", "не понимаю", "путаюсь"],
    frustrated: ["frustrated", "annoyed", "molesto", "frustrado", "разочарован", "раздражен"],
    curious: ["curious", "wonder", "interesting", "curioso", "interesante", "любопытно", "интересно", "?"]
  };

  const textLower = text.toLowerCase();
  const detected: Record<string, number> = { curious: 0.2 }; // Default low-level curiosity

  for (const [emotion, keywords] of Object.entries(emotions)) {
    for (const keyword of keywords) {
      if (textLower.includes(keyword)) {
        detected[emotion] = (detected[emotion] || 0) + 0.3;
      }
    }
  }

  // Find dominant emotion
  const dominant = Object.entries(detected).reduce((max, current) => 
    current[1] > max[1] ? current : max, ["neutral", 1.0]);
    
  return { emotion: dominant[0], confidence: dominant[1], data: detected };
}

function detectFamilyMember(message: string): string {
  const messageLower = message.toLowerCase();
  
  for (const [name, member] of Object.entries(FAMILY_MEMBERS)) {
    // Check name variations
    if (messageLower.includes(name)) return name;
    
    // Check Russian variants
    for (const variant of member.russian_variants) {
      if (messageLower.includes(variant)) return name;
    }
  }
  
  return "elena"; // Default to Elena
}

function extractVideoScript(text: string): string {
  const match = text.match(/\[VIDEO SCRIPT START\](.*?)\[VIDEO SCRIPT END\]/s);
  return match ? match[1].trim() : "";
}

function formatClaudeRequest(userMessage: string, familyMember: string, emotion: any, conversationHistory: any[]) {
  const member = FAMILY_MEMBERS[familyMember as keyof typeof FAMILY_MEMBERS];
  
  const systemPrompt = `You are Espaluz, a bilingual emotionally intelligent Spanish-English language tutor for expat families.

FAMILY MEMBER CONTEXT:
- You're speaking with: ${member.role} (${familyMember})
- Age: ${member.age}
- Learning level: ${member.learning_level}
- Interests: ${member.interests.join(", ")}
- Communication tone: ${member.tone}
- Language balance: ${Math.round(member.language_balance.spanish * 100)}% Spanish, ${Math.round(member.language_balance.english * 100)}% English

EMOTIONAL CONTEXT:
- Detected emotion: ${emotion.emotion} (confidence: ${Math.round(emotion.confidence * 100)}%)
- Respond with appropriate emotional intelligence and warmth

RESPONSE FORMAT:
Your response MUST have TWO parts:

1️⃣ A full bilingual message with emotional tone and learning content appropriate for the family member's profile.

2️⃣ Then add a short video script section like this:
[VIDEO SCRIPT START]
¡Hola! Vamos a aprender algo nuevo juntos.
Hello! Let's learn something new together.
[VIDEO SCRIPT END]

Keep the video script short, warm, and age-appropriate for ${member.role}.

IMPORTANT:
- Match the language balance: ${Math.round(member.language_balance.spanish * 100)}% Spanish, ${Math.round(member.language_balance.english * 100)}% English
- Use ${member.tone} tone throughout
- Focus on ${member.interests.join(", ")} when possible
- Adapt complexity to ${member.learning_level} level`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-8), // Keep last 8 messages for context
    { role: "user", content: userMessage }
  ];

  return {
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1000,
    temperature: 0.7,
    messages
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!claudeApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const { message, userId } = await req.json();
    
    if (!message || !userId) {
      throw new Error('Message and userId are required');
    }

    console.log(`Processing message for user ${userId}: ${message}`);

    // Detect family member and emotion
    const familyMember = detectFamilyMember(message);
    const emotion = detectEmotion(message);
    
    console.log(`Detected family member: ${familyMember}, emotion: ${emotion.emotion}`);

    // Get conversation history from database
    const { data: sessions } = await supabase
      .from('learning_sessions')
      .select('content')
      .eq('user_id', userId)
      .eq('session_type', 'dashboard_chat')
      .order('created_at', { ascending: false })
      .limit(8);

    const conversationHistory = sessions?.map(session => {
      const content = session.content as any;
      return [
        { role: 'user', content: content.user_message || '' },
        { role: 'assistant', content: content.ai_response || '' }
      ];
    }).flat().filter(msg => msg.content) || [];

    // Format Claude request
    const claudeRequest = formatClaudeRequest(message, familyMember, emotion, conversationHistory);

    // Call Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify(claudeRequest)
    });

    if (!claudeResponse.ok) {
      throw new Error(`Claude API error: ${claudeResponse.status} ${await claudeResponse.text()}`);
    }

    const claudeResult = await claudeResponse.json();
    const fullResponse = claudeResult.content[0].text;
    const videoScript = extractVideoScript(fullResponse);

    // Save to learning sessions
    const { error: sessionError } = await supabase
      .from('learning_sessions')
      .insert({
        user_id: userId,
        session_type: 'dashboard_chat',
        source: 'dashboard',
        content: {
          user_message: message,
          ai_response: fullResponse,
          video_script: videoScript,
          family_member: familyMember,
          detected_emotion: emotion
        },
        progress_data: {
          family_member: familyMember,
          emotion: emotion.emotion,
          confidence: emotion.confidence,
          language_balance: FAMILY_MEMBERS[familyMember as keyof typeof FAMILY_MEMBERS].language_balance
        }
      });

    if (sessionError) {
      console.error('Error saving session:', sessionError);
    }

    return new Response(JSON.stringify({
      response: fullResponse,
      videoScript,
      familyMember,
      emotion: emotion.emotion,
      confidence: emotion.confidence
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in espaluz-chat:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      response: "Lo siento, hubo un error. Sorry, there was an error.",
      videoScript: "¡Hola! Hello! We'll be right back.",
      familyMember: "elena",
      emotion: "neutral"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});