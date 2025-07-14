import type { Request, Response } from "express";
import fetch from "node-fetch";

// Exact text cleaning as provided by user (Python logic ported to JS)
function cleanTextForSpeech(text: string): string {
  text = text.replace(/\*+([^*]+)\*+/g, "$1");
  text = text.replace(/_+([^_]+)_+/g, "$1");
  text = text.replace(/`+([^`]+)`+/g, "$1");
  text = text.replace(/"([^"]+)"/g, "$1");
  text = text.replace(/'([^']+)'/g, "$1");
  text = text.replace(/^\d+\.\s*/gm, "");
  text = text.replace(/\n\d+\.\s*/g, "\n");
  text = text.replace(/[0-9]\uFE0F\u20E3/g, "");
  text = text.replace(/[\#@\[\](){}<>]/g, "");
  text = text.replace(/\s+/g, " ");
  return text.trim();
}

// Split text into chunks of <=200 chars, splitting at sentence boundaries if possible
function chunkText(text: string, maxLen = 200): string[] {
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    let idx = remaining.lastIndexOf('.', maxLen);
    if (idx === -1 || idx < maxLen / 2) idx = maxLen;
    chunks.push(remaining.slice(0, idx + 1).trim());
    remaining = remaining.slice(idx + 1).trim();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

async function fetchTTSChunk(chunk: string): Promise<Uint8Array> {
  const params = new URLSearchParams({
    ie: "UTF-8",
    q: chunk,
    tl: "es",
    client: "tw-ob"
  });
  const response = await fetch(`https://translate.google.com/translate_tts?${params}`, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
      "Accept": "*/*"
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[generate-voice] Google TTS failed for chunk: ${chunk}\n${errorText}`);
    throw new Error(`Google TTS failed: ${errorText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") return res.status(405).end();
  const { text } = req.body;
  if (!text) {
    console.error("[generate-voice] No text provided in request body", req.body);
    return res.status(400).json({ error: "No text provided" });
  }

  const cleaned = cleanTextForSpeech(text);
  console.log(`[generate-voice] Incoming text: ${text}`);
  console.log(`[generate-voice] Cleaned text: ${cleaned}`);
  console.log(`[generate-voice] Cleaned text length: ${cleaned.length}`);

  try {
    // Chunking logic
    const chunks = chunkText(cleaned, 200);
    console.log(`[generate-voice] Number of chunks: ${chunks.length}`);
    const audioBuffers: Uint8Array[] = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`[generate-voice] Fetching TTS for chunk ${i + 1}/${chunks.length}: ${chunks[i]}`);
      const audio = await fetchTTSChunk(chunks[i]);
      audioBuffers.push(audio);
    }
    // Concatenate all audio buffers
    let totalLength = audioBuffers.reduce((sum, arr) => sum + arr.length, 0);
    let combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const buf of audioBuffers) {
      combined.set(buf, offset);
      offset += buf.length;
    }
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", "inline; filename=voice.mp3");
    res.send(Buffer.from(combined));
  } catch (e: any) {
    console.error(`[generate-voice] Exception: ${e.message}`, e);
    res.status(500).json({ error: e.message || "Unknown error" });
  }
} 