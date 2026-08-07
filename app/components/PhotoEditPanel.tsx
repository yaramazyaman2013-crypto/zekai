"use client";

import { useRef, useState } from "react";
import { Synapse } from "./Synapse";

export default function PhotoEditPanel() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(file: File | undefined) {
    if (!file) return;
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function run() {
    if (!imageDataUrl || !prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/edit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, imageDataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bilinmeyen hata");
      setResult(data.imageUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bir şeyler ters gitti.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div
          onClick={() => fileRef.current?.click()}
          className="flex h-40 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] sm:w-40 sm:shrink-0"
        >
          {imageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageDataUrl} alt="yüklenen fotoğraf" className="h-full w-full object-cover" />
          ) : (
            <span className="px-3 text-center text-xs text-[var(--text-dim)]">
              Fotoğraf yüklemek için dokun
            </span>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <label className="font-mono text-xs uppercase tracking-wider text-[var(--text-dim)]">
            ne yapılsın
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Örn: arka planı stüdyo beyazı yap, gökyüzünü gün batımına çevir"
            rows={3}
            className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[15px] outline-none placeholder:text-[var(--text-dim)]"
          />
          <button
            onClick={run}
            disabled={loading || !imageDataUrl || !prompt.trim()}
            className="self-start rounded-xl bg-[var(--violet)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Düzenle
          </button>
        </div>
      </div>

      {loading && <Synapse label="fotoğraf işleniyor" />}
      {error && <p className="text-sm text-[var(--coral)]">{error}</p>}

      {result && (
        <div className="scrollbar-thin flex-1 overflow-y-auto">
          <a href={result} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result}
              alt="düzenlenmiş fotoğraf"
              className="w-full rounded-xl border border-[var(--border)] object-cover"
            />
          </a>
        </div>
      )}
    </div>
  );
}
