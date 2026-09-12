import { useState } from "react";
import { useInventory } from "../lib/InventoryContext";
import { ItemForm, type ItemFormValues } from "../components/ItemForm";
import { CATEGORY_LABELS, CATEGORY_ORDER, daysSincePurchase, isLowStock } from "../lib/inventory";
import type { IngredientCategory, InventoryItem } from "../types";

export function Inventory() {
  const { items, createItem, updateItem, removeItem } = useInventory();
  const [addingCategory, setAddingCategory] = useState<IngredientCategory | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleCreate(values: ItemFormValues) {
    createItem(values);
    setAddingCategory(null);
  }

  function handleUpdate(item: InventoryItem, values: ItemFormValues) {
    updateItem({ ...item, ...values });
    setEditingId(null);
  }

  return (
    <div className="inventory">
      <header className="inventory-header">
        <h1>Inventory</h1>
      </header>

      {CATEGORY_ORDER.filter((category) => category !== "misc" || items.some((i) => i.category === "misc")).map(
        (category) => {
          const categoryItems = items
            .filter((i) => i.category === category)
            .sort((a, b) => a.amount - b.amount);

          return (
            <section key={category} className="category-section">
              <div className="category-header">
                <h2>{CATEGORY_LABELS[category]}</h2>
                <button type="button" className="secondary" onClick={() => setAddingCategory(category)}>
                  + Add
                </button>
              </div>

              {addingCategory === category && (
                <ItemForm defaultCategory={category} onSubmit={handleCreate} onCancel={() => setAddingCategory(null)} />
              )}

              <ul className="item-list">
                {categoryItems.map((item) =>
                  editingId === item.id ? (
                    <li key={item.id} className="item-row editing">
                      <ItemForm
                        initial={item}
                        onSubmit={(values) => handleUpdate(item, values)}
                        onCancel={() => setEditingId(null)}
                      />
                    </li>
                  ) : (
                    <li key={item.id} className={`item-row${isLowStock(item) ? " low-stock" : ""}`}>
                      <div className="item-main">
                        <span className="item-name">{item.name}</span>
                        <span className="item-amount">
                          {item.amount} {item.unit}
                        </span>
                        {isLowStock(item) && <span className="badge low">low</span>}
                      </div>
                      <div className="item-meta">
                        {item.notes && <span className="item-notes">{item.notes}</span>}
                        <FreshnessLabel item={item} />
                      </div>
                      <div className="item-actions">
                        <button type="button" className="link" onClick={() => setEditingId(item.id)}>
                          Edit
                        </button>
                        <button type="button" className="link danger" onClick={() => removeItem(item.id)}>
                          Delete
                        </button>
                      </div>
                    </li>
                  )
                )}
                {categoryItems.length === 0 && <li className="empty">Nothing tracked yet.</li>}
              </ul>
            </section>
          );
        }
      )}
    </div>
  );
}

function FreshnessLabel({ item }: { item: InventoryItem }) {
  const days = daysSincePurchase(item);
  if (days === null) return <span className="item-freshness unknown">unknown age (baseline)</span>;
  if (days === 0) return <span className="item-freshness">added today</span>;
  return <span className="item-freshness">added {days}d ago</span>;
}
