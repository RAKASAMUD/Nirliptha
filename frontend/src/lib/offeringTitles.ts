"use client";

// Fallback generic title if the title cannot be found in local storage or API
const DEFAULT_TITLE = "Private Asset Offering";

// Synchronize titles from the server/API to the local registry
export async function syncOfferingTitles() {
  if (typeof window === "undefined") return;

  try {
    const res = await fetch("/api/titles");
    if (res.ok) {
      const db = await res.json();
      const registryStr = localStorage.getItem("offering_titles_registry");
      let registry: Record<string, string> = {};
      if (registryStr) {
        try {
          registry = JSON.parse(registryStr);
        } catch (_) {}
      }

      let updated = false;
      for (const [address, title] of Object.entries(db)) {
        if (typeof title === "string" && registry[address] !== title) {
          registry[address] = title;
          updated = true;
          // Dispatch event for each updated title so UI updates reactively
          window.dispatchEvent(
            new CustomEvent("offeringTitleUpdated", {
              detail: { address, title },
            })
          );
        }
      }

      if (updated) {
        localStorage.setItem("offering_titles_registry", JSON.stringify(registry));
      }
    }
  } catch (error) {
    console.error("Failed to sync offering titles from server:", error);
  }
}

export function getOfferingTitle(auctionAddress?: string): string {
  if (!auctionAddress) {
    return DEFAULT_TITLE;
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

  // No mock data, just use the default title if not found.
  // The UI should soon receive the title via API sync if it exists.
  return DEFAULT_TITLE;
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

      // Async post to server so it persists across different browsers
      fetch("/api/titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: cleanAddr, title: cleanTitle }),
      }).catch(err => console.error("Failed to sync title to server:", err));

    } catch (e) {
      console.error("Error saving offering title:", e);
    }
  }
}
