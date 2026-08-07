import { NextRequest, NextResponse } from "next/server";
import { textToSpeech } from "@/lib/pollinations";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { text } = (await req.json()) as { text: string };
    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Seslendirilecek metin boş." }, { status: 400 });
    }

    const audioBuffer = await textToSpeech(text);
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Ses üretilemedi.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
