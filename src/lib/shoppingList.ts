import { buildIngredientRows } from "./recipeIngredients";
import type { IngredientCategory, InventoryItem, Recipe } from "../types";

export interface ShoppingListLine {
  itemId: string;
  name: string;
  category: IngredientCategory;
  have: number;
  needed: number;
  toBuy: number;
  unit: string;
  /** Perennial recipes whose need contributed to this line. */
  usedIn: string[];
}

export interface UnmatchedNeed {
  ingredientName: string;
  category: IngredientCategory;
  usedIn: string[];
}

export interface ShoppingList {
  lines: ShoppingListLine[];
  unmatched: UnmatchedNeed[];
}

/** What to go buy: ingredients needed across all perennial (standing-
 * rotation) recipes combined, where the combined need exceeds what's on
 * hand. A shortage only lands here because a recipe Ben actually keeps
 * brewing needs it — a one-off recipe being short on something doesn't put
 * it on the list. Demand from multiple perennial recipes needing the same
 * item is summed, not just flagged once. */
export function buildShoppingList(perennialRecipes: Recipe[], items: InventoryItem[]): ShoppingList {
  const neededByItem = new Map<string, { amount: number; recipes: Set<string> }>();
  const neededUnmatched = new Map<string, { category: IngredientCategory; recipes: Set<string> }>();

  for (const recipe of perennialRecipes) {
    const rows = buildIngredientRows(recipe, items);
    for (const row of rows) {
      if (row.matchedItemId) {
        const entry = neededByItem.get(row.matchedItemId) ?? { amount: 0, recipes: new Set() };
        entry.amount += row.amountNeeded;
        entry.recipes.add(recipe.name);
        neededByItem.set(row.matchedItemId, entry);
      } else {
        const key = `${row.category}:${row.rawName}`;
        const entry = neededUnmatched.get(key) ?? { category: row.category, recipes: new Set() };
        entry.recipes.add(recipe.name);
        neededUnmatched.set(key, entry);
      }
    }
  }

  const lines: ShoppingListLine[] = [];
  for (const [itemId, { amount, recipes }] of neededByItem) {
    const item = items.find((i) => i.id === itemId);
    if (!item || item.amount >= amount) continue;
    lines.push({
      itemId,
      name: item.name,
      category: item.category,
      have: item.amount,
      needed: amount,
      toBuy: amount - item.amount,
      unit: item.unit,
      usedIn: [...recipes].sort(),
    });
  }
  lines.sort((a, b) => a.name.localeCompare(b.name));

  const unmatched: UnmatchedNeed[] = [...neededUnmatched.entries()]
    .map(([key, { category, recipes }]) => ({
      ingredientName: key.slice(category.length + 1),
      category,
      usedIn: [...recipes].sort(),
    }))
    .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));

  return { lines, unmatched };
}
