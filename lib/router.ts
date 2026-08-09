// Sohbet + niyet yönlendirme: Pollinations.ai'nin OpenAI uyumlu metin modeli
// üzerinden. Anahtar tamamen ücretsiz (enter.pollinations.ai, kart istemez)
// ama artık zorunlu — Pollinations anonim istekleri kasıtlı reddediyor.

import { requirePollinationsKey } from "./pollinations";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type Effort = "normal" | "ultra";

const CHAT_URL = "https://gen.pollinations.ai/v1/chat/completions";

const BASE_SYSTEM_INSTRUCTION = `Sen ZekAI adında, Türkçe konuşan bir yapay zeka atölyesisin.
Elinde şu yetenekler var: sohbet/soru cevaplama, güncel bilgi için internetten
arama yapabilme, görsel oluşturma, logo tasarlama, kullanıcının yüklediği bir
fotoğrafı talimatla düzenleme, kod yazma.
Kullanıcı bir görsel, resim, çizim istediğinde generate_image fonksiyonunu çağır.
Kullanıcı bir logo/marka kimliği istediğinde generate_logo fonksiyonunu çağır.
Kullanıcı bir fotoğraf yüklediyse VE onu değiştirmeni istediyse edit_photo fonksiyonunu çağır.
Kullanıcı bir kod, script, fonksiyon, program yazmanı istediğinde write_code fonksiyonunu çağır.
Video veya müzik üretme yeteneğin YOK. Kullanıcı bunu isterse fonksiyon çağırma,
bunun yerine dürüstçe henüz bu özelliğin eklenmediğini söyle ve istersen o sahnenin
durağan bir görselini çizebileceğini teklif et.
Sıradan bir soru veya sohbet mesajında hiçbir fonksiyon çağırma, direkt Türkçe cevap ver.`;

