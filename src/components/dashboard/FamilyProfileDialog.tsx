import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

/*
 * 8 Nov 2026 (Elena approved the 9 questions): "About your new life". Serious, never pushy: one question per screen,
 * tap answers, each says WHY, only the first is needed, the rest can be skipped and EspaLuz asks them later in
 * conversation (profileLine in espaluz-chat / profile_line in the bots). Saved as one more note in the family notebook -
 * learning_sessions {event:'family_profile'} - so no new table, and kids-memory hands it to WhatsApp and Telegram.
 *
 * 15 Nov 2026 (Elena): EVERY question lets the family type its own answer, and what they type is saved as the answer
 * itself, so EspaLuz uses it word for word on the web and both bots. Five new questions, each used by EspaLuz
 * (cto-aipa docs/espaluz/QUESTIONNAIRE_GAPS_2026-11-15.md): why they came, how long they plan to stay, when they arrived,
 * who already speaks Spanish at home, which school the children go to (only when there are children). Shown in English,
 * Russian or Spanish; the SAVED values stay in English (the options' own words), so the rules keyed by them keep working.
 */

export type FamilyProfile = {
  country_now?: string; country_from?: string; native_language?: string; moved_when?: string; household?: string;
  spanish_feel?: string; focus?: string[]; miss_most?: string;
  // 13 Nov 2026 (Elena: most families moving here are not retired - many work online): work + their own profession.
  work?: string; profession?: string;
  // 15 Nov 2026
  why_here?: string[]; stay_plan?: string; arrived?: string; spanish_at_home?: string[]; school?: string;
  // 16 Nov 2026 (Michael, English teacher): EspaLuz teaches English too - the switch for its English coach.
  learn?: string; english_feel?: string; english_goal?: string[];
};

// The 21 countries with a belonging pack (supabase/functions/_shared/belonging/<key>.json).
export const PACK_COUNTRIES: [string, string][] = [
  ['panama', 'Panama'], ['mexico', 'Mexico'], ['colombia', 'Colombia'], ['argentina', 'Argentina'], ['spain', 'Spain'],
  ['peru', 'Peru'], ['chile', 'Chile'], ['ecuador', 'Ecuador'], ['guatemala', 'Guatemala'], ['costa_rica', 'Costa Rica'],
  ['cuba', 'Cuba'], ['bolivia', 'Bolivia'], ['dominican_republic', 'Dominican Republic'], ['honduras', 'Honduras'],
  ['paraguay', 'Paraguay'], ['nicaragua', 'Nicaragua'], ['el_salvador', 'El Salvador'], ['uruguay', 'Uruguay'],
  ['puerto_rico', 'Puerto Rico'], ['venezuela', 'Venezuela'], ['equatorial_guinea', 'Equatorial Guinea'],
];
const COUNTRY_NAMES: Record<'ru' | 'es', Record<string, string>> = {
  ru: { panama: 'Панама', mexico: 'Мексика', colombia: 'Колумбия', argentina: 'Аргентина', spain: 'Испания', peru: 'Перу', chile: 'Чили',
    ecuador: 'Эквадор', guatemala: 'Гватемала', costa_rica: 'Коста-Рика', cuba: 'Куба', bolivia: 'Боливия', dominican_republic: 'Доминиканская Республика',
    honduras: 'Гондурас', paraguay: 'Парагвай', nicaragua: 'Никарагуа', el_salvador: 'Сальвадор', uruguay: 'Уругвай', puerto_rico: 'Пуэрто-Рико',
    venezuela: 'Венесуэла', equatorial_guinea: 'Экваториальная Гвинея' },
  es: { panama: 'Panamá', mexico: 'México', colombia: 'Colombia', argentina: 'Argentina', spain: 'España', peru: 'Perú', chile: 'Chile',
    ecuador: 'Ecuador', guatemala: 'Guatemala', costa_rica: 'Costa Rica', cuba: 'Cuba', bolivia: 'Bolivia', dominican_republic: 'República Dominicana',
    honduras: 'Honduras', paraguay: 'Paraguay', nicaragua: 'Nicaragua', el_salvador: 'El Salvador', uruguay: 'Uruguay', puerto_rico: 'Puerto Rico',
    venezuela: 'Venezuela', equatorial_guinea: 'Guinea Ecuatorial' },
};

