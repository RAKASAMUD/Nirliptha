import { GradientBlinds } from "./external/GradientBlinds/GradientBlinds";

// Copy locked verbatim by PLAN-FE-frontend.md Task 2. Both CTAs are
// next/link navigation, no client interactivity of Hero's own needed — the
// only 'use client' in this tree is the vendored GradientBlinds background
// leaf itself (WebGL canvas), same pattern as any other purely-visual
// client leaf (e.g. Countdown.tsx elsewhere).
export function Hero() {
  return (
    <main className="relative flex min-h-[calc(100vh-80px)] flex-col items-center justify-center">
      {/* spotlightRadius=0.5 (as originally set) leaves the shader's spotlight
          falloff going deeply negative outside that radius — since the mouse
          starts centered and dampening was 0 (no chase), the top/edges of
          this tall section fell way outside the lit radius and read as a
          dark "hole". Widened the radius so the glow covers the full section
          instead of just a small halo around the cursor, capped dpr so the
          per-pixel shader isn't repainting at full retina resolution on
          every pointermove (was the main cause of hover lag), and added a
          touch of mouse dampening to smooth the spotlight's chase instead of
          snapping it every single pointer event.

          -top-20 extends this layer up past main's own top edge to cover the
          floating Navbar's ~80px of flow height too (same 80px this
          section's own min-h-[calc(100vh-80px)] already assumes) — without
          it, that strip showed the plain page background instead of the
          gradient, reading as a "hole" at the very top. `overflow-hidden`
          had to come off `<main>` for this negative offset to actually
          render instead of being clipped; GradientBlinds already clips its
          own canvas internally, so nothing was relying on it. */}
      <div className="absolute inset-x-0 -top-20 bottom-0 z-0 opacity-40">
        <GradientBlinds
          gradientColors={["#840016", "#000000"]}
          angle={0}
          noise={0}
          blindCount={20}
          blindMinWidth={10}
          mouseDampening={0.15}
          spotlightRadius={1.5}
          distortAmount={0}
          dpr={1.5}
        />
      </div>
      <section className="relative z-10 mx-auto flex max-w-(--container-max-width) flex-col items-center gap-unit px-margin-mobile text-center md:px-margin-desktop">
        {/* Type mix on the drop-cap glyph ("Words Taken", one big P shared by
            both lines instead of one per line), the rest of "rivate"/"ublic"
            (Plus Jakarta Sans, bold), and "Decisions"/"Confidence" (Copeland)
            — matching the reference image. "Confidence" gets its own
            white-chip callout (oxblood text on white) instead of plain
            body-color text. CTAs moved out of Hero — now live below
            HowItWorks (see page.tsx). */}
        <h1 className="max-w-5xl text-4xl leading-none text-parchment md:text-6xl">
          <div className="flex items-center justify-center gap-2 md:gap-4">
            <span className="font-words-taken text-[1.8em] leading-[0.8] md:text-[2.2em]">P</span>
            <span className="flex flex-col items-start text-left font-body font-bold">
              <span>
                rivate <span className="font-copeland font-normal">Decisions</span>
              </span>
              <span>
                ublic{" "}
                <span className="inline-block bg-white px-3 py-0.5 font-copeland font-normal text-oxblood">
                  Confidence
                </span>
              </span>
            </span>
          </div>
        </h1>
        <p className="mt-8 max-w-[600px] font-body text-lg leading-relaxed text-muted">
          Your bid is encrypted before it leaves your browser. A trusted execution environment
          determines the auction without exposing your offer. Even after settlement, your
          ownership remains confidential.
        </p>
      </section>
    </main>
  );
}
