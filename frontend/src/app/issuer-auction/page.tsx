import { IssuerListing } from "@/components/IssuerListing";

export default function IssuerAuctionPage() {
  return (
    <main className="mx-auto max-w-(--container-max-width) px-margin-mobile py-section-gap md:px-margin-desktop">
      <IssuerListing />
    </main>
  );
}
