import { createContext, useContext, useState, type ReactNode } from "react";
import { addItem, deleteItem, loadData, saveItem, saveItems } from "./storage";
import { addDeductionLogEntry, loadDeductionLog, markDeductionUndone } from "./deductionLog";
import { pushLocalToCloud } from "./cloudSync";
import { slugify } from "./slug";
import type { DeductionLineItem, DeductionLogEntry, InventoryData, InventoryItem } from "../types";

export interface NewItemInput {
  category: InventoryItem["category"];
  name: string;
  amount: number;
  unit: string;
  notes: string;
  alphaAcid?: number;
}

export interface DeductionRequest {
  itemId: string;
  amountRequested: number;
}

interface InventoryContextValue {
  items: InventoryItem[];
  deductionLog: DeductionLogEntry[];
  createItem: (input: NewItemInput) => void;
  updateItem: (item: InventoryItem) => void;
  removeItem: (itemId: string) => void;
  /** Applies several item deductions as one atomic save and records a
   * recoverable log entry for it. Each requested amount is clamped to what
   * the item actually has on hand — the log records what was actually
   * subtracted, not what was asked for, so undo can restore exactly that
   * much without fabricating stock that was never really there. */
  deductBatch: (recipeId: string, recipeName: string, deltas: DeductionRequest[]) => void;
  /** Records a history entry WITHOUT touching current stock — for a brew
   * that already happened and whose consumption is already reflected in
   * inventory some other way (e.g. backfilling from before this feature
   * existed). Amounts are exactly what's passed in, not clamped, since
   * there's no live stock check to clamp against. */
  logPastDeduction: (recipeId: string, recipeName: string, deductedAt: string, items: DeductionLineItem[]) => void;
  /** Reverses a not-yet-undone, inventory-applying log entry, adding its
   * recorded amounts back to current stock, and marks the entry undone
   * (kept, not deleted). No-ops for a log-only entry (appliedToInventory:
   * false) — there's nothing to add back. */
  undoDeduction: (logId: string) => void;
  /** Re-reads localStorage into state — used by the cloud-sync
   * reconciliation when the cloud copy wins on load. */
  reload: () => void;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<InventoryData>(() => loadData());
  const [deductionLog, setDeductionLog] = useState<DeductionLogEntry[]>(() => loadDeductionLog());

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
      alphaAcid: input.alphaAcid,
      // A newly logged purchase, not baseline stock — gets real freshness tracking.
      purchaseDate: new Date().toISOString(),
    };
    setData(addItem(item));
    pushLocalToCloud();
  }

  function updateItem(item: InventoryItem) {
    setData(saveItem(item));
    pushLocalToCloud();
  }

  function removeItem(itemId: string) {
    setData(deleteItem(itemId));
    pushLocalToCloud();
  }

  function deductBatch(recipeId: string, recipeName: string, deltas: DeductionRequest[]) {
    const lineItems: DeductionLogEntry["items"] = [];
    const updatedItems = data.items.map((item) => {
      const delta = deltas.find((d) => d.itemId === item.id);
      if (!delta) return item;
      const actual = Math.min(delta.amountRequested, item.amount);
      if (actual > 0) lineItems.push({ itemId: item.id, name: item.name, unit: item.unit, amount: actual });
      return { ...item, amount: item.amount - actual };
    });
    setData(saveItems(updatedItems));

    const entry: DeductionLogEntry = {
      id: crypto.randomUUID(),
      recipeId,
      recipeName,
      deductedAt: new Date().toISOString(),
      items: lineItems,
      undoneAt: null,
      appliedToInventory: true,
    };
    setDeductionLog(addDeductionLogEntry(entry));
    pushLocalToCloud();
  }

  function logPastDeduction(recipeId: string, recipeName: string, deductedAt: string, items: DeductionLineItem[]) {
    const entry: DeductionLogEntry = {
      id: crypto.randomUUID(),
      recipeId,
      recipeName,
      deductedAt,
      items,
      undoneAt: null,
      appliedToInventory: false,
    };
    setDeductionLog(addDeductionLogEntry(entry));
    pushLocalToCloud();
  }

  function undoDeduction(logId: string) {
    const entry = deductionLog.find((e) => e.id === logId);
    if (!entry || entry.undoneAt || !entry.appliedToInventory) return;
    const updatedItems = data.items.map((item) => {
      const line = entry.items.find((l) => l.itemId === item.id);
      return line ? { ...item, amount: item.amount + line.amount } : item;
    });
    setData(saveItems(updatedItems));
    setDeductionLog(markDeductionUndone(logId, new Date().toISOString()));
    pushLocalToCloud();
  }

  function reload() {
    setData(loadData());
    setDeductionLog(loadDeductionLog());
  }

  return (
    <InventoryContext.Provider
      value={{
        items: data.items,
        deductionLog,
        createItem,
        updateItem,
        removeItem,
        deductBatch,
        logPastDeduction,
        undoDeduction,
        reload,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory(): InventoryContextValue {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within an InventoryProvider");
  return ctx;
}
