// Russian voices for Мишка Медок & Лиса Алиса (11 Nov 2026). SEPARATE from generate-voice so Pere & Titi's voices are
// never touched. Free: Azure Speech F0 (shares EspaLuz's monthly allowance - ~1,140 turns/month measured 10 Nov).
// Voices can be changed without code via secrets AZURE_MISHKA_VOICE / _PITCH / _RATE and AZURE_LISA_VOICE / _PITCH / _RATE.
// If Azure fails the page falls back to the phone's own Russian voice.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const VOICES: Record<string, { voice: string; pitch: string; rate: string }> = {
  mishka: { voice: Deno.env.get('AZURE_MISHKA_VOICE') ?? 'ru-RU-DmitryNeural',
            pitch: Deno.env.get('AZURE_MISHKA_PITCH') ?? '-8%', rate: Deno.env.get('AZURE_MISHKA_RATE') ?? '-15%' },
  lisa: { voice: Deno.env.get('AZURE_LISA_VOICE') ?? 'ru-RU-DariyaNeural',
          pitch: Deno.env.get('AZURE_LISA_PITCH') ?? '+12%', rate: Deno.env.get('AZURE_LISA_RATE') ?? '+0%' },
};

function b64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const out = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  try {
    const { text, who } = await req.json();
    const v = VOICES[who];
    const key = Deno.env.get('AZURE_SPEECH_KEY');
    if (!v || typeof text !== 'string' || !text.trim() || !key) return out({ error: 'no voice' }, 400);
    const spoken = text.slice(0, 600).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ru-RU'>` +
      `<voice name='${v.voice}'><prosody pitch='${v.pitch}' rate='${v.rate}'>${spoken}</prosody></voice></speak>`;
    const region = Deno.env.get('AZURE_SPEECH_REGION') || 'eastus';
    const r = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'espaluz-voice-ru' },
      body: ssml,
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) {
      console.error(`[voice-ru] azure ${r.status} ${(await r.text()).slice(0, 120)}`);
      return out({ error: 'voice busy' }, 503);
    }
    const audio = b64(new Uint8Array(await r.arrayBuffer()));
    console.log(`[voice-ru] ${who} chars=${spoken.length}`);
    return out({ audioContent: audio, mimeType: 'audio/mpeg', spokenBy: `azure-${who}` });
  } catch (e) {
    console.error('[voice-ru] error', String(e).slice(0, 160));
    return out({ error: 'server' }, 500);
  }
});
