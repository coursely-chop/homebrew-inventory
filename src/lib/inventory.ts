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

const SEALED_MONTHLY_DECAY = 0.0075;
const OPENED_MONTHLY_DECAY = 0.025;

/** One-time default for a hop's "sealed" toggle: this app's usual full
 * purchase sizes are a 16oz bag or a 1lb bag, so still being at or above
 * that amount reads as "probably never opened." Amount alone can't
 * actually prove that (a partly-used bag could get topped back up, a
 * small single-ounce packet starts under the bar while genuinely sealed),
 * so this is only a starting guess — sealed stays a real, user-editable
 * field after that. */
export function defaultSealed(amount: number, unit: string): boolean {
  if (unit === "oz") return amount >= 16;
  if (unit === "lb") return amount >= 1;
  return false;
}

/** Today's estimated real potency, decaying the label AA% from purchase
 * date at ~0.75%/month sealed or ~2.5%/month opened (opened hops oxidize
 * faster) — used anywhere bittering math should reflect actual potency
 * instead of what the package said on day one. Falls back to the label
 * value unadjusted when there's no known purchase date (nothing to decay
 * from) or no recorded AA% at all. */
export function effectiveAlphaAcid(item: InventoryItem): number | undefined {
  if (item.alphaAcid === undefined) return undefined;
  const days = daysSincePurchase(item);
  if (days === null || days <= 0) return item.alphaAcid;
  const monthsSinceAdded = days / 30.44;
  const rate = item.sealed ? SEALED_MONTHLY_DECAY : OPENED_MONTHLY_DECAY;
  return Math.max(item.alphaAcid * (1 - rate * monthsSinceAdded), 0);
}

// AA% loss at or above this fraction reads as fully "degraded" (the
// orange end of the scale) — beyond a point, further decay isn't worth
// distinguishing visually.
const DEGRADATION_CAP = 0.15;

// Three color stops the degradation scale interpolates through: green
// (freshest known state) -> yellow (halfway to DEGRADATION_CAP) -> orange
// (at or past DEGRADATION_CAP).
const DEGRADATION_STOPS: { h: number; s: number; l: number }[] = [
  { h: 130, s: 55, l: 45 }, // green
  { h: 50, s: 70, l: 50 }, // yellow
  { h: 25, s: 80, l: 50 }, // orange
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Subtle row-background tint for a hop, scaling with how much AA% it's
 * lost — green at no loss, through yellow, to orange as loss approaches
 * DEGRADATION_CAP. Low alpha over the theme's own background (rather than
 * a fixed light color) so it reads correctly in dark mode too. Undefined
 * (no tint) for non-hops, missing AA%, or unknown purchase date — "we
 * don't know" shouldn't render as if it were confirmed freshest. */
export function degradationBackground(item: InventoryItem): string | undefined {
  if (item.category !== "hops" || item.alphaAcid === undefined) return undefined;
  const days = daysSincePurchase(item);
  if (days === null) return undefined;
  const eff = effectiveAlphaAcid(item);
  if (eff === undefined) return undefined;
  const lossFraction = Math.max(1 - eff / item.alphaAcid, 0);
  const t = Math.min(lossFraction / DEGRADATION_CAP, 1);

  const segment = t <= 0.5 ? 0 : 1;
  const localT = t <= 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
  const from = DEGRADATION_STOPS[segment];
  const to = DEGRADATION_STOPS[segment + 1];
  const h = lerp(from.h, to.h, localT);
  const s = lerp(from.s, to.s, localT);
  const l = lerp(from.l, to.l, localT);
  const alpha = 0.1 + 0.12 * t;
  return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
}
