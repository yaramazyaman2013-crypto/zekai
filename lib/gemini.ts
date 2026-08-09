// Google Gemini — hem sohbet/yönlendirme hem kod yazma burada.
// Gemini'nin METİN modelleri (görsel/müzik değil) gerçekten kalıcı ücretsiz
// bir kotaya sahip: kredi kartı istemiyor, "bakiye" diye bir şey yok, kota
// her gün sıfırlanıyor. Pollinations'ın "Pollen" kredi sistemi (her an
// tükenebilen, kalıcı olmayan bir çözümdü) bu yüzden burada kullanılmıyor.

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type Effort = "normal" | "ultra";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function requireGoogleKey(): string {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error(
      "GOOGLE_API_KEY tanımlı değil. Google AI Studio'dan (aistudio.google.com/apikey) ücretsiz bir anahtar alıp Vercel'e ekle."
    );
  }
  return key;
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
    return "Google'ın günlük ücretsiz kotası doldu, yarın sıfırlanır ya da birazdan tekrar dene.";
  }
  return detail ? `Yanıt alınamadı: ${detail}` : "Yanıt alınamadı, tekrar dener misin?";
}

// ---------- Kod yazma ----------

const CODE_SYSTEM_INSTRUCTION = `Sen usta bir yazılımcısın. Kullanıcının istediği kodu yaz.
Kodu her zaman uygun dil etiketiyle üçlü backtick (\`\`\`dil ... \`\`\`) içinde ver.
Kod bloğundan önce tek cümlelik kısa bir Türkçe açıklama, sonra gerekiyorsa
nasıl çalıştırılacağına dair kısa notlar ekle. Gereksiz uzatma, doğrudan işe yarar kod yaz.`;

export async function generateCode(request: string): Promise<string> {
  const apiKey = requireGoogleKey();
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const res = await fetch(`${API_BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: request }] }],
      systemInstruction: { parts: [{ text: CODE_SYSTEM_INSTRUCTION }] },
      generationConfig: { temperature: 0.3 },
    }),
    signal: AbortSignal.timeout(55_000),
  });

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

// ---------- Sohbet + niyet yönlendirme ----------

const BASE_SYSTEM_INSTRUCTION = `Sen ZekAI adında, Türkçe konuşan bir yapay zeka atölyesisin.
Elinde şu yetenekler var: sohbet/soru cevaplama, görsel oluşturma, logo tasarlama,
kullanıcının yüklediği bir fotoğrafı talimatla düzenleme, kod yazma.
Kullanıcı bir görsel, resim, çizim istediğinde generate_image fonksiyonunu çağır.
Kullanıcı bir logo/marka kimliği istediğinde generate_logo fonksiyonunu çağır.
Kullanıcı bir fotoğraf yüklediyse VE onu değiştirmeni istediyse edit_photo fonksiyonunu çağır.
Kullanıcı bir kod, script, fonksiyon, program yazmanı istediğinde write_code fonksiyonunu çağır.
Gerçek zamanlı internete erişimin YOK — güncel olay/fiyat gibi anlık bilgi
istenirse elindeki en güncel bilgiyle dürüstçe cevap ver, kesin ve anlık
bilgiye erişemediğini belirt, tahmin yürütüp uydurma.
Video veya müzik üretme yeteneğin YOK. Kullanıcı bunu isterse fonksiyon çağırma,
bunun yerine dürüstçe henüz bu özelliğin eklenmediğini söyle ve istersen o sahnenin
durağan bir görselini çizebileceğini teklif et.
Sıradan bir soru veya sohbet mesajında hiçbir fonksiyon çağırma, direkt Türkçe cevap ver.`;

const ULTRA_ADDITION = `

ULTRA MOD AKTİF. Cevap vermeden önce zihninde (kullanıcıya göstermeden) şunları yap:
1) Soruyu/isteği tam olarak ne istendiğini netleştirerek yeniden ifade et.
2) En az iki farklı yaklaşım veya olası cevabı düşün, hangisi daha doğru/isabetli karşılaştır.
3) Olası hataları, eksik varsayımları veya belirsizlikleri kontrol et.
4) En iyi cevabı seç ve sadece SONUCU, gereksiz uzatmadan, net ve öz şekilde yaz.
Bu düşünme adımlarını asla kullanıcıya gösterme, sadece nihai cevabı ver.`;

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "generate_image",
        description: "Kullanıcının tarif ettiği bir sahneyi veya görseli sıfırdan oluşturur.",
        parameters: {
          type: "object",
          properties: {
            prompt: { type: "string", description: "Görselin İngilizce, betimleyici üretim istemi." },
          },
          required: ["prompt"],
        },
      },
      {
        name: "generate_logo",
        description: "Bir marka veya işletme için logo tasarımı üretir.",
        parameters: {
          type: "object",
          properties: {
            prompt: { type: "string", description: "Logonun İngilizce, betimleyici üretim istemi." },
          },
          required: ["prompt"],
        },
      },
      {
        name: "edit_photo",
        description:
          "Kullanıcının bu mesajla birlikte yüklediği fotoğrafı verilen talimata göre düzenler. Sadece bir fotoğraf ekliyse kullan.",
        parameters: {
          type: "object",
          properties: {
            prompt: { type: "string", description: "Fotoğrafta yapılacak değişikliğin İngilizce tarifi." },
          },
          required: ["prompt"],
        },
      },
      {
        name: "write_code",
        description: "Kullanıcının istediği kodu, scripti, fonksiyonu veya programı yazar.",
        parameters: {
          type: "object",
          properties: {
            request: {
              type: "string",
              description: "Kullanıcının kod isteğinin tam, ayrıntılı tarifi (dil/teknoloji dahil).",
            },
          },
          required: ["request"],
        },
      },
    ],
  },
];

type FunctionCall = { name: string; args: { prompt?: string; request?: string } };

export type RouterResult = {
  text: string | null;
  functionCall: FunctionCall | null;
};

function buildContents(
  messages: ChatMessage[],
  imageDataUrl: string | null | undefined
) {
  return messages.map((m, i) => {
    const isLastUser = i === messages.length - 1 && m.role === "user";
    const parts: Record<string, unknown>[] = [{ text: m.content }];
    if (isLastUser && imageDataUrl) {
      const match = imageDataUrl.match(/^data:(.+);base64,(.+)$/);
      if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });
}

export async function routeMessage(
  messages: ChatMessage[],
  imageDataUrl?: string | null,
  effort: Effort = "normal"
): Promise<RouterResult> {
  const apiKey = requireGoogleKey();
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const systemText = BASE_SYSTEM_INSTRUCTION + (effort === "ultra" ? ULTRA_ADDITION : "");

  const res = await fetch(`${API_BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: buildContents(messages, imageDataUrl),
      tools: TOOLS,
      systemInstruction: { parts: [{ text: systemText }] },
      generationConfig: { temperature: effort === "ultra" ? 0.4 : 0.8 },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("Gemini chat error:", res.status, errText.slice(0, 300));
    throw new Error(geminiErrorMessage(res.status, errText));
  }

  const data = await res.json();
  const parts: Array<{ text?: string; functionCall?: FunctionCall }> =
    data?.candidates?.[0]?.content?.parts || [];

  const fnPart = parts.find((p) => p.functionCall);
  const textPart = parts
    .filter((p) => p.text)
    .map((p) => p.text)
    .join("");

  return {
    text: textPart || null,
    functionCall: fnPart?.functionCall || null,
  };
}
