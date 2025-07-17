
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default family member template for new users
const DEFAULT_FAMILY_MEMBER = {
  role: "adult",
  age: 35,
  learning_level: "beginner",
  interests: ["culture", "daily life", "conversation"],
  tone: "conversational",
  spanish_preference: 0.5,
  english_preference: 0.5
};

async function getFamilyMembers(supabase: any, userId: string) {
  const { data: familyMembers, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching family members:', error);
    return [];
  }

  return familyMembers || [];
}

async function detectFamilyMember(message: string, familyMembers: any[]): Promise<any> {
  if (!familyMembers || familyMembers.length === 0) {
    return {
      id: 'default',
      name: 'User',
      ...DEFAULT_FAMILY_MEMBER
    };
  }

  const messageLower = message.toLowerCase();
  
  // Try to find family member by name or name variants
  for (const member of familyMembers) {
    if (messageLower.includes(member.name.toLowerCase())) {
      return member;
    }
    
    if (member.name_variants && Array.isArray(member.name_variants)) {
      for (const variant of member.name_variants) {
        if (messageLower.includes(variant.toLowerCase())) {
          return member;
        }
      }
    }
  }
  
  return familyMembers[0] || {
    id: 'default',
    name: 'User',
    ...DEFAULT_FAMILY_MEMBER
  };
}

function detectEmotion(text: string) {
  const emotions = {
    happy: ["happy", "glad", "joy", "excited", "feliz", "contento", "alegre", "радость", "счастье", "рада", "рад", "!"],
    sad: ["sad", "upset", "unhappy", "triste", "грустно", "печально", ":("],
    confused: ["confused", "don't understand", "no entiendo", "confundido", "не понимаю", "путаюсь"],
    frustrated: ["frustrated", "annoyed", "molesto", "frustrado", "разочарован", "раздражен"],
    curious: ["curious", "wonder", "interesting", "curioso", "interesante", "любопытно", "интересно", "?"]
  };

  const textLower = text.toLowerCase();
  const detected: Record<string, number> = { curious: 0.2 };

  for (const [emotion, keywords] of Object.entries(emotions)) {
    for (const keyword of keywords) {
      if (textLower.includes(keyword)) {
        detected[emotion] = (detected[emotion] || 0) + 0.3;
      }
    }
  }

  const dominant = Object.entries(detected).reduce((max, current) => 
    current[1] > max[1] ? current : max, ["neutral", 1.0]);
    
  return { emotion: dominant[0], confidence: dominant[1], data: detected };
}

function extractVideoScript(text: string): string {
  const match = text.match(/\[VIDEO SCRIPT START\](.*?)\[VIDEO SCRIPT END\]/s);
  return match ? match[1].trim() : "";
}

