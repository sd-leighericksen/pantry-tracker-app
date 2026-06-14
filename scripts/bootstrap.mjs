/* First-run bootstrap for the container. Idempotent: seeds default categories
 * and stores if empty, and creates the single household user from
 * PT_USERNAME / PT_PASSWORD if no user exists yet. Plain ESM + raw SQL so it
 * runs against the standalone image (no tsx, no path aliases, no TS schema). */
import Database from "better-sqlite3";
import { randomBytes } from "node:crypto";
import { argon2id } from "hash-wasm";

const dbPath = process.env.DB_PATH ?? "./data/pantry.sqlite";
const db = new Database(dbPath);

const CATEGORIES = [
  ["Pantry", 0],
  ["Fridge", 1],
  ["Freezer", 1],
  ["Fresh Produce", 1],
  ["Cleaning", 0],
  ["Personal Care", 0],
];
const STORES = [
  ["Woolies", "#178841"],
  ["Coles", "#e01a22"],
  ["ALDI", "#001f6c"],
];

if (db.prepare("select count(*) n from categories").get().n === 0) {
  const ins = db.prepare(
    "insert into categories (name, prompt_expiry, sort) values (?, ?, ?)",
  );
  CATEGORIES.forEach(([name, prompt], i) => ins.run(name, prompt, i));
  console.log(`[bootstrap] seeded ${CATEGORIES.length} categories`);
}

if (db.prepare("select count(*) n from stores").get().n === 0) {
  const ins = db.prepare(
    "insert into stores (name, colour, sort) values (?, ?, ?)",
  );
  STORES.forEach(([name, colour], i) => ins.run(name, colour, i));
  console.log(`[bootstrap] seeded ${STORES.length} stores`);
}

if (db.prepare("select count(*) n from users").get().n === 0) {
  const username = process.env.PT_USERNAME;
  const password = process.env.PT_PASSWORD;
  if (username && password) {
    const passwordHash = await argon2id({
      password,
      salt: randomBytes(16),
      parallelism: 1,
      iterations: 3,
      memorySize: 65536,
      hashLength: 32,
      outputType: "encoded",
    });
    db.prepare(
      "insert into users (username, password_hash) values (?, ?)",
    ).run(username, passwordHash);
    console.log(`[bootstrap] created user "${username}"`);
  } else {
    console.log(
      "[bootstrap] no user yet — set PT_USERNAME and PT_PASSWORD to auto-create one",
    );
  }
}
