import { useState } from "react";
import { useInventory } from "../lib/InventoryContext";
import { buildIngredientRows, totalsByItem, type IngredientRow } from "../lib/recipeIngredients";
import { round } from "../lib/format";
import type { Recipe } from "../types";

export function DeductPanel({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const { items, updateItem } = useInventory();
  const [rows, setRows] = useState<IngredientRow[]>(() => buildIngredientRows(recipe, items));
  const [done, setDone] = useState(false);

  function setMatch(key: string, itemId: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, matchedItemId: itemId || null } : r)));
  }

  const totals = totalsByItem(rows);

  function handleConfirm() {
    for (const [itemId, amountNeeded] of totals) {
      const item = items.find((i) => i.id === itemId);
      if (!item) continue;
      updateItem({ ...item, amount: Math.max(0, item.amount - amountNeeded) });
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="deduct-panel">
        <p className="import-status ok">Inventory updated.</p>
        <button type="button" className="secondary" onClick={onClose}>
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="deduct-panel">
      <h3>Deduct ingredients for this batch</h3>
      <table>
        <thead>
          <tr>
            <th>Ingredient</th>
            <th>Needed</th>
            <th>Inventory item</th>
            <th>After</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const matched = items.find((i) => i.id === row.matchedItemId) ?? null;
            const totalNeeded = row.matchedItemId ? totals.get(row.matchedItemId)! : null;
            const after = matched && totalNeeded !== null ? matched.amount - totalNeeded : null;
            const short = after !== null && after < 0;
            return (
              <tr key={row.key}>
                <td>{row.ingredientName}</td>
                <td className="num">
                  {round(row.amountNeeded, 2)} {row.unit}
                </td>
                <td>
                  <select value={row.matchedItemId ?? ""} onChange={(e) => setMatch(row.key, e.target.value)}>
                    <option value="">— don't deduct —</option>
                    {items
                      .filter((i) => i.category === row.category)
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({round(i.amount, 2)} {i.unit})
                        </option>
                      ))}
                  </select>
                </td>
                <td className={`num${short ? " short" : ""}`}>
                  {after === null ? "—" : `${round(Math.max(after, 0), 2)} ${matched?.unit}${short ? " (short)" : ""}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="deduct-actions">
        <button type="button" className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" onClick={handleConfirm}>
          Confirm &amp; deduct
        </button>
      </div>
    </div>
  );
}
