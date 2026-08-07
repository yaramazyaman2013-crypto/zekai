export type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_INSTRUCTION = `Sen ZekAI adında, Türkçe konuşan bir yapay zeka atölyesisin.
Elinde şu yetenekler var: sohbet/soru cevaplama, görsel oluşturma, logo tasarlama,
kullanıcının yüklediği bir fotoğrafı talimatla düzenleme.
Kullanıcı bir görsel, resim, çizim istediğinde generate_image fonksiyonunu çağır.
Kullanıcı bir logo/marka kimliği istediğinde generate_logo fonksiyonunu çağır.
Kullanıcı bir fotoğraf yüklediyse VE onu değiştirmeni istediyse edit_photo fonksiyonunu çağır.
Video veya müzik üretme yeteneğin YOK. Kullanıcı bunu isterse fonksiyon çağırma,
bunun yerine dürüstçe henüz bu özelliğin eklenmediğini söyle ve istersen o sahnenin
durağan bir görselini çizebileceğini teklif et.
Sıradan bir soru veya sohbet mesajında hiçbir fonksiyon çağırma, direkt Türkçe cevap ver.`;

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "generate_image",
        description:
          "Kullanıcının tarif ettiği bir sahneyi veya görseli sıfırdan oluşturur.",
        parameters: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "Görselin İngilizce, betimleyici üretim istemi (prompt).",
            },
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
            prompt: {
              type: "string",
              description: "Logonun İngilizce, betimleyici üretim istemi (prompt).",
            },
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
            prompt: {
              type: "string",
              description: "Fotoğrafta yapılacak değişikliğin İngilizce tarifi.",
            },
          },
          required: ["prompt"],
        },
      },
    ],
  },
];

type FunctionCall = { name: string; args: { prompt?: string } };

export type GeminiRouterResult = {
  text: string | null;
  functionCall: FunctionCall | null;
};

export async function routeMessage(
  messages: ChatMessage[],
  imageDataUrl?: string | null
): Promise<GeminiRouterResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY tanımlı değil.");

  const contents = messages.map((m, i) => {
    const isLastUser = i === messages.length - 1 && m.role === "user";
    const parts: Record<string, unknown>[] = [{ text: m.content }];
    if (isLastUser && imageDataUrl) {
      const match = imageDataUrl.match(/^data:(.+);base64,(.+)$/);
      if (match) {
        parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }
    }
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });

  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents,
        tools: imageDataUrl ? TOOLS : [{ functionDeclarations: TOOLS[0].functionDeclarations.slice(0, 2) }],
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        generationConfig: { temperature: 0.7 },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error("Gemini error:", errText);
    throw new Error("Model yanıt vermedi. API anahtarını ve kotayı kontrol et.");
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

export async function simpleReply(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY tanımlı değil.");

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        generationConfig: { temperature: 0.8 },
      }),
    }
  );

  if (!res.ok) throw new Error("Model yanıt vermedi.");
  const data = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") ||
    "Bir yanıt üretilemedi, tekrar dener misin?"
  );
}
