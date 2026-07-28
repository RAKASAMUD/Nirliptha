"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const STEPS = [
  {
    n: "01",
    title: "Create",
    body: "Start an auction by setting the asset quantity, reserve price, and closing time.",
  },
  {
    n: "02",
    title: "Bid",
    body: "Choose how much you want to buy and the highest price you're willing to pay. Your bid stays private.",
  },
  {
    n: "03",
    title: "Compute",
    body: "When bidding closes, the final price and winning bids are calculated inside a trusted execution environment.",
  },
  {
    n: "04",
    title: "Settle",
    body: "Winners receive their assets. Everyone else gets an automatic refund.",
  },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const validCards = cardRefs.current.filter((el): el is HTMLDivElement => el !== null);
        if (validCards.length > 0) {
          gsap.fromTo(
            validCards,
            { opacity: 0, x: 40, scale: 0.96 },
            { opacity: 1, x: 0, scale: 1, duration: 0.6, ease: "power3.out", stagger: 0.15 }
          );
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="mx-auto max-w-(--container-max-width) px-margin-mobile py-24 md:px-margin-desktop border-t border-hairline"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* LEFT COLUMN: TITLE & INTRO */}
        <div className="lg:col-span-5 lg:sticky lg:top-28">
          <h2 className="font-display text-4xl text-parchment md:text-5xl leading-tight tracking-tight mb-4">
            Four steps. One confidential auction.
          </h2>
          <p className="font-body text-muted text-sm md:text-base leading-relaxed">
            From creating an auction to claiming your assets, every bid stays private until the auction ends.
          </p>
        </div>

        {/* RIGHT COLUMN: 4 STEP CARDS STACKED VERTICALLY (4 ROWS) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {STEPS.map((step, i) => (
            <div
              key={step.n}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className="hairline-border flex flex-col sm:flex-row items-start sm:items-center gap-6 bg-surface p-6 rounded-2xl transition-all hover:border-oxblood/40 hover:bg-surface/80 shadow-xs"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-oxblood/40 font-copeland text-base font-normal text-white border border-oxblood/50 shadow-xs">
                {step.n}
              </span>
              <div className="flex-1">
                <h3 className="mb-1 font-display text-xl text-parchment font-semibold">{step.title}</h3>
                <p className="font-body text-xs md:text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
