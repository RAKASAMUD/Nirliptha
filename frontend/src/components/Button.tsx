import Link from "next/link";
import type { ReactNode, ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "ghost";

type CommonProps = {
  variant?: Variant;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
};

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsLink = CommonProps & {
  href: string;
  disabled?: boolean;
};

type Props = ButtonAsButton | ButtonAsLink;

const variantClass: Record<Variant, string> = {
  primary: "bg-oxblood text-white hover:bg-oxblood-hover",
  outline:
    "border border-hairline-strong text-parchment hover:bg-white/5",
  ghost: "text-parchment hover:bg-white/5",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 font-body text-sm font-medium transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100";

// No directive needed here — this component has no hooks of its own. It's
// safe to render inside a Server subtree when used with `href` (pure
// navigation), and safe inside a Client subtree when the caller passes
// `onClick` (the closure only ever originates from an already-client parent,
// e.g. BidForm / ConfirmModal).
export function Button(props: Props) {
  const { variant = "primary", children, icon, className = "" } = props;
  const classes = `${base} ${variantClass[variant]} ${className}`;

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={classes} aria-disabled={props.disabled}>
        {children}
        {icon}
      </Link>
    );
  }

  const { href: _href, ...buttonProps } = props as ButtonAsButton;
  void _href;
  return (
    <button className={classes} {...buttonProps}>
      {children}
      {icon}
    </button>
  );
}
