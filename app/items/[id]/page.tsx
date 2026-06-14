import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { getItem, listCategories, listStores } from "@/lib/items";
import { itemInsights, recentEvents } from "@/lib/insights";
import { ItemDetail } from "@/components/items/ItemDetail";

export const metadata = { title: "Item · Pantry Tracker" };

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) notFound();

  const item = getItem(itemId);
  if (!item) notFound();

  const categories = listCategories();
  const stores = listStores();
  const insights = itemInsights(itemId);
  const events = recentEvents(itemId);

  return (
    <main className="mx-auto w-full max-w-[680px] px-4 py-8">
      <ItemDetail
        item={item}
        categories={categories}
        stores={stores}
        insights={insights}
        events={events}
      />
    </main>
  );
}
