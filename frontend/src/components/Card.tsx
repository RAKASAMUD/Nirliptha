import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
  tint?: boolean; // true = bg-surface (elevated card), false = transparent (structural container)
};

// Containers are sharp-edged (0px radius) per DESIGN.md's "Structural vs
// Actionable" shape rule — only Button/StatusPill use pill roundedness.
export function Card({ children, className = "", as = "div", tint = true }: Props) {
  const Tag = as;
  return (
    <Tag
      className={`rounded-[20px] transition-all duration-300 ${
        tint
          ? "bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] hover:bg-white/[0.07] hover:border-white/25 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          : "hairline-border"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
