import type { ReactNode } from "react";

export function SectionLabel({ label, title }: { label: string; title: string }) {
  return (
    <div>
      <p className="text-[12px] text-ash-gray">{label}</p>
      <h2 className="text-heading text-off-black">{title}</h2>
    </div>
  );
}

export function Card({ children, padding = "default" }: { children: ReactNode; padding?: "main" | "default" }) {
  const pad = padding === "main" ? "p-34 md:p-50 lg:p-69" : "p-34 md:p-50";
  return (
    <div className={`rounded-full border-[0.5px] border-black/6 bg-pure-white ${pad}`}>{children}</div>
  );
}

export function Pill({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-fit rounded-3xl bg-[rgba(12,13,15,0.05)] px-22 py-10 text-[13px] font-normal text-pure-black transition-colors duration-150 hover:bg-[rgba(12,13,15,0.09)] disabled:cursor-not-allowed disabled:text-ash-gray"
    >
      {children}
    </button>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full-3 border-[0.5px] border-signal-blue px-10 py-0.5 text-[12px] text-signal-blue">
      {children}
    </span>
  );
}
