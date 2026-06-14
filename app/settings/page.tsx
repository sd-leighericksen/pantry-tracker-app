import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { listDeviceTokens } from "@/lib/device-tokens";
import { listWebhooks } from "@/lib/webhooks";
import { getShareToken } from "@/lib/share";
import { listStores, listCategories } from "@/lib/items";
import { TokenManager } from "@/components/settings/TokenManager";
import { WebhookManager } from "@/components/settings/WebhookManager";
import { ShareManager } from "@/components/settings/ShareManager";
import { StoreManager } from "@/components/settings/StoreManager";
import { CategoryManager } from "@/components/settings/CategoryManager";

export const metadata = { title: "Settings · Pantry Tracker" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings");

  const tokens = await listDeviceTokens();
  const webhooks = listWebhooks();
  const shareToken = getShareToken();
  const stores = listStores();
  const categories = listCategories();

  return (
    <main className="mx-auto w-full max-w-[680px] px-4 py-8">
      <h1 className="mb-8 text-[40px] font-semibold leading-none tracking-tight text-ink">
        Settings
      </h1>
      <div className="flex flex-col gap-12">
        <CategoryManager categories={categories} />
        <StoreManager stores={stores} />
        <TokenManager tokens={tokens} />
        <WebhookManager webhooks={webhooks} />
        <ShareManager token={shareToken} />
      </div>
    </main>
  );
}
