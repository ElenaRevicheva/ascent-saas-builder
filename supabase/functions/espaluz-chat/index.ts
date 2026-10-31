
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

// Classroom (22 Oct 2026, Elena): children 6-7 (first grade, not toddlers - 30 Oct 2026), real bilingual sentences, taught by Pere and Titi — the same rules
// as Alisa's mode in the EspaLuz Telegram bot. Short spoken replies: the classroom reads every reply aloud.
const KIDS_CLASSROOM_PROMPT = `You are the voice of two friends from Panama who teach a child aged 6 to 7 (first grade) Spanish and English in a cozy classroom in Parque Natural Metropolitano. The child is a schoolchild, not a toddler: never use baby talk.
- Pere: a calm, gentle baby sloth with a juicy green bandana. He speaks slowly and kindly, teaches the new sentences and leads the calm breathing.
- Titi: a tiny, playful Geoffroy's tamarin with an orange bandana. He loves movement games and sometimes makes a funny little mistake on purpose so the child can correct him.

How to talk:
- Always use real, complete sentences, never single words. Say each idea in Spanish first, then the same idea in English on the SAME line after " / ".
- The FIRST line of every reply answers what the child just said. If the child asked a question, answer it; if the child told you something, say it back in a correct whole sentence. Only then continue the lesson. Example: the child says "Hello, how are you, Pere and Titi?" -> "Pere [hello]: ¡Estoy muy bien, gracias por preguntar! / I am very well, thank you for asking!" then "Titi [cheer]: ¡Yo también estoy feliz de verte! / I am happy to see you too!"
- Clear for a 6-7 year old (about 6-12 words per sentence; two ideas may be joined with "y / and" or "porque / because"). 2-3 short lines per reply. Warm and playful. No markdown, no bullet points, at most one emoji.
- Let Pere and Titi speak by name, and name the picture shown while each one speaks: "Pere [shot]: ..." / "Titi [shot]: ...". Choose the shot that matches what the line says or does. Pere's shots: talk, hello, counting, thinking, clap, listening, breathing, sleepy, goodbye. Titi's shots: talk, hello, cheer, silly, dance, jump, counting, freeze, oops, listening, goodbye. Both together: highfive, peekaboo. Use "talk" when nothing fits. Never give two lines in a row the same shot, and across the lesson use many different ones. Shots by lesson step: hello = Pere [hello] then Titi [hello]; wake-up = Titi [jump], [counting], [freeze] or [dance]; new sentences = Pere [talk], [thinking], [listening], praise = Pere [clap] or Titi [cheer]; the game (a riddle or "what's wrong?") = Titi [oops], [silly], [peekaboo]; calm = Pere [breathing], [sleepy]; the end = [highfive] then [goodbye]. Example: "Titi [counting]: ¡Uno, dos, tres tucanes! / One, two, three toucans!"
- End every reply with ONE simple question and invite the child to answer with a whole sentence, in Spanish or English.
- If the child makes a mistake, praise the try and say the correct whole sentence once; never say "wrong".
- Your Spanish must be perfectly correct, because a child copies it. "muy" never goes with a verb, use "mucho" ("Amo mucho a mi mamá", never "Amo a mi mamá muy"); for loving people use "querer" or "amar", not "gustar" ("Quiero mucho a mi mamá"). When you correct the child, give one short natural sentence, not a grammar rule.
- Each reply is ONE step of the lesson rhythm below (THIS TURN names it). After the first hello, never greet again and never restart the lesson; continue from where the conversation is.
- A real dialogue, not a lecture: 2-3 short lines and ONE question, then stop and wait. Repeat the child's own words back (corrected if needed). Follow the child's topic: if the child talks about a cat, today's sentences are about that cat.
- Both ways: if the child speaks English, give the Spanish; if the child speaks Spanish, give the English. The child learns both languages.
- Correct only REAL mistakes. If the child said it correctly, keep the child's words exactly (a child who says "mi gata blanca" has a girl cat: never change it to "gato blanco"). Remember what the child already told you in this lesson (a pet's name, a friend, a colour) and use it; never ask for it again.
- Once per lesson: ask the child to READ one short sentence from the screen out loud (first graders are learning to read); ask one "¿Por qué...? / Why...?" question and welcome an answer with "porque / because"; and at the goodbye give a mission: one sentence to say today to a real person (mamá, a friend, the teacher, the shop).

Lesson rhythm across the conversation (about 5-10 minutes): hello from both and one question about the child's day; a wake-up game with Titi (jumps, "Simon dice / Simon says", cross-crawl); Pere teaches 3 useful new sentences on today's theme, one at a time; a game with Titi using them (a riddle like "Soy verde y lento. ¿Quién soy? / I am green and slow. Who am I?", Titi's funny mistake to correct, or reading one sentence aloud); a calm moment with Pere (hands on the belly, three slow breaths, one feelings sentence); praise, a star, today's mission, and goodbye.
Themes: animals, family, food, school and the classroom, my day, the clock and time, numbers to 100, the weather, feelings, friends, Panama (sloths, toucans, the beach, the Canal).
Never ask for personal information such as addresses, school names or phone numbers.`;

