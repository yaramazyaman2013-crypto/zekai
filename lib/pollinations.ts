// Pollinations.ai — free, no API key, no card required.
// Anonymous usage is rate-limited (~1 request/15s) but needs zero payment setup.

const IMAGE_BASE = "https://gen.pollinations.ai/image";
const AUDIO_BASE = "https://gen.pollinations.ai/audio";
const REFERRER = "zekai.app";
const LITTERBOX_UPLOAD = "https://litterbox.catbox.moe/resources/internals/api.php";

function randomSeed() {
  return Math.floor(Math.random() * 1_000_000);
}

async function fetchWithRetry(url: string, timeoutMs: number, attempts = 2): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) return res;
      const body = await res.text().catch(() => "");
      console.error(`Pollinations isteği ${res.status} döndü:`, body.slice(0, 300));
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error("Pollinations isteği başarısız:", e);
      lastErr = e;
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1200));
  }
  throw lastErr instanceof Error ? lastErr : new Error("İstek başarısız oldu.");
}

async function fetchImageAsDataUrl(url: string): Promise<string> {
  const res = await fetchWithRetry(url, 55_000);
  const contentType = res.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    const body = await res.text().catch(() => "");
    console.error("Pollinations görsel yerine şu içeriği döndürdü:", body.slice(0, 300));
    throw new Error("Görsel servisi beklenmedik bir yanıt döndürdü.");
  }
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
    referrer: REFERRER,
  });

  const url = `${IMAGE_BASE}/${encodeURIComponent(finalPrompt)}?${params.toString()}`;

  try {
    return await fetchImageAsDataUrl(url);
  } catch {
    throw new Error("Görsel üretilemedi. Servis şu an yoğun olabilir, biraz sonra tekrar dene.");
  }
}

async function uploadForEditing(imageDataUrl: string): Promise<string> {
  const match = imageDataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error("Fotoğraf okunamadı.");
  const mimeType = match[1];
  const ext = mimeType.split("/")[1]?.split("+")[0] || "jpg";
  const buf = Buffer.from(match[2], "base64");

  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("time", "1h");
  form.append("fileToUpload", new Blob([buf], { type: mimeType }), `input.${ext}`);

  const res = await fetch(LITTERBOX_UPLOAD, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  const text = (await res.text()).trim();
  if (!res.ok || !text.startsWith("http")) {
    console.error("Litterbox yükleme hatası:", res.status, text.slice(0, 300));
    throw new Error("Fotoğraf yüklenemedi, tekrar dener misin?");
  }
  return text;
}

export async function editPhoto(prompt: string, imageDataUrl: string): Promise<string> {
  const publicUrl = await uploadForEditing(imageDataUrl);

  const params = new URLSearchParams({
    model: "kontext",
    image: publicUrl,
    width: "1024",
    height: "1024",
    seed: String(randomSeed()),
    nologo: "true",
    referrer: REFERRER,
  });

  const url = `${IMAGE_BASE}/${encodeURIComponent(prompt)}?${params.toString()}`;

  try {
    return await fetchImageAsDataUrl(url);
  } catch {
    throw new Error("Fotoğraf düzenlenemedi. Servis şu an yoğun olabilir, biraz sonra tekrar dene.");
  }
}

export async function textToSpeech(text: string): Promise<ArrayBuffer> {
  const safeText = text.length > 700 ? text.slice(0, 700) + "..." : text;
  const params = new URLSearchParams({
    voice: "nova",
    referrer: REFERRER,
  });
  const url = `${AUDIO_BASE}/${encodeURIComponent(safeText)}?${params.toString()}`;

  const res = await fetchWithRetry(url, 30_000);
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.startsWith("audio/")) {
    const body = await res.text().catch(() => "");
    console.error("Pollinations ses yerine şu içeriği döndürdü:", body.slice(0, 300));
    throw new Error("Ses üretilemedi, birazdan tekrar dene.");
  }
  return res.arrayBuffer();
}
