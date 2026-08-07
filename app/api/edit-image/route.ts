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

    const { prompt, imageDataUrl } = (await req.json()) as {
      prompt: string;
      imageDataUrl: string;
    };

    if (!imageDataUrl) {
      return NextResponse.json({ error: "Önce bir fotoğraf yükle." }, { status: 400 });
    }
    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: "Ne yapmak istediğini yaz." }, { status: 400 });
    }

    const res = await fetch(
      "https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({
          input: {
            prompt,
            input_image: imageDataUrl,
            output_format: "png",
          },
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Replicate error:", data);
      return NextResponse.json(
        { error: "Fotoğraf düzenlenemedi. API anahtarını ve kotayı kontrol edin." },
        { status: 502 }
      );
    }

    let output = data.output;
    if (Array.isArray(output)) output = output[0];

    if (!output && data.urls?.get) {
      output = await pollForOutput(data.urls.get, token);
    }

    if (!output) {
      return NextResponse.json({ error: "İşlem zaman aşımına uğradı, tekrar dene." }, { status: 504 });
    }

    return NextResponse.json({ imageUrl: output });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Sunucu hatası oluştu." }, { status: 500 });
  }
}

async function pollForOutput(url: string, token: string, attempts = 25): Promise<string | null> {
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
