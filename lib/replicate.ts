const REPLICATE_BASE = "https://api.replicate.com/v1/models";

async function pollForOutput(url: string, token: string, attempts = 25): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.status === "succeeded") {
      return Array.isArray(data.output) ? data.output[0] : data.output;
    }
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(data.error || "Üretim başarısız oldu.");
    }
  }
  return null;
}

export async function generateImage(
  prompt: string,
  mode: "image" | "logo" = "image"
): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN tanımlı değil.");

  const finalPrompt =
    mode === "logo"
      ? `minimal vector logo design, "${prompt}", flat colors, clean geometric shapes, centered composition, plain background, professional branding`
      : prompt;

  const res = await fetch(`${REPLICATE_BASE}/black-forest-labs/flux-schnell/predictions`, {
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
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Replicate error:", data);
    throw new Error(replicateErrorMessage(res.status, data));
  }

  let output = data.output;
  if (Array.isArray(output)) output = output[0];
  if (!output && data.urls?.get) output = await pollForOutput(data.urls.get, token);
  if (!output) throw new Error("Görsel zaman aşımına uğradı, tekrar dene.");
  return output;
}

export async function editPhoto(prompt: string, imageDataUrl: string): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN tanımlı değil.");

  const res = await fetch(`${REPLICATE_BASE}/black-forest-labs/flux-kontext-pro/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    body: JSON.stringify({
      input: { prompt, input_image: imageDataUrl, output_format: "png" },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Replicate error:", data);
    throw new Error(replicateErrorMessage(res.status, data));
  }

  let output = data.output;
  if (Array.isArray(output)) output = output[0];
  if (!output && data.urls?.get) output = await pollForOutput(data.urls.get, token);
  if (!output) throw new Error("İşlem zaman aşımına uğradı, tekrar dene.");
  return output;
}

function replicateErrorMessage(status: number, data: unknown): string {
  const detail =
    typeof data === "object" && data !== null && "detail" in data
      ? String((data as { detail?: unknown }).detail)
      : "";
  if (status === 401) return "Replicate API anahtarı geçersiz.";
  if (status === 402 || /credit|payment|billing/i.test(detail)) {
    return "Replicate hesabında bakiye yok. replicate.com/account/billing üzerinden bakiye eklenmesi gerekiyor.";
  }
  if (status === 429) return "Replicate kotası anlık olarak doldu, birazdan tekrar dene.";
  return "Görsel servisi yanıt vermedi.";
}
