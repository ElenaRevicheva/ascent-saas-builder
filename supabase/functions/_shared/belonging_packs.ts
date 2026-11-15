// 15 Nov 2026: the 21 checked country guides in one map, for functions that need them by country key (submit-progress).
// espaluz-chat keeps its own imports of the same files. One file per country - edit the JSON, never here.
import argentinaPack from './belonging/argentina.json' with { type: 'json' };
import boliviaPack from './belonging/bolivia.json' with { type: 'json' };
import chilePack from './belonging/chile.json' with { type: 'json' };
import colombiaPack from './belonging/colombia.json' with { type: 'json' };
import costaRicaPack from './belonging/costa_rica.json' with { type: 'json' };
import cubaPack from './belonging/cuba.json' with { type: 'json' };
import dominicanRepublicPack from './belonging/dominican_republic.json' with { type: 'json' };
import ecuadorPack from './belonging/ecuador.json' with { type: 'json' };
import elSalvadorPack from './belonging/el_salvador.json' with { type: 'json' };
import equatorialGuineaPack from './belonging/equatorial_guinea.json' with { type: 'json' };
import guatemalaPack from './belonging/guatemala.json' with { type: 'json' };
import hondurasPack from './belonging/honduras.json' with { type: 'json' };
import mexicoPack from './belonging/mexico.json' with { type: 'json' };
import nicaraguaPack from './belonging/nicaragua.json' with { type: 'json' };
import panamaPack from './belonging/panama.json' with { type: 'json' };
import paraguayPack from './belonging/paraguay.json' with { type: 'json' };
import peruPack from './belonging/peru.json' with { type: 'json' };
import puertoRicoPack from './belonging/puerto_rico.json' with { type: 'json' };
import spainPack from './belonging/spain.json' with { type: 'json' };
import uruguayPack from './belonging/uruguay.json' with { type: 'json' };
import venezuelaPack from './belonging/venezuela.json' with { type: 'json' };

// deno-lint-ignore no-explicit-any
export const BELONGING: Record<string, any> = {
  argentina: argentinaPack,
  bolivia: boliviaPack,
  chile: chilePack,
  colombia: colombiaPack,
  costa_rica: costaRicaPack,
  cuba: cubaPack,
  dominican_republic: dominicanRepublicPack,
  ecuador: ecuadorPack,
  el_salvador: elSalvadorPack,
  equatorial_guinea: equatorialGuineaPack,
  guatemala: guatemalaPack,
  honduras: hondurasPack,
  mexico: mexicoPack,
  nicaragua: nicaraguaPack,
  panama: panamaPack,
  paraguay: paraguayPack,
  peru: peruPack,
  puerto_rico: puertoRicoPack,
  spain: spainPack,
  uruguay: uruguayPack,
  venezuela: venezuelaPack,
};
