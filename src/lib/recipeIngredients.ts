import { suggestMatch } from "./ingredientMatch";
import { computeEffectiveAmount, suggestHopSubstitute, type HopSubstitution } from "./hopSubstitution";
import type { IngredientCategory, InventoryItem, Recipe } from "../types";

export interface IngredientRow {
  key: string;
  ingredientName: string;
  /** The underlying ingredient name without the "(Use)" suffix hop rows add
   * to ingredientName for display — used to dedupe an unmatched ingredient
   * across a recipe's several additions of it (e.g. "Motueka (Boil)" and
   * "Motueka (Hop Stand)" are one ingredient, not two). */
  rawName: string;
  category: IngredientCategory;
  amountNeeded: number;
  unit: string;
  matchedItemId: string | null;
  /** Hops only — needed to tell a bittering addition (where a substitute's
   * alpha acid % matters) from a hop-stand/dry-hop one (where it doesn't). */
  use?: string;
  /** Hops only — this addition's recorded alpha acid %, null if BeerXML
   * didn't carry one. */
  recipeAA?: number | null;
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
      rawName: f.name,
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
      rawName: h.name,
      category: "hops",
      amountNeeded: h.amountOz,
      unit: "oz",
      matchedItemId: suggestMatch(h.name, "hops", items)?.id ?? null,
      use: h.use,
      recipeAA: h.alpha > 0 ? h.alpha : null,
    });
  });

  recipe.yeasts.forEach((y, i) => {
    if (y.amountIsWeight) return;
    rows.push({
      key: `y${i}`,
      ingredientName: y.name,
      rawName: y.name,
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

/** The amount actually deducted for one row's currently-selected item —
 * equal to amountNeeded, except a Boil hop row deducted against an item with
 * a different alpha acid % (a manual substitution in the deduction panel,
 * most commonly), where it's scaled to preserve the addition's bitterness
 * contribution instead of a 1:1 gram swap. */
export function effectiveAmount(row: IngredientRow, items: InventoryItem[]): number {
  const item = row.matchedItemId ? items.find((i) => i.id === row.matchedItemId) : undefined;
  if (!item) return row.amountNeeded;
  const isBoil = row.category === "hops" && row.use === "Boil";
  return computeEffectiveAmount(isBoil, row.recipeAA ?? null, item.alphaAcid, row.amountNeeded).amount;
}

/** Same as totalsByItem, but using effectiveAmount per row — this is what
 * should actually be subtracted from stock. */
export function effectiveTotalsByItem(rows: IngredientRow[], items: InventoryItem[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.matchedItemId) {
      totals.set(row.matchedItemId, (totals.get(row.matchedItemId) ?? 0) + effectiveAmount(row, items));
    }
  }
  return totals;
}

export interface ShortIngredient {
  itemId: string;
  name: string;
  needed: number;
  have: number;
  unit: string;
  substitute?: HopSubstitution;
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
  // Effective (AA-adjusted) totals, not raw — a Boil hop's real inventory AA
  // can differ from what the recipe assumed, and comparing against the raw
  // sum was flagging items as short that the adjusted math actually covers
  // (see DeductPanel, which already used the adjusted total for the real
  // deduction — this brings the feasibility check in line with it).
  const totals = effectiveTotalsByItem(rows, items);

  const short: ShortIngredient[] = [];
  for (const [itemId, needed] of totals) {
    const item = items.find((i) => i.id === itemId);
    if (!item || item.amount >= needed) continue;

    let substitute: HopSubstitution | undefined;
    if (item.category === "hops") {
      // Only suggest covering the gap, not replacing a whole addition — you
      // can use up what you've actually got first (e.g. 3.5oz of your own
      // 4.5oz-needed Simcoe) and just top up the ~1oz shortfall with
      // something else, rather than being told to swap out an entire
      // addition's worth. `needed` is already AA-adjusted to this item's
      // real potency (see effectiveTotalsByItem above), so the shortfall
      // is expressed in "oz of this item, at its real AA" terms — that's
      // the correct basis for converting into a substitute's oz, not the
      // recipe's originally-assumed AA for any one addition.
      const hopRows = rows.filter((r) => r.matchedItemId === itemId && r.category === "hops");
      const dominant = hopRows.reduce((a, b) => (b.amountNeeded > a.amountNeeded ? b : a));
      const shortfall = needed - item.amount;
      substitute = suggestHopSubstitute(item.name, dominant.use ?? "", shortfall, item.alphaAcid ?? null, items) ?? undefined;
    }

    short.push({ itemId, name: item.name, needed, have: item.amount, unit: item.unit, substitute });
  }

  const unmatched = rows.filter((r) => !r.matchedItemId).map((r) => r.ingredientName);

  return { ready: short.length === 0, short, unmatched };
}
