import { HOP_SUBSTITUTES } from "../data/hopSubstitutes";
import { normalizeCompact } from "./ingredientMatch";
import { effectiveAlphaAcid } from "./inventory";
import type { InventoryItem } from "../types";

/** Candidate substitute names for a hop, per the AHA chart-derived map —
 * case/punctuation-insensitive lookup since recipe names vary ("Idaho #7"
 * vs "Idaho 7"). */
export function findSubstituteNames(hopName: string): string[] {
  const target = normalizeCompact(hopName);
  const entry = Object.entries(HOP_SUBSTITUTES).find(([name]) => normalizeCompact(name) === target);
  return entry?.[1] ?? [];
}

/** A dry-hop/hop-stand swap only needs to be flavor-similar, so the amount
 * carries over unchanged. A boil addition contributes bitterness, so
 * swapping hops with different alpha acid % at a 1:1 weight would change the
 * batch's IBU — this scales weight to preserve total alpha acid units
 * (weight × AA%) instead. Falls back to the unadjusted amount whenever
 * either AA% isn't known yet, rather than guessing. */
export function computeEffectiveAmount(
  isBoil: boolean,
  recipeAA: number | null,
  inventoryAA: number | undefined,
  amountNeeded: number
): { amount: number; aaAdjusted: boolean } {
  if (isBoil && recipeAA && inventoryAA) {
    return { amount: amountNeeded * (recipeAA / inventoryAA), aaAdjusted: true };
  }
  return { amount: amountNeeded, aaAdjusted: false };
}

export interface HopSubstitution {
  item: InventoryItem;
  amountNeeded: number;
  /** "aa-adjusted": boil addition, weight scaled by AA ratio. "unadjusted":
   * hop-stand/dry-hop, or a boil addition where AA% isn't recorded yet on
   * one side (falls back to a straight gram-for-gram swap). */
  status: "aa-adjusted" | "unadjusted";
}

/** Best substitute for a short hop, restricted to the specific pairings in
 * hopSubstitutes.ts — actually has enough stock to cover the (AA-adjusted,
 * if applicable) amount needed. Returns null if the hop has no listed
 * substitute or nothing listed has sufficient stock either. */
export function suggestHopSubstitute(
  hopName: string,
  use: string,
  amountNeeded: number,
  recipeAA: number | null,
  items: InventoryItem[]
): HopSubstitution | null {
  const candidateNames = new Set(findSubstituteNames(hopName).map(normalizeCompact));
  if (candidateNames.size === 0) return null;
  const isBoil = use === "Boil";

  let best: HopSubstitution | null = null;
  for (const item of items) {
    if (item.category !== "hops") continue;
    if (!candidateNames.has(normalizeCompact(item.name))) continue;

    const { amount, aaAdjusted } = computeEffectiveAmount(isBoil, recipeAA, effectiveAlphaAcid(item), amountNeeded);
    if (item.amount < amount) continue; // this candidate is also short

    if (!best || item.amount > best.item.amount) {
      best = { item, amountNeeded: amount, status: aaAdjusted ? "aa-adjusted" : "unadjusted" };
    }
  }
  return best;
}
