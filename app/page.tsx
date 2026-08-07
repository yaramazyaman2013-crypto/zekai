import UnifiedChat from "./components/UnifiedChat";
import { Synapse } from "./components/Synapse";

export default function Home() {
  return (
    <div className="grain-field flex h-dvh flex-col bg-[var(--bg)]">
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-8">
        <div className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-xl italic text-[var(--text)] sm:text-2xl">
            Zek<span className="text-[var(--violet)] not-italic">AI</span>
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-widest text-[var(--text-dim)] sm:inline">
            tek pencere, her şey
          </span>
        </div>
        <Synapse label="çevrimiçi" />
      </header>

      <main className="flex min-h-0 flex-1 flex-col p-3 sm:p-8">
        <div className="min-h-0 flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
          <UnifiedChat />
        </div>
      </main>
    </div>
  );
}
