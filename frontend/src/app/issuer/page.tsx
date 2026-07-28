import { Suspense } from "react";
import { IssuerListing } from "@/components/IssuerListing";

export default function IssuerPage() {
  return (
    <Suspense>
      <IssuerListing />
    </Suspense>
  );
}
