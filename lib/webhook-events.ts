/* Edge/client-safe webhook event constants — no server-only/db deps, so this
 * is importable from client components (the settings UI) as well as the server
 * dispatch module. */

export type WebhookEvent =
  | "shopping.item_added"
  | "item.below_threshold"
  | "item.expiring_soon"
  | "shop.completed";

export const WEBHOOK_EVENTS: WebhookEvent[] = [
  "shopping.item_added",
  "item.below_threshold",
  "item.expiring_soon",
  "shop.completed",
];
