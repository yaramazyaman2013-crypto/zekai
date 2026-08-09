// Pollinations.ai — sadece görsel, logo ve fotoğraf düzenleme için.
// ÖNEMLİ: Görsel üretimi (Flux/Kontext) resmi olarak "anonim, anahtarsız,
// sınırsız ücretsiz" — sadece hafif bir hız sınırı var (~15sn/istek).
// Bir API anahtarıyla (hesaba bağlı) istek atarsan bu Pollen kredisi
// harcıyor ve hesap bakiyesi biterse çalışmayı durduruyor. O yüzden burada
// BİLEREK anahtar GÖNDERMİYORUZ — anonim kalmak asıl ücretsiz olan yol.

const IMAGE_BASE = "https://gen.pollinations.ai/image";
const LEGACY_IMAGE_BASE = "https://image.pollinations.ai/prompt";
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
      lastErr = new Error(`HTTP ${res.status}: ${body.slice(0, 150) || "detay yok"}`);
    } catch (e) {
      console.error("Pollinations isteği başarısız:", e);
      lastErr = e;
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1500));
  }
  throw lastErr instanceof Error ? lastErr : new Error("İstek başarısız oldu.");
}

// gen.pollinations.ai artık anonim erişimi reddediyor; eski (henüz kapatılmamış)
// image.pollinations.ai anonim ve ücretsiz kalmış olabilir — önce yeniyi,
// olmazsa eskiyi dener.
async function fetchImageWithFallback(
  primaryUrl: string,
  legacyUrl: string
): Promise<Response> {
  try {
    return await fetchWithRetry(primaryUrl, 55_000, 1);
  } catch (primaryErr) {
    console.error("Yeni adres başarısız, eski adres deneniyor:", primaryErr);
    try {
      return await fetchWithRetry(legacyUrl, 55_000, 2);
    } catch (legacyErr) {
      console.error("Eski adres de başarısız:", legacyErr);
      throw legacyErr;
    }
  }
}

async function fetchImageAsDataUrl(primaryUrl: string, legacyUrl: string): Promise<string> {
  const res = await fetchImageWithFallback(primaryUrl, legacyUrl);
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
  });

  const primaryUrl = `${IMAGE_BASE}/${encodeURIComponent(finalPrompt)}?${params.toString()}`;
  const legacyUrl = `${LEGACY_IMAGE_BASE}/${encodeURIComponent(finalPrompt)}?${params.toString()}`;

  try {
    return await fetchImageAsDataUrl(primaryUrl, legacyUrl);
  } catch (e) {
    const detail = e instanceof Error ? e.message : "";
    throw new Error(`Görsel üretilemedi${detail ? ` (${detail})` : ""}.`);
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
  });

  const primaryUrl = `${IMAGE_BASE}/${encodeURIComponent(prompt)}?${params.toString()}`;
  const legacyUrl = `${LEGACY_IMAGE_BASE}/${encodeURIComponent(prompt)}?${params.toString()}`;

  try {
    return await fetchImageAsDataUrl(primaryUrl, legacyUrl);
  } catch (e) {
    const detail = e instanceof Error ? e.message : "";
    throw new Error(`Fotoğraf düzenlenemedi${detail ? ` (${detail})` : ""}.`);
  }
}
