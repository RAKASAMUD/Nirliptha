"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const STEPS = [
  {
    n: "01",
    title: "Create",
    body: "The issuer opens an auction. Quantity, minimum price, and deadline are public by design.",
  },
  {
    n: "02",
    title: "Bid",
    body: "Investors submit encrypted quantity and price. Deposits lock confidentially.",
  },
  {
    n: "03",
    title: "Compute",
    body: "After the deadline, winners and the clearing price are computed inside a TEE.",
  },
  {
    n: "04",
    title: "Settle",
    body: "Winners claim tokens, losers get refunds. Ownership stays encrypted.",
  },
];

// Copy locked verbatim by PLAN-FE-frontend.md Task 2 ("How It Works", 4 steps).
//
// GSAP scroll-triggered reveal — no ScrollTrigger plugin installed, so a
// plain IntersectionObserver fires the timeline once the grid enters the
// viewport (disconnects after firing, matching WhySection's Framer Motion
// `viewport={{ once: true }}` behavior with a different tool). The
// connector line draws in first (scaleX), then the 4 cards pop in with a
// stagger — deliberately a different animation shape than WhySection's
// plain fade+slide, for variety between the two GSAP/Framer sections.
export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const tl = gsap.timeline();
        tl.to(lineRef.current, { scaleX: 1, duration: 0.8, ease: "power2.out" }, 0);
        tl.fromTo(
          cardRefs.current,
          { opacity: 0, y: 24, scale: 0.94 },
          { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.4)", stagger: 0.12 },
          0.2
        );
      },
      { threshold: 0.2 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="mx-auto max-w-(--container-max-width) px-margin-mobile py-section-gap md:px-margin-desktop"
    >
      <div className="mb-12">
        <span className="mb-4 block font-mono text-xs tracking-widest text-oxblood uppercase">
          (02) Lifecycle
        </span>
        <h2 className="font-display text-3xl text-parchment md:text-4xl">
          Four steps, one transaction each
        </h2>
      </div>
      <div className="relative grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="absolute top-1/2 left-0 -z-10 hidden h-px w-full -translate-y-1/2 bg-oxblood/10 md:block" />
        <div
          ref={lineRef}
          className="absolute top-1/2 left-0 -z-10 hidden h-px w-full origin-left scale-x-0 -translate-y-1/2 bg-oxblood/40 md:block"
        />
        {STEPS.map((step, i) => (
          <div
            key={step.n}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            className="hairline-border flex flex-col gap-6 bg-surface p-8 transition-colors hover:border-oxblood/30"
          >
            <span className="font-mono text-xs text-oxblood/60">{step.n}</span>
            <div>
              <h5 className="mb-4 font-display text-xl text-parchment">{step.title}</h5>
              <p className="font-body text-sm leading-relaxed text-muted">{step.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
