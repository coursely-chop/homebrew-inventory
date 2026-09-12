import { useState } from "react";
import { useInventory } from "../lib/InventoryContext";
import { suggestMatch } from "../lib/ingredientMatch";
import { round } from "../lib/format";
import type { IngredientCategory, Recipe } from "../types";

interface DeductRow {
  key: string;
  ingredientName: string;
  category: IngredientCategory;
  amountNeeded: number;
  unit: string;
  matchedItemId: string | null;
}

function buildRows(recipe: Recipe, items: ReturnType<typeof useInventory>["items"]): DeductRow[] {
  const rows: DeductRow[] = [];

  recipe.fermentables.forEach((f, i) => {
    rows.push({
      key: `f${i}`,
      ingredientName: f.name,
      category: "grain",
      amountNeeded: f.amountLb,
      unit: "lb",
      matchedItemId: suggestMatch(f.name, "grain", items)?.id ?? null,
    });
  });

  recipe.hops.forEach((h, i) => {
    rows.push({
      key: `h${i}`,
      ingredientName: `${h.name} (${h.use})`,
      category: "hops",
      amountNeeded: h.amountOz,
      unit: "oz",
      matchedItemId: suggestMatch(h.name, "hops", items)?.id ?? null,
    });
  });

  recipe.yeasts.forEach((y, i) => {
    if (y.amountIsWeight) return;
    rows.push({
      key: `y${i}`,
      ingredientName: y.name,
      category: "yeast",
      amountNeeded: y.amount,
      unit: "packet",
      matchedItemId: suggestMatch(y.name, "yeast", items)?.id ?? null,
    });
  });

  return rows;
}

export function DeductPanel({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const { items, updateItem } = useInventory();
  const [rows, setRows] = useState<DeductRow[]>(() => buildRows(recipe, items));
  const [done, setDone] = useState(false);

  function setMatch(key: string, itemId: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, matchedItemId: itemId || null } : r)));
  }

  // Several recipe rows (e.g. the same hop added at Boil, Hop Stand, and Dry
  // Hop) commonly map to one inventory item — deduction has to sum those
  // before touching the stored amount, not subtract once per row against a
  // stale read of the same item.
  const totalsByItem = new Map<string, number>();
  for (const row of rows) {
    if (row.matchedItemId) {
      totalsByItem.set(row.matchedItemId, (totalsByItem.get(row.matchedItemId) ?? 0) + row.amountNeeded);
    }
  }

  function handleConfirm() {
    for (const [itemId, amountNeeded] of totalsByItem) {
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
            const totalNeeded = row.matchedItemId ? totalsByItem.get(row.matchedItemId)! : null;
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
