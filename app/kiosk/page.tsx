import { ScanShell } from "@/components/kiosk/ScanShell";
import { listCategories, listStores } from "@/lib/items";
import { listPinnedItems } from "@/lib/quick";

export const metadata = { title: "Scan · Pantry Tracker" };

/* Server component: the kiosk home is the scan surface. Catalogue data for the
 * manual add-item modal and the pinned quick-add tiles are fetched here and
 * handed to the client island. */
export default function KioskPage() {
  const categories = listCategories();
  const stores = listStores();
  const pinned = listPinnedItems();
  return <ScanShell categories={categories} stores={stores} pinned={pinned} />;
}
