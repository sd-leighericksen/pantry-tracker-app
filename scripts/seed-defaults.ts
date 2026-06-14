import { db, schema } from "@/lib/db";

/* ------------------------------------------------------------------ *
 * Seed the default flat categories (BRIEF §5.3). Idempotent — running it
 * again only adds categories whose names are missing. prompt_expiry follows
 * §5.4 (Fridge/Freezer/Fresh prompt for expiry; Pantry/Cleaning/Care don't).
 *
 *   pnpm db:seed
 * ------------------------------------------------------------------ */

const DEFAULTS: { name: string; promptExpiry: boolean }[] = [
  { name: "Pantry", promptExpiry: false },
  { name: "Fridge", promptExpiry: true },
  { name: "Freezer", promptExpiry: true },
  { name: "Fresh Produce", promptExpiry: true },
  { name: "Cleaning", promptExpiry: false },
  { name: "Personal Care", promptExpiry: false },
];

/* Default Australian stores (BRIEF AU context). User-manageable later. */
const STORES: { name: string; colour: string }[] = [
  { name: "Woolies", colour: "#178841" },
  { name: "Coles", colour: "#e01a22" },
  { name: "ALDI", colour: "#001f6c" },
];

const existingCats = new Set(
  db.select({ name: schema.categories.name }).from(schema.categories).all().map((c) => c.name),
);

let catsAdded = 0;
DEFAULTS.forEach((cat, i) => {
  if (existingCats.has(cat.name)) return;
  db.insert(schema.categories)
    .values({ name: cat.name, promptExpiry: cat.promptExpiry, sort: i })
    .run();
  catsAdded += 1;
});

const existingStores = new Set(
  db.select({ name: schema.stores.name }).from(schema.stores).all().map((s) => s.name),
);

let storesAdded = 0;
STORES.forEach((store, i) => {
  if (existingStores.has(store.name)) return;
  db.insert(schema.stores).values({ name: store.name, colour: store.colour, sort: i }).run();
  storesAdded += 1;
});

console.log(
  `[seed] categories: ${catsAdded} added, ${DEFAULTS.length - catsAdded} present. ` +
    `stores: ${storesAdded} added, ${STORES.length - storesAdded} present.`,
);
