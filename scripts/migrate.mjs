/* Production migration runner. Plain ESM with no path aliases or tsx, so it
 * runs against the standalone image's node_modules. The Dockerfile copies the
 * full drizzle-orm package so the migrator submodule is present. */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const dbPath = process.env.DB_PATH ?? "./data/pantry.sqlite";
const migrationsFolder = process.env.MIGRATIONS_DIR ?? "./drizzle/migrations";

const db = drizzle(new Database(dbPath));
migrate(db, { migrationsFolder });
console.log(`[migrate] complete: ${dbPath}`);
