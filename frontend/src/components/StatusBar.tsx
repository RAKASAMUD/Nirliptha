"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const STAGES = ["Awaiting escrow", "Open", "Pending reveal", "Settled"] as const;

type Props = {
  current: 0 | 1 | 2 | 3;
};

// The two Issuer mockups (Open vs Settled state) each shipped a DIFFERENT
// status-bar design (big circles+connector-line vs small dots+fill-bar) for
// the same 4-stage concept. Reconciled into one canonical version — the
// circle+connector design, since it reads more clearly — driven entirely by
// the `current` prop per PLAN-FE-frontend.md Task 4's `{ current: 0|1|2|3 }`
// interface.
//
// GSAP-driven transition whenever `current` changes (auction status moves
// forward): the oxblood fill line animates from wherever it last landed to
// the new progress point (gsap.to() always tweens from the element's
// current rendered state, so no manual bookkeeping of the previous value is
// needed), and the newly active stage's circle "pops" in with a back-out
// ease. Runs on mount too, doubling as an entrance animation.
export function StatusBar({ current }: Props) {
  const fillRef = useRef<HTMLDivElement>(null);
  const circleRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const progress = current / (STAGES.length - 1);
    const tl = gsap.timeline();
    tl.to(fillRef.current, { scaleX: progress, duration: 0.6, ease: "power2.out" }, 0);

    const activeCircle = circleRefs.current[current];
    if (activeCircle) {
      tl.fromTo(
        activeCircle,
        { scale: 0.6 },
        { scale: 1, duration: 0.5, ease: "back.out(1.7)" },
        0.15
      );
    }

    return () => {
      tl.kill();
    };
  }, [current]);

  return (
    <div className="relative flex items-center justify-between">
      <div className="absolute top-5 right-0 left-0 -z-10 h-px bg-hairline" />
      <div
        ref={fillRef}
        className="absolute top-5 left-0 -z-10 h-px w-full origin-left scale-x-0 bg-oxblood"
      />
      {STAGES.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex flex-col items-center gap-4 px-4">
            <div
              ref={(el) => {
                circleRefs.current[i] = el;
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                done || active
                  ? "border-oxblood bg-oxblood"
                  : "border-hairline-strong bg-surface"
              }`}
            >
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  done || active ? "bg-white" : "bg-hairline-strong"
                }`}
              />
            </div>
            <span
              className={`font-body text-xs font-medium tracking-wider uppercase ${
                active ? "text-oxblood font-semibold" : done ? "text-parchment" : "text-muted/50"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
