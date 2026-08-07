"use client";

import { useEffect, useRef, useState } from "react";
import { Synapse } from "./Synapse";

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

export default function UnifiedChat() {
  const [turns, setTurns] = useState<Turn[]>([
    {
      role: "assistant",
      content:
        "Merhaba, ben ZekAI. Yaz ya da mikrofona konuş — görsel, logo, fotoğraf düzenleme ya da sohbet, ne istersen anlayıp yapayım.",
    },
  ]);
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
      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto px-1 py-4 space-y-4">
        {turns.map((t, i) => (
          <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] space-y-2 rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                t.role === "user"
                  ? "bg-[var(--violet)] text-white rounded-br-sm"
                  : "bg-[var(--surface-raised)] border border-[var(--border)] rounded-bl-sm"
              }`}
            >
              {t.attachedImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.attachedImage} alt="" className="max-h-40 rounded-lg object-cover" />
              )}
              <p className="whitespace-pre-wrap">{t.content}</p>
              {t.imageUrl && (
                <a href={t.imageUrl} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.imageUrl}
                    alt=""
                    className="max-w-full rounded-lg border border-[var(--border)]"
                  />
                </a>
              )}
              {t.role === "assistant" && (
                <button
                  onClick={() => playVoice(t.content, i)}
                  className="font-mono text-xs text-[var(--text-dim)] hover:text-[var(--violet)]"
                >
                  {playingIndex === i ? "▶ okunuyor..." : "🔊 seslendir"}
                </button>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2.5">
              <Synapse label="düşünüyor" />
            </div>
          </div>
        )}
      </div>

      {error && <p className="mb-2 text-sm text-[var(--coral)]">{error}</p>}

      {pendingImage && (
        <div className="mb-2 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pendingImage} alt="" className="h-12 w-12 rounded-lg object-cover" />
          <span className="font-mono text-xs text-[var(--text-dim)]">
            fotoğraf eklendi — ne yapılsın?
          </span>
          <button
            onClick={() => setPendingImage(null)}
            className="ml-auto font-mono text-xs text-[var(--coral)]"
          >
            kaldır
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 border-t border-[var(--border)] pt-3">
        <button
          onClick={() => fileRef.current?.click()}
          aria-label="Fotoğraf ekle"
          className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-lg text-[var(--text-dim)]"
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
          placeholder="Yaz: bir görsel, logo, fotoğraf düzenleme iste ya da sohbet et..."
          className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[15px] outline-none placeholder:text-[var(--text-dim)]"
        />
        {speechSupported && (
          <button
            onClick={toggleListening}
            aria-label={listening ? "Dinlemeyi durdur" : "Mikrofonla konuş"}
            className={`shrink-0 rounded-xl px-4 py-3 text-lg text-white ${
              listening ? "bg-[var(--coral)]" : "bg-[var(--surface-raised)] border border-[var(--border)]"
            }`}
          >
            {listening ? "■" : "🎙"}
          </button>
        )}
        <button
          onClick={() => send(input)}
          disabled={busy || !input.trim()}
          className="shrink-0 rounded-xl bg-[var(--violet)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          Gönder
        </button>
      </div>
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
