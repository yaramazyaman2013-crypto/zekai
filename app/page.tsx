"use client";

import { useState } from "react";
import ChatPanel from "./components/ChatPanel";
import ImagePanel from "./components/ImagePanel";
import PhotoEditPanel from "./components/PhotoEditPanel";
import VoicePanel from "./components/VoicePanel";
import { Synapse } from "./components/Synapse";

type ToolId = "chat" | "image" | "logo" | "edit" | "voice";

const TOOLS: { id: ToolId; label: string; hint: string; icon: string }[] = [
  { id: "chat", label: "Konuş", hint: "metinle sohbet", icon: "◆" },
  { id: "image", label: "Çiz", hint: "görsel üret", icon: "▲" },
  { id: "logo", label: "Marka", hint: "logo tasarla", icon: "●" },
  { id: "edit", label: "Rötuş", hint: "fotoğraf düzenle", icon: "◐" },
  { id: "voice", label: "Dinle", hint: "sesli sohbet", icon: "≈" },
];

export default function Home() {
  const [tool, setTool] = useState<ToolId>("chat");

  return (
    <div className="grain-field flex h-dvh flex-col bg-[var(--bg)] sm:flex-row">
      {/* Desktop rail */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] p-5 sm:flex">
        <Wordmark />
        <nav className="mt-8 flex flex-col gap-1">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                tool === t.id
                  ? "bg-[var(--surface-raised)] text-[var(--text)]"
                  : "text-[var(--text-dim)] hover:text-[var(--text)]"
              }`}
            >
              <span className="font-mono text-[var(--violet)]">{t.icon}</span>
              <span className="flex flex-col">
                <span className="font-medium">{t.label}</span>
                <span className="text-xs text-[var(--text-dim)]">{t.hint}</span>
              </span>
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-6">
          <Synapse label="çevrimiçi" />
        </div>
      </aside>

      {/* Mobile header */}
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:hidden">
        <Wordmark compact />
        <Synapse />
      </header>

      {/* Main canvas */}
      <main className="flex min-h-0 flex-1 flex-col p-4 sm:p-8">
        <div className="mb-4 hidden sm:block">
          <h1 className="font-[family-name:var(--font-display)] text-2xl italic text-[var(--text)]">
            {TOOLS.find((t) => t.id === tool)?.hint}
          </h1>
        </div>
        <div className="min-h-0 flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
          {tool === "chat" && <ChatPanel />}
          {tool === "image" && <ImagePanel mode="image" />}
          {tool === "logo" && <ImagePanel mode="logo" />}
          {tool === "edit" && <PhotoEditPanel />}
          {tool === "voice" && <VoicePanel />}
        </div>
      </main>

      {/* Mobile tab bar */}
      <nav className="grid grid-cols-5 border-t border-[var(--border)] bg-[var(--surface)] sm:hidden">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`flex flex-col items-center gap-1 py-2.5 text-xs ${
              tool === t.id ? "text-[var(--violet)]" : "text-[var(--text-dim)]"
            }`}
          >
            <span className="font-mono text-base">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className={`font-[family-name:var(--font-display)] italic text-[var(--text)] ${
          compact ? "text-xl" : "text-2xl"
        }`}
      >
        Zek<span className="text-[var(--violet)] not-italic">AI</span>
      </span>
      {!compact && (
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)]">
          atölye
        </span>
      )}
    </div>
  );
}
