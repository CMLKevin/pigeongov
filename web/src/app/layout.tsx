import type { Metadata, Viewport } from "next";
import { Header } from "@/components/header";
import "./globals.css";

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
  themeColor: "#0f0a1f",
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
      className="dark"
    >
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased font-mono">
        <Header />
        <main className="relative z-10 flex-1">{children}</main>
        <footer className="relative z-10 border-t-2 border-[#3d2a7a] py-8 px-6">
          <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
            <p className="font-mono text-xs">
              <span className="text-pigeon-green glow-green">pigeongov</span>{" "}
              <span className="text-pigeon-purple">v0.4.0</span> — local-first, privacy-first
            </p>
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/CMLKevin/pigeongov"
                className="hover:text-pigeon-green transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
              <a
                href="https://www.npmjs.com/package/pigeongov"
                className="hover:text-pigeon-green transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                npm
              </a>
              <a
                href="/privacy"
                className="hover:text-pigeon-green transition-colors"
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
