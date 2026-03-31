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
    <header className="sticky top-0 z-50 border-b-2 border-[#3d2a7a] bg-[#0f0a1f]/90 backdrop-blur-lg supports-[backdrop-filter]:bg-[#0f0a1f]/75">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-1 font-mono text-lg font-bold tracking-tight text-pigeon-green glow-green hover:text-pigeon-green transition-colors"
        >
          pigeongov
          <span className="cursor-blink text-pigeon-green">_</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted hover:text-pigeon-green hover:bg-pigeon-green/10 transition-colors"
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
            className="hidden sm:inline-flex items-center rounded-md border-2 border-pigeon-green/40 bg-gradient-to-r from-pigeon-green/15 to-pigeon-cyan/15 px-4 py-1.5 text-sm font-medium text-pigeon-green hover:from-pigeon-green/25 hover:to-pigeon-cyan/25 hover:border-pigeon-green/60 transition-all"
          >
            Sign in
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden rounded-md p-2 text-muted hover:text-pigeon-green hover:bg-pigeon-green/10 transition-colors"
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
          "md:hidden overflow-hidden transition-all duration-200 ease-in-out border-t-2 border-[#3d2a7a]",
          mobileOpen ? "max-h-80" : "max-h-0 border-t-transparent"
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-3 bg-[#1a1040]/95">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted hover:text-pigeon-green hover:bg-pigeon-green/10 transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          <Link
            href="/sign-in"
            onClick={() => setMobileOpen(false)}
            className="mt-2 flex items-center justify-center rounded-md border-2 border-pigeon-green/40 bg-gradient-to-r from-pigeon-green/15 to-pigeon-cyan/15 px-4 py-2 text-sm font-medium text-pigeon-green hover:from-pigeon-green/25 hover:to-pigeon-cyan/25 transition-all"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
