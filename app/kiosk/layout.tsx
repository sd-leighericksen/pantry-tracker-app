import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

/* Kiosk shell layout — chrome-less, fixed full-height surface for the
 * wall-mounted touchscreen (DESIGN.md: dark only, large targets, no hover).
 * Auth is enforced here so nothing kiosk renders to an anonymous client. */

export default async function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/kiosk");

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <div className="mx-auto w-full max-w-[960px] px-8 py-6">{children}</div>
    </div>
  );
}
