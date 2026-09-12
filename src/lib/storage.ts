import seedData from "../data/seed-inventory.json";
import type { InventoryData, InventoryItem } from "../types";

const STORAGE_KEY = "homebrew-inventory-data";

export function loadData(): InventoryData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw) as InventoryData;

  const initial = seedData as InventoryData;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveData(data: InventoryData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Adds a new item (real purchaseDate — this is a fresh purchase, not baseline stock). */
export function addItem(item: InventoryItem): InventoryData {
  const data = loadData();
  const next: InventoryData = { items: [...data.items, item] };
  saveData(next);
  return next;
}

/** Replaces one item in storage (by id) and persists the whole data set. */
export function saveItem(item: InventoryItem): InventoryData {
  const data = loadData();
  const next: InventoryData = { items: data.items.map((i) => (i.id === item.id ? item : i)) };
  saveData(next);
  return next;
}

/** Permanently removes an item. */
export function deleteItem(itemId: string): InventoryData {
  const data = loadData();
  const next: InventoryData = { items: data.items.filter((i) => i.id !== itemId) };
  saveData(next);
  return next;
}
