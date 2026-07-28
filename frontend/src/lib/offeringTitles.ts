"use client";

const PRESET_TITLES = [
  "Qatar World Cup Stadium",
  "Jabodebek LRT Fleet Series A",
  "Bali Solar Farm Infrastructure",
  "Nusantara Toll Road Development Bond",
  "Sumatra Geothermal Power Plant",
];

export function getOfferingTitle(auctionAddress?: string): string {
  if (!auctionAddress) {
    return "Asset Offering";
  }

  const cleanAddr = auctionAddress.toLowerCase();

  if (typeof window !== "undefined") {
    try {
      // 1. Direct key check
      const key = `offering_title_${cleanAddr}`;
      const saved = localStorage.getItem(key);
      if (saved && saved.trim()) {
        return saved.trim();
      }

      // 2. Global registry map check
      const registryStr = localStorage.getItem("offering_titles_registry");
      if (registryStr) {
        const registry = JSON.parse(registryStr);
        if (registry[cleanAddr] && registry[cleanAddr].trim()) {
          return registry[cleanAddr].trim();
        }
      }
    } catch (e) {
      console.error("Error reading offering title:", e);
    }
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
  if (!auctionAddress || !title || !title.trim()) {
    return;
  }
  const cleanAddr = auctionAddress.toLowerCase();
  const cleanTitle = title.trim();

  if (typeof window !== "undefined") {
    try {
      // Save direct key
      const key = `offering_title_${cleanAddr}`;
      localStorage.setItem(key, cleanTitle);

      // Save into global registry map
      let registry: Record<string, string> = {};
      const registryStr = localStorage.getItem("offering_titles_registry");
      if (registryStr) {
        try {
          registry = JSON.parse(registryStr);
        } catch (_) {}
      }
      registry[cleanAddr] = cleanTitle;
      localStorage.setItem("offering_titles_registry", JSON.stringify(registry));

      // Dispatch custom event for real-time reactive updates
      window.dispatchEvent(
        new CustomEvent("offeringTitleUpdated", {
          detail: { address: cleanAddr, title: cleanTitle },
        })
      );
    } catch (e) {
      console.error("Error saving offering title:", e);
    }
  }
}
