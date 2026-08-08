// Sohbet + niyet yönlendirme: Pollinations.ai'nin OpenAI uyumlu ücretsiz metin
// modeli üzerinden. Anahtar gerekmiyor, günlük/aylık bir kota yok — sadece
// anonim kullanımda hafif bir hız sınırı var (~15 sn/istek).

export type ChatMessage = { role: "user" | "assistant"; content: string };

const CHAT_URL = "https://text.pollinations.ai/openai";
const REFERRER = "zekai.app";

const SYSTEM_INSTRUCTION = `Sen ZekAI adında, Türkçe konuşan bir yapay zeka atölyesisin.
Elinde şu yetenekler var: sohbet/soru cevaplama, görsel oluşturma, logo tasarlama,
kullanıcının yüklediği bir fotoğrafı talimatla düzenleme, kod yazma.
Kullanıcı bir görsel, resim, çizim istediğinde generate_image fonksiyonunu çağır.
Kullanıcı bir logo/marka kimliği istediğinde generate_logo fonksiyonunu çağır.
Kullanıcı bir fotoğraf yüklediyse VE onu değiştirmeni istediyse edit_photo fonksiyonunu çağır.
Kullanıcı bir kod, script, fonksiyon, program yazmanı istediğinde write_code fonksiyonunu çağır.
Video veya müzik üretme yeteneğin YOK. Kullanıcı bunu isterse fonksiyon çağırma,
bunun yerine dürüstçe henüz bu özelliğin eklenmediğini söyle ve istersen o sahnenin
durağan bir görselini çizebileceğini teklif et.
Sıradan bir soru veya sohbet mesajında hiçbir fonksiyon çağırma, direkt Türkçe cevap ver.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "generate_image",
      description: "Kullanıcının tarif ettiği bir sahneyi veya görseli sıfırdan oluşturur.",
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
  },
  {
    type: "function",
    function: {
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
  },
  {
    type: "function",
    function: {
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
  },
  {
    type: "function",
    function: {
      name: "write_code",
      description:
        "Kullanıcının istediği kodu, scripti, fonksiyonu veya programı yazar.",
      parameters: {
        type: "object",
        properties: {
          request: {
            type: "string",
            description:
              "Kullanıcının kod isteğinin tam, ayrıntılı tarifi (dil/teknoloji belirtilmişse dahil).",
          },
        },
        required: ["request"],
      },
    },
  },
];

type FunctionCall = { name: string; args: { prompt?: string; request?: string } };

export type RouterResult = {
  text: string | null;
  functionCall: FunctionCall | null;
};

function buildMessages(messages: ChatMessage[], imageDataUrl?: string | null) {
  const chatMessages: Array<Record<string, unknown>> = [
    { role: "system", content: SYSTEM_INSTRUCTION },
  ];

  messages.forEach((m, i) => {
    const isLastUser = i === messages.length - 1 && m.role === "user";
    if (isLastUser && imageDataUrl) {
      chatMessages.push({
        role: "user",
        content: [
          { type: "text", text: m.content },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      });
    } else {
      chatMessages.push({ role: m.role, content: m.content });
    }
  });

  return chatMessages;
}

// Sırayla denenecek modeller — hepsi ücretsiz. İlki başarısız olursa
// (kapasite/geçici sorun), otomatik olarak bir sonrakine düşer.
const MODEL_FALLBACKS = ["kimi", "deepseek", "openai"];

async function callChat(
  messages: ChatMessage[],
  imageDataUrl: string | null | undefined,
  withTools: boolean
) {
  const builtMessages = buildMessages(messages, imageDataUrl);
  let lastErr: unknown;

  for (const model of MODEL_FALLBACKS) {
    const body: Record<string, unknown> = {
      model,
      reasoning_effort: "high",
      referrer: REFERRER,
      messages: builtMessages,
    };
    if (withTools) {
      body.tools = TOOLS;
      body.tool_choice = "auto";
    }

    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45_000),
      });

      if (res.ok) return res.json();

      const errText = await res.text().catch(() => "");
      console.error(`Pollinations chat hatası (${model}):`, res.status, errText.slice(0, 300));
      lastErr =
        res.status === 429
          ? new Error("Model şu an yoğun, birazdan tekrar dene.")
          : new Error("Model yanıt vermedi, birazdan tekrar dene.");
    } catch (e) {
      console.error(`Pollinations isteği başarısız (${model}):`, e);
      lastErr = e;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("Model yanıt vermedi, birazdan tekrar dene.");
}

export async function routeMessage(
  messages: ChatMessage[],
  imageDataUrl?: string | null
): Promise<RouterResult> {
  const data = await callChat(messages, imageDataUrl, true);
  const message = data?.choices?.[0]?.message;

  const toolCall = message?.tool_calls?.[0];
  let functionCall: FunctionCall | null = null;
  if (toolCall?.function?.name) {
    let args: { prompt?: string; request?: string } = {};
    try {
      args = JSON.parse(toolCall.function.arguments || "{}");
    } catch {
      args = {};
    }
    functionCall = { name: toolCall.function.name, args };
  }

  return {
    text: typeof message?.content === "string" ? message.content : null,
    functionCall,
  };
}

export async function simpleReply(messages: ChatMessage[]): Promise<string> {
  const data = await callChat(messages, null, false);
  return data?.choices?.[0]?.message?.content || "Bir yanıt üretilemedi, tekrar dener misin?";
}
