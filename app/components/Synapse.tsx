export function Synapse({ active = true, label }: { active?: boolean; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs tracking-wide text-[var(--text-dim)]">
      <span className="relative flex h-2.5 w-2.5">
        <span
          className={`absolute inline-flex h-full w-full rounded-full bg-[var(--violet)] ${
            active ? "synapse-dot" : ""
          }`}
        />
      </span>
      {label && <span>{label}</span>}
    </span>
  );
}
