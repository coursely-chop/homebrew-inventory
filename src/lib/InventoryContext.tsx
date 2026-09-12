import { createContext, useContext, useState, type ReactNode } from "react";
import { addItem, deleteItem, loadData, saveItem } from "./storage";
import { slugify } from "./slug";
import type { InventoryData, InventoryItem } from "../types";

export interface NewItemInput {
  category: InventoryItem["category"];
  name: string;
  amount: number;
  unit: string;
  notes: string;
}

interface InventoryContextValue {
  items: InventoryItem[];
  createItem: (input: NewItemInput) => void;
  updateItem: (item: InventoryItem) => void;
  removeItem: (itemId: string) => void;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<InventoryData>(() => loadData());

  function createItem(input: NewItemInput) {
    const id = slugify(
      input.name,
      data.items.map((i) => i.id)
    );
    const item: InventoryItem = {
      id,
      category: input.category,
      name: input.name,
      amount: input.amount,
      unit: input.unit,
      notes: input.notes,
      // A newly logged purchase, not baseline stock — gets real freshness tracking.
      purchaseDate: new Date().toISOString(),
    };
    setData(addItem(item));
  }

  function updateItem(item: InventoryItem) {
    setData(saveItem(item));
  }

  function removeItem(itemId: string) {
    setData(deleteItem(itemId));
  }

  return (
    <InventoryContext.Provider value={{ items: data.items, createItem, updateItem, removeItem }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory(): InventoryContextValue {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within an InventoryProvider");
  return ctx;
}
