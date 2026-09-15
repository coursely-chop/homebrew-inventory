import { createContext, useContext, useState, type ReactNode } from "react";
import { addShoppingListItem, deleteShoppingListItem, loadShoppingListItems } from "./shoppingListStorage";
import { pushLocalToCloud } from "./cloudSync";
import { slugify } from "./slug";
import type { IngredientCategory, ShoppingListItem } from "../types";

export interface NewShoppingListItemInput {
  category: IngredientCategory;
  name: string;
  notes: string;
}

interface ShoppingListContextValue {
  items: ShoppingListItem[];
  addItem: (input: NewShoppingListItemInput) => void;
  removeItem: (id: string) => void;
  /** Re-reads localStorage into state — used by the cloud-sync
   * reconciliation when the cloud copy wins on load. */
  reload: () => void;
}

const ShoppingListContext = createContext<ShoppingListContextValue | null>(null);

export function ShoppingListProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ShoppingListItem[]>(() => loadShoppingListItems());

  function addItem(input: NewShoppingListItemInput) {
    const id = slugify(
      input.name,
      items.map((i) => i.id)
    );
    const item: ShoppingListItem = { id, category: input.category, name: input.name, notes: input.notes };
    setItems(addShoppingListItem(item));
    pushLocalToCloud();
  }

  function removeItem(id: string) {
    setItems(deleteShoppingListItem(id));
    pushLocalToCloud();
  }

  function reload() {
    setItems(loadShoppingListItems());
  }

  return (
    <ShoppingListContext.Provider value={{ items, addItem, removeItem, reload }}>
      {children}
    </ShoppingListContext.Provider>
  );
}

export function useShoppingListItems(): ShoppingListContextValue {
  const ctx = useContext(ShoppingListContext);
  if (!ctx) throw new Error("useShoppingListItems must be used within a ShoppingListProvider");
  return ctx;
}
