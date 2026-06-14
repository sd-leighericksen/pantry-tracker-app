import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { listUseSoon } from "@/lib/expiry";
import { UseSoonView } from "@/components/UseSoonView";

export const metadata = { title: "Use Soon · Pantry Tracker" };

export default async function UseSoonPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/use-soon");

  return (
    <main className="mx-auto w-full max-w-[680px] px-4 py-8">
      <UseSoonView entries={listUseSoon()} />
    </main>
  );
}
