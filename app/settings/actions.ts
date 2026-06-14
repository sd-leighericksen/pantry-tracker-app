"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import {
  issueDeviceToken,
  revokeDeviceToken,
  type DeviceTokenKind,
} from "@/lib/device-tokens";
import {
  createWebhook,
  deleteWebhook,
  getWebhook,
  setWebhookEnabled,
  testWebhook,
  WEBHOOK_EVENTS,
} from "@/lib/webhooks";
import { disableSharing, enableSharing } from "@/lib/share";
import {
  categoryItemCount,
  createCategory,
  createStore,
  deleteCategory,
  deleteStore,
  renameCategory,
} from "@/lib/items";

/* ------------------------------------------------------------------ *
 * Device & API token management (BRIEF §7). The raw token is returned to
 * the client exactly once, on issue.
 * ------------------------------------------------------------------ */

const KINDS: DeviceTokenKind[] = ["kiosk", "api", "mobile"];

export type IssueResult =
  | { ok: true; name: string; token: string }
  | { ok: false; error: string };

export async function issueTokenAction(
  name: string,
  kind: string,
): Promise<IssueResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required." };
  if (trimmed.length > 60) return { ok: false, error: "Name is too long." };
  if (!KINDS.includes(kind as DeviceTokenKind)) {
    return { ok: false, error: "Invalid kind." };
  }

  const issued = await issueDeviceToken(trimmed, kind as DeviceTokenKind);
  revalidatePath("/settings");
  return { ok: true, name: issued.name, token: issued.token };
}

export async function revokeTokenAction(id: number): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await revokeDeviceToken(id);
  revalidatePath("/settings");
}

/* ------------------------------ webhooks ----------------------------- */

export type WebhookResult = { ok: boolean; error?: string };

function validUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function createWebhookAction(
  eventType: string,
  url: string,
): Promise<WebhookResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const trimmed = url.trim();
  if (!validUrl(trimmed)) return { ok: false, error: "Enter a valid URL." };
  if (eventType !== "all" && !WEBHOOK_EVENTS.includes(eventType as never)) {
    return { ok: false, error: "Invalid event." };
  }
  createWebhook(eventType, trimmed);
  revalidatePath("/settings");
  return { ok: true };
}

export async function toggleWebhookAction(
  id: number,
  enabled: boolean,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  setWebhookEnabled(id, enabled);
  revalidatePath("/settings");
}

export async function deleteWebhookAction(id: number): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  deleteWebhook(id);
  revalidatePath("/settings");
}

export async function testWebhookAction(id: number): Promise<WebhookResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const hook = getWebhook(id);
  if (!hook) return { ok: false, error: "Not found." };
  const ok = await testWebhook(hook.url);
  return ok ? { ok: true } : { ok: false, error: "No 2xx response." };
}

/* --------------------------- shareable list -------------------------- */

export async function enableShareAction(): Promise<{ token: string } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const token = enableSharing();
  revalidatePath("/settings");
  return { token };
}

export async function disableShareAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  disableSharing();
  revalidatePath("/settings");
}

/* ------------------------------- stores ------------------------------ */

export type StoreResult = { ok: boolean; error?: string };

export async function createStoreAction(
  name: string,
  colour: string,
): Promise<StoreResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required." };
  if (trimmed.length > 40) return { ok: false, error: "Name is too long." };
  const hex = /^#[0-9a-fA-F]{6}$/.test(colour) ? colour : "#888e90";
  createStore(trimmed, hex);
  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteStoreAction(id: number): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  deleteStore(id);
  revalidatePath("/settings");
}

/* ----------------------------- categories ---------------------------- */

export type CategoryResult = { ok: boolean; error?: string };

function validName(name: string): string | null {
  const t = name.trim();
  if (!t) return null;
  return t.length <= 40 ? t : null;
}

export async function createCategoryAction(name: string): Promise<CategoryResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const t = validName(name);
  if (!t) return { ok: false, error: "Enter a name (max 40 chars)." };
  createCategory(t);
  revalidatePath("/settings");
  return { ok: true };
}

export async function renameCategoryAction(
  id: number,
  name: string,
): Promise<CategoryResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const t = validName(name);
  if (!t) return { ok: false, error: "Enter a name (max 40 chars)." };
  renameCategory(id, t);
  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteCategoryAction(id: number): Promise<CategoryResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const count = categoryItemCount(id);
  if (count > 0) {
    return {
      ok: false,
      error: `In use by ${count} item${count === 1 ? "" : "s"} — move them first.`,
    };
  }
  deleteCategory(id);
  revalidatePath("/settings");
  return { ok: true };
}
