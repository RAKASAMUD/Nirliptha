"use client";

export function getOfferingTitle(auctionAddress?: string): string {
  if (!auctionAddress || typeof window === "undefined") {
    return "Asset Offering";
  }
  try {
    const key = `offering_title_${auctionAddress.toLowerCase()}`;
    const saved = localStorage.getItem(key);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch (e) {
    console.error("Error reading offering title:", e);
  }
  return "Asset Offering";
}

export function saveOfferingTitle(auctionAddress: string, title: string): void {
  if (!auctionAddress || typeof window === "undefined" || !title || !title.trim()) {
    return;
  }
  try {
    const key = `offering_title_${auctionAddress.toLowerCase()}`;
    localStorage.setItem(key, title.trim());
  } catch (e) {
    console.error("Error saving offering title:", e);
  }
}