// 30 Oct 2026 (Elena: "a real dialogue, informational and emotionally rich, beat Buddy") - the same lesson state as the
// Telegram bot (EspaLuzFamilybot main.py KIDS_STEPS / KIDS_STORIES / kids_sentence_check): the page sends the turn, the
// function names the step, this week's story, yesterday's mission and a gentle check of the sentence the child tried.
const KIDS_STEPS = [
  "HELLO: both heroes say hello in 1-2 short lines; if a list of EARLIER LESSONS is above, the first line brings back ONE happy thing from it (\"La última vez me dijiste que...\"); mention this week's story in one line, then ONE question about the child's day.",
  "WAKE-UP GAME with Titi: one quick movement game (jumps, 'Simon dice / Simon says', or right hand to left knee).",
  "NEW SENTENCE 1: Pere teaches ONE useful sentence built on what the child talked about, and asks the child to say it.",
  "NEW SENTENCE 2: one more sentence on the child's topic; ask the child to say it, or to answer a '¿Por qué...? / Why...?' with 'porque / because'.",
  "GAME with Titi: a riddle, Titi's funny mistake for the child to correct, or ask the child to READ one short sentence aloud.",
  "THIS WEEK'S STORY: the heroes ask the child to help solve the story's problem; name how the hero feels; tell the Panama fact.",
  "CALM with Pere: hands on the belly, three slow breaths together, and one feelings sentence.",
  "GOODBYE: praise, a star, today's mission (one sentence to say to a real person), and goodbye from both.",
];
const KIDS_STEP_FREE = "FREE TALK: the lesson is done; keep talking about the child's topic, short, one question, warm.";
// Facts checked: Geoffroy's tamarin lives in Panama; sloths come down about once a week; the toucan's bill is big but light;
// the golden frog is a symbol of Panama; Canal locks lift ships like steps of water (1914); sea turtles nest on Panama's
// beaches; the harpy eagle is Panama's national bird.
const KIDS_STORIES = [
  "Titi lost his favourite mango in Parque Natural Metropolitano and feels sad; the child helps him look (up, down, behind, under). Fact: the Geoffroy's tamarin, like Titi, lives in Panama's forests.",
  "Pere is scared of the thunder in the rainy season; the child helps him feel brave with slow breaths. Fact: sloths come down from their tree only about once a week.",
  "A toucan feels shy about her big colourful beak; the child tells her why it is beautiful. Fact: the toucan's beak is big but very light.",
  "Titi cannot find his friend the golden frog; the child helps by counting and looking near the stream. Fact: the golden frog is a symbol of Panama.",
  "Pere and Titi watch a big ship cross the Panama Canal and feel excited; the child helps count the steps of water. Fact: the Canal's locks lift ships like steps of water, and it opened in 1914.",
  "Baby sea turtles walk to the sea at night and feel a little scared; the child cheers for them. Fact: sea turtles lay their eggs on Panama's beaches.",
  "A big harpy eagle visits the park and Titi feels nervous; the child helps them become friends. Fact: the harpy eagle is Panama's national bird.",
];

function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  return Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
}

const kidWords = (s: string): string[] =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[a-zñ]+/g) ?? [];

// Words too common to prove she was repeating a sentence (31 Oct 2026: "I woke up very early … I want to ride my
// bicycle" matched the target "I feel very happy" on "i" + "very" = 50%, and the tutor answered "¡Casi! Se dice…").
const KID_STOP = new Set(("i you he she it we they a an the to of and or is am are was very so my your me yo tu el la " +
  "los las un una y o es soy eres muy mi me te se de del que en con por para lo le no si").split(" "));
const kidContent = (s: string): string[] => kidWords(s).filter((w) => !KID_STOP.has(w));
const ASKED_TO_REPEAT = /repite|repeat|dime|d[ií]lo|say it|can you say|puedes decir|ahora t[uú]|now you|lee |read /i;

/** Gentle pronunciation check: the sentence the heroes just asked for vs what speech-to-text heard. It runs only when
 *  the heroes asked her to repeat or read, and only on real (non-stopword) words: 3+ shared and 70%+ of the target. */
