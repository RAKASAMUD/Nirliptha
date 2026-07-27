"use client";

import { motion } from "framer-motion";

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

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

// 'use client' — whileInView + the stagger timeline need the browser.
// staggerChildren=1 (1s between each card) per request; each card's title
// (the "penekanan" word — Before/After settlement, Whenever required) is
// set in Copeland, same emphasis-font pattern as Hero's "Decisions"/
// "Confidence", contrasted against the plain-body-font description below it.
//
// This section inverts the site's usual dark theme (white background, dark
// text) as a deliberate contrast break — --color-muted is white globally
// (design decision made earlier), so body copy here needs an explicit dark
// gray instead of the shared token, and the hairline divider/border needs a
// dark variant too (the global --color-hairline tokens are tuned for light
// text on dark backgrounds and are nearly invisible on white).
export function WhySection() {
  return (
    <section className="mx-auto max-w-(--container-max-width) border-y border-black/10 bg-white px-margin-mobile py-section-gap md:px-margin-desktop">
      <div className="mb-12 flex justify-center text-center">
        <h2 className="max-w-2xl font-display text-3xl text-charcoal md:text-4xl">
          Privacy from start to finish
        </h2>
      </div>
      <div className="mb-12 h-px w-full bg-black/10" />
      <motion.div
        className="grid grid-cols-1 gap-12 md:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        {POINTS.map((point) => (
          <motion.div key={point.n} variants={itemVariants} className="flex flex-col gap-4">
            <span className="font-mono text-xs font-medium text-oxblood/60">{point.n}</span>
            <h4 className="font-copeland text-2xl text-charcoal">{point.title}</h4>
            <p className="font-body text-neutral-600">{point.body}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
