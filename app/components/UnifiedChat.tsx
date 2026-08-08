"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type Turn = {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string | null;
  attachedImage?: string | null;
};

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: { transcript: string }[][] }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function getSpeechImpl(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="thinking-dot h-1.5 w-1.5 rounded-full bg-[var(--text-dim)]"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

export default function UnifiedChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const sendRef = useRef<(text: string, viaVoice: boolean) => void>(() => {});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const turnsRef = useRef<Turn[]>(turns);

  useEffect(() => {
    turnsRef.current = turns;
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    );
  }, [turns]);

  useEffect(() => {
    const Impl = getSpeechImpl();
    if (!Impl) return;
    const t = setTimeout(() => setSpeechSupported(true), 0);
    const rec = new Impl();
    rec.lang = "tr-TR";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (event) => {
      const transcript = event.results[event.results.length - 1]?.[0]?.transcript;
      if (transcript) sendRef.current(transcript, true);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    return () => clearTimeout(t);
  }, []);

  function toggleListening() {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setError(null);
      recognitionRef.current.start();
      setListening(true);
    }
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function send(text: string, viaVoice = false) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError(null);
    const userTurn: Turn = { role: "user", content: trimmed, attachedImage: pendingImage };
    const next = [...turnsRef.current, userTurn];
    setTurns(next);
    setInput("");
    const imageForRequest = pendingImage;
    setPendingImage(null);
    setBusy(true);
    try {
      const res = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((t) => ({ role: t.role, content: t.content })),
          imageDataUrl: imageForRequest,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bilinmeyen hata");

      const assistantTurn: Turn = {
        role: "assistant",
        content: data.text,
        imageUrl: data.imageUrl,
      };
      const withReply = [...next, assistantTurn];
      setTurns(withReply);

      if (viaVoice) {
        void playVoice(data.text, withReply.length - 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bir şeyler ters gitti.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    sendRef.current = send;
  });

  async function playVoice(text: string, index: number) {
    try {
      setPlayingIndex(index);
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Ses üretilemedi.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.onended = () => setPlayingIndex(null);
        void audioRef.current.play();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ses oynatılamadı.");
      setPlayingIndex(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="scrollbar-thin flex-1 overflow-y-auto px-4 pb-3 pt-2 sm:px-6"
      >
        {turns.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 pb-24">
            <Image
              src="/logo-mark.png"
              alt="ZekAI"
              width={168}
              height={168}
              priority
              className="mark-breathe h-32 w-32 sm:h-36 sm:w-36"
            />
            <p className="font-mono text-xs tracking-wide text-[var(--text-dim)]">
              yaz ya da konuş
            </p>
          </div>
        )}

        <div className="space-y-3">
          {turns.map((t, i) => (
            <div
              key={i}
              className={`rise-in flex ${t.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {t.role === "assistant" && (
                <span className="mr-2 mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--violet)]" />
              )}
              <div
                className={`max-w-[82%] space-y-2 rounded-[20px] px-4 py-2.5 text-[15px] leading-relaxed ${
                  t.role === "user"
                    ? "rounded-br-md bg-[var(--violet)] text-white shadow-[0_4px_16px_-4px_rgba(130,102,255,0.5)]"
                    : "rounded-bl-md bg-[var(--surface-raised)] text-[var(--text)]"
                }`}
              >
                {t.attachedImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.attachedImage}
                    alt=""
                    className="max-h-40 rounded-xl border border-white/10 object-cover"
                  />
                )}
                <p className="whitespace-pre-wrap">{t.content}</p>
                {t.imageUrl && (
                  <a
                    href={t.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-xl border border-[var(--border)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.imageUrl} alt="" className="w-full" />
                  </a>
                )}
                {t.role === "assistant" && (
                  <button
                    onClick={() => playVoice(t.content, i)}
                    className="-ml-1 flex items-center gap-1 rounded-full px-1.5 py-1 font-mono text-[11px] text-[var(--text-dim)] transition-colors hover:text-[var(--violet)]"
                  >
                    {playingIndex === i ? (
                      <>
                        <ThinkingDots /> okunuyor
                      </>
                    ) : (
                      "🔊 seslendir"
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}

          {busy && (
            <div className="rise-in flex justify-start">
              <span className="mr-2 mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--violet)]" />
              <div className="rounded-[20px] rounded-bl-md bg-[var(--surface-raised)] px-4 py-3">
                <ThinkingDots />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 sm:px-6">
        {error && (
          <div className="mb-2 rounded-xl border-l-2 border-[var(--coral)] bg-[var(--coral-dim)] px-3 py-2 text-[13px] text-[var(--text)]">
            {error}
          </div>
        )}

        {pendingImage && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-[var(--surface-raised)] px-2.5 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingImage}
              alt=""
              className="h-10 w-10 rounded-lg object-cover"
            />
            <span className="font-mono text-xs text-[var(--text-dim)]">
              fotoğraf eklendi
            </span>
            <button
              onClick={() => setPendingImage(null)}
              aria-label="Fotoğrafı kaldır"
              className="ml-auto flex h-7 w-7 items-center justify-center rounded-full text-[var(--coral)] transition-colors hover:bg-[var(--coral-dim)]"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]">
          <button
            onClick={() => fileRef.current?.click()}
            aria-label="Fotoğraf ekle"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg text-[var(--text-dim)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
          >
            📎
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Görsel, logo, düzenleme iste ya da sohbet et..."
            className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-tight outline-none placeholder:text-[var(--text-dim)]"
          />
          {speechSupported && (
            <button
              onClick={toggleListening}
              aria-label={listening ? "Dinlemeyi durdur" : "Mikrofonla konuş"}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base text-white transition-colors ${
                listening
                  ? "mic-recording bg-[var(--coral)]"
                  : "bg-[var(--surface-raised)] text-[var(--text-dim)] hover:text-[var(--text)]"
              }`}
            >
              {listening ? "■" : "🎙"}
            </button>
          )}
          <button
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
            aria-label="Gönder"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--violet)] text-lg font-semibold text-white transition-opacity disabled:opacity-30"
          >
            ↑
          </button>
        </div>
      </div>
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
