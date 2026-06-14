import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { listCategories, listStores } from "@/lib/items";
import { CaptureView } from "@/components/CaptureView";

export const metadata = { title: "Add by photo · Pantry Tracker" };

export default async function CapturePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/items/capture");

  return (
    <main className="mx-auto w-full max-w-[640px] px-4 py-8">
      <CaptureView categories={listCategories()} stores={listStores()} />
    </main>
  );
}
