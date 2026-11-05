import type { ReactNode } from "react";

export function Eyebrow({ children, light }: { children: ReactNode; light?: boolean }) {
  return (
    <p className={`flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] ${light ? "text-gold-soft" : "text-gold"}`}>
      <span className="h-px w-8 bg-gold" />
      {children}
    </p>
  );
}
