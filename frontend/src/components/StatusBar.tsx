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
    <div className="relative w-full py-2">
      {/* Background connector line from center of 1st circle to 4th circle */}
      <div className="absolute top-5 left-[12.5%] right-[12.5%] -z-10 h-0.5 bg-hairline-strong/30" />
      
      {/* Animated active progress fill line */}
      <div
        ref={fillRef}
        className="absolute top-5 left-[12.5%] right-[12.5%] -z-10 h-0.5 origin-left scale-x-0 bg-oxblood shadow-[0_0_8px_rgba(132,0,22,0.6)]"
      />
      
      <div className="grid grid-cols-4 w-full">
        {STAGES.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={label} className="flex flex-col items-center gap-3 text-center px-1">
              <div
                ref={(el) => {
                  circleRefs.current[i] = el;
                }}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  done || active
                    ? "border-oxblood bg-oxblood shadow-[0_0_12px_rgba(132,0,22,0.4)]"
                    : "border-hairline-strong bg-surface"
                }`}
              >
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    done || active ? "bg-white" : "bg-hairline-strong/60"
                  }`}
                />
              </div>
              <span
                className={`font-body text-[11px] font-medium tracking-wider uppercase leading-tight ${
                  active ? "text-oxblood font-bold" : done ? "text-parchment font-semibold" : "text-muted/60"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
