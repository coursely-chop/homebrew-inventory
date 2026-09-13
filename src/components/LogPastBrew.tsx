import { useState } from "react";
import { useInventory } from "../lib/InventoryContext";
import { useRecipes } from "../lib/RecipeContext";
import { buildIngredientRows, effectiveTotalsByItem } from "../lib/recipeIngredients";
import { round } from "../lib/format";
import type { DeductionLineItem } from "../types";

interface EditableLine extends DeductionLineItem {
  key: string;
}

function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LogPastBrew() {
  const { items, logPastDeduction } = useInventory();
  const { recipes } = useRecipes();
  const [open, setOpen] = useState(false);
  const [recipeId, setRecipeId] = useState("");
  const [date, setDate] = useState(todayDateInputValue());
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [addItemId, setAddItemId] = useState("");

  function handleSelectRecipe(id: string) {
    setRecipeId(id);
    setStatus(null);
    const recipe = recipes.find((r) => r.id === id);
    if (!recipe) {
      setLines([]);
      return;
    }
    const rows = buildIngredientRows(recipe, items);
    const totals = effectiveTotalsByItem(rows, items);
    const built: EditableLine[] = [];
    for (const [itemId, amount] of totals) {
      const item = items.find((i) => i.id === itemId);
      if (!item) continue;
      built.push({ key: itemId, itemId, name: item.name, unit: item.unit, amount: round(amount, 2) });
    }
    setLines(built);
  }

  function updateLineAmount(key: string, amount: number) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, amount } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function handleAddItem() {
    if (!addItemId) return;
    const item = items.find((i) => i.id === addItemId);
    if (!item || lines.some((l) => l.itemId === item.id)) return;
    setLines((prev) => [...prev, { key: item.id, itemId: item.id, name: item.name, unit: item.unit, amount: 0 }]);
    setAddItemId("");
  }

  function handleSubmit() {
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) return;
    const nonZero = lines.filter((l) => l.amount > 0).map(({ key: _key, ...line }) => line);
    if (nonZero.length === 0) {
      setStatus("Nothing to log — every amount is zero.");
      return;
    }
    const deductedAt = new Date(`${date}T12:00:00.000Z`).toISOString();
    logPastDeduction(recipe.id, recipe.name, deductedAt, nonZero);
    setStatus(`Logged ${recipe.name} to history.`);
    setOpen(false);
    setRecipeId("");
    setLines([]);
  }

  if (!open) {
    return (
      <div className="log-past-brew">
        <button type="button" className="secondary" onClick={() => setOpen(true)}>
          + Log a past brew
        </button>
        {status && <p className="import-status ok">{status}</p>}
      </div>
    );
  }

  return (
    <div className="log-past-brew-form">
      <h3>Log a past brew</h3>
      <p className="log-past-brew-note">
        Records history only — this won't change current inventory. Use it when a brew's consumption is already
        reflected some other way (or happened before this history existed).
      </p>

      <div className="item-form-row">
        <select value={recipeId} onChange={(e) => handleSelectRecipe(e.target.value)}>
          <option value="">Choose a recipe…</option>
          {recipes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {lines.length > 0 && (
        <table className="log-past-brew-table">
          <tbody>
            {lines.map((line) => (
              <tr key={line.key}>
                <td>{line.name}</td>
                <td className="num">
                  <input
                    type="number"
                    step="any"
                    value={line.amount}
                    onChange={(e) => updateLineAmount(line.key, parseFloat(e.target.value) || 0)}
                  />
                  {line.unit}
                </td>
                <td>
                  <button type="button" className="row-menu-trigger" onClick={() => removeLine(line.key)} aria-label={`Remove ${line.name}`}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {recipeId && (
        <div className="item-form-row">
          <select value={addItemId} onChange={(e) => setAddItemId(e.target.value)}>
            <option value="">Add an ingredient not matched above…</option>
            {items
              .filter((i) => !lines.some((l) => l.itemId === i.id))
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
          </select>
          <button type="button" className="secondary" onClick={handleAddItem} disabled={!addItemId}>
            Add
          </button>
        </div>
      )}

      {status && <p className="import-status error">{status}</p>}

      <div className="item-form-actions">
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setOpen(false);
            setRecipeId("");
            setLines([]);
            setStatus(null);
          }}
        >
          Cancel
        </button>
        <button type="button" onClick={handleSubmit} disabled={!recipeId}>
          Log this brew
        </button>
      </div>
    </div>
  );
}
