// Pollinations.ai — genuinely free, no API key, no card required.
// Anonymous usage is rate-limited (~1 request/15s) but needs zero payment setup.

const IMAGE_BASE = "https://image.pollinations.ai/prompt";
const UPLOAD_URL = "https://image.pollinations.ai/upload";

function randomSeed() {
  return Math.floor(Math.random() * 1_000_000);
}

async function fetchImageAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(55_000) });
  if (!res.ok) {
    throw new Error("Görsel servisi yanıt vermedi, birazdan tekrar dene.");
  }
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${contentType};base64,${buf.toString("base64")}`;
}

export async function generateImage(
  prompt: string,
  mode: "image" | "logo" = "image"
): Promise<string> {
  const finalPrompt =
    mode === "logo"
      ? `minimal vector logo design, "${prompt}", flat colors, clean geometric shapes, centered composition, plain background, professional branding`
      : prompt;

  const params = new URLSearchParams({
    model: "flux",
    width: mode === "logo" ? "1024" : "1280",
    height: mode === "logo" ? "1024" : "720",
    seed: String(randomSeed()),
    nologo: "true",
  });

  const url = `${IMAGE_BASE}/${encodeURIComponent(finalPrompt)}?${params.toString()}`;

  try {
    return await fetchImageAsDataUrl(url);
  } catch {
    throw new Error("Görsel üretilemedi. Servis şu an yoğun olabilir, biraz sonra tekrar dene.");
  }
}

export async function editPhoto(prompt: string, imageDataUrl: string): Promise<string> {
  const match = imageDataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error("Fotoğraf okunamadı.");
  const mimeType = match[1];
  const buf = Buffer.from(match[2], "base64");

  const form = new FormData();
  form.append("file", new Blob([buf], { type: mimeType }), "input.jpg");

  const uploadRes = await fetch(UPLOAD_URL, { method: "POST", body: form });
  if (!uploadRes.ok) {
    throw new Error("Fotoğraf yüklenemedi, tekrar dener misin?");
  }
  const uploadData = await uploadRes.json();
  const publicUrl: string | undefined = uploadData.ipfs || uploadData.url || uploadData.data;
  if (!publicUrl) throw new Error("Fotoğraf yüklenemedi, tekrar dener misin?");

  const params = new URLSearchParams({
    model: "kontext",
    image: publicUrl,
    width: "1024",
    height: "1024",
    seed: String(randomSeed()),
    nologo: "true",
  });

  const url = `${IMAGE_BASE}/${encodeURIComponent(prompt)}?${params.toString()}`;

  try {
    return await fetchImageAsDataUrl(url);
  } catch {
    throw new Error("Fotoğraf düzenlenemedi. Servis şu an yoğun olabilir, biraz sonra tekrar dene.");
  }
}

export async function textToSpeech(text: string): Promise<ArrayBuffer> {
  const url = `https://text.pollinations.ai/${encodeURIComponent(text)}`;
  const params = new URLSearchParams({ model: "openai-audio", voice: "nova" });
  const res = await fetch(`${url}?${params.toString()}`, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) {
    throw new Error("Ses üretilemedi, birazdan tekrar dene.");
  }
  return res.arrayBuffer();
}
