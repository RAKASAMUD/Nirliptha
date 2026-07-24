import { Hero } from "@/components/Hero";
import { WhySection } from "@/components/WhySection";
import { HowItWorks } from "@/components/HowItWorks";

// Composition only, per PLAN-FE-frontend.md Task 2: "Semua konten statis —
// tidak ada wallet call, tidak ada contract read. Halaman ini harus render
// instan tanpa wallet." Zero 'use client' anywhere in this tree.
export default function Home() {
  return (
    <>
      <Hero />
      <WhySection />
      <HowItWorks />
    </>
  );
}
