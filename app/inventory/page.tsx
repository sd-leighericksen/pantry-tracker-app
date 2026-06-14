import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { listInventoryItems } from "@/lib/inventory";
import { listCategories, listStores } from "@/lib/items";
import { InventoryView } from "@/components/inventory/InventoryView";

export const metadata = { title: "Inventory · Pantry Tracker" };

export default async function InventoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/inventory");

  const items = listInventoryItems();
  const categories = listCategories();
  const stores = listStores();

  return (
    <main className="mx-auto w-full max-w-[1200px] px-6 py-8">
      <InventoryView items={items} categories={categories} stores={stores} />
    </main>
  );
}