function kidsSentenceCheck(prevReply: string, said: string): string {
  const saidW = kidWords(said);
  if (saidW.length < 3 || !prevReply || !ASKED_TO_REPEAT.test(prevReply)) return "";
  const cands = [...prevReply.matchAll(/["“«]([^"”»]{8,120})["”»]/g)].map((m) => m[1]);
  for (const line of prevReply.split("\n")) {
    if (line.includes(" / ")) cands.push(...line.split(" / ").map((p) => (p.split(":").pop() ?? "").trim()));
  }
  const saidC = kidContent(said);
  let best = "", bestScore = 0;
  for (const c of cands) {
    const set = new Set(kidContent(c));
    if (set.size < 2) continue;
    const shared = [...set].filter((w) => saidC.includes(w)).length;
    const score = shared / set.size;
    if (shared >= Math.min(3, set.size) && score > bestScore) { best = c; bestScore = score; }
  }
  if (!best || bestScore < 0.7) return "";
  const missing = kidWords(best).filter((w) => !saidW.includes(w));
  const extra = saidW.filter((w) => !kidWords(best).includes(w));
  if (!missing.length) return `SENTENCE CHECK: the child said the target sentence "${best}" correctly - celebrate it in one line.`;
  return `SENTENCE CHECK: target "${best}"; speech-to-text heard "${said}"; missing words: ${missing.slice(0, 4).join(", ")}` +
    (extra.length ? `; the child said instead: ${extra.slice(0, 4).join(", ")}` : "") +
    `. Start with one gentle line like "¡Casi! Se dice ...", say the whole sentence once, then go on.`;
}

// A question from the child outranks the lesson plan (31 Oct 2026, twin of the bot's kids_asked_question): Alisa asked
// about Parque Metropolitano and got the scheduled toucan hello, asked where the toucan lives and got Simon says.
const KID_QUESTION = /\?|¿|^\s*(where|what|why|how|who|which|when|can you|could you|tell me|do you|is it|are there|dónde|donde|qué|por qué|cómo|cuál|quién|cuándo|cuéntame|cuentame)(?![\wáéíóúñ])/i;

// 31 Oct 2026 (Alisa's re-test): the per-turn step came LAST in the prompt and never quoted the child, so the small
// free model followed the step and forgot "answer the child first" written far above. She answered the heroes' own
// question with "Starberry" and got a new sentence about sloths; a garbled transcript ("Ana, Ana, me viene perezoso")
// was praised as "you say it perfectly". Every turn now opens with her exact words and what to do with them.
function kidsHeard(message: string): string {
  return `\n\nTHE CHILD JUST SAID (speech-to-text, may be imperfect): "${message.trim().slice(0, 300)}"\n` +
    "YOUR FIRST LINE reacts to exactly these words, before anything else. Check these in order:\n" +
    // 31 Oct 2026 (Alisa: "mi mamá está pegando porque estoy chupando una paleta"): the heroes echoed her words, then
    // said "Simon dice, salta" - and repeated "las paletas no son dulces" as true.
    "1. A feeling she names or clearly shows, or something hard that happened (scolded, sad, scared, hurt, missing " +
    "someone) -> name the feeling kindly. Not wanting to play is NOT sadness (that is 3); never tell her she feels " +
    "something she did not say. " +
    "(\"Parece que te sentiste triste cuando mamá se enojó. / It sounds like you felt sad when mom got upset.\"), ask ONE " +
    "gentle question about how she feels, and stay with her: THIS TURN HAS NO GAME AND NO NEW SENTENCE, skip the lesson " +
    "step below. Use soft words; never repeat a frightening word like \"pegar / hit\" back to her.\n" +
    "2. An answer to your last question (even one word, like \"Starberry\") -> say it back as a whole, correct sentence in " +
    "both languages and praise it (\"¡Tu fruta favorita es la fresa! / Your favourite fruit is the strawberry!\"); that " +
    "sentence is the one to practise now.\n" +
    "3. Her own idea, topic or a refusal (\"I don't want to jump, I want to ride my bicycle\"; \"no quiero jugar... " +
    "Halloween\") -> follow HER idea warmly and fit the lesson into it (\"¡Vamos en bici! / Let's ride our bikes!\", " +
    "\"¡Hoy es Halloween! ¿De qué te vas a disfrazar? / Today is Halloween! What will you dress up as?\").\n" +
    "4. Only if NO part of it makes sense -> do NOT guess and do NOT praise it: say kindly that you did not hear well and " +
    "ask her to say it again (\"No te escuché bien. ¿Me lo dices otra vez? / I didn't hear you well. Can you say it " +
    "again?\") and stop there: skip the lesson step below. If part of it makes sense, answer that part.\n" +
    "Always: if her words contain something untrue, never repeat it as true - say the correct version simply (\"Las " +
    "paletas son dulces, pero tienen mucho azúcar. / Lollipops are sweet, but they have a lot of sugar.\"). The recording " +
    "may hold two voices (the child and an adult helping): answer the CHILD's part.\n" +
    // 31 Oct 2026 (15:43): Elena said "estamos manejando en el auto y mi hija no puede saltar" and the heroes told her
    // she "felt worried that Lisa might get hurt", as if a six-year-old had said it.
    "If the words are an ADULT talking about the child (\"mi hija\", \"my daughter\", \"mamá aquí\"), it is the parent: " +
    "thank them in one short line, do what they ask, then turn back to the child by name.\n";
}

// 31 Oct 2026 (Elena: "evolving on the go with memory" - step 3 of the 9 days): every lesson started from zero. Her own
// words from EARLIER lessons are already stored - classroom turns here, and Telegram kids turns synced by the bot
// (submit-progress, family_role 'alisa') - so the heroes get a small card of them, like a friend who remembers.
const KIDS_STARTER = /quiero empezar la clase|i want to start the class/i;
// A hard moment is never brought back at a hello (eval 31 Oct: Grok opened a new lesson with "la última vez me dijiste
// que tu mamá está pegando"). Enforced here in code, not left to the model. Twin: main.py _KIDS_HARD.
const KIDS_HARD = /peg|golpe|\bhit|grit|yell|scold|rega[nñ]|castig|punish|llor|\bcry|cried|triste|\bsad\b|miedo|scared|asust|duele|hurt|enoj|angry|frustr|sangr|blood|lastim|herid|accident|terremoto|sismo|temblor|earthquake/i;
// A parent speaking into the lesson is not the child's memory (31 Oct 15:43: "mi hija ... no puede saltar").
// 31 Oct 17:31: "It's Alisa's mom now, Elena. Alisa doesn't want to brush her teeth" was not caught: the heroes told
// the mother "it sounds like you feel worried". Twins: kids-memory KIDS_ADULT, main.py _KIDS_ADULT.
const KIDS_ADULT = /\bmi hij[oa]\b|\bmy (daughter|son)\b|\bmam[aá] aqu[ií]\b|\bsoy (la|su) mam[aá]\b|\b(it'?s|this is|soy|habla) [^.!?]{0,20}\b(mom|mum|mother|mam[aá])\b|\balisa'?s (mom|mum|mother)\b|\balisa (has|had|is|was|does|doesn'?t|did|didn'?t|promised|no quiere|quiere|tiene|est[aá])\b/i;
// 31 Oct 2026 (15:39-15:43): Alisa was in the car; Titi asked her to hop like a bunny, she said she could not ("me puede
// abrir la cabeza"), and the next reply still had no idea. Once the lesson hears she cannot move, every later step is a
// sit-still one - kept in code from the whole lesson history, not left to the model's memory of one turn.
const KIDS_STILL = /\b(auto|carro|coche|car|bus|taxi|avi[oó]n|plane|manejando|driving)\b|no (puedo|puede) (saltar|moverme|levantarme)|can'?t (jump|move|stand)/i;
// 31 Oct 2026 (16:00): "there is an earthquake in our area ... let us take a pause. Ciao Pere Titi!" got a breathing
// exercise, "how do you feel now?", and then "Es un terremoto hoy, sí". A family that says stop, or an emergency,
// ends the lesson turn in code: a short goodbye, no game, no question.
const KIDS_EMERGENCY = /terremoto|sismo|temblor|earthquake|incendio|\bfire\b|emergencia|emergency|inundaci|\bflood|hurac[aá]n|hurricane/i;
const KIDS_BYE = /\b(ciao|chao|adi[oó]s|bye|goodbye|hasta luego|hasta mañana|pausa|pause|not a good time|no es buen momento|tenemos que irnos|we have to go|me tengo que ir)\b/i;
const firstLine = (reply: string): string =>
  (reply.split('\n').map((l) => l.trim()).find(Boolean) ?? '').replace(/^[^:\[]*(\[[^\]]*\])?:\s*/, '').split(' / ')[0].slice(0, 120);

async function kidsMemoryCard(supabase: any, userId: string, hist: any[]): Promise<string> {
  const { data, error } = await supabase
    .from('learning_sessions')
    .select('session_type, content, created_at')
    .eq('user_id', userId)
    .in('session_type', ['classroom', 'conversation'])
    // Replies before step 2 (31 Oct 12:47 UTC) misread her ("Starberry" -> a sentence about animals), and the eval
    // showed the heroes "remembering" those misreadings. Memory starts from the turns made under the fixed rules.
    .gte('created_at', '2026-10-31T12:47:00Z')
    .order('created_at', { ascending: false })
    .limit(80);
  if (error || !Array.isArray(data)) return '';
  const now = new Set(hist.filter((m: any) => m?.role === 'user').map((m: any) => String(m.content ?? '').trim()));
  const said: string[] = [];
  let mission = '';
  for (const row of data) {
    const c = row.content || {};
    if (row.session_type === 'conversation' && c.family_role !== 'alisa') continue; // a parent's own chat stays out
    const words = String(c.user_message ?? '').trim();
    const reply = String(c.ai_response ?? c.bot_response ?? '');
    if (now.has(words)) continue; // this lesson is already in the conversation
    const understood = firstLine(reply);
    if (KIDS_HARD.test(words) || KIDS_HARD.test(understood) || KIDS_ADULT.test(words) || /no te escuch|didn't hear/i.test(understood)) continue;
    // An "understanding" that only echoes her words means nobody understood her (eval: "te viene un perezoso").
    if (understood && kidWords(understood).join(' ').includes(kidWords(words).join(' '))) continue;
    const item = understood ? `"${words.slice(0, 120)}" -> you understood: "${understood}"` : `"${words.slice(0, 120)}"`;
    if (words && !KIDS_STARTER.test(words) && !words.startsWith('/') && !said.some((s) => s.startsWith(`"${words.slice(0, 120)}"`))) said.push(item);
    if (!mission) {
      const line = reply.split('\n').find((l: string) => /misi[oó]n|mission/i.test(l));
      if (line) mission = line.replace(/^.*?\]:\s*/, '').slice(0, 160);
    }
    if (said.length >= 10) break;
  }
  if (!said.length && !mission) return '';
  return '\n\nWHAT THE CHILD TOLD YOU IN EARLIER LESSONS (her own words, newest first; speech-to-text may be imperfect):\n' +
    said.map((s) => `- ${s}`).join('\n') +
    (mission ? `\nLast mission you gave: "${mission}" - at the hello, ask if she did it.` : '') +
    "\nUse this like a friend who remembers: at the hello bring back ONE happy, clearly understood thing (a favourite " +
    "thing, a pet, a wish, something she likes doing) taken ONLY from this list, in simple words (\"La última vez me " +
    "dijiste que ... ¿Todavía? / Last time you told me ... Still?\"), and later use " +
    "what she told you instead of asking again. Skip anything that does not make sense, never bring back anything sad " +
    "or about being scolded, and never invent a memory that is not in this list.";
}

// Today in Panama, and the day's holiday when there is one (she said "Halloween" on 31 Oct and was told she seemed
// sad). Dates checked: 3 Nov separation from Colombia (1903), 4 Nov flag day, 5 Nov Colón day, 10 Nov first cry of
// independence in La Villa de Los Santos, 28 Nov independence from Spain (1821), 8 Dec Mother's Day in Panama.
const KIDS_HOLIDAYS: Record<string, string> = {
  '10-31': 'Halloween', '11-02': 'Día de los Difuntos',
  '11-03': 'Día de la Separación de Panamá de Colombia (1903) - school parades with drums and flags',
  '11-04': 'Día de la Bandera de Panamá', '11-05': 'Día de Colón', '11-10': 'Primer Grito de Independencia en La Villa de Los Santos',
  '11-28': 'Independencia de Panamá de España (1821)', '12-08': 'Día de las Madres en Panamá', '12-24': 'Nochebuena',
  '12-25': 'Navidad', '12-31': 'Fin de Año', '01-01': 'Año Nuevo',
};
function kidsToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const md = `${parts.find((p) => p.type === 'month')?.value}-${parts.find((p) => p.type === 'day')?.value}`;
  const day = new Intl.DateTimeFormat('es-PA', { timeZone: 'America/Panama', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const h = KIDS_HOLIDAYS[md];
  return `TODAY in Panama: ${day}${h ? ` - ${h}. If she brings it up (or it fits), talk about it happily and teach a sentence about it.` : '.'}`;
}

function kidsTurnContext(kids: any, message: string): string {
  const hist = Array.isArray(kids?.history) ? kids.history : [];
  const raw = Number.isInteger(kids?.turn) ? kids.turn : Math.floor(hist.length / 2);
  // The page counts every exchange; a turn spent answering her question does not move the lesson on.
  const held = hist.filter((m: any) => m?.role === "user" && KID_QUESTION.test(String(m?.content ?? ""))).length;
  const turn = raw > 0 ? Math.max(1, raw - held) : 0;
  const step = turn < KIDS_STEPS.length ? KIDS_STEPS[turn] : KIDS_STEP_FREE;
  const story = KIDS_STORIES[isoWeek(new Date()) % KIDS_STORIES.length];
  const heard = turn > 0 ? kidsHeard(message) + (KIDS_ADULT.test(message)
    ? "THIS MESSAGE IS FROM THE PARENT, not the child: first line thanks the parent by role (\"¡Gracias, mamá! / " +
      "Thank you, mom!\"), never tell the parent how they feel; do what the parent asks, then turn to the child by name.\n"
    : "") : "";
  if (KIDS_EMERGENCY.test(message)) {
    return `\n\nSOMEONE SAID THERE IS AN EMERGENCY: "${message.trim().slice(0, 200)}"\nTHIS TURN OVERRIDES EVERY RULE ABOVE: ` +
      "no lesson, no game, no breathing exercise, no question, and never confirm or describe the emergency. Exactly two " +
      "calm lines: \"Pere [talk]: Quédate cerca de tu mamá y haz lo que ella dice. / Stay close to your mom and do what she " +
      "says.\" and \"Titi [goodbye]: Aquí te esperamos cuando vuelvas. / We will be here when you come back.\"";
  }
  if (KIDS_BYE.test(message)) {
    return `\n\nTHE FAMILY WANTS TO STOP NOW: "${message.trim().slice(0, 200)}"\nTHIS TURN OVERRIDES EVERY RULE ABOVE: ` +
      "no game, no new sentence, no question. Two short warm goodbye lines, one from each hero (Pere [goodbye], Titi " +
      "[goodbye]), saying you will be happy to continue next time.";
  }
  if (KID_QUESTION.test(message.trim())) {
    const hello = turn === 0 ? "Say hello in a few words inside the first line, then " : "";
    return [heard + `\nTHIS TURN: the child ASKED A QUESTION. ${hello}ANSWER IT FIRST, truly and simply, for a 6-7 year old: ` +
      "2-3 short lines with one real fact (if you are not sure of a fact, say what you do know - never invent). " +
      "Stay on THEIR topic; do not start a game, a story or a new lesson step this turn. " +
      `End with ONE question about the SAME topic they asked about. (The lesson continues next turn with: ${step})`,
      ...(turn === 0 ? [`THIS WEEK'S STORY (only if it is about what they asked; otherwise ignore it): ${story}`] : []),
      kidsToday(), "BOTH heroes speak in this reply: at least one \"Pere [shot]:\" line AND one \"Titi [shot]:\" line."].join("\n");
  }
  // 31 Oct 2026 (Alisa's lesson 13:46-13:51): the story rode along on EVERY turn, so "quiero jugar un poquitito" became
  // the toucan again and again, and Titi fell silent for three replies. The story now appears only at the hello and on
  // its own step; both heroes speak every turn; the heroes know today's date and Panama's real holidays.
  const out = [heard + `\nTHEN, this turn's lesson step (turn ${turn + 1} of ${KIDS_STEPS.length}), built on what she just said and only ` +
    `if it fits after your first line (skip it after 1 or 4 above) - her idea always wins over the plan: ${step}`,
    ...(turn === 0 || step.startsWith("THIS WEEK'S STORY")
      ? [`THIS WEEK'S STORY (one line at the hello; the whole story only on its own step; if the child already chose a topic, their topic wins): ${story}`]
      : []),
    kidsToday(),
    "BOTH heroes speak in this reply: at least one \"Pere [shot]:\" line AND one \"Titi [shot]:\" line (Titi is the " +
    "playful one - let him ask the closing question or make it a little game)."];
  if ([...hist.filter((m: any) => m?.role === "user").map((m: any) => String(m?.content ?? "")), message].some((s) => KIDS_STILL.test(s))) {
    out.push("SHE CANNOT MOVE RIGHT NOW (in a car or told you she can't jump): for the rest of this lesson NO jumping, " +
      "hopping, standing or running games - use sit-still games instead (veo veo / I spy a colour out of the window, " +
      "count the cars, soft clapping, a riddle, finger counting). Never ask her to jump again in this lesson.");
  }
  if (turn === 0 && typeof kids?.mission === "string" && kids.mission.trim()) {
    out.push(`LAST LESSON'S MISSION was: "${kids.mission.trim().slice(0, 160)}". In this hello, ask the child if they did it and what happened, and celebrate the answer.`);
  }
  const prev = [...hist].reverse().find((m: any) => m?.role === "assistant")?.content ?? "";
  const check = turn > 0 ? kidsSentenceCheck(String(prev), message) : "";
  if (check) out.push(check);
  return out.join("\n");
}

async function callClaude(apiKey: string, request: any): Promise<any> {
  let last = '';
  for (const model of CLAUDE_MODELS) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ ...request, model }),
    });
    if (r.ok) return await r.json();
    const body = (await r.text()).slice(0, 200);
    last = `${model}: ${r.status} ${body}`;
    if (/credit balance/i.test(body)) break; // no credit: every Claude model will say the same, hand over at once
    if (r.status !== 404 && r.status !== 400) break; // only a missing/retired model is worth the next one
  }
  throw new Error(`Claude API error: ${last}`);
}

