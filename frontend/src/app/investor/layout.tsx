export default function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="theme-investor-light flex flex-col flex-1 min-h-screen w-full bg-gradient-to-b from-white via-rose-50/60 to-rose-100/50 text-charcoal font-body antialiased">
      {children}
    </div>
  );
}
