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
    containerClassName: "flex h-[120px] w-[120px] items-center justify-center p-0",
    imgClassName: "h-[120px] w-[120px] max-h-[120px] object-contain",
  },
  {
    src: "/sepolia.png",
    alt: "Sepolia",
    containerClassName: "flex h-[120px] w-auto items-center justify-center p-0",
    imgClassName: "h-[120px] w-auto max-h-[120px] object-contain",
  },
  {
    src: "/nextjs.jpg",
    alt: "Next.js",
    containerClassName: "flex h-[120px] w-auto items-center justify-center p-0",
    imgClassName: "h-[120px] w-auto max-h-[120px] object-contain rounded-xl",
  },
];

export function TechLoop() {
  return (
    <section className="border-y border-hairline py-8">
      <LogoLoop
        logos={logos}
        speed={60}
        direction="right"
        gap={48}
        logoHeight={120}
        pauseOnHover
        ariaLabel="Built on"
        renderItem={(item) => {
          const custom = item as CustomLogoItem;
          return "src" in custom ? (
            <div className={custom.containerClassName || "flex h-[80px] w-[160px] items-center justify-center rounded-xl p-2"}>
              <img
                src={custom.src}
                alt={custom.alt}
                className={custom.imgClassName || "h-[60px] w-auto object-contain"}
              />
            </div>
          ) : null;
        }}
      />
    </section>
  );
}
