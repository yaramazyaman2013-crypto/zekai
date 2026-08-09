import { NextRequest, NextResponse } from "next/server";
import { routeMessage, generateCode, type ChatMessage, type Effort } from "@/lib/gemini";
import { generateImage, editPhoto } from "@/lib/pollinations";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { messages, imageDataUrl, effort } = (await req.json()) as {
      messages: ChatMessage[];
      imageDataUrl?: string | null;
      effort?: Effort;
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "Mesaj boş olamaz." }, { status: 400 });
    }

    const routed = await routeMessage(messages, imageDataUrl, effort === "ultra" ? "ultra" : "normal");

    if (!routed.functionCall) {
      return NextResponse.json({
        text: routed.text || "Bir yanıt üretilemedi, tekrar dener misin?",
        imageUrl: null,
        kind: "text",
      });
    }

    const { name, args } = routed.functionCall;
    const prompt = args?.prompt || messages[messages.length - 1]?.content || "";

    try {
      if (name === "generate_image") {
        const imageUrl = await generateImage(prompt, "image");
        return NextResponse.json({
          text: routed.text || "İşte istediğin görsel:",
          imageUrl,
          kind: "image",
        });
      }
      if (name === "generate_logo") {
        const imageUrl = await generateImage(prompt, "logo");
        return NextResponse.json({
          text: routed.text || "İşte logo önerin:",
          imageUrl,
          kind: "logo",
        });
      }
      if (name === "edit_photo") {
        if (!imageDataUrl) {
          return NextResponse.json({
            text: "Düzenlemem için önce bir fotoğraf eklemen lazım — ataç ikonuna dokun.",
            imageUrl: null,
            kind: "text",
          });
        }
        const editedUrl = await editPhoto(prompt, imageDataUrl);
        return NextResponse.json({
          text: routed.text || "İşte düzenlenmiş fotoğraf:",
          imageUrl: editedUrl,
          kind: "edit",
        });
      }
      if (name === "write_code") {
        const request = args?.request || prompt;
        const code = await generateCode(request);
        return NextResponse.json({
          text: code,
          imageUrl: null,
          kind: "code",
        });
      }
    } catch (genErr) {
      return NextResponse.json(
        { error: genErr instanceof Error ? genErr.message : "Üretim başarısız oldu." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      text: routed.text || "Anlayamadım, biraz daha açar mısın?",
      imageUrl: null,
      kind: "text",
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Sunucu hatası oluştu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
