
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
    model: CLAUDE_MODELS[0],
    max_tokens: 1000,
    temperature: 0.7,
    system: systemPrompt,
    messages
  };
}

// claude-3-5-sonnet-20241022 is retired (404). Current models on Elena's key, first that answers wins (22 Oct 2026).
const CLAUDE_MODELS = ["claude-sonnet-4-6", "claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001"];

// Classroom (22 Oct 2026, Elena): children 5-7, real bilingual sentences, taught by Pere and Titi — the same rules
// as Alisa's mode in the EspaLuz Telegram bot. Short spoken replies: the classroom reads every reply aloud.
const KIDS_CLASSROOM_PROMPT = `You are the voice of two friends from Panama who teach a child aged 5 to 7 Spanish and English in a cozy classroom in Parque Natural Metropolitano:
- Pere: a calm, gentle baby sloth with a juicy green bandana. He speaks slowly and kindly, teaches the new sentences and leads the calm breathing.
- Titi: a tiny, playful Geoffroy's tamarin with an orange bandana. He loves movement games and sometimes makes a funny little mistake on purpose so the child can correct him.

How to talk:
- Always use real, complete sentences, never single words. Say each idea in Spanish first, then the same idea in English on the next line.
- Short and clear for a 5-7 year old (about 5-10 words per sentence). At most 4 sentence pairs per reply. Warm and playful. No markdown, no bullet points, at most one emoji.
- Let Pere and Titi speak by name, and name the picture shown while each one speaks: "Pere [shot]: ..." / "Titi [shot]: ...". Choose the shot that matches what the line says or does. Pere's shots: talk, hello, counting, thinking, clap, listening, breathing, sleepy, goodbye. Titi's shots: talk, cheer, silly, dance, jump, counting, freeze, oops, listening, goodbye. Both together: highfive, peekaboo. Use "talk" when nothing fits. Example: "Titi [counting]: ¡Uno, dos, tres tucanes! / One, two, three toucans!"
- End every reply with ONE simple question and invite the child to answer with a whole sentence, in Spanish or English.
- If the child makes a mistake, praise the try and say the correct whole sentence once; never say "wrong".

Lesson rhythm across the conversation (about 5-10 minutes): hello from both and one question about the child's day; a wake-up game with Titi (jumps, "Simon dice / Simon says", cross-crawl); Pere teaches 3 useful new sentences on today's theme, one at a time; a game with Titi using them; a calm moment with Pere (hands on the belly, three slow breaths, one feelings sentence); praise, a star, and goodbye.
Themes: animals, colors, family, food, school, the playground, feelings, Panama (sloths, toucans, the beach, the Canal).
Never ask for personal information such as addresses, school names or phone numbers.`;

async function callClaude(apiKey: string, request: any): Promise<any> {
  let last = '';
  for (const model of CLAUDE_MODELS) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ ...request, model }),
    });
    if (r.ok) return await r.json();
    last = `${model}: ${r.status} ${(await r.text()).slice(0, 200)}`;
    if (r.status !== 404 && r.status !== 400) break; // only a missing/retired model is worth the next one
  }
  throw new Error(`Claude API error: ${last}`);
}

// 28 Oct 2026 — the fleet's order rule (Elena, 25 Oct): FREE first (Gemini, Groq), Claude by money. The Anthropic
// org ran out of credit on 28 Oct and every classroom turn died with "credit balance is too low" while the bots kept
// answering on Groq. Same model ids as the bots' llm_chain.py; each provider is used only when its secret exists.
const GROQ_MODEL = Deno.env.get('GROQ_MODEL') || 'openai/gpt-oss-120b';
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';

async function callGroq(apiKey: string, request: any): Promise<any> {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'content-type': 'application/json', 'User-Agent': 'espaluz-chat/1.0' },
    body: JSON.stringify({ model: GROQ_MODEL, max_tokens: request.max_tokens, temperature: request.temperature,
                           messages: [{ role: 'system', content: request.system }, ...request.messages] }),
  });
  if (!r.ok) throw new Error(`Groq ${GROQ_MODEL}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const text = j.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq: empty answer');
  return { content: [{ text }] };
}

async function callGemini(apiKey: string, request: any): Promise<any> {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: request.system }] },
      contents: request.messages.map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: request.max_tokens, temperature: request.temperature },
    }),
  });
  if (!r.ok) throw new Error(`Gemini ${GEMINI_MODEL}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const text = j.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ;
  if (!text) throw new Error('Gemini: empty answer');
  return { content: [{ text }] };
}

/** First provider that answers wins: Gemini → Groq → Claude. A provider without a secret is skipped, not an error. */
async function callChain(request: any): Promise<{ result: any; provider: string }> {
  const chain: [string, string | undefined, (k: string, r: any) => Promise<any>][] = [
    ['gemini', Deno.env.get('GEMINI_API_KEY'), callGemini],
    ['groq', Deno.env.get('GROQ_API_KEY'), callGroq],
    ['claude', Deno.env.get('ANTHROPIC_API_KEY'), callClaude],
  ];
  const errors: string[] = [];
  for (const [name, key, fn] of chain) {
    if (!key) continue;
    try {
      const result = await fn(key, request);
      console.log(`answered by ${name}`);
      return { result, provider: name };
    } catch (e) {
      errors.push(`${name}: ${(e as Error).message}`);
      console.error(`${name} failed, trying the next provider:`, (e as Error).message);
    }
  }
  throw new Error(errors.length ? errors.join(' | ') : 'No LLM provider configured (GEMINI_API_KEY, GROQ_API_KEY or ANTHROPIC_API_KEY)');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract user ID from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const userId = user.id;
    
    const { message, isVoiceInput, originalLanguage, kids } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
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

    const claudeRequest = kids
      ? { max_tokens: 500, temperature: 0.7, system: KIDS_CLASSROOM_PROMPT,
          messages: [...(Array.isArray(kids.history) ? kids.history.slice(-10) : []), { role: 'user', content: message }] }
      : formatClaudeRequest(message, familyMember, emotion, conversationHistory, isVoiceInput, originalLanguage);

    const { result: claudeResult, provider } = await callChain(claudeRequest);
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
          session_type: kids ? 'classroom' : 'chat',
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
      provider,
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
