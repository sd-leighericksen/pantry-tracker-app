"use client";

import Link from "next/link";
import {
  Barcode,
  HandTap,
  Stack,
  ShoppingCart,
  ChartBar,
  Gear,
  type Icon,
} from "@phosphor-icons/react";

/* Persistent bottom navigation across every authed surface. Four destinations,
 * large touch targets, no hover dependence (DESIGN.md kiosk constraints). */

type Tab = {
  href: string;
  label: string;
  icon: Icon;
  isActive: (path: string) => boolean;
};

const TABS: Tab[] = [
  { href: "/kiosk", label: "Scan", icon: Barcode, isActive: (p) => p === "/kiosk" },
  { href: "/kiosk/use", label: "Use", icon: HandTap, isActive: (p) => p === "/kiosk/use" },
  {
    href: "/inventory",
    label: "Inventory",
    icon: Stack,
    isActive: (p) => p === "/inventory" || p.startsWith("/items"),
  },
  {
    href: "/shopping",
    label: "Shopping",
    icon: ShoppingCart,
    isActive: (p) => p.startsWith("/shopping"),
  },
  {
    href: "/reports",
    label: "Reports",
    icon: ChartBar,
    isActive: (p) => p.startsWith("/reports"),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Gear,
    isActive: (p) => p.startsWith("/settings"),
  },
];

export function AppNav({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface-card pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-[680px] items-stretch">
        {TABS.map((tab) => {
          const active = tab.isActive(pathname);
          const Glyph = tab.icon;
          return (
            <li key={tab.href} className="min-w-0 flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 px-0.5 ${
                  active ? "text-ink" : "text-charcoal"
                }`}
              >
                <Glyph size={24} weight={active ? "fill" : "regular"} />
                <span className="text-[11px] leading-none">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
