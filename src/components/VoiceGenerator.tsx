import React, { useState } from "react";

// Replace with your actual Supabase project ref
const SUPABASE_FUNCTION_URL = "https://euyidvolwqmzijkfrplh.functions.supabase.co/generate-voice";

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

export const VoiceGenerator: React.FC<{ text: string }> = ({ text }) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setAudioUrl(null);

    const cleaned = cleanTextForSpeech(text);

    try {
      const res = await fetch(SUPABASE_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleaned }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.audioUrl) {
        throw new Error(data.error || "Voice generation failed");
      }
      setAudioUrl(data.audioUrl);
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={loading} style={{ marginBottom: 8 }}>
        {loading ? "Generating..." : "Generate Voice"}
      </button>
      {error && <div style={{ color: "red" }}>{error}</div>}
      {audioUrl && (
        <div>
          <audio controls src={audioUrl} />
          <a href={audioUrl} download="voice.mp3" style={{ marginLeft: 8 }}>Download</a>
        </div>
      )}
    </div>
  );
}; 