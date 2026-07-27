import { Button } from "./Button";
import { ArrowForwardIcon } from "./icons";

// The "Enter as Issuer" / "Enter as Investor" CTAs — moved out of Hero per
// request, now sitting below HowItWorks instead (page.tsx) so the headline
// area stays focused on the pitch, not the action.
export function CTASection() {
  return (
    <section className="mx-auto max-w-(--container-max-width) px-margin-mobile pb-section-gap md:px-margin-desktop">
      <div className="flex flex-col items-center gap-gutter md:flex-row md:justify-center">
        <Button href="/issuer" variant="primary" icon={<ArrowForwardIcon className="h-[18px] w-[18px]" />}>
          Enter as Issuer
        </Button>
        <Button href="/login-investor" variant="outline">
          Enter as Investor
        </Button>
      </div>
    </section>
  );
}
