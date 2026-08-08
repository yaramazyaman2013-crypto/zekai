// Sadece kod yazma isteklerinde kullanılıyor. GOOGLE_API_KEY tanımlı değilse
// bu özellik nazikçe devre dışı kalır — uygulamanın geri kalanı (sohbet,
// görsel, logo, fotoğraf düzenleme, ses) Pollinations.ai ile tamamen ücretsiz
// çalışmaya devam eder.

const CODE_SYSTEM_INSTRUCTION = `Sen usta bir yazılımcısın. Kullanıcının istediği kodu yaz.
Kodu her zaman uygun dil etiketiyle üçlü backtick (\`\`\`dil ... \`\`\`) içinde ver.
Kod bloğundan önce tek cümlelik kısa bir Türkçe açıklama, sonra gerekiyorsa
nasıl çalıştırılacağına dair kısa notlar ekle. Gereksiz uzatma, doğrudan işe yarar kod yaz.`;

export async function generateCode(request: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Kod yazma özelliği için Vercel'de GOOGLE_API_KEY tanımlı değil. Google AI Studio'dan ücretsiz bir anahtar alıp ekleyebilirsin."
    );
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: request }] }],
        systemInstruction: { parts: [{ text: CODE_SYSTEM_INSTRUCTION }] },
        generationConfig: { temperature: 0.3 },
      }),
      signal: AbortSignal.timeout(55_000),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("Gemini code error:", res.status, errText.slice(0, 300));
    throw new Error(geminiErrorMessage(res.status, errText));
  }

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text || "")
      .join("") || "";
  if (!text) throw new Error("Kod üretilemedi, tekrar dener misin?");
  return text;
}

function geminiErrorMessage(status: number, body: string): string {
  let detail = "";
  try {
    detail = JSON.parse(body)?.error?.message || "";
  } catch {
    detail = body.slice(0, 200);
  }
  if (status === 400 && /API key not valid/i.test(detail)) {
    return "GOOGLE_API_KEY geçersiz. Vercel'deki değeri kontrol et.";
  }
  if (status === 403) {
    return "GOOGLE_API_KEY'in bu modele erişim izni yok ya da faturalandırma gerekiyor.";
  }
  if (status === 404) {
    return "Model bulunamadı (GEMINI_MODEL yanlış olabilir).";
  }
  if (status === 429) {
    return "Google kotası doldu, birazdan tekrar dene.";
  }
  return detail ? `Kod yazılamadı: ${detail}` : "Kod yazılamadı, tekrar dener misin?";
}
