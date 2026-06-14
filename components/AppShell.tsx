"use client";

import { usePathname } from "next/navigation";

import { AppNav } from "@/components/AppNav";

/* Wraps every page. Shows the persistent bottom nav on all authed surfaces and
 * reserves space for it; hides it on the login screen. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  /* No app nav on unauthenticated surfaces. */
  if (
    pathname === "/login" ||
    pathname === "/offline" ||
    pathname.startsWith("/share/")
  ) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="pb-20">{children}</div>
      <AppNav pathname={pathname} />
    </>
  );
}
