import { randomBytes } from "node:crypto";
import { argon2id, argon2Verify } from "hash-wasm";

/* ------------------------------------------------------------------ *
 * Pure password hashing (argon2id via hash-wasm). No server-only guard
 * and no DB/cookie deps, so this is reusable from CLI scripts (the
 * first-run user bootstrap) as well as the auth data layer.
 *
 * 64 MiB / 3 passes is a sane interactive default for homelab hardware.
 * Encoded PHC strings carry their own params, so retuning later does not
 * invalidate existing hashes.
 * ------------------------------------------------------------------ */

const ARGON2_OPTS = {
  parallelism: 1,
  iterations: 3,
  memorySize: 65536,
  hashLength: 32,
  outputType: "encoded",
} as const;

/* A real, valid argon2id hash used to equalise verification timing when a
 * username does not exist (prevents user-enumeration via response time). */
export const DUMMY_HASH =
  "$argon2id$v=19$m=65536,t=3,p=1$OxIRVbnL76TbJz8F16kwYg$" +
  "QX0tVeY5ULJOaF2C0gq28wKLEPITeVtaVKJfXEdqDks";

export async function hashPassword(password: string): Promise<string> {
  return argon2id({ password, salt: randomBytes(16), ...ARGON2_OPTS });
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    return await argon2Verify({ password, hash });
  } catch {
    /* Malformed stored hash — treat as a failed verification, never throw. */
    return false;
  }
}
