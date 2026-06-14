import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[1200px] flex-col justify-center px-8 py-24">
      <p className="font-mono text-xs uppercase tracking-widest text-charcoal">
        Pantry Tracker
      </p>
      <h1 className="mt-4 text-5xl font-semibold tracking-tight md:text-[80px] md:leading-none">
        Signed in.
      </h1>
      <p className="mt-6 max-w-[60ch] text-lg text-body">
        Welcome back, {user.username}. Scan in/out is live on the kiosk. Open
        Food Facts lookup, inventory views, and the shopping list come next.
      </p>
      <div className="mt-12 flex items-center gap-4">
        <Link
          href="/kiosk"
          className="flex h-14 items-center rounded-lg bg-accent px-7 text-xl font-semibold text-accent-on"
        >
          Open kiosk
        </Link>
        <Link
          href="/reports"
          className="flex h-14 items-center rounded-lg border border-hairline-strong px-7 text-xl font-semibold text-ink"
        >
          Reports
        </Link>
        <Link
          href="/settings"
          className="flex h-14 items-center rounded-lg border border-hairline-strong px-7 text-xl font-semibold text-ink"
        >
          Settings
        </Link>
        <LogoutButton />
      </div>
    </main>
  );
}
