"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import {
  addFreeTextItem,
  completeShop,
  removeShoppingItem,
  setTicked,
} from "@/lib/shopping";

/* ------------------------------------------------------------------ *
 * Shopping list actions. Authenticated like API routes
 * (vercel-react-best-practices: server-auth-actions); each revalidates
 * /shopping so the optimistic client reconciles with server truth.
 * ------------------------------------------------------------------ */

async function requireUser(): Promise<boolean> {
  return (await getCurrentUser()) !== null;
}

export async function tickItemAction(
  id: number,
  ticked: boolean,
): Promise<void> {
  if (!(await requireUser())) return;
  setTicked(id, ticked);
  revalidatePath("/shopping");
}

export async function removeItemAction(id: number): Promise<void> {
  if (!(await requireUser())) return;
  removeShoppingItem(id);
  revalidatePath("/shopping");
}

export type AddResult = { ok: boolean; error?: string };

export async function addFreeTextAction(
  text: string,
  storeId: number | null,
): Promise<AddResult> {
  if (!(await requireUser())) return { ok: false, error: "Not signed in." };
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Enter an item." };
  if (trimmed.length > 200) return { ok: false, error: "Too long." };

  addFreeTextItem(trimmed, storeId ?? null);
  revalidatePath("/shopping");
  return { ok: true };
}

export async function completeShopAction(): Promise<void> {
  if (!(await requireUser())) return;
  completeShop();
  revalidatePath("/shopping");
}
