import { useState } from "react";
import { useInventory } from "../lib/InventoryContext";
import { buildIngredientRows, effectiveAmount, effectiveTotalsByItem, type IngredientRow } from "../lib/recipeIngredients";
import { round } from "../lib/format";
import type { Recipe } from "../types";

interface DeductGroup {
  key: string;
  rawName: string;
  category: IngredientRow["category"];
  unit: string;
  rows: IngredientRow[];
}

/** One group per recipe ingredient — a hop added at Boil and again at Hop
 * Stand is one line ("3 oz of Motueka"), not two. */
function groupRows(rows: IngredientRow[]): DeductGroup[] {
  const groups = new Map<string, DeductGroup>();
  for (const row of rows) {
    const key = `${row.category}:${row.rawName}`;
    const group = groups.get(key);
    if (group) group.rows.push(row);
    else groups.set(key, { key, rawName: row.rawName, category: row.category, unit: row.unit, rows: [row] });
  }
  return [...groups.values()];
}

export function DeductPanel({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const { items, deductBatch } = useInventory();
  const [rows, setRows] = useState<IngredientRow[]>(() => buildIngredientRows(recipe, items));
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function setGroupMatch(group: DeductGroup, itemId: string) {
    const keys = new Set(group.rows.map((r) => r.key));
    setRows((prev) => prev.map((r) => (keys.has(r.key) ? { ...r, matchedItemId: itemId || null } : r)));
    setEditingKey(null);
  }

  const totals = effectiveTotalsByItem(rows, items);
  const groups = groupRows(rows);

  function handleConfirm() {
    const deltas = [...totals.entries()].map(([itemId, amountRequested]) => ({ itemId, amountRequested }));
    deductBatch(recipe.id, recipe.name, deltas);
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
      <h3>Deduct from inventory</h3>

      <div className="deduct-list">
        {groups.map((group) => {
          const matchedId = group.rows[0].matchedItemId;
          const matched = items.find((i) => i.id === matchedId) ?? null;
          const unit = matched?.unit ?? group.unit;
          const groupAmount = group.rows.reduce((sum, r) => sum + effectiveAmount(r, items), 0);
          const aaAdjusted = group.rows.some(
            (r) => r.category === "hops" && r.use === "Boil" && Math.abs(effectiveAmount(r, items) - r.amountNeeded) > 0.005
          );
          const totalForItem = matched ? totals.get(matched.id)! : null;
          const after = matched && totalForItem !== null ? matched.amount - totalForItem : null;
          const short = matched !== null && totalForItem !== null && round(matched.amount, 1) < round(totalForItem, 1);
          const title = matched?.name ?? group.rawName;
          const showRecipeName = matched && matched.name.toLowerCase() !== group.rawName.toLowerCase();
          const choosing = matched === null || editingKey === group.key;

          return (
            <section key={group.key} className="deduct-item">
              <div className="deduct-item-head">
                <h4>{title}</h4>
                {matched && (
                  <button
                    type="button"
                    className="link"
                    onClick={() => setEditingKey(editingKey === group.key ? null : group.key)}
                  >
                    {editingKey === group.key ? "Done" : "Change"}
                  </button>
                )}
              </div>
              {showRecipeName && <p className="deduct-recipe-name">Recipe calls it “{group.rawName}”</p>}

              {choosing && (
                <select value={matchedId ?? ""} onChange={(e) => setGroupMatch(group, e.target.value)}>
                  <option value="">— don't deduct —</option>
                  {items
                    .filter((i) => i.category === group.category)
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({round(i.amount, 2)} {i.unit})
                      </option>
                    ))}
                </select>
              )}

              {matched && (
                <dl className="deduct-lines">
                  <div>
                    <dt>This recipe</dt>
                    <dd>
                      {round(groupAmount, 2)} {unit}
                      {aaAdjusted && <span className="aa-note"> AA-adjusted</span>}
                    </dd>
                  </div>
                  <div>
                    <dt>In inventory</dt>
                    <dd>
                      {round(matched.amount, 2)} {unit}
                    </dd>
                  </div>
                  <div className={`deduct-after${short ? " short" : ""}`}>
                    <dt>New inventory</dt>
                    <dd>
                      {round(Math.max(after ?? 0, 0), 2)} {unit}
                      {short ? " (short)" : ""}
                    </dd>
                  </div>
                </dl>
              )}
            </section>
          );
        })}
      </div>

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