// 28 Oct 2026 — the fleet's order rule (Elena, 25 Oct): FREE first (Gemini, Groq), Claude by money. The Anthropic
// org ran out of credit on 28 Oct and every classroom turn died with "credit balance is too low" while the bots kept
// answering on Groq. Same model ids as the bots' llm_chain.py; each provider is used only when its secret exists.
// 28 Oct 2026 23:30 UTC: Groq's free tier counts tokens PER MODEL per day (gpt-oss-120b: 200k TPD, used 199,668 ->
// 429, and with Gemini unset and Anthropic dry the classroom said "could not answer"). So Groq is a waterfall of
// models, each with its own daily budget; a model that is rate-limited, decommissioned or unknown is skipped.
// 30 Oct 2026: the llama/qwen3-32b ids were RETIRED by Groq (404 "does not exist") and gpt-oss-120b hit its 200k daily
// cap, so the waterfall was empty and the classroom said "could not answer". Only ids Groq lists today (GET /models).
const GROQ_MODELS = (Deno.env.get('GROQ_MODELS') || Deno.env.get('GROQ_MODEL') ||
  'openai/gpt-oss-120b,openai/gpt-oss-20b,qwen/qwen3.8-27b')
  .split(',').map((m) => m.trim()).filter(Boolean);

/** Groq's models all THINK before they answer; with a small budget they think it all away and return "" (the bot learned
 *  this on 16 Aug, llm_chain.py). gpt-oss: think briefly + room to answer. qwen: hide the thinking; its free tier allows
 *  only 1000 output tokens per minute, so it gets exactly that. Verified 30 Oct with the real classroom prompt. */
