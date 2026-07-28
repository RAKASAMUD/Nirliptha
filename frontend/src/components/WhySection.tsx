"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const POINTS = [
  {
    n: "01",
    title: "Before settlement",
    body: "Your bid remains hidden—even from the auction operator.",
  },
  {
    n: "02",
    title: "After settlement",
    body: "Your ownership stays confidential instead of becoming public.",
  },
  {
    n: "03",
    title: "Whenever required",
    body: "Provide auditable access on your terms, then revoke it when the review is complete.",
  },
];

export function WhySection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>(".why-point-card");

      // PINNED SCROLLTRIGGER TIMELINE (High-Impact Showcase)
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: triggerRef.current,
          start: "top top",
          end: "+=150%", // User needs to scroll 1.5x screen height to reveal all cards
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      // Initially hide all 3 items with blur & vertical offset
      gsap.set(items, { opacity: 0, y: 140, scale: 0.85, filter: "blur(8px)" });

      // Sequentially animate each card into full view as user scrolls
      items.forEach((item, index) => {
        tl.to(
          item,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
            duration: 1,
            ease: "power3.out",
          },
          index * 0.8
        );
      });
    }, triggerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={triggerRef} className="w-full bg-white border-y border-black/10 overflow-hidden">
      <section ref={containerRef} className="mx-auto max-w-(--container-max-width) px-margin-mobile py-20 md:px-margin-desktop min-h-screen flex flex-col justify-center">
        <div className="mb-12 flex justify-center text-center">
          <div>
            <span className="font-mono text-xs font-bold text-oxblood uppercase tracking-widest block mb-2">
              Privacy Standard
            </span>
            <h2 className="max-w-2xl font-display text-3xl text-charcoal md:text-5xl tracking-tight">
              Privacy from start to finish
            </h2>
          </div>
        </div>

        <div className="mb-14 h-px w-full bg-black/10" />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {POINTS.map((point) => (
            <div
              key={point.n}
              className="why-point-card flex flex-col gap-4 p-8 rounded-3xl border border-black/10 bg-white shadow-sm transition-all hover:shadow-md hover:border-oxblood/30"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-oxblood/10 font-mono text-xs font-bold text-oxblood">
                  {point.n}
                </span>
                <span className="h-2 w-2 rounded-full bg-oxblood animate-pulse" />
              </div>
              <h4 className="font-copeland text-2xl md:text-3xl text-charcoal mt-2">{point.title}</h4>
              <p className="font-body text-neutral-600 text-sm md:text-base leading-relaxed">{point.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
