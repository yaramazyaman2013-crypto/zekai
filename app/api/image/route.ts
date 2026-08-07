import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN tanımlı değil. Vercel ortam değişkenlerini kontrol edin." },
        { status: 500 }
      );
    }

    const { prompt, mode } = (await req.json()) as {
      prompt: string;
      mode?: "image" | "logo";
    };

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: "Bir açıklama yazmalısın." }, { status: 400 });
    }

    const finalPrompt =
      mode === "logo"
        ? `minimal vector logo design, "${prompt}", flat colors, clean geometric shapes, centered composition, plain background, professional branding, no text unless specified`
        : prompt;

    const res = await fetch(
      "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({
          input: {
            prompt: finalPrompt,
            aspect_ratio: mode === "logo" ? "1:1" : "16:9",
            output_format: "png",
            num_outputs: 1,
          },
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Replicate error:", data);
      return NextResponse.json(
        { error: "Görsel üretilemedi. API anahtarını ve kotayı kontrol edin." },
        { status: 502 }
      );
    }

    let output = data.output;
    if (Array.isArray(output)) output = output[0];

    if (!output && data.urls?.get) {
      // fell back to async — poll briefly
      output = await pollForOutput(data.urls.get, token);
    }

    if (!output) {
      return NextResponse.json({ error: "Görsel zaman aşımına uğradı, tekrar dene." }, { status: 504 });
    }

    return NextResponse.json({ imageUrl: output });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Sunucu hatası oluştu." }, { status: 500 });
  }
}

async function pollForOutput(url: string, token: string, attempts = 20): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.status === "succeeded") {
      return Array.isArray(data.output) ? data.output[0] : data.output;
    }
    if (data.status === "failed" || data.status === "canceled") return null;
  }
  return null;
}
