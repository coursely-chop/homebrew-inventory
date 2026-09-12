import { suggestMatch } from "./ingredientMatch";
import type { IngredientCategory, InventoryItem, Recipe } from "../types";

export interface IngredientRow {
  key: string;
  ingredientName: string;
  category: IngredientCategory;
  amountNeeded: number;
  unit: string;
  matchedItemId: string | null;
}

/** One row per fermentable/hop/yeast addition, each matched against
 * inventory (or left unmatched below the confidence threshold — see
 * ingredientMatch.ts). Shared by the deduction panel and the recipe-list
 * feasibility badge so "can I brew this" and "what actually gets deducted"
 * never disagree. Water/misc additions (Campden, gypsum) are excluded —
 * they aren't a tracked inventory category. */
export function buildIngredientRows(recipe: Recipe, items: InventoryItem[]): IngredientRow[] {
  const rows: IngredientRow[] = [];

  recipe.fermentables.forEach((f, i) => {
    rows.push({
      key: `f${i}`,
      ingredientName: f.name,
      category: "grain",
      amountNeeded: f.amountLb,
      unit: "lb",
      matchedItemId: suggestMatch(f.name, "grain", items)?.id ?? null,
    });
  });

  recipe.hops.forEach((h, i) => {
    rows.push({
      key: `h${i}`,
      ingredientName: `${h.name} (${h.use})`,
      category: "hops",
      amountNeeded: h.amountOz,
      unit: "oz",
      matchedItemId: suggestMatch(h.name, "hops", items)?.id ?? null,
    });
  });

  recipe.yeasts.forEach((y, i) => {
    if (y.amountIsWeight) return;
    rows.push({
      key: `y${i}`,
      ingredientName: y.name,
      category: "yeast",
      amountNeeded: y.amount,
      unit: "packet",
      matchedItemId: suggestMatch(y.name, "yeast", items)?.id ?? null,
    });
  });

  return rows;
}

/** Sums amountNeeded per inventory item across rows — several recipe rows
 * (a hop added at Boil, Hop Stand, and Dry Hop) commonly share one item. */
export function totalsByItem(rows: IngredientRow[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.matchedItemId) {
      totals.set(row.matchedItemId, (totals.get(row.matchedItemId) ?? 0) + row.amountNeeded);
    }
  }
  return totals;
}

export interface ShortIngredient {
  name: string;
  needed: number;
  have: number;
  unit: string;
}

export interface RecipeFeasibility {
  ready: boolean;
  short: ShortIngredient[];
  /** Recipe ingredients with no confident inventory match — not counted as
   * shortages (we genuinely don't know), but worth surfacing separately. */
  unmatched: string[];
}

export function checkFeasibility(recipe: Recipe, items: InventoryItem[]): RecipeFeasibility {
  const rows = buildIngredientRows(recipe, items);
  const totals = totalsByItem(rows);

  const short: ShortIngredient[] = [];
  for (const [itemId, needed] of totals) {
    const item = items.find((i) => i.id === itemId);
    if (item && item.amount < needed) {
      short.push({ name: item.name, needed, have: item.amount, unit: item.unit });
    }
  }

  const unmatched = rows.filter((r) => !r.matchedItemId).map((r) => r.ingredientName);

  return { ready: short.length === 0, short, unmatched };
}
