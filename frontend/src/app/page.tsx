import { Hero } from "@/components/Hero";
import { TechLoop } from "@/components/TechLoop";
import { WhySection } from "@/components/WhySection";
import { HowItWorks } from "@/components/HowItWorks";
import { FAQSection } from "@/components/FAQSection";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";

// Composition only, per PLAN-FE-frontend.md Task 2: "Semua konten statis —
// tidak ada wallet call, tidak ada contract read. Halaman ini harus render
// instan tanpa wallet." Footer lives here (not the root layout) — it's
// landing-page-only, not shown on /issuer or /investor. TechLoop was
// previously a static row inside Hero; moved to its own section so the
// GradientBlinds background area stays just the headline. CTASection was
// previously the two buttons inside Hero; moved below HowItWorks.
export default function Home() {
  return (
    <>
      <Hero />
      <TechLoop />
      <WhySection />
      <HowItWorks />
      <CTASection />
      <FAQSection />
      <Footer />
    </>
  );
}
