import type { IngredientCategory, InventoryItem } from "../types";

function normalizeCompact(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[(),-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Recipe ingredient names rarely match inventory names exactly ("Premium
 * Pilsner Malt" vs "Pilsner", "Oats, Flaked" vs "Flaked Oats", "LALBREW
 * NOVALAGER" vs "Nova Lager"). Scores 0-1: 1 for an exact match ignoring
 * punctuation/case, ~0.9 when one name contains the other with punctuation
 * stripped (catches brand-prefix and word-order variants), otherwise the
 * fraction of shared words. */
export function matchScore(a: string, b: string): number {
  const compactA = normalizeCompact(a);
  const compactB = normalizeCompact(b);
  let compactScore = 0;
  if (compactA && compactA === compactB) compactScore = 1;
  else if (compactA && compactB && (compactA.includes(compactB) || compactB.includes(compactA))) compactScore = 0.9;

  const tokensA = new Set(normalizeTokens(a));
  const tokensB = new Set(normalizeTokens(b));
  const intersection = [...tokensA].filter((t) => tokensB.has(t));
  const union = new Set([...tokensA, ...tokensB]);
  const tokenScore = union.size ? intersection.length / union.size : 0;

  return Math.max(compactScore, tokenScore);
}

// Below this, two names sharing just one generic word (e.g. both containing
// "Malt") isn't enough signal to auto-select a match — that risks silently
// deducting from the wrong item. Below the bar, the ingredient is left
// unmatched for a person to map by hand instead.
const SUGGEST_THRESHOLD = 0.5;

export function suggestMatch(
  ingredientName: string,
  category: IngredientCategory,
  items: InventoryItem[]
): InventoryItem | null {
  let best: InventoryItem | null = null;
  let bestScore = 0;
  for (const item of items) {
    if (item.category !== category) continue;
    const score = matchScore(ingredientName, item.name);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return bestScore >= SUGGEST_THRESHOLD ? best : null;
}
