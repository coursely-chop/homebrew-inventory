import type { ShoppingListItem } from "../types";

export const STORAGE_KEY = "homebrew-shopping-list-data";

export function loadShoppingListItems(): ShoppingListItem[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as ShoppingListItem[]) : [];
}

function save(items: ShoppingListItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addShoppingListItem(item: ShoppingListItem): ShoppingListItem[] {
  const items = [...loadShoppingListItems(), item];
  save(items);
  return items;
}

export function deleteShoppingListItem(id: string): ShoppingListItem[] {
  const items = loadShoppingListItems().filter((i) => i.id !== id);
  save(items);
  return items;
}
