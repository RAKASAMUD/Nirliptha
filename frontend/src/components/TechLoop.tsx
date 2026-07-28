"use client";

import { LogoLoop, type LogoItem } from "./external/LogoLoop/LogoLoop";

// Uploaded to public/ — real brand logos replacing the plain-text badges.
// No ERC-7984 entry: it's a token standard, not a product with its own
// logo, so it was dropped rather than mixed in as a lone text item among
// real marks.
type CustomLogoItem = LogoItem & {
  containerClassName?: string;
  imgClassName?: string;
};

const logos: CustomLogoItem[] = [
  {
    src: "/Nox.png",
    alt: "Nox Protocol",
    containerClassName: "flex h-30 w-30 items-center justify-center p-1",
    imgClassName: "h-30 w-30 object-contain",
  },
  {
    src: "/safe.png",
    alt: "Gnosis Safe",
    containerClassName: "flex h-20 w-44 items-center justify-center p-3",
    imgClassName: "h-14 w-auto object-contain",
  },
  {
    src: "/sepolia.png",
    alt: "Sepolia",
    containerClassName: "flex h-20 w-40 items-center justify-center p-3",
    imgClassName: "h-16 w-auto object-contain",
  },
];

export function TechLoop() {
  return (
    <section className="border-y border-hairline py-8">
      <LogoLoop
        logos={logos}
        speed={60}
        direction="right"
        gap={32}
        pauseOnHover
        ariaLabel="Built on"
        renderItem={(item) => {
          const custom = item as CustomLogoItem;
          return "src" in custom ? (
            <div className={custom.containerClassName || "flex h-20 w-40 items-center justify-center rounded-xl p-4"}>
              <img
                src={custom.src}
                alt={custom.alt}
                className={custom.imgClassName || "h-20 w-40 object-contain"}
              />
            </div>
          ) : null;
        }}
      />
    </section>
  );
}
