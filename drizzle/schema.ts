import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/* ------------------------------------------------------------------ *
 * Pantry domain — brief §7 data model.
 * Every quantity change goes through stock_events; items.quantity is
 * read-only outside that path (enforced in lib/stock.ts).
 * ------------------------------------------------------------------ */

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  promptExpiry: integer("prompt_expiry", { mode: "boolean" })
    .notNull()
    .default(false),
  sort: integer("sort").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const stores = sqliteTable("stores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  colour: text("colour").notNull().default("#888e90"),
  logo: text("logo"),
  sort: integer("sort").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const items = sqliteTable(
  "items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    brand: text("brand"),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    photo: text("photo"),
    /* Inventory snapshot — only mutated by lib/stock.ts via stock_events. */
    quantity: integer("quantity").notNull().default(0),
    threshold: integer("threshold").notNull().default(0),
    preferredStoreId: integer("preferred_store_id").references(() => stores.id),
    nutriscore: text("nutriscore"),
    nova: integer("nova"),
    /* Packaging size as free-text display ("320g", "1 kg") — never parsed. */
    sizeText: text("size_text"),
    /* Imported from OFF/AI; shown read-only on the item detail. */
    ingredients: text("ingredients"),
    /* Comma-separated allergen names (en: prefix stripped). */
    allergens: text("allergens"),
    /* Normalised per-100g nutriments, JSON-encoded. */
    nutriments: text("nutriments"),
    defaultShelfLifeDays: integer("default_shelf_life_days"),
    notes: text("notes"),
    /* Quick-add tile: pinned to the kiosk home with an optional emoji. */
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    icon: text("icon"),
    /* Full Open Food Facts payload, cached. JSON-encoded. */
    offData: text("off_data"),
    archivedAt: integer("archived_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("items_category_idx").on(table.categoryId),
    index("items_low_stock_idx").on(table.quantity, table.threshold),
  ],
);

export const barcodes = sqliteTable(
  "barcodes",
  {
    barcode: text("barcode").primaryKey(),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index("barcodes_item_idx").on(table.itemId)],
);

export const itemStores = sqliteTable(
  "item_stores",
  {
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.itemId, table.storeId] }),
    index("item_stores_store_idx").on(table.storeId),
  ],
);

/* Source of truth for inventory movement. Append-only. */
export const stockEvents = sqliteTable(
  "stock_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    /* scan-in | scan-out | quick-use | quick-add | manual | ai */
    source: text("source").notNull(),
    expiryDate: integer("expiry_date", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("stock_events_item_idx").on(table.itemId, table.createdAt),
    index("stock_events_recent_idx").on(table.createdAt),
  ],
);

export const shoppingList = sqliteTable(
  "shopping_list",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    itemId: integer("item_id").references(() => items.id, {
      onDelete: "cascade",
    }),
    freeText: text("free_text"),
    storeId: integer("store_id").references(() => stores.id),
    /* pending | ticked */
    status: text("status").notNull().default("pending"),
    addedBy: text("added_by").notNull().default("auto"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    tickedAt: integer("ticked_at", { mode: "timestamp" }),
  },
  (table) => [
    index("shopping_list_status_idx").on(table.status),
    uniqueIndex("shopping_list_pending_item_unique")
      .on(table.itemId)
      .where(sql`status = 'pending' AND item_id IS NOT NULL`),
  ],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const webhooks = sqliteTable("webhooks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventType: text("event_type").notNull(),
  url: text("url").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/* ------------------------------------------------------------------ *
 * Auth — single-household, but with named, revocable tokens
 * (kiosk, n8n, HA, Leigh's phone). See brief §7 Security.
 * ------------------------------------------------------------------ */

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

export const deviceTokens = sqliteTable("device_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  /* sha256 of the bearer token — raw value shown to user once on issue. */
  tokenHash: text("token_hash").notNull().unique(),
  /* kiosk | api | mobile */
  kind: text("kind").notNull(),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
  revokedAt: integer("revoked_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
