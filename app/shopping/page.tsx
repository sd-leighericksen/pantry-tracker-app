import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { listShoppingList } from "@/lib/shopping";
import { listStores } from "@/lib/items";
import { ShoppingList } from "@/components/shopping/ShoppingList";

export const metadata = { title: "Shopping · Pantry Tracker" };

export default async function ShoppingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/shopping");

  const entries = listShoppingList();
  const stores = listStores();

  return (
    <main className="mx-auto w-full max-w-[680px] px-4 py-8">
      <ShoppingList entries={entries} stores={stores} />
    </main>
  );
}
