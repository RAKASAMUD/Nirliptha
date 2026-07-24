const GITHUB_URL = "https://github.com/RAKASAMUD/Nirliptha";
const IEXEC_DISCORD_URL = "https://discord.gg/iexec";

// Locked content per PLAN-FE-frontend.md Task 2: single row, "Built for WTF
// Hackathon" + GitHub + iExec Discord. The three Stitch mockups each showed
// a different footer (different link sets, different copyright lines) —
// this is the one canonical version the plan actually specifies.
export function Footer() {
  return (
    <footer className="w-full border-t border-hairline bg-charcoal/80 py-12">
      <div className="mx-auto flex max-w-(--container-max-width) flex-col items-center justify-between gap-gutter px-margin-mobile md:flex-row md:px-margin-desktop">
        <span className="font-body text-sm text-muted">Built for WTF Hackathon</span>
        <div className="flex gap-8">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="font-body text-sm text-muted transition-colors hover:text-parchment"
          >
            GitHub
          </a>
          <a
            href={IEXEC_DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            className="font-body text-sm text-muted transition-colors hover:text-parchment"
          >
            iExec Discord
          </a>
        </div>
      </div>
    </footer>
  );
}
