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
    <Tag className={`hairline-border ${tint ? "bg-surface" : ""} ${className}`}>
      {children}
    </Tag>
  );
}
