"use client";

import { useEffect, useRef, useState } from "react";
import { Synapse } from "./Synapse";

type VoiceTurn = { role: "user" | "assistant"; content: string };

// Minimal shape for the Web Speech API — not in default TS lib.
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

export default function VoicePanel() {
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Unknown until the client checks; avoids an SSR/client mismatch.
  const [supported, setSupported] = useState<boolean | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const turnsRef = useRef<VoiceTurn[]>([]);
  const handleUserSpeechRef = useRef<(text: string) => void>(() => {});

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  useEffect(() => {
    const Impl = getSpeechImpl();
    if (!Impl) {
      const t = setTimeout(() => setSupported(false), 0);
      return () => clearTimeout(t);
    }
    const rec = new Impl();
    rec.lang = "tr-TR";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (event) => {
      const transcript = event.results[event.results.length - 1]?.[0]?.transcript;
      if (transcript) handleUserSpeechRef.current(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    const t = setTimeout(() => setSupported(true), 0);
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

  async function handleUserSpeech(text: string) {
    const next: VoiceTurn[] = [...turnsRef.current, { role: "user", content: text }];
    setTurns(next);
    setBusy(true);
    setError(null);
    try {
      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const chatData = await chatRes.json();
      if (!chatRes.ok) throw new Error(chatData.error || "Bilinmeyen hata");
      const reply: string = chatData.text;
      setTurns([...next, { role: "assistant", content: reply }]);

      const voiceRes = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reply }),
      });
      if (!voiceRes.ok) {
        const errData = await voiceRes.json().catch(() => ({}));
        throw new Error(errData.error || "Ses üretilemedi.");
      }
      const blob = await voiceRes.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        void audioRef.current.play();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bir şeyler ters gitti.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    handleUserSpeechRef.current = handleUserSpeech;
  });

  if (supported === null) {
    return <div className="flex h-full items-center justify-center"><Synapse label="hazırlanıyor" /></div>;
  }

  if (!supported) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[var(--text-dim)]">
        Bu tarayıcı sesli girişi desteklemiyor. Chrome veya Safari&apos;nin güncel sürümünü dene.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="scrollbar-thin flex-1 overflow-y-auto space-y-4 px-1 py-4">
        {turns.length === 0 && (
          <p className="text-center text-sm text-[var(--text-dim)]">
            Mikrofona dokun ve konuşmaya başla.
          </p>
        )}
        {turns.map((t, i) => (
          <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                t.role === "user"
                  ? "bg-[var(--violet)] text-white rounded-br-sm"
                  : "bg-[var(--surface-raised)] border border-[var(--border)] rounded-bl-sm"
              }`}
            >
              {t.content}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="mb-2 text-sm text-[var(--coral)]">{error}</p>}
      {busy && <div className="mb-2"><Synapse label="düşünüyor ve sesleniyor" /></div>}

      <div className="flex flex-col items-center gap-3 border-t border-[var(--border)] pt-4">
        <button
          onClick={toggleListening}
          className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl transition ${
            listening ? "bg-[var(--coral)]" : "bg-[var(--violet)]"
          }`}
          aria-label={listening ? "Dinlemeyi durdur" : "Konuşmaya başla"}
        >
          {listening ? "■" : "●"}
        </button>
        <span className="font-mono text-xs text-[var(--text-dim)]">
          {listening ? "dinliyor..." : "dokun ve konuş"}
        </span>
        <audio ref={audioRef} className="hidden" />
      </div>
    </div>
  );
}
