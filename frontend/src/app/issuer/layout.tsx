export default function IssuerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="theme-dark flex flex-col flex-1 min-h-screen w-full bg-gradient-to-bl from-[#45000a] via-[#150004] to-[#000000] text-parchment font-body antialiased">
      {children}
    </div>
  );
}
