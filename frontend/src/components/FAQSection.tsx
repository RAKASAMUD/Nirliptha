"use client";

import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";

const FAQS = [
  {
    question: "Is this a real RWA issuance platform?",
    answer:
      "Not yet. Nirlipta is a hackathon prototype that demonstrates how confidential primary market auctions can be built using Nox Protocol.",
  },
  {
    question: "Are the assets backed by real-world assets?",
    answer:
      "No. The `cAsset` token used in this demo is a simulated asset created to demonstrate the auction workflow.\n\nIn a production deployment, asset tokens would be issued by authorized institutions representing legally recognized real-world assets.",
  },
  {
    question: "Who can issue assets in production?",
    answer:
      "In a real deployment, only authorized issuers—such as regulated financial institutions, licensed tokenization platforms, or approved asset originators—would be able to issue RWA tokens.\n\nIdentity verification, compliance checks, and regulatory approval would be part of the issuance process.",
  },
  {
    question: "Is cUSD a real stablecoin?",
    answer:
      "No. `cUSD` is a confidential demo token used for testing the auction process.\n\nA production version could integrate with regulated stablecoins or tokenized deposits through wrapping or confidential settlement mechanisms.",
  },
  {
    question: "Why are wallet addresses still public?",
    answer:
      "Nox protects confidential data such as bids, allocations, and balances. Wallet addresses remain standard Ethereum addresses, so full identity anonymity is outside the scope of this prototype.",
  },
  {
    question: "Why is the auction running on Sepolia?",
    answer:
      "Sepolia is used for demonstration and testing purposes. The same architecture can be deployed to Ethereum mainnet or other supported environments.",
  },
  {
    question: "Does this platform replace legal and regulatory requirements?",
    answer:
      "No. Nirlipta focuses on confidential auction infrastructure.\n\nReal-world deployments would still require legal agreements, KYC/AML, issuer authorization, investor eligibility checks, and compliance with local regulations.",
  },
];

export function FAQSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const faqRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const validCards = faqRefs.current.filter((el): el is HTMLDivElement => el !== null);
        if (validCards.length > 0) {
          gsap.fromTo(
            validCards,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.1 }
          );
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      ref={sectionRef}
      className="mx-auto max-w-(--container-max-width) px-margin-mobile py-24 md:px-margin-desktop border-t border-hairline"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* LEFT COLUMN: TITLE */}
        <div className="lg:col-span-5 lg:sticky lg:top-28">
          <h2 className="font-display text-4xl text-parchment md:text-5xl leading-tight tracking-tight mb-4">
            Frequently Asked Questions
          </h2>
          <p className="font-body text-muted text-sm md:text-base leading-relaxed">
            Everything you need to know about the Nirlipta prototype and its production potential.
          </p>
        </div>

        {/* RIGHT COLUMN: FAQ ACCORDION */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i;

            return (
              <div
                key={i}
                ref={(el) => {
                  faqRefs.current[i] = el;
                }}
                className={`hairline-border rounded-2xl overflow-hidden transition-all duration-300 ${
                  isOpen ? "bg-surface/80 border-oxblood/40 shadow-xs" : "bg-surface"
                }`}
              >
                <button
                  onClick={() => toggleFAQ(i)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-oxblood/50 rounded-2xl"
                  aria-expanded={isOpen}
                >
                  <h3 className="font-display text-lg text-parchment font-semibold leading-snug">
                    {faq.question}
                  </h3>
                  <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-oxblood/20 text-oxblood border border-oxblood/30 transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </span>
                </button>
                
                <div
                  className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? "max-h-96 pb-6 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="font-body text-sm md:text-base leading-relaxed text-muted space-y-4">
                    {faq.answer.split("\n\n").map((paragraph, pIdx) => {
                      // Process basic markdown-like syntax for `code`
                      const parts = paragraph.split(/`([^`]+)`/);
                      return (
                        <p key={pIdx}>
                          {parts.map((part, partIdx) => 
                            partIdx % 2 === 1 ? (
                              <code key={partIdx} className="text-rose-300 px-1 py-0.5 rounded bg-rose-500/10 font-mono text-[0.9em]">
                                {part}
                              </code>
                            ) : (
                              part
                            )
                          )}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
