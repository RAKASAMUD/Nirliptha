"use client";

import { LogoLoop, type LogoItem } from "./external/LogoLoop/LogoLoop";

// Uploaded to public/ — real brand logos replacing the plain-text badges.
// No ERC-7984 entry: it's a token standard, not a product with its own
// logo, so it was dropped rather than mixed in as a lone text item among
// real marks.
const logos: LogoItem[] = [
  { src: "/Nox.png", alt: "Nox Protocol" },
  { src: "/safe.png", alt: "Gnosis Safe" },
  { src: "/sepolia.png", alt: "Sepolia" },
];

// Was a static wrapped row inside Hero — moved to its own section (per the
// user's request to keep it out of the Hero/GradientBlinds area) and
// replaced with a looping marquee via the vendored LogoLoop. 'use client'
// here isn't about hooks (this component has none) — it's because
// `renderItem` below is a function prop being passed into LogoLoop (a
// Client Component), and functions can't cross the Server->Client boundary
// undeclared.
//
// Custom renderItem instead of LogoLoop's default `<img>` handling: the
// three uploaded logos vary wildly in native size/aspect ratio (Nox is a
// square badge, Gnosis Safe is a wide wordmark, Sepolia is a tall mascot)
// AND the Gnosis Safe mark is plain black with a transparent background —
// invisible against the page's dark charcoal. A fixed white card per logo
// (object-contain inside) fixes both: every mark gets the same footprint
// ("proporsional satu sama lain"), and the white background gives the
// black Safe logo contrast. Sepolia's own built-in tilt is part of its
// actual artwork, left untouched.
export function TechLoop() {
  return (
    <section className="border-y border-hairline py-8">
      <LogoLoop
        logos={logos}
        speed={40}
        direction="left"
        gap={32}
        fadeOut
        fadeOutColor="#000000"
        pauseOnHover
        ariaLabel="Built on"
        renderItem={(item) =>
          "src" in item ? (
            <div className="flex h-20 w-40 items-center justify-center rounded-xl bg-white p-4">
              <img src={item.src} alt={item.alt} className="h-full w-full object-contain" />
            </div>
          ) : null
        }
      />
    </section>
  );
}
