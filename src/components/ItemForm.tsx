import { useState, type FormEvent } from "react";
import type { IngredientCategory, InventoryItem } from "../types";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "../lib/inventory";

export interface ItemFormValues {
  category: IngredientCategory;
  name: string;
  amount: number;
  unit: string;
  notes: string;
}

interface ItemFormProps {
  initial?: InventoryItem;
  defaultCategory?: IngredientCategory;
  onSubmit: (values: ItemFormValues) => void;
  onCancel: () => void;
}

export function ItemForm({ initial, defaultCategory, onSubmit, onCancel }: ItemFormProps) {
  const [category, setCategory] = useState<IngredientCategory>(initial?.category ?? defaultCategory ?? "hops");
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [unit, setUnit] = useState(initial?.unit ?? (defaultCategory === "yeast" ? "packet" : "oz"));
  const [notes, setNotes] = useState(initial?.notes ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!name.trim() || Number.isNaN(parsedAmount)) return;
    onSubmit({ category, name: name.trim(), amount: parsedAmount, unit: unit.trim(), notes: notes.trim() });
  }

  return (
    <form className="item-form" onSubmit={handleSubmit}>
      <div className="item-form-row">
        <select value={category} onChange={(e) => setCategory(e.target.value as IngredientCategory)}>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="item-form-row">
        <input
          type="number"
          step="any"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input type="text" placeholder="Unit (oz, lb, packet)" value={unit} onChange={(e) => setUnit(e.target.value)} />
      </div>
      <input type="text" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="item-form-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit">{initial ? "Save" : "Add"}</button>
      </div>
    </form>
  );
}
