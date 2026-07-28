"use client";

const PRESET_TITLES = [
  "Stadion Qatar World Cup 2026",
  "LRT Jabodebek Fleet Series A",
  "Bali Solar Farm Infrastructure",
  "Nusantara Toll Road Development Bond",
  "Sumatra Geothermal Power Plant",
];

export function getOfferingTitle(auctionAddress?: string): string {
  if (!auctionAddress || typeof window === "undefined") {
    return "Asset Offering";
  }

  const cleanAddr = auctionAddress.toLowerCase();

  try {
    const key = `offering_title_${cleanAddr}`;
    const saved = localStorage.getItem(key);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch (e) {
    console.error("Error reading offering title:", e);
  }

  // Deterministic fallback based on address hash so every auction has a distinct title
  let charSum = 0;
  for (let i = 0; i < cleanAddr.length; i++) {
    charSum += cleanAddr.charCodeAt(i);
  }
  const index = charSum % PRESET_TITLES.length;
  return PRESET_TITLES[index];
}

export function saveOfferingTitle(auctionAddress: string, title: string): void {
  if (!auctionAddress || typeof window === "undefined" || !title || !title.trim()) {
    return;
  }
  try {
    const key = `offering_title_${auctionAddress.toLowerCase()}`;
    localStorage.setItem(key, title.trim());
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("offeringTitleUpdated", {
          detail: { address: auctionAddress.toLowerCase(), title: title.trim() },
        })
      );
    }
  } catch (e) {
    console.error("Error saving offering title:", e);
  }
}
