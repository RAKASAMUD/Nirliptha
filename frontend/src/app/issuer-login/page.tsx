import { GlareHover } from "@/components/external/GlareHover/GlareHover";
import { ConnectButton } from "@/components/ConnectButton";

export default function IssuerLoginPage() {
  return (
    <main className="mx-auto flex h-[calc(100vh-96px)] max-w-(--container-max-width) items-center justify-center overflow-hidden px-margin-mobile md:px-margin-desktop">
      <GlareHover
        width="auto"
        height="auto"
        background="var(--color-surface)"
        borderColor="var(--color-hairline-strong)"
        borderRadius="20px"
        glareColor="#ffffff"
        glareOpacity={0.3}
        className="p-12 text-center"
      >
        <div className="flex flex-col items-center gap-8">
          <p className="max-w-xs font-body text-muted">
            Connect your wallet to create and manage confidential auctions.
          </p>
          <ConnectButton />
        </div>
      </GlareHover>
    </main>
  );
}
