
export interface Lesson {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: 'vocabulary' | 'grammar' | 'conversation' | 'culture';
  estimatedMinutes: number;
  vocabulary: string[];
  phrases: { spanish: string; english: string; pronunciation: string }[];
  exercises: Exercise[];
}

export interface Exercise {
  id: string;
  type: 'translation' | 'multiple_choice' | 'fill_blank' | 'pronunciation';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export const spanishLessons: Lesson[] = [
  {
    id: 'greetings-basics',
    title: 'Basic Greetings & Introductions',
    description: 'Learn essential greetings and how to introduce yourself in Spanish',
    difficulty: 'beginner',
    category: 'conversation',
    estimatedMinutes: 15,
    vocabulary: ['hola', 'adiós', 'gracias', 'por favor', 'perdón', 'nombre', 'mucho gusto'],
    phrases: [
      { spanish: 'Hola, ¿cómo estás?', english: 'Hello, how are you?', pronunciation: 'OH-lah, KOH-moh ehs-TAHS' },
      { spanish: 'Me llamo...', english: 'My name is...', pronunciation: 'meh YAH-moh' },
      { spanish: 'Mucho gusto', english: 'Nice to meet you', pronunciation: 'MOO-choh GOOS-toh' },
      { spanish: 'Por favor', english: 'Please', pronunciation: 'pohr fah-VOHR' },
      { spanish: 'Gracias', english: 'Thank you', pronunciation: 'GRAH-see-ahs' },
      { spanish: 'De nada', english: 'You\'re welcome', pronunciation: 'deh NAH-dah' }
    ],
    exercises: [
      {
        id: 'greeting-translation-1',
        type: 'translation',
        question: 'How do you say "Hello, how are you?" in Spanish?',
        correctAnswer: 'Hola, ¿cómo estás?',
        explanation: 'This is the most common greeting in Spanish. "Hola" means hello, and "¿cómo estás?" means how are you.'
      },
      {
        id: 'greeting-multiple-choice-1',
        type: 'multiple_choice',
        question: 'What does "Mucho gusto" mean?',
        options: ['Good morning', 'Nice to meet you', 'See you later', 'Thank you'],
        correctAnswer: 'Nice to meet you',
        explanation: '"Mucho gusto" literally means "much pleasure" and is used when meeting someone for the first time.'
      }
    ]
  },
  {
    id: 'family-vocabulary',
    title: 'Family Members',
    description: 'Learn vocabulary for family members and relationships',
    difficulty: 'beginner',
    category: 'vocabulary',
    estimatedMinutes: 20,
    vocabulary: ['familia', 'padre', 'madre', 'hijo', 'hija', 'hermano', 'hermana', 'abuelo', 'abuela'],
    phrases: [
      { spanish: 'Mi familia es grande', english: 'My family is big', pronunciation: 'mee fah-MEE-lee-ah ehs GRAHN-deh' },
      { spanish: 'Tengo dos hermanos', english: 'I have two brothers', pronunciation: 'TEHN-goh dohs ehr-MAH-nohs' },
      { spanish: 'Mi padre trabaja', english: 'My father works', pronunciation: 'mee PAH-dreh trah-BAH-hah' },
      { spanish: 'Esta es mi madre', english: 'This is my mother', pronunciation: 'EHS-tah ehs mee MAH-dreh' }
    ],
    exercises: [
      {
        id: 'family-translation-1',
        type: 'translation',
        question: 'How do you say "My sister" in Spanish?',
        correctAnswer: 'Mi hermana',
        explanation: '"Mi" means "my" and "hermana" means "sister". For brother, you would say "hermano".'
      },
      {
        id: 'family-fill-blank-1',
        type: 'fill_blank',
        question: 'Complete: "Tengo una _____ muy inteligente" (I have a very smart daughter)',
        correctAnswer: 'hija',
        explanation: '"Hija" means daughter. "Hijo" would be son.'
      }
    ]
  },
  {
    id: 'daily-activities',
    title: 'Daily Activities & Routines',
    description: 'Express what you do every day in Spanish',
    difficulty: 'beginner',
    category: 'conversation',
    estimatedMinutes: 25,
    vocabulary: ['trabajar', 'estudiar', 'comer', 'dormir', 'desayunar', 'almorzar', 'cenar', 'leer', 'escribir'],
    phrases: [
      { spanish: 'Me levanto a las siete', english: 'I get up at seven', pronunciation: 'meh leh-VAHN-toh ah lahs see-EH-teh' },
      { spanish: 'Desayuno en casa', english: 'I have breakfast at home', pronunciation: 'deh-sah-YOO-noh ehn KAH-sah' },
      { spanish: 'Trabajo en una oficina', english: 'I work in an office', pronunciation: 'trah-BAH-hoh ehn OO-nah oh-fee-SEE-nah' },
      { spanish: 'Por la noche leo', english: 'At night I read', pronunciation: 'pohr lah NOH-cheh LEH-oh' }
    ],
    exercises: [
      {
        id: 'activities-multiple-choice-1',
        type: 'multiple_choice',
        question: 'What does "desayunar" mean?',
        options: ['To sleep', 'To have breakfast', 'To work', 'To study'],
        correctAnswer: 'To have breakfast',
        explanation: '"Desayunar" means to have breakfast. "Almorzar" is lunch and "cenar" is dinner.'
      }
    ]
  },
  {
    id: 'numbers-time',
    title: 'Numbers & Telling Time',
    description: 'Learn numbers 1-100 and how to tell time in Spanish',
    difficulty: 'beginner',
    category: 'grammar',
    estimatedMinutes: 30,
    vocabulary: ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'diez', 'veinte', 'hora', 'minuto', 'reloj'],
    phrases: [
      { spanish: '¿Qué hora es?', english: 'What time is it?', pronunciation: 'keh OH-rah ehs' },
      { spanish: 'Son las tres', english: 'It\'s three o\'clock', pronunciation: 'sohn lahs trehs' },
      { spanish: 'Es la una', english: 'It\'s one o\'clock', pronunciation: 'ehs lah OO-nah' },
      { spanish: 'A las cinco y media', english: 'At five thirty', pronunciation: 'ah lahs SEEN-koh ee MEH-dee-ah' }
    ],
    exercises: [
      {
        id: 'time-translation-1',
        type: 'translation',
        question: 'How do you ask "What time is it?" in Spanish?',
        correctAnswer: '¿Qué hora es?',
        explanation: 'This is the standard way to ask for the time in Spanish.'
      }
    ]
  },
  {
    id: 'restaurant-ordering',
    title: 'Ordering Food at a Restaurant',
    description: 'Learn how to order food and drinks like a local',
    difficulty: 'intermediate',
    category: 'conversation',
    estimatedMinutes: 25,
    vocabulary: ['restaurante', 'camarero', 'menú', 'plato', 'bebida', 'cuenta', 'propina'],
    phrases: [
      { spanish: '¿Podría ver el menú?', english: 'Could I see the menu?', pronunciation: 'poh-DREE-ah vehr ehl meh-NOO' },
      { spanish: 'Quisiera ordenar', english: 'I would like to order', pronunciation: 'kee-see-EH-rah ohr-deh-NAHR' },
      { spanish: 'La cuenta, por favor', english: 'The check, please', pronunciation: 'lah KWEHN-tah pohr fah-VOHR' },
      { spanish: '¿Qué recomienda?', english: 'What do you recommend?', pronunciation: 'keh reh-koh-mee-EHN-dah' }
    ],
    exercises: [
      {
        id: 'restaurant-multiple-choice-1',
        type: 'multiple_choice',
        question: 'How do you politely ask for the check?',
        options: ['¿Dónde está?', 'La cuenta, por favor', '¿Cuánto cuesta?', 'No gracias'],
        correctAnswer: 'La cuenta, por favor',
        explanation: 'This is the polite way to ask for the check. "Por favor" makes it more courteous.'
      }
    ]
  }
];

export const getLessonById = (id: string): Lesson | undefined => {
  return spanishLessons.find(lesson => lesson.id === id);
};

export const getLessonsByDifficulty = (difficulty: 'beginner' | 'intermediate' | 'advanced'): Lesson[] => {
  return spanishLessons.filter(lesson => lesson.difficulty === difficulty);
};

export const getLessonsByCategory = (category: 'vocabulary' | 'grammar' | 'conversation' | 'culture'): Lesson[] => {
  return spanishLessons.filter(lesson => lesson.category === category);
};
