import "./globals.css";
import { Header } from "../components/Header";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FreshGate · Real-Time LLM Freshness Gateway",
  description:
    "Open-source Bifrost gateway plugin and Freshness Engine providing Tavily-verified claim freshness, prompt-volatility TTLs, and instant hallucination correction.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-[100dvh] bg-[#09090b] font-sans text-zinc-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
