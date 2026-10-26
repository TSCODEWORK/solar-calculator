import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080C15",
};

export const metadata: Metadata = {
  title: "Solar & Storage Payback Engine | Free, Private ROI & LCOE Calculator",
  description:
    "Production-grade interactive solar and battery storage payback calculator with automated weekly EIA electricity rates and NREL PVWatts v8 insolation. 100% private with zero lead-capture.",
  keywords: [
    "solar payback calculator",
    "battery storage roi",
    "nrel pvwatts v8",
    "eia electricity rates",
    "nem 3.0 calculator",
    "levelized cost of energy",
  ],
  authors: [{ name: "Self-Updating Solar Engine" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark`}>
      <body className="min-h-screen bg-[#080C15] text-slate-100 font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-300">
        {children}
      </body>
    </html>
  );
}
