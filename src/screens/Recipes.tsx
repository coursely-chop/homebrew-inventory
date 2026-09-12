import { useState } from "react";
import { useRecipes } from "../lib/RecipeContext";
import { ImportRecipe } from "../components/ImportRecipe";
import { RecipeDetail } from "../components/RecipeDetail";

export function Recipes() {
  const { recipes, removeRecipe } = useRecipes();
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
          {recipes.map((r) => (
            <li key={r.id} className={`recipe-row${selectedId === r.id ? " selected" : ""}`}>
              <button type="button" className="recipe-row-main" onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}>
                <span className="recipe-name">{r.name}</span>
                <span className="recipe-style">{r.styleName}</span>
                <span className="recipe-summary">
                  OG {r.estOG.toFixed(3)} · ABV {r.estABV.toFixed(1)}% · IBU {Math.round(r.ibu)}
                </span>
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
          ))}
        </ul>
      )}

      {selected && <RecipeDetail recipe={selected} />}
    </div>
  );
}