function formatClaudeRequest(userMessage: string, familyMember: any, emotion: any, conversationHistory: any[], isVoiceInput?: boolean, originalLanguage?: string) {
  const voiceInputContext = isVoiceInput ? `\n\nVOICE INPUT CONTEXT:
- This message was received via voice input
- Original language: ${originalLanguage === 'ru' ? 'Russian' : originalLanguage === 'es' ? 'Spanish' : 'English'}
- Please provide a comprehensive bilingual response that acknowledges the voice input and helps with language learning
- Include translations and explanations as appropriate` : '';

  const systemPrompt = `You are Espaluz, a professional Spanish tutor for expat families. You are educational, encouraging, and structured in your teaching approach.

FAMILY MEMBER CONTEXT:
- Student: ${familyMember.role} (${familyMember.name})
- Age: ${familyMember.age || 'not specified'}
- Learning level: ${familyMember.learning_level}
- Interests: ${familyMember.interests ? familyMember.interests.join(", ") : "general learning"}
- Communication tone: ${familyMember.tone}
- Language balance: ${Math.round((familyMember.spanish_preference || 0.5) * 100)}% Spanish, ${Math.round((familyMember.english_preference || 0.5) * 100)}% English

EMOTIONAL CONTEXT:
- Detected emotion: ${emotion.emotion} (confidence: ${Math.round(emotion.confidence * 100)}%)
- Respond with appropriate emotional intelligence and warmth${voiceInputContext}

EDUCATIONAL TEACHING APPROACH:
- Always include Spanish vocabulary with pronunciation guides
- Provide cultural context when relevant
- Use structured learning: Vocabulary → Example → Practice
- Correct mistakes gently with explanations
- Build on what the student already knows
- Include mini-exercises or questions to practice
- Track progress by mentioning learned vocabulary

RESPONSE FORMAT:
Your response MUST have TWO parts:

1️⃣ EDUCATIONAL LESSON (Main Response):
- Start with warm greeting in both languages
- Teach relevant Spanish vocabulary with pronunciation: [word] (pronunciation)
- Provide 2-3 example sentences using the vocabulary
- Include cultural tip if relevant
- Give a mini-practice exercise or question
- Encourage continued learning
- Use ${Math.round((familyMember.spanish_preference || 0.5) * 100)}% Spanish, ${Math.round((familyMember.english_preference || 0.5) * 100)}% English

2️⃣ VIDEO SCRIPT:
[VIDEO SCRIPT START]
¡Hola estudiantes! Hello students! Today we learned [vocabulary topic].
Remember: [key Spanish phrase] means [English translation].
Let's practice: [simple exercise or repetition]
¡Muy bien! Very good! Keep practicing every day.
[VIDEO SCRIPT END]

EXAMPLES OF GOOD RESPONSES:
User: "How do I say hello?"
Response: "¡Hola! Let me teach you greetings! 

**Basic Greetings:**
- Hola (OH-lah) = Hello
- Buenos días (BWAY-nohs DEE-ahs) = Good morning  
- Buenas tardes (BWAY-nahs TAR-dehs) = Good afternoon

**Cultural Tip:** In Latin America, people often greet with a kiss on the cheek, even in business!

**Practice:** Try saying "¡Hola! ¿Cómo estás?" (Hello! How are you?) to someone today.

**Your turn:** Can you tell me how you would greet someone in the evening?"

Make every interaction educational and structured while maintaining warmth and encouragement.`;

  const messages = [
    ...conversationHistory.slice(-8),
    { role: "user", content: userMessage }
  ];

  return {
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1000,
    temperature: 0.7,
    system: systemPrompt,
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

    const { message, userId, isVoiceInput, originalLanguage } = await req.json();
    
    if (!message || !userId) {
      throw new Error('Message and userId are required');
    }

    console.log(`Processing message for user ${userId}: ${message}`);

    const familyMembers = await getFamilyMembers(supabase, userId);
    const familyMember = await detectFamilyMember(message, familyMembers);
    const emotion = detectEmotion(message);
    
    console.log(`Detected family member: ${familyMember.name} (${familyMember.role}), emotion: ${emotion.emotion}`);

    // Get conversation history
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

    const claudeRequest = formatClaudeRequest(message, familyMember, emotion, conversationHistory, isVoiceInput, originalLanguage);

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

    // Extract vocabulary from response for progress tracking
    const vocabularyPattern = /\*\*(.*?)\*\*/g;
    const vocabularyMatches = fullResponse.match(vocabularyPattern) || [];
    const extractedVocabulary = vocabularyMatches
      .map(match => match.replace(/\*\*/g, ''))
      .filter(word => word.length > 2 && !word.includes(':'));

    // Save to learning sessions
    try {
      const { error: sessionError } = await supabase
        .from('learning_sessions')
        .insert({
          user_id: userId,
          session_type: 'chat',
          source: 'web',
          content: {
            user_message: message,
            ai_response: fullResponse,
            video_script: videoScript,
            family_member: familyMember.name,
            family_member_id: familyMember.id,
            detected_emotion: emotion,
            vocabulary_taught: extractedVocabulary
          },
          progress_data: {
            family_member: familyMember.name,
            family_member_role: familyMember.role,
            emotion: emotion.emotion,
            confidence: emotion.confidence,
            vocabulary_learned: extractedVocabulary,
            learning_level: familyMember.learning_level,
            language_balance: {
              spanish: familyMember.spanish_preference || 0.5,
              english: familyMember.english_preference || 0.5
            }
          }
        });

      if (sessionError) {
        console.error('Error saving session:', sessionError);
      }
    } catch (sessionSaveError) {
      console.error('Session save exception:', sessionSaveError);
    }

    return new Response(JSON.stringify({
      response: fullResponse,
      videoScript,
      familyMember: familyMember.name,
      familyMemberRole: familyMember.role,
      emotion: emotion.emotion,
      confidence: emotion.confidence,
      vocabularyTaught: extractedVocabulary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in espaluz-chat:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      response: "Lo siento, hubo un error. Sorry, there was an error. Let's try again! ¡Intentemos de nuevo!",
      videoScript: "¡Hola! Hello! We're having a small technical issue. Un pequeño problema técnico. Please try again. Por favor, inténtalo de nuevo.",
      familyMember: "elena",
      emotion: "neutral"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