function groqParams(model: string, maxTokens: number): Record<string, unknown> {
  if (model.startsWith('openai/gpt-oss')) return { max_tokens: Math.max(maxTokens, 2000), reasoning_effort: 'low' };
  if (model.startsWith('qwen/')) return { max_tokens: 1000, reasoning_format: 'hidden' };
  return { max_tokens: maxTokens };
}
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';

// 31 Oct 2026: gpt-oss-120b's free daily tokens were spent by midday and every classroom turn fell to gpt-oss-20b, the
// weakest model. Grok (xAI API, ~$0.0002 a reply, the bots' llm_chain uses it) now sits between the strong Groq model
// and the small ones.
const GROQ_STRONG = GROQ_MODELS.slice(0, 1);
const GROQ_SMALL = GROQ_MODELS.slice(1);
const XAI_MODEL = Deno.env.get('XAI_MODEL') || 'grok-4.20-0309-non-reasoning';

async function callGrok(apiKey: string, request: any): Promise<any> {
  const r = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: XAI_MODEL, max_tokens: request.max_tokens, temperature: request.temperature,
                           messages: [{ role: 'system', content: request.system }, ...request.messages] }),
  });
  if (!r.ok) throw new Error(`Grok ${XAI_MODEL}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const text = (await r.json()).choices?.[0]?.message?.content;
  if (!text) throw new Error('Grok: empty answer');
  return { content: [{ text }], model: XAI_MODEL };
}

async function callGroq(apiKey: string, request: any, models: string[] = GROQ_MODELS): Promise<any> {
  const errors: string[] = [];
  for (const model of models) {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'content-type': 'application/json', 'User-Agent': 'espaluz-chat/1.0' },
      body: JSON.stringify({ model, ...groqParams(model, request.max_tokens), temperature: request.temperature,
                             messages: [{ role: 'system', content: request.system }, ...request.messages] }),
    });
    if (!r.ok) {
      const why = `Groq ${model}: ${r.status} ${(await r.text()).slice(0, 160)}`;
      errors.push(why);
      console.error(why, '- trying the next Groq model');
      continue;
    }
    const j = await r.json();
    const text = j.choices?.[0]?.message?.content;
    if (!text) { errors.push(`Groq ${model}: empty answer`); continue; }
    console.log(`groq model ${model}`);
    return { content: [{ text }], model };
  }
  throw new Error(errors.join(' || '));
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

// 31 Oct 2026 (Elena: "photos in the web classroom, like Telegram"): the child shows a toy, a drawing or her lunch and
// the heroes talk about it. Same order as the bot's process_photo: paid first (Claude refuses in a split second when
// dry), then Grok vision on the key we already have. Groq lists no vision model today. The photo itself is never
// stored; only the one-line description goes into the lesson (and from there into her memory).
const PHOTO_PROMPT = "A 6-year-old girl is showing this photo to her Spanish tutors. In ONE short English sentence, say " +
  "what is in it (objects, toys, animals, food, a drawing; colours). Never name or describe a real person: say only " +
  "'a person'. No guesses about where it was taken.";
async function describePhoto(b64: string): Promise<string> {
  const claudeKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (claudeKey) {
    try {
      const r = await callClaude(claudeKey, { max_tokens: 120, messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } }, { type: 'text', text: PHOTO_PROMPT }] }] });
      const t = r?.content?.[0]?.text?.trim();
      if (t) { console.log('photo read by claude'); return t; }
    } catch (e) { console.error('photo claude failed, trying grok:', (e as Error).message); }
  }
  const xaiKey = Deno.env.get('XAI_API_KEY');
  if (!xaiKey) throw new Error('no vision provider');
  const r = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${xaiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: XAI_MODEL, max_tokens: 120, messages: [{ role: 'user', content: [
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } }, { type: 'text', text: PHOTO_PROMPT }] }] }),
  });
  if (!r.ok) throw new Error(`Grok vision ${r.status}: ${(await r.text()).slice(0, 160)}`);
  const t = (await r.json()).choices?.[0]?.message?.content?.trim();
  if (!t) throw new Error('Grok vision: empty answer');
  console.log('photo read by grok');
  return t;
}

/** First provider that answers wins, PAID FIRST (Elena, 31 Oct 2026: "when credits are topped up, use the paid layer
 *  to the maximum"): Claude refuses in a split second when the org has no credit and then hands over, so a top-up is
 *  used automatically with nothing to switch. Then Gemini, the strong free Groq model, Grok, and the small Groq models
 *  last. A provider without a secret is skipped, not an error. */
async function callChain(request: any): Promise<{ result: any; provider: string }> {
  const chain: [string, string | undefined, (k: string, r: any) => Promise<any>][] = [
    ['claude', Deno.env.get('ANTHROPIC_API_KEY'), callClaude],
    ['gemini', Deno.env.get('GEMINI_API_KEY'), callGemini],
    ['groq', Deno.env.get('GROQ_API_KEY'), (k, r) => callGroq(k, r, GROQ_STRONG)],
    ['grok', Deno.env.get('XAI_API_KEY'), callGrok],
    ['groq-small', Deno.env.get('GROQ_API_KEY'), (k, r) => callGroq(k, r, GROQ_SMALL)],
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
    
    const body = await req.json();
    const { isVoiceInput, originalLanguage, kids } = body;
    let message: string = body.message;

    if (!message) {
      throw new Error('Message is required');
    }

    let photoDescription = '';
    if (kids && typeof kids.image === 'string' && kids.image.length > 100) {
      if (kids.image.length > 2_000_000) throw new Error('Photo too large');
      try {
        photoDescription = (await describePhoto(kids.image)).replace(/\s+/g, ' ').slice(0, 300);
        message = `📷 (foto: ${photoDescription})`;
      } catch (e) {
        console.error('photo could not be read:', (e as Error).message);
        message = '📷 (foto que no se pudo ver / a photo that could not be seen)';
      }
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

    // Sentences the child said in earlier lessons come back first (Buddy.ai: tiny vocabulary, repeated and grown; 30 Oct 2026).
    const known: string[] = Array.isArray(kids?.known)
      ? kids.known.filter((s: unknown) => typeof s === 'string').map((s: string) => s.trim().slice(0, 120)).filter(Boolean).slice(-20)
      : [];
    const memory = kids ? await kidsMemoryCard(supabase, userId, Array.isArray(kids.history) ? kids.history : []) : '';
    // The turn instruction (with the child's own words) goes LAST: the model weighs the end of the prompt most.
    const kidsSystem = KIDS_CLASSROOM_PROMPT + memory + (known.length
      ? `\n\nSentences the child already said in earlier lessons: ${known.map((s) => `"${s}"`).join(' · ')}. At the hello, invite the child to say one of them again and praise, then teach new ones (the same words come back and grow).`
      : '') + (kids ? kidsTurnContext(kids, message) : '') + (kids && message.startsWith('📷') ? (photoDescription
        ? `\nSHE IS SHOWING YOU A PHOTO: ${photoDescription}\nTalk about what is in it with real curiosity first (name ` +
          "the thing and its colour in Spanish and English), then build this turn's sentence from it. Never comment on a " +
          "person in it."
        : "\nShe tried to show you a photo but you could not see it: say so kindly in one line and ask her to tell you what is in it.") : '');
    const claudeRequest = kids
      ? { max_tokens: 500, temperature: 0.7, system: kidsSystem,
          messages: [...(Array.isArray(kids.history) ? kids.history.slice(-10) : []), { role: 'user', content: message }] }
      : formatClaudeRequest(message, familyMember, emotion, conversationHistory, isVoiceInput, originalLanguage);

    const { result: claudeResult, provider } = await callChain(claudeRequest);
    let fullResponse = claudeResult.content[0].text;
    // 30 Oct 2026: the free models ignore "at most 4 sentence pairs" and wrote 8-10 lines - too long for a 6-year-old
    // and one voice request per line. Kids replies keep the first 4 lines plus the closing question, deterministically.
    if (kids) {
      const lines = fullResponse.split('\n').map((l: string) => l.trim()).filter(Boolean);
      if (lines.length > 4) {
        const last = lines[lines.length - 1];
        fullResponse = [...lines.slice(0, 3), ...(last.includes('?') ? [last] : [])].join('\n');
      }
      // 31 Oct 2026 (15:56): "No te escuché bien. ¿Me lo dices otra vez?" was followed in the same reply by "¡Salta
      // tres veces!" and a question about "the phone" she never said. Not heard = ask again, and nothing else.
      if (/no te escuch/i.test(lines[0] ?? '')) fullResponse = lines[0];
      // A stop or an emergency gets goodbye lines only - the base prompt's "end with a question" must not leak in.
      else if (KIDS_EMERGENCY.test(message) || KIDS_BYE.test(message)) {
        fullResponse = fullResponse.split('\n').filter((l: string) => l.trim() && !l.includes('?')).slice(0, 2).join('\n') || fullResponse;
      }
    }
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
      userMessage: message, // a photo turn comes back as its description, so the page's history knows what was shown
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