type Lang = 'en' | 'ru' | 'es';
type Txt = Record<Lang, string>;
type Key = Exclude<keyof FamilyProfile, 'profession'> | 'family';
// options: [saved value (English), Russian label, Spanish label]. free: the typed box; freeKey: saved under its own key.
type Q = { key: Key; ask: Txt; why: Txt; options?: [string, string, string][]; multi?: boolean; free?: Txt; freeKey?: keyof FamilyProfile; kidsOnly?: boolean;
  onlyIf?: (p: FamilyProfile) => boolean };
const learnsEnglish = (p: FamilyProfile) => /english|ingl|англ/i.test(String(p.learn ?? ''));
const onlyEnglish = (p: FamilyProfile) => learnsEnglish(p) && !/spanish|espa|испан|both|ambos|оба/i.test(String(p.learn ?? ''));

const QUESTIONS: Q[] = [
  { key: 'country_now',
    ask: { en: 'Where is home now?', ru: 'Где ваш дом сейчас?', es: '¿Dónde es tu hogar ahora?' },
    why: { en: 'So EspaLuz knows your holidays, your school calendar and your local customs.', ru: 'Чтобы EspaLuz знала ваши праздники, школьный календарь и местные обычаи.', es: 'Para que EspaLuz conozca tus feriados, tu calendario escolar y tus costumbres locales.' },
    free: { en: 'Somewhere else? Type the place', ru: 'Другое место? Напишите его', es: '¿Otro lugar? Escríbelo' } },
  { key: 'country_from',
    ask: { en: 'And where does your story begin?', ru: 'А где начинается ваша история?', es: '¿Y dónde empieza tu historia?' },
    why: { en: 'So she can build bridges between the customs you grew up with and the new ones.', ru: 'Чтобы она строила мосты между обычаями, с которыми вы выросли, и новыми.', es: 'Para que pueda tender puentes entre las costumbres con las que creciste y las nuevas.' },
    free: { en: 'Your country of origin', ru: 'Ваша родная страна', es: 'Tu país de origen' } },
  { key: 'native_language',
    ask: { en: 'Which language does your heart speak?', ru: 'На каком языке говорит ваше сердце?', es: '¿Qué idioma habla tu corazón?' },
    why: { en: 'So when Spanish gets too hard, she can explain a word in your language.', ru: 'Чтобы, когда испанский слишком сложен, она могла объяснить слово на вашем языке.', es: 'Para que, cuando el español se ponga difícil, pueda explicarte una palabra en tu idioma.' },
    // 20 Nov 2026 (Elena): a native Spanish speaker had no button for their own heart language - typing "I already speak Spanish"
    // here matched nothing. Saved value 'Spanish' is exactly what settles() / settlesProfile() / bots' _settles() already read.
    options: [['English', 'Английский', 'Inglés'], ['Spanish', 'Испанский', 'Español'], ['Russian', 'Русский', 'Ruso'], ['Ukrainian', 'Украинский', 'Ucraniano'], ['Portuguese', 'Португальский', 'Portugués'],
      ['French', 'Французский', 'Francés'], ['German', 'Немецкий', 'Alemán'], ['Italian', 'Итальянский', 'Italiano'], ['Chinese', 'Китайский', 'Chino'],
      ['Arabic', 'Арабский', 'Árabe'], ['Hindi', 'Хинди', 'Hindi']],
    free: { en: 'Another language', ru: 'Другой язык', es: 'Otro idioma' } },
  { key: 'why_here', multi: true,
    ask: { en: 'What brought you here?', ru: 'Что привело вас сюда?', es: '¿Qué te trajo aquí?' },
    why: { en: 'So EspaLuz speaks to your real reason - the one that keeps you going when Spanish is hard. Choose any.', ru: 'Чтобы EspaLuz говорила о вашей настоящей причине - той, что держит вас, когда испанский даётся трудно. Можно выбрать несколько.', es: 'Para que EspaLuz hable de tu verdadera razón, la que te sostiene cuando el español cuesta. Elige las que quieras.' },
    options: [["Work (mine or my partner's)", 'Работа (моя или партнёра)', 'Trabajo (mío o de mi pareja)'], ['My partner or family is from here', 'Мой партнёр или семья отсюда', 'Mi pareja o mi familia es de aquí'],
      ['A better life for the children', 'Лучшая жизнь для детей', 'Una vida mejor para los niños'], ['A calmer, safer life', 'Более спокойная и безопасная жизнь', 'Una vida más tranquila y segura'],
      ['Lower cost of living', 'Жизнь дешевле', 'Un costo de vida más bajo'], ['Adventure, seeing the world', 'Приключение, увидеть мир', 'Aventura, conocer el mundo']],
    free: { en: 'Something else? Type it', ru: 'Что-то другое? Напишите', es: '¿Otra cosa? Escríbela' } },
  { key: 'moved_when',
    ask: { en: 'How long have you been here?', ru: 'Как давно вы здесь?', es: '¿Cuánto tiempo llevas aquí?' },
    why: { en: 'The first months are about getting by; later it is about belonging. She meets you where you are.', ru: 'Первые месяцы - о том, как справиться; потом - о том, как стать своими. Она встретит вас там, где вы сейчас.', es: 'Los primeros meses son para arreglárselas; después, para sentirse parte. Ella te acompaña donde estés.' },
    options: [['Still planning the move', 'Ещё планируем переезд', 'Todavía planeando la mudanza'], ['Traveling - still looking for my place', 'Путешествую - ищу своё место', 'Viajando, buscando mi lugar'],
      ['Less than 6 months', 'Меньше 6 месяцев', 'Menos de 6 meses'], ['6 to 12 months', 'От 6 до 12 месяцев', 'De 6 a 12 meses'], ['1 to 3 years', 'От 1 до 3 лет', 'De 1 a 3 años'], ['More than 3 years', 'Больше 3 лет', 'Más de 3 años']],
    free: { en: 'Or tell it in your own words', ru: 'Или расскажите своими словами', es: 'O cuéntalo con tus palabras' } },
  { key: 'arrived',
    ask: { en: 'When did you arrive?', ru: 'Когда вы приехали?', es: '¿Cuándo llegaste?' },
    why: { en: 'So EspaLuz knows which moments are your FIRST ones here - your first carnival, your first rainy season. Month and year is enough; skip it if you are not here yet.', ru: 'Чтобы EspaLuz знала, какие моменты здесь у вас ПЕРВЫЕ - первый карнавал, первый сезон дождей. Достаточно месяца и года; пропустите, если вы ещё не здесь.', es: 'Para que EspaLuz sepa qué momentos son tus PRIMEROS aquí: tu primer carnaval, tu primera temporada de lluvias. Basta con mes y año; sáltala si aún no llegaste.' },
    free: { en: 'e.g. March 2025', ru: 'например, март 2025', es: 'p. ej. marzo de 2025' } },
  { key: 'stay_plan',
    ask: { en: 'How long do you plan to stay?', ru: 'Как долго вы планируете здесь жить?', es: '¿Cuánto tiempo piensas quedarte?' },
    why: { en: 'Building a home and passing through need different help. She will fit hers to your plan - and change when it changes.', ru: 'Тем, кто строит дом, и тем, кто проездом, нужна разная помощь. Она подстроится под ваш план - и изменится, когда он изменится.', es: 'Construir un hogar y estar de paso necesitan ayuda distinta. Ella se ajusta a tu plan, y cambia cuando cambie.' },
    options: [['A few months', 'Несколько месяцев', 'Unos meses'], ['A year or two', 'Год-два', 'Uno o dos años'], ['This is our home now', 'Теперь это наш дом', 'Ahora este es nuestro hogar'], ['Not sure yet', 'Пока не знаем', 'Todavía no lo sé']],
    free: { en: 'Or tell it in your own words', ru: 'Или расскажите своими словами', es: 'O cuéntalo con tus palabras' } },
  { key: 'household',
    ask: { en: 'Who is on this adventure with you?', ru: 'Кто с вами в этом приключении?', es: '¿Quién está contigo en esta aventura?' },
    why: { en: 'So she talks to your real family, not a generic one.', ru: 'Чтобы она говорила с вашей настоящей семьёй, а не с выдуманной.', es: 'Para que hable con tu familia real, no con una genérica.' },
    options: [['Two parents with children', 'Двое родителей с детьми', 'Dos padres con hijos'], ['Single parent with children', 'Один родитель с детьми', 'Madre o padre solo con hijos'],
      ['A couple', 'Пара', 'Una pareja'], ['Grandparents with grandchildren', 'Бабушка и дедушка с внуками', 'Abuelos con nietos'], ['On my own', 'Я один / одна', 'Yo solo / sola']],
    free: { en: 'Another family shape? Describe it in your own words', ru: 'Другая семья? Опишите своими словами', es: '¿Otra forma de familia? Descríbela con tus palabras' } },
  { key: 'spanish_at_home', multi: true,
    ask: { en: 'Does anyone in your family already speak Spanish?', ru: 'Кто-то в вашей семье уже говорит по-испански?', es: '¿Alguien en tu familia ya habla español?' },
    why: { en: 'A partner from here or a child who speaks it at school is your best bridge - EspaLuz will lean on them. Choose any.', ru: 'Партнёр отсюда или ребёнок, который говорит в школе, - ваш лучший мост; EspaLuz будет на них опираться. Можно выбрать несколько.', es: 'Una pareja de aquí o un hijo que lo habla en la escuela es tu mejor puente; EspaLuz se apoyará en ellos. Elige las que quieras.' },
    options: [['My partner is from here', 'Мой партнёр отсюда', 'Mi pareja es de aquí'], ['My partner speaks Spanish', 'Мой партнёр говорит по-испански', 'Mi pareja habla español'],
      ['The children speak it at school', 'Дети говорят в школе', 'Los niños lo hablan en la escuela'], ['Nobody yet', 'Пока никто', 'Nadie todavía']],
    free: { en: 'Someone else? Type it', ru: 'Кто-то другой? Напишите', es: '¿Otra persona? Escríbela' } },
  { key: 'work',
    ask: { en: 'What do you do for work?', ru: 'Чем вы занимаетесь?', es: '¿A qué te dedicas?' },
    why: { en: 'So EspaLuz can bring the Spanish of your own field, and grow with you as your work changes.', ru: 'Чтобы EspaLuz приносила испанский вашей профессии и росла вместе с вами, когда работа меняется.', es: 'Para que EspaLuz te traiga el español de tu campo y crezca contigo cuando tu trabajo cambie.' },
    options: [['I work online, remotely', 'Работаю онлайн, удалённо', 'Trabajo en línea, a distancia'], ['A local job here', 'Местная работа здесь', 'Un trabajo local aquí'], ['My own business', 'Свой бизнес', 'Mi propio negocio'],
      ['Studying', 'Учусь', 'Estudio'], ['Caring for the family full time', 'Занимаюсь семьёй всё время', 'Cuido a la familia a tiempo completo'], ['Retired', 'На пенсии', 'Jubilado / jubilada'], ['Between things right now', 'Сейчас в поиске', 'Ahora entre una cosa y otra']],
    free: { en: 'Your profession (optional) - e.g. designer, nurse, developer, teacher', ru: 'Ваша профессия (необязательно) - например, дизайнер, медсестра, разработчик, учитель', es: 'Tu profesión (opcional), p. ej. diseñadora, enfermero, programadora, maestro' }, freeKey: 'profession' },
  { key: 'family',
    ask: { en: 'Who are the little ones?', ru: 'Кто ваши малыши?', es: '¿Quiénes son los pequeños?' },
    why: { en: 'So Pere & Titi know each child by name. Names and ages live in your family list.', ru: 'Чтобы Пере и Тити знали каждого ребёнка по имени. Имена и возраст - в списке вашей семьи.', es: 'Para que Pere y Titi conozcan a cada niño por su nombre. Nombres y edades están en tu lista de familia.' } },
  { key: 'school', kidsOnly: true,
    ask: { en: 'Which school do the children go to?', ru: 'В какую школу ходят дети?', es: '¿A qué escuela van los niños?' },
    why: { en: "So Pere & Titi reinforce what your child's school expects - a local school, a bilingual one or homeschool need different help.", ru: 'Чтобы Пере и Тити закрепляли то, чего ждёт школа ребёнка: местной школе, двуязычной и домашнему обучению нужна разная помощь.', es: 'Para que Pere y Titi refuercen lo que pide la escuela de tu hijo: una escuela local, una bilingüe o el homeschool necesitan ayuda distinta.' },
    options: [['Local public school', 'Местная государственная школа', 'Escuela pública local'], ['Local private school', 'Местная частная школа', 'Escuela privada local'],
      ['Bilingual or international school', 'Двуязычная или международная школа', 'Escuela bilingüe o internacional'], ['Homeschool', 'Домашнее обучение', 'Educación en casa'], ['Not in school yet', 'Пока не ходят в школу', 'Todavía no va a la escuela']],
    free: { en: 'Something else? Type it', ru: 'Что-то другое? Напишите', es: '¿Otra cosa? Escríbela' } },
  { key: 'learn',
    ask: { en: 'What do you want to learn with EspaLuz?', ru: 'Что вы хотите учить с EspaLuz?', es: '¿Qué quieres aprender con EspaLuz?' },
    why: { en: 'Spanish for your new life, English for work and the world - or both.', ru: 'Испанский для новой жизни, английский для работы и мира - или оба.', es: 'Español para tu nueva vida, inglés para el trabajo y el mundo, o los dos.' },
    options: [['Spanish', 'Испанский', 'Español'], ['English', 'Английский', 'Inglés'], ['Both Spanish and English', 'И испанский, и английский', 'Español e inglés'],
      // 18 Nov 2026 (Elena): native Spanish speakers moving between countries - no beginner Spanish; this country's own words
      // and ways + real English practice, replies stay bilingual. The brain reads it with settles() (web) / _settles() (bots).
      ['I already speak Spanish - help us settle in, and practise English', 'Я уже говорю по-испански - помогите обжиться и подтянуть английский', 'Ya hablo español: ayúdanos a instalarnos y a practicar inglés']],
    free: { en: 'Or say it in your own words', ru: 'Или скажите своими словами', es: 'O dilo con tus palabras' } },
  { key: 'english_feel', onlyIf: learnsEnglish,
    ask: { en: 'How does English feel today?', ru: 'Как вам английский сегодня?', es: '¿Cómo te sientes hoy con el inglés?' },
    why: { en: 'So every English answer is at your level.', ru: 'Чтобы каждый ответ по-английски был на вашем уровне.', es: 'Para que cada respuesta en inglés esté a tu nivel.' },
    options: [["I'm just starting", 'Только начинаю', 'Estoy empezando'], ['I get by', 'Объясняюсь', 'Me defiendo'], ["I'm comfortable", 'Мне комфортно', 'Me siento cómodo / cómoda'], ['Fluent, I want to polish it', 'Свободно, хочу отточить', 'Con fluidez, quiero pulirlo']],
    free: { en: 'Or say it in your own words', ru: 'Или скажите своими словами', es: 'O dilo con tus palabras' } },
  { key: 'english_goal', multi: true, onlyIf: learnsEnglish,
    ask: { en: 'What is your English for?', ru: 'Для чего вам английский?', es: '¿Para qué quieres el inglés?' },
    why: { en: 'She practises what you will really use.', ru: 'Она тренирует то, что вам правда пригодится.', es: 'Practica contigo lo que de verdad vas a usar.' },
    options: [['Work and career: emails, meetings, interviews', 'Работа и карьера: письма, встречи, собеседования', 'Trabajo y carrera: correos, reuniones, entrevistas'], ['Fluent everyday conversation', 'Свободный разговор каждый день', 'Conversación fluida del día a día'], ['Travel', 'Путешествия', 'Viajes'], ['An exam (IELTS, TOEFL, Cambridge)', 'Экзамен (IELTS, TOEFL, Cambridge)', 'Un examen (IELTS, TOEFL, Cambridge)'], ['Helping my children with English', 'Помогать детям с английским', 'Ayudar a mis hijos con el inglés']],
    free: { en: 'Something else? Type it', ru: 'Что-то другое? Напишите', es: '¿Otra cosa? Escríbela' } },
  { key: 'spanish_feel', onlyIf: (p) => !onlyEnglish(p),
    ask: { en: 'How does Spanish feel today?', ru: 'Как вам испанский сегодня?', es: '¿Cómo te sientes hoy con el español?' },
    why: { en: 'So she pitches every answer at your level.', ru: 'Чтобы каждый её ответ был на вашем уровне.', es: 'Para que cada respuesta esté a tu nivel.' },
    options: [["I'm just starting", 'Только начинаю', 'Estoy empezando'], ['I get by', 'Объясняюсь', 'Me defiendo'], ["I'm comfortable", 'Мне комфортно', 'Me siento cómodo / cómoda']],
    free: { en: 'Or say it in your own words', ru: 'Или скажите своими словами', es: 'O dilo con tus palabras' } },
  { key: 'focus', multi: true,
    ask: { en: 'What would make the biggest difference this month?', ru: 'Что сильнее всего поможет в этом месяце?', es: '¿Qué marcaría la mayor diferencia este mes?' },
    why: { en: 'So she starts where it matters to you now. Choose any; change it when life changes.', ru: 'Чтобы она начинала с того, что важно сейчас. Выберите любые; меняйте, когда меняется жизнь.', es: 'Para que empiece por lo que te importa ahora. Elige las que quieras; cámbialo cuando cambie la vida.' },
    options: [["The children's school", 'Школа детей', 'La escuela de los niños'], ['Doctors and health', 'Врачи и здоровье', 'Médicos y salud'], ['Work', 'Работа', 'Trabajo'],
      ['Papers and offices', 'Документы и учреждения', 'Trámites y oficinas'], ['Friends and neighbours', 'Друзья и соседи', 'Amigos y vecinos'], ['Feeling at home', 'Почувствовать себя дома', 'Sentirme en casa'],
      ['Speaking with confidence', 'Говорить уверенно', 'Hablar con confianza']],
    free: { en: 'Something else? Type it', ru: 'Что-то другое? Напишите', es: '¿Otra cosa? Escríbela' } },
  { key: 'miss_most',
    ask: { en: 'What do you miss most from home?', ru: 'По чему вы больше всего скучаете?', es: '¿Qué es lo que más extrañas de casa?' },
    why: { en: 'So she can help you find a piece of home here, and build new traditions.', ru: 'Чтобы она помогла найти здесь кусочек дома и создать новые традиции.', es: 'Para que te ayude a encontrar un pedazo de hogar aquí y crear nuevas tradiciones.' },
    options: [['People', 'Люди', 'La gente'], ['Food', 'Еда', 'La comida'], ['My language', 'Мой язык', 'Mi idioma'], ['Traditions', 'Традиции', 'Las tradiciones'],
      ['The rhythm of life', 'Ритм жизни', 'El ritmo de vida'], ['Nothing much', 'Почти ни по чему', 'Casi nada']],
    free: { en: 'Something else? Type it', ru: 'Что-то другое? Напишите', es: '¿Otra cosa? Escríbela' } },
];

