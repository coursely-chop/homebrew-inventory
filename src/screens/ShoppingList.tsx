import { useState, type FormEvent } from "react";
import { useRecipes } from "../lib/RecipeContext";
import { useInventory } from "../lib/InventoryContext";
import { useShoppingListItems } from "../lib/ShoppingListContext";
import { buildShoppingList } from "../lib/shoppingList";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "../lib/inventory";
import type { IngredientCategory } from "../types";

export function ShoppingList() {
  const { recipes } = useRecipes();
  const { items } = useInventory();
  const { items: manualItems, addItem, removeItem } = useShoppingListItems();
  const [addingCategory, setAddingCategory] = useState<IngredientCategory | null>(null);

  const perennialRecipes = recipes.filter((r) => r.perennial);
  const { lines, unmatched } = buildShoppingList(perennialRecipes, items);

  function handleAdd(category: IngredientCategory, name: string) {
    addItem({ category, name, notes: "" });
    setAddingCategory(null);
  }

  return (
    <div className="shopping-list">
      <header className="shopping-header">
        <h1>Shopping List</h1>
      </header>

      {perennialRecipes.length > 0 && (
        <p className="shopping-subtitle">
          {`Built from ${perennialRecipes.length} perennial recipe${perennialRecipes.length === 1 ? "" : "s"}.`}
        </p>
      )}

      {perennialRecipes.length === 0 && (
        <p className="empty">
          Mark a recipe as ★ perennial (on the Recipes tab) to pull its shortages in automatically — or just add
          items below.
        </p>
      )}

      {CATEGORY_ORDER.map((category) => {
        const autoLines = lines.filter((l) => l.category === category);
        const manual = manualItems.filter((m) => m.category === category);

        return (
          <section key={category} className="category-section">
            <div className="category-header">
              <h2>{CATEGORY_LABELS[category]}</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setAddingCategory(category)}
                aria-label={`Add ${CATEGORY_LABELS[category]}`}
              >
                +
              </button>
            </div>

            {addingCategory === category && (
              <AddShoppingItemForm onSubmit={(name) => handleAdd(category, name)} onCancel={() => setAddingCategory(null)} />
            )}

            <ul className="item-list">
              {autoLines.map((line) => (
                <li key={line.itemId} className="item-row shopping-line">
                  <div className="item-main">
                    <span className="item-name">{line.name}</span>
                  </div>
                  <div className="item-meta">
                    <span className="shopping-used-in">for: {line.usedIn.join(", ")}</span>
                  </div>
                </li>
              ))}
              {manual.map((item) => (
                <li key={item.id} className="item-row shopping-line">
                  <div className="item-main">
                    <span className="item-name">{item.name}</span>
                  </div>
                  <button
                    type="button"
                    className="row-menu-trigger"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
              {autoLines.length === 0 && manual.length === 0 && (
                <li className="empty">Nothing needed here right now.</li>
              )}
            </ul>
          </section>
        );
      })}

      {unmatched.length > 0 && (
        <section className="category-section">
          <div className="category-header">
            <h2>Not yet tracked</h2>
          </div>
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
    </div>
  );
}

function AddShoppingItemForm({ onSubmit, onCancel }: { onSubmit: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim());
  }

  return (
    <form className="item-form" onSubmit={handleSubmit}>
      <div className="item-form-row">
        <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="item-form-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit">Add</button>
      </div>
    </form>
  );
}
