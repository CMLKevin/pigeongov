import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import { Header } from "@/components/header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PigeonGov — Government paperwork, without the paperwork.",
    template: "%s | PigeonGov",
  },
  description:
    "A delightful tool that turns scary government forms into guided workflows. File taxes, check benefits, plan for life events — privately and for free.",
  metadataBase: new URL("https://pigeongov.vercel.app"),
  openGraph: {
    title: "PigeonGov",
    description: "Government paperwork, without the paperwork.",
    siteName: "PigeonGov",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#6c3aed",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} dark`}
    >
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border py-8 px-6">
          <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
            <p className="font-mono text-xs">
              pigeongov v0.4.0 — local-first, privacy-first
            </p>
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/CMLKevin/pigeongov"
                className="hover:text-foreground transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
              <a
                href="https://www.npmjs.com/package/pigeongov"
                className="hover:text-foreground transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                npm
              </a>
              <a
                href="/privacy"
                className="hover:text-foreground transition-colors"
              >
                Privacy
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
