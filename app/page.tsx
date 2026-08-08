import Image from "next/image";
import UnifiedChat from "./components/UnifiedChat";
import { Synapse } from "./components/Synapse";

export default function Home() {
  return (
    <div className="grain-field flex h-dvh flex-col overflow-hidden bg-[var(--bg)]">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/90 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="flex items-center gap-2">
          <Image
            src="/logo-mark.png"
            alt=""
            width={30}
            height={30}
            className="h-[22px] w-[22px] sm:h-6 sm:w-6"
            priority
          />
          <span className="font-[family-name:var(--font-display)] text-[19px] italic leading-none text-[var(--text)] sm:text-xl">
            Zek<span className="text-[var(--violet)] not-italic">AI</span>
          </span>
        </div>
        <Synapse label="çevrimiçi" />
      </header>

      <main className="min-h-0 flex-1">
        <UnifiedChat />
      </main>
    </div>
  );
}
