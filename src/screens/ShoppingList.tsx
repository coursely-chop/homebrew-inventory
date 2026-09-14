import { useRecipes } from "../lib/RecipeContext";
import { useInventory } from "../lib/InventoryContext";
import { buildShoppingList } from "../lib/shoppingList";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "../lib/inventory";
import type { IngredientCategory } from "../types";

export function ShoppingList() {
  const { recipes } = useRecipes();
  const { items } = useInventory();
  const perennialRecipes = recipes.filter((r) => r.perennial);
  const { lines, unmatched } = buildShoppingList(perennialRecipes, items);

  return (
    <div className="shopping-list">
      <header className="shopping-header">
        <h1>Shopping List</h1>
        <p className="shopping-subtitle">
          {perennialRecipes.length === 0
            ? "Nothing here yet."
            : `Built from ${perennialRecipes.length} perennial recipe${perennialRecipes.length === 1 ? "" : "s"}.`}
        </p>
      </header>

      {perennialRecipes.length === 0 ? (
        <p className="empty">
          Mark a recipe as ★ perennial (on the Recipes tab) to build a shopping list from it — a shortage only
          shows up here if it blocks something you keep coming back to.
        </p>
      ) : lines.length === 0 && unmatched.length === 0 ? (
        <p className="empty">Fully stocked for everything in your perennial rotation.</p>
      ) : (
        <>
          {CATEGORY_ORDER.filter((c) => lines.some((l) => l.category === c)).map((category) => (
            <section key={category} className="category-section">
              <h2>{CATEGORY_LABELS[category]}</h2>
              <ul className="item-list">
                {lines
                  .filter((l) => l.category === category)
                  .map((line) => (
                    <li key={line.itemId} className="item-row shopping-line">
                      <div className="item-main">
                        <span className="item-name">{line.name}</span>
                      </div>
                      <div className="item-meta">
                        <span className="shopping-used-in">for: {line.usedIn.join(", ")}</span>
                      </div>
                    </li>
                  ))}
              </ul>
            </section>
          ))}

          {unmatched.length > 0 && (
            <section className="category-section">
              <h2>Not yet tracked</h2>
              <ul className="item-list">
                {unmatched.map((u) => (
                  <li key={`${u.category}:${u.ingredientName}`} className="item-row">
                    <div className="item-main">
                      <span className="item-name">{u.ingredientName}</span>
                      <span className="item-aa">{CATEGORY_LABELS[u.category as IngredientCategory]}</span>
                    </div>
                    <div className="item-meta">
                      <span className="shopping-used-in">for: {u.usedIn.join(", ")}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