const UI: Record<string, Txt> = {
  title: { en: 'About your new life', ru: 'О вашей новой жизни', es: 'Sobre tu nueva vida' },
  progress: { en: 'Question {i} of {n} · only your family sees this, and you can change it any time.', ru: 'Вопрос {i} из {n} · это видит только ваша семья, и вы можете изменить ответ в любой момент.', es: 'Pregunta {i} de {n} · solo tu familia lo ve, y puedes cambiarlo cuando quieras.' },
  back: { en: '← Back', ru: '← Назад', es: '← Atrás' }, skip: { en: 'Skip for now', ru: 'Пропустить', es: 'Saltar por ahora' },
  next: { en: 'Next', ru: 'Далее', es: 'Siguiente' }, done: { en: 'Done', ru: 'Готово', es: 'Listo' }, saving: { en: 'Saving…', ru: 'Сохраняю…', es: 'Guardando…' },
  needHome: { en: 'Please choose where home is now', ru: 'Пожалуйста, выберите, где ваш дом сейчас', es: 'Elige dónde es tu hogar ahora, por favor' },
  saved: { en: 'Thank you. EspaLuz will use this on the web, WhatsApp and Telegram.', ru: 'Спасибо. EspaLuz будет учитывать это на сайте, в WhatsApp и Telegram.', es: 'Gracias. EspaLuz lo usará en la web, WhatsApp y Telegram.' },
  failed: { en: 'Could not save. Please try again.', ru: 'Не удалось сохранить. Попробуйте ещё раз.', es: 'No se pudo guardar. Inténtalo de nuevo.' },
  kidsList: { en: 'Children in your family list:', ru: 'Дети в списке семьи:', es: 'Niños en tu lista de familia:' },
  noKids: { en: 'No children in your family list yet.', ru: 'В списке семьи пока нет детей.', es: 'Todavía no hay niños en tu lista de familia.' },
  openFamily: { en: 'Open your family list →', ru: 'Открыть список семьи →', es: 'Abrir tu lista de familia →' },
  wait: { en: 'Your answers wait for you: press "Start here" again and you continue from this question.', ru: 'Ваши ответы сохранятся: нажмите «Начать здесь» снова, и вы продолжите с этого вопроса.', es: 'Tus respuestas te esperan: pulsa "Empieza aquí" otra vez y sigues desde esta pregunta.' },
};

