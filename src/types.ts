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
