import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// A warm, neutral multilingual ElevenLabs voice (works well for Turkish).
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY tanımlı değil. Vercel ortam değişkenlerini kontrol edin." },
        { status: 500 }
      );
    }

    const { text, voiceId } = (await req.json()) as { text: string; voiceId?: string };
    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Seslendirilecek metin boş." }, { status: 400 });
    }

    const id = voiceId || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.4, similarity_boost: 0.8 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("ElevenLabs error:", errText);
      return NextResponse.json(
        { error: "Ses üretilemedi. API anahtarını ve kotayı kontrol edin." },
        { status: 502 }
      );
    }

    const audioBuffer = await res.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Sunucu hatası oluştu." }, { status: 500 });
  }
}
