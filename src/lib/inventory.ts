import type { IngredientCategory, InventoryItem } from "../types";

/** Below this amount, an item is flagged low. Thresholds are per-category
 * because "low" means something different for a 0.5oz dry-hop addition than
 * a 5lb grain bill component — yeast is judged by packet count, where 1
 * packet left means the next brew day needs a reorder first. */
const LOW_STOCK_THRESHOLD: Record<IngredientCategory, number> = {
  hops: 1,
  grain: 1,
  yeast: 2,
  misc: 1,
};

// A hop below this is too little for any real addition — not literally
// zero, but "kicked" in the same sense as a keg: done, even if a few
// crumbs remain in the bag. Other categories only count as depleted at
// exactly zero.
const KICKED_THRESHOLD = 0.1;

export function isOutOfStock(item: InventoryItem): boolean {
  return item.category === "hops" ? item.amount < KICKED_THRESHOLD : item.amount <= 0;
}

/** "kicked" for a spent hop, "out" for anything else at zero. */
export function outOfStockLabel(item: InventoryItem): string {
  return item.category === "hops" ? "kicked" : "out";
}

/** True for anything below threshold, out-of-stock included — use this for
 * "does this need attention at all." For the Low tab specifically (as
 * opposed to Out), exclude isOutOfStock separately so the two tabs don't
 * duplicate each other. */
export function isLowStock(item: InventoryItem): boolean {
  return item.amount < LOW_STOCK_THRESHOLD[item.category];
}

export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  hops: "Hops",
  grain: "Grain",
  yeast: "Yeast",
  misc: "Misc",
};

export const CATEGORY_ORDER: IngredientCategory[] = ["hops", "grain", "yeast", "misc"];

/** Days since purchase, or null for baseline stock with unknown purchase date. */
export function daysSincePurchase(item: InventoryItem): number | null {
  if (!item.purchaseDate) return null;
  const ms = Date.now() - new Date(item.purchaseDate).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** Freshness as shown in the UI — exact days for the first month, then a
 * rounded month count, since "94d ago" reads as falsely precise once
 * you're months out from purchase. */
export function freshnessLabel(item: InventoryItem): string {
  const days = daysSincePurchase(item);
  if (days === null) return "baseline";
  if (days === 0) return "added today";
  if (days < 30) return `added ${days}d ago`;
  const months = Math.round(days / 30.44);
  return `added ~${months}mo ago`;
}
