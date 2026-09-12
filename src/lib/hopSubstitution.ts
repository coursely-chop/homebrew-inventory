import { HOP_FAMILIES } from "../data/hopFamilies";
import { normalizeCompact } from "./ingredientMatch";
import type { InventoryItem } from "../types";

export function findHopFamily(hopName: string): string[] | null {
  const target = normalizeCompact(hopName);
  return HOP_FAMILIES.find((family) => family.some((n) => normalizeCompact(n) === target)) ?? null;
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

/** Best substitute for a short hop: same flavor family, actually has enough
 * stock to cover the (AA-adjusted, if applicable) amount needed. Returns
 * null if the hop isn't in any family group or nothing in its family has
 * sufficient stock either. */
export function suggestHopSubstitute(
  hopName: string,
  use: string,
  amountNeeded: number,
  recipeAA: number | null,
  items: InventoryItem[]
): HopSubstitution | null {
  const family = findHopFamily(hopName);
  if (!family) return null;
  const familyCompact = new Set(family.map(normalizeCompact));
  const targetCompact = normalizeCompact(hopName);
  const isBoil = use === "Boil";

  let best: HopSubstitution | null = null;
  for (const item of items) {
    if (item.category !== "hops") continue;
    const itemCompact = normalizeCompact(item.name);
    if (itemCompact === targetCompact || !familyCompact.has(itemCompact)) continue;

    const { amount, aaAdjusted } = computeEffectiveAmount(isBoil, recipeAA, item.alphaAcid, amountNeeded);
    if (item.amount < amount) continue; // this candidate is also short

    if (!best || item.amount > best.item.amount) {
      best = { item, amountNeeded: amount, status: aaAdjusted ? "aa-adjusted" : "unadjusted" };
    }
  }
  return best;
}
