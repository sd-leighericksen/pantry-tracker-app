import { listQuickUseItems } from "@/lib/quick";
import { QuickUseGrid } from "@/components/kiosk/QuickUseGrid";

export const metadata = { title: "Quick Use · Pantry Tracker" };

/* Auth + chrome-less shell come from app/kiosk/layout.tsx. */
export default function QuickUsePage() {
  return <QuickUseGrid items={listQuickUseItems()} />;
}
