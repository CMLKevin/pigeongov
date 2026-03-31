"use client";

import Link from "next/link";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarHeart,
  BadgeDollarSign,
  Receipt,
  GraduationCap,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/", label: "Life Events", icon: CalendarHeart },
  { href: "/screen", label: "Benefits", icon: BadgeDollarSign },
  { href: "/workflows/tax/1040", label: "Tax", icon: Receipt },
  { href: "/student-loans", label: "Student Loans", icon: GraduationCap },
] as const;

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-1 font-mono text-lg font-bold tracking-tight text-foreground hover:text-pigeon-purple transition-colors"
        >
          pigeongov
          <span className="cursor-blink text-pigeon-purple">_</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted hover:text-foreground hover:bg-surface transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="hidden sm:inline-flex items-center rounded-md border border-pigeon-purple/40 bg-pigeon-purple/10 px-4 py-1.5 text-sm font-medium text-pigeon-purple hover:bg-pigeon-purple/20 transition-colors"
          >
            Sign in
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden rounded-md p-2 text-muted hover:text-foreground hover:bg-surface transition-colors"
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-200 ease-in-out border-t border-border",
          mobileOpen ? "max-h-80" : "max-h-0 border-t-transparent"
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-3">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-surface transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          <Link
            href="/sign-in"
            onClick={() => setMobileOpen(false)}
            className="mt-2 flex items-center justify-center rounded-md border border-pigeon-purple/40 bg-pigeon-purple/10 px-4 py-2 text-sm font-medium text-pigeon-purple hover:bg-pigeon-purple/20 transition-colors"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
