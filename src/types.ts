export type IngredientCategory = "hops" | "grain" | "yeast" | "misc";

export interface InventoryItem {
  id: string;
  category: IngredientCategory;
  name: string;
  amount: number;
  unit: string;
  notes: string;
  /** Alpha acid %, hops only — from the package at purchase. Lets boil-hop
   * substitution scale weight to preserve bitterness instead of a 1:1 gram
   * swap. Undefined until entered; substitution math falls back to an
   * unadjusted amount wherever it's missing. */
  alphaAcid?: number;
  /** Hops only — whether the package is still its original unopened size.
   * Alpha acid decays faster once opened (more oxygen exposure), so this
   * picks which decay rate effectiveAlphaAcid() applies. Undefined is
   * treated as opened (the more conservative assumption). */
  sealed?: boolean;
  /** ISO date this item was added under real freshness tracking, or null for
   * baseline stock imported at launch with unknown purchase date (see PRD:
   * no backfilling historical purchase dates). */
  purchaseDate: string | null;
}

/** A manually-added shopping list entry — independent of the auto-computed
 * shortage lines (see shoppingList.ts), for anything Ben wants to remember
 * to buy that isn't necessarily a perennial-recipe shortfall. */
export interface ShoppingListItem {
  id: string;
  category: IngredientCategory;
  name: string;
  notes: string;
}

export interface InventoryData {
  items: InventoryItem[];
}

export interface DeductionLineItem {
  itemId: string;
  name: string;
  unit: string;
  /** What was actually subtracted — clamped to what was on hand, so it's
   * never more than the item actually had (and undo can restore exactly
   * this much without fabricating stock that was never really there). */
  amount: number;
}

export interface DeductionLogEntry {
  id: string;
  recipeId: string;
  recipeName: string;
  deductedAt: string;
  items: DeductionLineItem[];
  /** Set when undone — kept in the log rather than deleted, so the record
   * of "this happened, then was reversed" survives. */
  undoneAt: string | null;
  /** False for an entry backfilled via "Log a past brew" — recorded purely
   * as history, without touching current stock (e.g. because it already
   * happened, or was already accounted for another way). Undo only makes
   * sense when this is true; otherwise "restoring" would add stock back
   * that this entry never actually removed. */
  appliedToInventory: boolean;
}

export interface Fermentable {
  name: string;
  type: string;
  amountLb: number;
  yieldPct: number;
  colorLovibond: number;
}

export interface HopAddition {
  name: string;
  alpha: number;
  amountOz: number;
  use: string;
  time: number;
  form: string;
  temperatureF: number | null;
}

export interface YeastAddition {
  name: string;
  form: string;
  /** Packet count when amountIsWeight is false (the common case for dry
   * yeast, which is how inventory tracks it) — otherwise a weight this app
   * doesn't yet convert, so deduction skips it rather than guessing. */
  amount: number;
  amountIsWeight: boolean;
  displayAmount: string;
  attenuation: number;
}

export interface MiscAddition {
  name: string;
  displayAmount: string;
  time: number;
  type: string;
  use: string;
}

export interface MashStep {
  name: string;
  type: string;
  stepTimeMin: number;
  stepTempF: number;
  rampTimeMin: number;
  endTempF: number;
}

export interface Recipe {
  id: string;
  name: string;
  styleName: string;
  batchSizeGal: number;
  boilTimeMin: number;
  efficiencyPct: number;
  estOG: number;
  estFG: number;
  ibu: number;
  estABV: number;
  estColorSRM: number;
  fermentables: Fermentable[];
  hops: HopAddition[];
  yeasts: YeastAddition[];
  miscs: MiscAddition[];
  mashSteps: MashStep[];
  fermentationStages: number;
  primaryAgeDays: number;
  primaryTempF: number;
  notes: string;
  /** Grainfather has no public API — BeerXML export/import, done manually per
   * recipe, is the realistic path (see PRD). Kept so the recipe list can show
   * where each entry came from once manual entry exists alongside import. */
  sourceFile: string;
  importedAt: string;
  /** A recipe Ben keeps coming back to (his "standing rotation" — see PRD's
   * Seasonal Rotation section), as opposed to a one-off. Drives the shopping
   * list: a shortage only becomes a "go buy this" line when it blocks a
   * perennial recipe, not just any recipe ever imported. */
  perennial: boolean;
}
