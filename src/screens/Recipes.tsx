import { useState } from "react";
import { useRecipes } from "../lib/RecipeContext";
import { useInventory } from "../lib/InventoryContext";
import { ImportRecipe } from "../components/ImportRecipe";
import { RecipeDetail } from "../components/RecipeDetail";
import { checkFeasibility, type ShortIngredient } from "../lib/recipeIngredients";
import { round } from "../lib/format";

function shortLabel(s: ShortIngredient): string {
  if (!s.substitute) return s.name;
  const amount = `${round(s.substitute.amountNeeded, 2)} ${s.substitute.item.unit}`;
  const aaNote = s.substitute.status === "aa-adjusted" ? ", AA-adjusted" : "";
  return `${s.name} (try ${s.substitute.item.name}, ${amount}${aaNote})`;
}

export function Recipes() {
  const { recipes, removeRecipe } = useRecipes();
  const { items } = useInventory();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = recipes.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="recipes">
      <header className="recipes-header">
        <h1>Recipes</h1>
      </header>

      <ImportRecipe />

      {recipes.length === 0 ? (
        <p className="empty">No recipes imported yet.</p>
      ) : (
        <ul className="recipe-list">
          {recipes.map((r) => {
            const feasibility = checkFeasibility(r, items);
            return (
              <li key={r.id} className={`recipe-row${selectedId === r.id ? " selected" : ""}`}>
                <button
                  type="button"
                  className="recipe-row-main"
                  onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}
                >
                  <span className="recipe-name-line">
                    <span className="recipe-name">{r.name}</span>
                    {feasibility.ready ? (
                      <span className="badge ready">ready to brew</span>
                    ) : (
                      <span
                        className="badge short-badge"
                        title={feasibility.short
                          .map((s) => `${s.name}: have ${s.have} ${s.unit}, need ${s.needed.toFixed(2)} ${s.unit}`)
                          .join("; ")}
                      >
                        short: {feasibility.short.map(shortLabel).join(", ")}
                      </span>
                    )}
                  </span>
                  <span className="recipe-style">{r.styleName}</span>
                  <span className="recipe-summary">
                    OG {r.estOG.toFixed(3)} · ABV {r.estABV.toFixed(1)}% · IBU {Math.round(r.ibu)}
                  </span>
                  {feasibility.unmatched.length > 0 && (
                    <span className="recipe-unmatched">not tracked: {feasibility.unmatched.join(", ")}</span>
                  )}
                </button>
                <button
                  type="button"
                  className="link danger"
                  onClick={() => {
                    if (selectedId === r.id) setSelectedId(null);
                    removeRecipe(r.id);
                  }}
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected && <RecipeDetail recipe={selected} />}
    </div>
  );
}
