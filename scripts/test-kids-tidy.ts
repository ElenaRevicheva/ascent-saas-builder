// Run: npx tsx scripts/test-kids-tidy.ts - kids reply tidy + class counter, on the shapes of Alisa's real 5 Nov turns.
import { kidsStripOpener, kidsIsEcho, kidsTidyReply, kidsClassDaysDone, kidsGreetedRecently } from '../supabase/functions/espaluz-chat/kids_tidy.ts';

let bad = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `\n     got  ${JSON.stringify(got)}\n     want ${JSON.stringify(want)}`}`);
};

// Opener removed, sentence kept and capitalised, both languages
eq('entiendo que', kidsStripOpener('Pere [listening]: Entiendo que quieres que la música sea un poquito más fuerte. / I understand that you want the music to be a little louder.'),
  'Pere [listening]: Quieres que la música sea un poquito más fuerte. / You want the music to be a little louder.');
eq('name first', kidsStripOpener('Pere [listening]: Alisa, entiendo que has pintado una unicornio. / Alisa, I understand that you have painted a unicorn.'),
  'Pere [listening]: Has pintado una unicornio. / You have painted a unicorn.');
eq('no opener untouched', kidsStripOpener('Titi [cheer]: ¡Yo también quiero jugar! / I also want to play!'), 'Titi [cheer]: ¡Yo también quiero jugar! / I also want to play!');
eq('no entiendo is a real sentence, kept', kidsStripOpener('Pere [talk]: No entiendo esa palabra. / I do not know that word.'), 'Pere [talk]: No entiendo esa palabra. / I do not know that word.');

// Echo: said back with nothing new
const s1 = 'Estoy escuchando una música, estoy pintando.';
eq('pure echo', kidsIsEcho('Pere [listening]: Estás escuchando una música y estás pintando. / You are listening to music and painting.', s1), false); // "estas" differs: a person change is allowed through to the opener rule
const s2 = 'Mamma, now I get music, but I also get music.';
eq('one-word answer said back whole stays', kidsIsEcho('Pere [talk]: Tu fruta favorita es la fresa. / Your favourite fruit is the strawberry.', 'Starberry'), false);
eq('question never an echo', kidsIsEcho('Titi [silly]: ¿Y qué música escuchas ahora mismo? / What music?', 'qué música escuchas ahora mismo'), false);
const s3 = 'Voy a jugar un poquito más y después voy a cortarme el cabello.';
eq('literal copy is an echo', kidsIsEcho('Pere [listening]: Voy a jugar un poquito más y después voy a cortarme el cabello. / I am going to play.', s3), true);
eq('correction is not an echo', kidsIsEcho('Pere [talk]: Has pintado un unicornio precioso hoy. / You painted a unicorn.', 'He pintado una unicornio. He pintado una unicornio ahora.'), false);

// Whole reply
eq('tidy drops literal echo, keeps the rest', kidsTidyReply('Pere [listening]: Voy a jugar un poquito más y después voy a cortarme el cabello. / I am going to play.\nTiti [silly]: ¡Primero el juego! / Game first!\n¿Cuántos minutos? / How many minutes?', s3),
  'Titi [silly]: ¡Primero el juego! / Game first!\n¿Cuántos minutos? / How many minutes?');
eq('tidy never empties a reply', kidsTidyReply('Pere [listening]: Voy a jugar un poquito más y después voy a cortarme el cabello. / I am going.', s3),
  'Pere [listening]: Voy a jugar un poquito más y después voy a cortarme el cabello. / I am going.');
void s2;

// Counter: her real pattern, 1-5 Nov, 27 start presses
const at = (d: string, h = 15) => Date.parse(`${d}T${String(h).padStart(2, '0')}:00:00Z`);
const start = '¡Hola Pere y Titi! Quiero empezar la clase. / Hello Pere and Titi! I want to start the class.';
const day = (d: string, starts: number, real: number) => [
  ...Array.from({ length: starts }, () => ({ at: at(d), said: start })),
  ...Array.from({ length: real }, () => ({ at: at(d), said: 'Voy a jugar' })),
];
const rows = [...day('2026-11-01', 8, 76), ...day('2026-11-02', 2, 23), ...day('2026-11-03', 5, 34), ...day('2026-11-04', 5, 11), ...day('2026-11-05', 7, 21)];
eq('5 days, 27 presses: 4 finished before today', kidsClassDaysDone(rows, at('2026-11-05', 22)), 4);
eq('next morning: 5', kidsClassDaysDone(rows, at('2026-11-06', 15)), 5);
eq('pressing start alone is no class', kidsClassDaysDone(day('2026-11-02', 9, 0), at('2026-11-05')), 0);
eq('2 real turns is no class', kidsClassDaysDone(day('2026-11-02', 1, 2), at('2026-11-05')), 0);
eq('no number change during the day', kidsClassDaysDone(day('2026-11-05', 1, 50), at('2026-11-05', 22)), 0);
eq('Panama day boundary: 03:00 UTC is yesterday', kidsClassDaysDone(Array.from({ length: 3 }, () => ({ at: at('2026-11-05', 3), said: 'hola' })), at('2026-11-05', 15)), 1);

eq('greeted 2 h ago', kidsGreetedRecently([{ at: at('2026-11-05', 13), said: start }], at('2026-11-05', 15)), true);
eq('greeted yesterday morning: game may return', kidsGreetedRecently([{ at: at('2026-11-04', 15), said: start }], at('2026-11-05', 15)), false);
eq('other talk is no greeting', kidsGreetedRecently([{ at: at('2026-11-05', 13), said: 'hola' }], at('2026-11-05', 15)), false);

console.log(bad ? `\n${bad} FAILED` : '\nall passed');
process.exit(bad ? 1 : 0);