// 18 Nov 2026: the page's twin of settles() in espaluz-chat and _settles() in both bots - a native Spanish speaker settling
// into another Spanish-speaking country (4th 'learn' answer, or native language Spanish).
export const settlesProfile = (p: Partial<FamilyProfile> | null | undefined): boolean =>
  !!p && (/already speak spanish|ya hablo espa[nñ]ol|уже говорю по-испански/i.test(String(p.learn ?? ''))
    || /^(spanish|espa[nñ]ol|castellano|испанский)$/i.test(String((p as Record<string, unknown>).native_language ?? '').trim()));

export async function readFamilyProfile(userId: string): Promise<FamilyProfile | null> {
  const { data } = await supabase.from('learning_sessions').select('content').eq('user_id', userId)
    .eq('session_type', 'analytics').eq('content->>event', 'family_profile').order('created_at', { ascending: false }).limit(1);
  return (data?.[0]?.content as FamilyProfile | undefined) ?? null;
}

const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm ${on ? 'border-transparent text-white' : 'border-border bg-background text-foreground'}`;
const asList = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v ? [String(v)] : []);

export const FamilyProfileDialog = ({ open, onOpenChange, onSaved, onOpenFamily }: {
  open: boolean; onOpenChange: (o: boolean) => void; onSaved?: (p: FamilyProfile) => void; onOpenFamily?: () => void;
}) => {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const lang: Lang = i18n.language?.startsWith('ru') ? 'ru' : i18n.language?.startsWith('es') ? 'es' : 'en';
  const L = (t: Txt) => t[lang] || t.en;
  const label = (o: [string, string, string]) => (lang === 'ru' ? o[1] : lang === 'es' ? o[2] : o[0]);
  const [p, setP] = useState<FamilyProfile>({});
  const [kids, setKids] = useState<string[]>([]);
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState('');
  const [saving, setSaving] = useState(false);
  const shown = QUESTIONS.filter((q) => (!q.kidsOnly || kids.length > 0) && (!q.onlyIf || q.onlyIf(p)));

  // 9 Nov 2026 (Elena's run-through): half-way answers wait in this browser tab (sessionStorage, never the server) and
  // reopening continues at the same question.
  const draftKey = user ? `espaluz-profile-draft-${user.id}` : '';
  const keepDraft = (cur: FamilyProfile, at: number) => {
    try { if (draftKey) sessionStorage.setItem(draftKey, JSON.stringify({ p: cur, i: at })); } catch { /* private mode */ }
  };
  useEffect(() => {
    if (!open || !user) return;
    let draft: { p: FamilyProfile; i: number } | null = null;
    try { draft = JSON.parse(sessionStorage.getItem(draftKey) || 'null'); } catch { draft = null; }
    if (draft && draft.p) { setP(draft.p); setI(Math.max(0, Number(draft.i) || 0)); }
    else {
      setI(0);
      readFamilyProfile(user.id).then((got) => { const { event: _e, ...rest } = (got ?? {}) as FamilyProfile & { event?: string }; setP(rest); });
    }
    supabase.from('family_members').select('name, age, role').eq('user_id', user.id).eq('is_active', true)
      .then(({ data }) => setKids((data ?? []).filter((m) => m.role === 'child').map((m) => `${m.name}${m.age ? `, ${m.age}` : ''}`)));
  }, [open, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const at = Math.min(i, shown.length - 1);
  const q = shown[at];
  const values = (qq: Q | undefined) => (qq?.key === 'country_now' ? PACK_COUNTRIES.map(([k]) => k) : (qq?.options ?? []).map((o) => o[0]));
  // The typed box shows a saved answer that is not one of the buttons (their own words).
  useEffect(() => {
    if (!q || q.key === 'family') { setTyped(''); return; }
    if (q.freeKey) { const f = p[q.freeKey]; setTyped(typeof f === 'string' ? f : ''); return; }
    setTyped(asList(p[q.key as keyof FamilyProfile]).find((v) => !values(q).includes(v)) ?? '');
  }, [at, q?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (final: FamilyProfile) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('learning_sessions').insert({ user_id: user.id, session_type: 'analytics', source: 'web',
      content: { event: 'family_profile', ...final } });
    setSaving(false);
    if (error) { toast.error(L(UI.failed)); return; }
    try { sessionStorage.removeItem(draftKey); } catch { /* private mode */ }
    toast.success(L(UI.saved));
    onSaved?.(final);
    onOpenChange(false);
  };

  // What they typed is saved as the answer itself (for a several-answers question: added to the chosen ones).
  const withTyped = (): FamilyProfile => {
    if (!q?.free || q.key === 'family') return p;
    const own = typed.trim().slice(0, 80);
    if (q.multi) {
      const k = q.key as 'focus' | 'why_here' | 'spanish_at_home' | 'english_goal';
      return { ...p, [k]: [...asList(p[k]).filter((v) => values(q).includes(v)), ...(own ? [own] : [])] };
    }
    return own ? { ...p, [q.freeKey ?? q.key]: own } : p;
  };
  const next = () => {
    const cur = withTyped();
    setP(cur);
    if (at === 0 && !cur.country_now) { toast.error(L(UI.needHome)); return; }
    if (at < shown.length - 1) setI(at + 1); else save(cur);
  };
  const pick = (v: string) => {
    if (!q || q.key === 'family') return;
    const k = q.key as keyof FamilyProfile;
    if (q.multi) {
      const list = asList(p[k]);
      setP({ ...p, [k]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] });
    } else { setP({ ...p, [k]: v }); if (!q.freeKey) setTyped(''); }
  };
  const isOn = (v: string) => (q && q.key !== 'family' ? asList(p[q.key as keyof FamilyProfile]).includes(v) : false);
  const tint = 'hsl(var(--espaluz-purple))';

  return (
    // Closing half-way never loses answers: once "home now" is chosen, what was answered is kept.
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving && withTyped().country_now) { save(withTyped()); return; } onOpenChange(o); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{L(UI.title)}</DialogTitle>
          <DialogDescription>{L(UI.progress).replace('{i}', String(at + 1)).replace('{n}', String(shown.length))}</DialogDescription>
        </DialogHeader>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full" style={{ width: `${((at + 1) / shown.length) * 100}%`, background: tint }} />
        </div>
        {q && (
          <div className="space-y-3">
            <p className="text-lg font-semibold text-foreground">{L(q.ask)}</p>
            <p className="text-sm text-muted-foreground">{L(q.why)}</p>

            {q.key === 'country_now' && (
              <div className="flex flex-wrap gap-2">
                {PACK_COUNTRIES.map(([k, n]) => (
                  <button key={k} type="button" onClick={() => { setP({ ...p, country_now: k }); setTyped(''); }} className={chip(p.country_now === k)}
                    style={p.country_now === k ? { background: tint } : undefined}>{lang === 'en' ? n : COUNTRY_NAMES[lang][k] ?? n}</button>
                ))}
              </div>
            )}

            {q.key === 'family' && (
              <div className="rounded-xl border border-border bg-background p-3 text-sm">
                {kids.length ? <p className="text-foreground">{L(UI.kidsList)} {kids.join(' · ')}</p>
                  : <p className="text-muted-foreground">{L(UI.noKids)}</p>}
                <button type="button" className="mt-2 font-semibold text-primary hover:underline"
                  onClick={() => { keepDraft(withTyped(), at); onOpenChange(false); onOpenFamily?.(); }}>{L(UI.openFamily)}</button>
                <p className="mt-1 text-xs text-muted-foreground">{L(UI.wait)}</p>
              </div>
            )}

            {q.options && (
              <div className="flex flex-wrap gap-2">
                {q.options.map((o) => {
                  const on = isOn(o[0]);
                  return <button key={o[0]} type="button" onClick={() => pick(o[0])} className={chip(on)} style={on ? { background: tint } : undefined}>{label(o)}</button>;
                })}
              </div>
            )}

            {q.free && (
              <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={L(q.free)} maxLength={80}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
            )}

            <div className="flex items-center justify-between pt-2">
              <button type="button" disabled={at === 0} onClick={() => setI(at - 1)} className="text-sm text-muted-foreground disabled:opacity-40">{L(UI.back)}</button>
              <div className="flex items-center gap-3">
                {at > 0 && at < shown.length - 1 && (
                  <button type="button" onClick={() => setI(at + 1)} className="text-sm text-muted-foreground hover:underline">{L(UI.skip)}</button>
                )}
                <button type="button" disabled={saving} onClick={next}
                  className="rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ background: tint }}>
                  {at < shown.length - 1 ? L(UI.next) : saving ? L(UI.saving) : L(UI.done)}
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
