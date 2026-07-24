import { IssuerListing } from "@/components/IssuerListing";

// Composition only — "your auctions" listing + create entry point live in
// the IssuerListing client component. A specific auction's dashboard is
// /issuer/[address].
export default function IssuerPage() {
  return (
    <main className="mx-auto max-w-(--container-max-width) px-margin-mobile py-section-gap md:px-margin-desktop">
      <IssuerListing />
    </main>
  );
}
