import { useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecipes } from "../lib/RecipeContext";
import { useInventory } from "../lib/InventoryContext";
import { ImportRecipe } from "../components/ImportRecipe";
import { DeleteIcon } from "../components/Icons";
import { checkFeasibility, type ShortIngredient } from "../lib/recipeIngredients";
import { round } from "../lib/format";

function shortLabel(s: ShortIngredient): string {
  if (!s.substitute) return s.name;
  const amount = `${round(s.substitute.amountNeeded, 2)} ${s.substitute.item.unit}`;
  const aaNote = s.substitute.status === "aa-adjusted" ? ", AA-adjusted" : "";
  return `${s.name} (try ${s.substitute.item.name}, ${amount}${aaNote})`;
}

export function Recipes() {
  const { recipes, removeRecipe, togglePerennial } = useRecipes();
  const { items } = useInventory();
  const navigate = useNavigate();
  const [importOpen, setImportOpen] = useState(false);

  // Perennial (starred) recipes float to the top as a group — stable
  // otherwise (Array.prototype.sort is spec-guaranteed stable), so
  // toggling one star doesn't shuffle anything beyond that grouping.
  const sorted = [...recipes].sort((a, b) => Number(b.perennial) - Number(a.perennial));

  // FLIP (First-Last-Invert-Play) reorder animation, hand-rolled rather
  // than pulling in an animation library — matches how this app's other
  // transitions (recipe-list/recipe-page slide-in) are already plain CSS.
  // Approach: capture every row's position just before the toggle that's
  // about to reorder them, then after React re-renders in the new order,
  // offset each row back to where it used to be with transitions off and
  // immediately animate that offset back to zero — the row appears to
  // glide from its old spot to its new one instead of snapping there.
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const prevTops = useRef<Map<string, number> | null>(null);

  function handleToggleStar(id: string) {
    const tops = new Map<string, number>();
    rowRefs.current.forEach((el, key) => tops.set(key, el.getBoundingClientRect().top));
    prevTops.current = tops;
    togglePerennial(id);
  }

  useLayoutEffect(() => {
    const prev = prevTops.current;
    if (!prev) return;
    prevTops.current = null;

    rowRefs.current.forEach((el, key) => {
      const prevTop = prev.get(key);
      if (prevTop === undefined) return;
      const deltaY = prevTop - el.getBoundingClientRect().top;
      if (deltaY === 0) return;
      el.style.transition = "none";
      el.style.transform = `translateY(${deltaY}px)`;
      el.getBoundingClientRect(); // force reflow so the jump above isn't itself animated
      requestAnimationFrame(() => {
        el.style.transition = "transform 0.25s ease";
        el.style.transform = "";
      });
    });
  });

  return (
    <div className="recipes">
      <header className="recipes-header">
        <h1>Recipes</h1>
        <button type="button" className="header-link" onClick={() => setImportOpen((v) => !v)}>
          {importOpen ? "Close" : "Import"}
        </button>
      </header>

      {importOpen && <ImportRecipe />}

      {sorted.length === 0 ? (
        <p className="empty">No recipes imported yet.</p>
      ) : (
        <ul className="recipe-list">
          {sorted.map((r) => {
            const feasibility = checkFeasibility(r, items);
            return (
              <li
                key={r.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(r.id, el);
                  else rowRefs.current.delete(r.id);
                }}
                className="recipe-row"
              >
                <button
                  type="button"
                  className={`star-toggle${r.perennial ? " active" : ""}`}
                  title={r.perennial ? "Perennial — part of the standing rotation" : "Mark as perennial"}
                  onClick={() => handleToggleStar(r.id)}
                >
                  {r.perennial ? "★" : "☆"}
                </button>
                <button type="button" className="recipe-row-main" onClick={() => navigate(`/recipes/${r.id}`)}>
                  <span className="recipe-name">{r.name}</span>
                  <span className="recipe-style">{r.styleName}</span>
                  <span className="recipe-summary">
                    OG {r.estOG.toFixed(3)} · ABV {r.estABV.toFixed(1)}% · IBU {Math.round(r.ibu)}
                  </span>
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
                  {feasibility.unmatched.length > 0 && (
                    <span className="recipe-unmatched">not tracked: {feasibility.unmatched.join(", ")}</span>
                  )}
                </button>
                <button
                  type="button"
                  className="recipe-delete"
                  aria-label={`Delete ${r.name}`}
                  onClick={() => removeRecipe(r.id)}
                >
                  <DeleteIcon />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
