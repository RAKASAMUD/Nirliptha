import type { ReactNode } from "react";

type Tone = "filled" | "outline" | "muted" | "success";

type Props = {
  children: ReactNode;
  tone?: Tone;
  className?: string;
};

const toneClass: Record<Tone, string> = {
  filled: "bg-oxblood text-white",
  outline: "border border-oxblood/40 text-oxblood",
  muted: "border border-hairline-strong text-muted",
  success: "border border-hairline-strong text-parchment",
};

export function StatusPill({ children, tone = "outline", className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.2em] ${toneClass[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
