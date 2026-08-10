import Image from "next/image";
import UnifiedChat from "./components/UnifiedChat";
import { Synapse } from "./components/Synapse";

export default function Home() {
  return (
    <div className="grain-field flex h-dvh flex-col overflow-hidden bg-[var(--bg)]">
      <header className="relative flex shrink-0 items-center justify-between bg-[var(--bg)]/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo-mark.png"
            alt=""
            width={30}
            height={30}
            className="h-[22px] w-[22px] sm:h-6 sm:w-6"
            priority
          />
          <span className="font-[family-name:var(--font-display)] text-[20px] italic leading-none text-[var(--text)] sm:text-xl">
            Zek<span className="bg-gradient-to-r from-[var(--violet-bright)] to-[var(--coral)] bg-clip-text text-transparent not-italic">AI</span>
          </span>
        </div>
        <Synapse label="çevrimiçi" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
      </header>

      <main className="min-h-0 flex-1">
        <UnifiedChat />
      </main>
    </div>
  );
}
