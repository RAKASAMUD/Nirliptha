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

  useEffect(() => {
    if (typeof window === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>(".why-point-card");

      items.forEach((item, index) => {
        gsap.fromTo(
          item,
          { opacity: 0, y: 60, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: item,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="mx-auto max-w-(--container-max-width) border-y border-black/10 bg-white px-margin-mobile py-section-gap md:px-margin-desktop">
      <div className="mb-12 flex justify-center text-center">
        <h2 className="max-w-2xl font-display text-3xl text-charcoal md:text-4xl">
          Privacy from start to finish
        </h2>
      </div>
      <div className="mb-12 h-px w-full bg-black/10" />

      <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
        {POINTS.map((point) => (
          <div
            key={point.n}
            className="why-point-card flex flex-col gap-4 p-6 rounded-2xl border border-black/5 bg-neutral-50/50 shadow-xs transition-all hover:shadow-md hover:border-oxblood/20"
          >
            <span className="font-mono text-xs font-bold text-oxblood">{point.n}</span>
            <h4 className="font-copeland text-2xl text-charcoal">{point.title}</h4>
            <p className="font-body text-neutral-600 text-sm leading-relaxed">{point.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
