export type IngredientCategory = "hops" | "grain" | "yeast" | "misc";

export interface InventoryItem {
  id: string;
  category: IngredientCategory;
  name: string;
  amount: number;
  unit: string;
  notes: string;
  /** ISO date this item was added under real freshness tracking, or null for
   * baseline stock imported at launch with unknown purchase date (see PRD:
   * no backfilling historical purchase dates). */
  purchaseDate: string | null;
}

export interface InventoryData {
  items: InventoryItem[];
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
}
