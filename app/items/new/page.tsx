import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { listCategories, listStores } from "@/lib/items";
import { NewItemView } from "@/components/NewItemView";

export const metadata = { title: "Add item · Pantry Tracker" };

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ barcode?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/items/new");

  const { barcode } = await searchParams;
  const categories = listCategories();
  const stores = listStores();

  return (
    <main className="mx-auto w-full max-w-[640px] px-6 py-10">
      <NewItemView
        categories={categories}
        stores={stores}
        barcode={barcode ?? null}
      />
    </main>
  );
}