// Ultra modda, API'nin kendi "reasoning_effort" parametresine güvenmek yerine
// (bazı modellerde güvensiz/yavaş çıktı) modeli kendi düşünce zinciriyle
// zorluyoruz: sessizce adım adım düşünsün, sonra öz ve isabetli cevap versin.
const ULTRA_ADDITION = `

ULTRA MOD AKTİF. Cevap vermeden önce zihninde (kullanıcıya göstermeden) şunları yap:
1) Soruyu/isteği tam olarak ne istendiğini netleştirerek yeniden ifade et.
2) En az iki farklı yaklaşım veya olası cevabı düşün, hangisi daha doğru/isabetli karşılaştır.
3) Olası hataları, eksik varsayımları veya belirsizlikleri kontrol et.
4) En iyi cevabı seç ve sadece SONUCU, gereksiz uzatmadan, net ve öz şekilde yaz.
Bu düşünme adımlarını asla kullanıcıya gösterme, sadece nihai cevabı ver.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "generate_image",
      description: "Kullanıcının tarif ettiği bir sahneyi veya görseli sıfırdan oluşturur.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Görselin İngilizce, betimleyici üretim istemi (prompt)." },
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
          prompt: { type: "string", description: "Logonun İngilizce, betimleyici üretim istemi (prompt)." },
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
          prompt: { type: "string", description: "Fotoğrafta yapılacak değişikliğin İngilizce tarifi." },
        },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_code",
      description: "Kullanıcının istediği kodu, scripti, fonksiyonu veya programı yazar.",
      parameters: {
        type: "object",
        properties: {
          request: {
            type: "string",
            description: "Kullanıcının kod isteğinin tam, ayrıntılı tarifi (dil/teknoloji belirtilmişse dahil).",
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

// Güncel/anlık bilgi gerektiren sorular için basit bir sezgisel kontrol —
// bu durumda arama yapabilen gemini-fast öne alınır.
const CURRENT_INFO_HINTS = [
  "bugün", "şu an", "şuan", "güncel", "son dakika", "haber", "hava durumu",
  "kaç tl", "kaç dolar", "kur ", "fiyat", "dolar", "euro", "borsa",
  "kim kazandı", "sonuç", "ne zaman", "tarihi ne", "yılında",
];

function needsCurrentInfo(messages: ChatMessage[]): boolean {
  const last = messages[messages.length - 1]?.content?.toLowerCase() || "";
  return CURRENT_INFO_HINTS.some((hint) => last.includes(hint));
}

function buildMessages(
  messages: ChatMessage[],
  imageDataUrl: string | null | undefined,
  systemInstruction: string
) {
  const chatMessages: Array<Record<string, unknown>> = [
    { role: "system", content: systemInstruction },
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

// Normal modda artık akıllı ve ücretsiz Kimi K2.5 öncelikli — daha önce doğru
// adrese gitmediğimiz için "bağlantı mı bozuk" diye şüpheyle sade modelleri
// öne almıştım, artık gerek yok. Güncel bilgi gerekiyorsa arama yapabilen
// gemini-fast öne alınır. Sağlam temel modeller yine de yedek olarak duruyor.
function modelOrder(effort: Effort, currentInfo: boolean): string[] {
  if (effort === "ultra") {
    return currentInfo
      ? ["gemini-fast", "kimi", "deepseek", "openai", "openai-fast"]
      : ["kimi", "deepseek", "gemini-fast", "openai", "openai-fast"];
  }
  return currentInfo
    ? ["gemini-fast", "kimi", "openai", "openai-fast", "mistral"]
    : ["kimi", "openai", "gemini-fast", "openai-fast", "mistral"];
}

// Tüm deneme turunun toplam bütçesi. Vercel'in fonksiyon süresi sınırını aşıp
// isteğin hiç cevapsız takılı kalmaması için sınırlı tutuluyor, ama modellerin
// birbirine geçmesine yetecek kadar geniş.
const GLOBAL_BUDGET_MS = 22_000;

async function callChat(
  messages: ChatMessage[],
  imageDataUrl: string | null | undefined,
  withTools: boolean,
  effort: Effort
) {
  const apiKey = requirePollinationsKey();
  const currentInfo = needsCurrentInfo(messages);
  const systemInstruction =
    BASE_SYSTEM_INSTRUCTION + (effort === "ultra" ? ULTRA_ADDITION : "");
  const builtMessages = buildMessages(messages, imageDataUrl, systemInstruction);
  const models = modelOrder(effort, currentInfo);

  const start = Date.now();
  let lastErr: unknown;

  for (const model of models) {
    const remaining = GLOBAL_BUDGET_MS - (Date.now() - start);
    if (remaining < 1500) break;

    const body: Record<string, unknown> = {
      model,
      messages: builtMessages,
    };
    if (withTools) {
      body.tools = TOOLS;
      body.tool_choice = "auto";
    }

    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(Math.min(remaining, 9000)),
      });

      if (res.ok) return res.json();

      const errText = await res.text().catch(() => "");
      console.error(`Pollinations chat hatası (${model}):`, res.status, errText.slice(0, 300));
      let detail = "";
      try {
        detail = JSON.parse(errText)?.error?.message || JSON.parse(errText)?.message || "";
      } catch {
        detail = errText.slice(0, 150);
      }
      if (res.status === 401) {
        lastErr = new Error(
          `Pollinations API anahtarı geçersiz (${model}). ${detail || "Vercel'deki POLLINATIONS_API_KEY değerini kontrol et."}`
        );
        break;
      }
      if (res.status === 429) {
        lastErr = new Error(`Model şu an yoğun (${model}), birazdan tekrar dene.`);
      } else {
        lastErr = new Error(
          `Model yanıt vermedi (${model}, HTTP ${res.status}): ${detail || "detay yok"}`
        );
      }
    } catch (e) {
      console.error(`Pollinations isteği başarısız (${model}):`, e);
      lastErr =
        e instanceof Error
          ? new Error(`Bağlantı hatası (${model}): ${e.message}`)
          : e;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("Model yanıt vermedi, birazdan tekrar dene.");
}

export async function routeMessage(
  messages: ChatMessage[],
  imageDataUrl?: string | null,
  effort: Effort = "normal"
): Promise<RouterResult> {
  requirePollinationsKey();
  let data;
  try {
    data = await callChat(messages, imageDataUrl, true, effort);
  } catch {
    // Araç çağırma (görsel/kod/logo algılama) tüm modellerde başarısız oldu —
    // son çare olarak sade sohbet modunda dener. Görsel/kod isteği bu turda
    // algılanamaz ama kullanıcı en azından tamamen boş dönmemiş olur.
    data = await callChat(messages, imageDataUrl, false, effort);
  }
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
  const data = await callChat(messages, null, false, "normal");
  return data?.choices?.[0]?.message?.content || "Bir yanıt üretilemedi, tekrar dener misin?";
}
