import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { hashPassword } from "@/lib/password";

/* ------------------------------------------------------------------ *
 * First-run bootstrap: create the single household user.
 *
 *   pnpm create-user                       # interactive prompts
 *   pnpm create-user --username leigh ...   # flags
 *   PT_USERNAME=leigh PT_PASSWORD=… pnpm create-user   # env
 *
 * This app is single-household (BRIEF §7). If a user already exists the
 * script aborts unless --force is passed, which replaces the password.
 * ------------------------------------------------------------------ */

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const hasForce = process.argv.includes("--force");

/** Read a visible line of input. */
async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  const answer = await rl.question(question);
  rl.close();
  return answer;
}

/** Read a line without echoing it (for passwords), masking with asterisks. */
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    stdout.write(question);
    const canRaw = stdin.isTTY;
    if (canRaw) stdin.setRawMode(true);
    stdin.resume();

    let value = "";
    const onData = (buf: Buffer) => {
      for (const byte of buf) {
        if (byte === 0x03) {
          /* Ctrl-C */
          cleanup();
          reject(new Error("aborted"));
          return;
        }
        if (byte === 0x0d || byte === 0x0a) {
          /* Enter */
          stdout.write("\n");
          cleanup();
          resolve(value);
          return;
        }
        if (byte === 0x7f || byte === 0x08) {
          /* Backspace */
          if (value.length > 0) {
            value = value.slice(0, -1);
            stdout.write("\b \b");
          }
          continue;
        }
        value += String.fromCharCode(byte);
        stdout.write("*");
      }
    };

    function cleanup() {
      stdin.off("data", onData);
      if (canRaw) stdin.setRawMode(false);
      stdin.pause();
    }

    stdin.on("data", onData);
  });
}

async function main() {
  const existing = await db.select().from(schema.users).all();
  if (existing.length > 0 && !hasForce) {
    console.error(
      `[create-user] A user already exists (${existing[0]!.username}). ` +
        `Pass --force to replace its password.`,
    );
    process.exit(1);
  }

  const username = (
    flag("username") ??
    process.env.PT_USERNAME ??
    (await prompt("Username: "))
  ).trim();

  const password =
    flag("password") ??
    process.env.PT_PASSWORD ??
    (await promptHidden("Password: "));

  if (!username || !password) {
    console.error("[create-user] Username and password are both required.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("[create-user] Password must be at least 8 characters.");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  if (existing.length > 0) {
    await db
      .update(schema.users)
      .set({ passwordHash })
      .where(eq(schema.users.id, existing[0]!.id));
    console.log(`[create-user] Password reset for "${existing[0]!.username}".`);
  } else {
    await db.insert(schema.users).values({ username, passwordHash });
    console.log(`[create-user] Created user "${username}".`);
  }
}

main().catch((err) => {
  console.error("[create-user] Failed:", err);
  process.exit(1);
});
