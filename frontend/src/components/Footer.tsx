export function Footer() {
  return (
    <footer className="w-full border-t border-hairline bg-charcoal py-8">
      <div className="mx-auto flex max-w-(--container-max-width) items-center justify-center px-margin-mobile md:px-margin-desktop">
        <span className="font-body text-xs text-muted/75 tracking-wider">
          © {new Date().getFullYear()} Nirliptha. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
