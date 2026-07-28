import type { Metadata } from "next";
import { Instrument_Serif, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Navbar } from "@/components/Navbar";
import { Providers } from "@/components/Providers";
import { RootThemeWrapper } from "@/components/RootThemeWrapper";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const wordsTaken = localFont({
  src: "../../public/fonts/WordsTakenDemo.ttf",
  variable: "--font-words-taken",
  weight: "400",
  style: "normal",
});

const copeland = localFont({
  src: "../../public/fonts/Copeland.otf",
  variable: "--font-copeland",
  weight: "400",
  style: "normal",
});

export const metadata: Metadata = {
  title: "Nirliptha",
  description:
    "Confidential sealed-bid, uniform-price auction for RWA primary issuance on Nox Protocol.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} ${wordsTaken.variable} ${copeland.variable} min-h-screen antialiased`}
    >
      <body className="flex min-h-screen flex-col w-full">
        <Providers>
          <RootThemeWrapper>
            <Navbar />
            <div className="flex flex-col flex-1 w-full">{children}</div>
          </RootThemeWrapper>
        </Providers>
      </body>
    </html>
  );
}
