/**
 * Cloud sync, matching pt-tracker's pattern exactly: a single Supabase row
 * (via a Vercel serverless function that holds the real credentials —
 * see api/data.ts) as the durable copy behind localStorage. localStorage
 * stays the fast, offline-first copy the app actually renders from; this
 * is just insurance against it getting wiped out from under the app.
 *
 * Unlike pt-tracker (one data shape, one context), this app has two
 * independent local stores (inventory, recipes) that need to travel
 * together as one row/one updated_at — so this module reads/writes both
 * localStorage keys directly rather than taking a single in-memory blob,
 * and InventoryContext/RecipeContext each call pushLocalToCloud() after
 * their own mutations rather than funneling through one saveData().
 */
import { STORAGE_KEY as INVENTORY_KEY } from "./storage";
import { STORAGE_KEY as RECIPES_KEY } from "./recipeStorage";
import { STORAGE_KEY as DEDUCTION_LOG_KEY } from "./deductionLog";
import { STORAGE_KEY as SHOPPING_LIST_KEY } from "./shoppingListStorage";

// Set only when deployed with the sync backend configured — undefined in
// local dev, where there's no server behind /api/data anyway.
const SYNC_SECRET = import.meta.env.VITE_SYNC_SECRET as string | undefined;

const UPDATED_AT_KEY = "homebrew-updated-at";

export interface CloudPayload {
  inventory: unknown;
  recipes: unknown;
  deductionLog: unknown;
  shoppingList: unknown;
}

function touchUpdatedAt(): void {
  localStorage.setItem(UPDATED_AT_KEY, new Date().toISOString());
}

/** Timestamp of the last write this device knows to be current — either a
 * real local edit, or a confirmed-in-sync moment with the cloud copy. */
export function getLocalUpdatedAt(): string | null {
  return localStorage.getItem(UPDATED_AT_KEY);
}

function readCombinedLocal(): CloudPayload {
  const inventory = localStorage.getItem(INVENTORY_KEY);
  const recipes = localStorage.getItem(RECIPES_KEY);
  const deductionLog = localStorage.getItem(DEDUCTION_LOG_KEY);
  const shoppingList = localStorage.getItem(SHOPPING_LIST_KEY);
  return {
    inventory: inventory ? JSON.parse(inventory) : null,
    recipes: recipes ? JSON.parse(recipes) : null,
    deductionLog: deductionLog ? JSON.parse(deductionLog) : null,
    shoppingList: shoppingList ? JSON.parse(shoppingList) : null,
  };
}

/** Fire-and-forget push of the current combined local state to the cloud
 * copy — localStorage has already been written by the caller, so a
 * failure here (offline, cold start, sync not configured) never blocks or
 * loses the local save; the next successful save (or the next load's
 * reconciliation) catches it up. */
async function pushToCloud(): Promise<void> {
  if (!SYNC_SECRET) return;
  try {
    const resp = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-sync-secret": SYNC_SECRET },
      body: JSON.stringify({ data: readCombinedLocal() }),
    });
    if (resp.ok) touchUpdatedAt();
  } catch {
    // offline or transient network failure — local save already succeeded.
  }
}

export function pushLocalToCloud(): void {
  void pushToCloud();
}

/** Cloud's current copy, for the once-per-load reconciliation. `reachable:
 * false` covers every failure mode (offline, cold start, sync not
 * configured, a bad response) — the caller must treat that as "unknown,"
 * never as "cloud confirmed empty." Only a genuinely successful response
 * with no row yet counts as confirmed-empty (see pt-tracker's
 * storage.ts — this mirrors a real bug fixed there: falling back to
 * "push local up" on a failed fetch can overwrite a good cloud copy with a
 * freshly-wiped-and-reseeded local one). */
export async function fetchCloudData(): Promise<{
  data: CloudPayload | null;
  updatedAt: string | null;
  reachable: boolean;
}> {
  if (!SYNC_SECRET) return { data: null, updatedAt: null, reachable: false };
  try {
    const resp = await fetch("/api/data", { headers: { "x-sync-secret": SYNC_SECRET } });
    if (!resp.ok) return { data: null, updatedAt: null, reachable: false };
    const body = (await resp.json()) as { data: CloudPayload | null; updatedAt: string | null };
    return { ...body, reachable: true };
  } catch {
    return { data: null, updatedAt: null, reachable: false };
  }
}

/** Adopts a cloud snapshot as the new local truth for whichever of
 * inventory/recipes it carries, then persists so it survives future loads
 * without another round-trip. Caller is responsible for telling each
 * context to reload its state from localStorage afterward. */
export function adoptCloudData(payload: CloudPayload): void {
  if (payload.inventory !== null && payload.inventory !== undefined) {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(payload.inventory));
  }
  if (payload.recipes !== null && payload.recipes !== undefined) {
    localStorage.setItem(RECIPES_KEY, JSON.stringify(payload.recipes));
  }
  if (payload.deductionLog !== null && payload.deductionLog !== undefined) {
    localStorage.setItem(DEDUCTION_LOG_KEY, JSON.stringify(payload.deductionLog));
  }
  if (payload.shoppingList !== null && payload.shoppingList !== undefined) {
    localStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(payload.shoppingList));
  }
  touchUpdatedAt();
}
