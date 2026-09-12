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

export function isOutOfStock(item: InventoryItem): boolean {
  return item.amount <= 0;
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
