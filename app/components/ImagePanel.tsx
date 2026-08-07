"use client";

import { useState } from "react";
import { Synapse } from "./Synapse";

export default function ImagePanel({ mode }: { mode: "image" | "logo" }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);

  const placeholder =
    mode === "logo"
      ? "Örn: kahve dükkanı için minimal, sıcak tonlarda bir logo"
      : "Örn: yağmurlu bir İstanbul akşamı, neon yansımalar, sinematik";

  async function generate() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bilinmeyen hata");
      setResults((prev) => [data.imageUrl, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bir şeyler ters gitti.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <label className="mb-2 block font-mono text-xs uppercase tracking-wider text-[var(--text-dim)]">
          {mode === "logo" ? "marka fikri" : "sahne açıklaması"}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            rows={2}
            className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[15px] outline-none placeholder:text-[var(--text-dim)]"
          />
          <button
            onClick={generate}
            disabled={loading || !prompt.trim()}
            className="rounded-xl bg-[var(--violet)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {mode === "logo" ? "Logo Üret" : "Görsel Üret"}
          </button>
        </div>
        {loading && <div className="mt-3"><Synapse label="üretiliyor, bu 10-20 saniye sürebilir" /></div>}
        {error && <p className="mt-3 text-sm text-[var(--coral)]">{error}</p>}
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {results.length === 0 && !loading && (
          <div className="flex h-full items-center justify-center text-center text-sm text-[var(--text-dim)]">
            Henüz bir şey üretilmedi.
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {results.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full object-cover transition group-hover:opacity-90" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
