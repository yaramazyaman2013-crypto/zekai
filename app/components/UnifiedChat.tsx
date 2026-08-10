"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-black/40">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--text-dim)]">
          {lang || "kod"}
        </span>
        <button
          onClick={copy}
          className={`tap-feedback font-mono text-[11px] transition-colors ${
            copied ? "check-pop text-[var(--lime)]" : "text-[var(--text-dim)] hover:text-[var(--violet-bright)]"
          }`}
        >
          {copied ? "✓ kopyalandı" : "⧉ kopyala"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-[family-name:var(--font-mono)] text-[13px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  if (!content.includes("```")) {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }
  const parts = content.split(/```(\w*)\n?/);
  // parts alternates: [text, lang, code, text, lang, code, ...]
  const nodes: ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 3 === 0) {
      if (parts[i].trim()) {
        nodes.push(
          <p key={i} className="whitespace-pre-wrap">
            {parts[i].trim()}
          </p>
        );
      }
    } else if (i % 3 === 2) {
      const lang = parts[i - 1];
      nodes.push(<CodeBlock key={i} code={parts[i].replace(/\n$/, "")} lang={lang} />);
    }
  }
  return <>{nodes}</>;
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
  const [effort, setEffort] = useState<"normal" | "ultra">("normal");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const sendRef = useRef<(text: string, viaVoice: boolean) => void>(() => {});
  const abortRef = useRef<AbortController | null>(null);
  const manualStopRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
    const controller = new AbortController();
    abortRef.current = controller;
    const safetyTimeout = setTimeout(() => controller.abort(), 70_000);
    try {
      const res = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: next.map((t) => ({ role: t.role, content: t.content })),
          imageDataUrl: imageForRequest,
          effort,
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
      if ((e as Error)?.name === "AbortError") {
        if (!manualStopRef.current) {
          setError("Yanıt çok uzun sürdü, tekrar dener misin?");
        }
      } else {
        setError(e instanceof Error ? e.message : "Bir şeyler ters gitti.");
      }
    } finally {
      clearTimeout(safetyTimeout);
      manualStopRef.current = false;
      setBusy(false);
      abortRef.current = null;
    }
  }

  useEffect(() => {
    sendRef.current = send;
  });

  function playVoice(text: string, index: number) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setError("Bu tarayıcı sesli okumayı desteklemiyor.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "tr-TR";
    utterance.onend = () => setPlayingIndex(null);
    utterance.onerror = () => setPlayingIndex(null);
    setPlayingIndex(index);
    window.speechSynthesis.speak(utterance);
  }

  function stopResponse() {
    manualStopRef.current = true;
    abortRef.current?.abort();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setBusy(false);
    setPlayingIndex(null);
  }

  const showStop = busy || playingIndex !== null;

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="scrollbar-thin flex-1 overflow-y-auto px-4 pb-3 pt-2 sm:px-6"
      >
        {turns.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-5 pb-24">
            <div className="mark-glow">
              <Image
                src="/logo-mark.png"
                alt="ZekAI"
                width={168}
                height={168}
                priority
                className="mark-breathe h-28 w-28 sm:h-32 sm:w-32"
              />
            </div>
            <p className="font-[family-name:var(--font-display)] text-xl italic text-[var(--text)]">
              Ne yapalım?
            </p>
            <div className="flex flex-wrap justify-center gap-2 px-4">
              {[
                { label: "✏️ Görsel çiz", fill: "Bir görsel çiz: " },
                { label: "🎨 Logo tasarla", fill: "Bir logo tasarla: " },
                { label: "💻 Kod yaz", fill: "Şunu yapan bir kod yaz: " },
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={() => {
                    setInput(s.fill);
                    requestAnimationFrame(() => textareaRef.current?.focus());
                  }}
                  className="tap-feedback rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-[13px] text-[var(--text)] hover:border-[var(--violet)]"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {turns.map((t, i) => (
            <div
              key={i}
              className={`rise-in flex ${t.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {t.role === "assistant" && (
                <span className="synapse-dot mr-2 mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--violet)]" />
              )}
              <div
                className={`max-w-[82%] space-y-2 rounded-[20px] px-4 py-2.5 text-[15px] leading-relaxed ${
                  t.role === "user"
                    ? "rounded-br-md bg-gradient-to-br from-[var(--violet-bright)] to-[var(--violet-deep)] text-white shadow-[0_4px_20px_-4px_rgba(130,102,255,0.55)]"
                    : "rounded-bl-md border border-[var(--border-soft)] bg-[var(--surface-raised)] text-[var(--text)]"
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
                <MessageContent content={t.content} />
                {t.imageUrl && (
                  <div className="glow-in space-y-1.5">
                    <a
                      href={t.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-xl border border-[var(--border)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={t.imageUrl} alt="" className="w-full" />
                    </a>
                    <a
                      href={t.imageUrl}
                      download="zekai-gorsel.png"
                      className="tap-feedback inline-flex items-center gap-1 rounded-full bg-[var(--surface)] px-3 py-1.5 font-mono text-[11px] text-[var(--text)] hover:text-[var(--lime)]"
                    >
                      ⬇ indir
                    </a>
                  </div>
                )}
                {t.role === "assistant" && (
                  <button
                    onClick={() =>
                      playingIndex === i ? stopResponse() : playVoice(t.content, i)
                    }
                    className="tap-feedback -ml-1 flex items-center gap-1 rounded-full px-1.5 py-1 font-mono text-[11px] text-[var(--text-dim)] hover:text-[var(--violet-bright)]"
                  >
                    {playingIndex === i ? (
                      <>
                        <ThinkingDots /> okunuyor · durdur
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
              <span className="synapse-dot mr-2 mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--violet)]" />
              <div className="rounded-[20px] rounded-bl-md border border-[var(--border-soft)] bg-[var(--surface-raised)] px-4 py-3">
                <ThinkingDots />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 sm:px-6">
        <div className="mb-2 flex justify-end">
          <div className="relative inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5">
            <div
              className={`absolute inset-y-0.5 w-[74px] rounded-full transition-transform duration-300 ease-out ${
                effort === "ultra"
                  ? "translate-x-[74px] bg-gradient-to-r from-[var(--violet)] to-[var(--coral)]"
                  : "translate-x-0 bg-[var(--violet)]"
              }`}
            />
            <button
              onClick={() => setEffort("normal")}
              className={`tap-feedback relative w-[74px] rounded-full py-1 font-mono text-[11px] ${
                effort === "normal" ? "text-white" : "text-[var(--text-dim)]"
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setEffort("ultra")}
              className={`tap-feedback relative w-[74px] rounded-full py-1 font-mono text-[11px] ${
                effort === "ultra" ? "text-white" : "text-[var(--text-dim)]"
              }`}
            >
              ⚡ Ultra
            </button>
          </div>
        </div>

        {error && (
          <div className="rise-in mb-2 rounded-xl border-l-2 border-[var(--coral)] bg-[var(--coral-dim)] px-3 py-2 text-[13px] text-[var(--text)]">
            {error}
          </div>
        )}

        {showStop && (
          <div className="mb-2 flex justify-end">
            <button
              onClick={stopResponse}
              className="tap-feedback rounded-full bg-[var(--surface-raised)] px-3 py-1.5 font-mono text-[11px] text-[var(--text)]"
            >
              ■ cevabı durdur
            </button>
          </div>
        )}

        {pendingImage && (
          <div className="rise-in mb-2 flex items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-raised)] px-2.5 py-2">
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
              className="tap-feedback ml-auto flex h-7 w-7 items-center justify-center rounded-full text-[var(--coral)] hover:bg-[var(--coral-dim)]"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 rounded-[26px] border border-[var(--border)] bg-[var(--surface-glass)] p-1.5 shadow-[0_8px_28px_-10px_rgba(0,0,0,0.65)] backdrop-blur-md transition-shadow focus-within:border-[var(--violet)]/50 focus-within:shadow-[0_0_0_3px_var(--violet-dim)]">
          <button
            onClick={() => fileRef.current?.click()}
            aria-label="Fotoğraf ekle"
            className="tap-feedback flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg text-[var(--text-dim)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
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
            ref={textareaRef}
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
              className={`tap-feedback flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base text-white ${
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
            className="tap-feedback flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--violet-bright)] to-[var(--violet-deep)] text-lg font-semibold text-white shadow-[0_2px_10px_-2px_rgba(130,102,255,0.6)] disabled:from-[var(--surface-raised)] disabled:to-[var(--surface-raised)] disabled:text-[var(--text-dim)] disabled:shadow-none"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
