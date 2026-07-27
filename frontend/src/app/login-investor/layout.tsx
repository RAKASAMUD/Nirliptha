// login-investor uses the same investor light theme as /investor.
// The RootThemeWrapper in the root layout handles theme-investor-light
// class detection via the pathname, so no extra layout wrapper needed here.
export default function LoginInvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
