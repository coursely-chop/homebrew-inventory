import { useState } from "react";
import { useInventory } from "../lib/InventoryContext";
import { ItemForm, type ItemFormValues } from "../components/ItemForm";
import { CATEGORY_LABELS, CATEGORY_ORDER, daysSincePurchase, isLowStock, isOutOfStock, outOfStockLabel } from "../lib/inventory";
import { round } from "../lib/format";
import type { IngredientCategory, InventoryItem } from "../types";

type ViewTab = "all" | "low" | "out";

const TABS: { id: ViewTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "low", label: "Low" },
  { id: "out", label: "Out" },
];

// "Low" and "Out" are mutually exclusive so the two tabs don't just repeat
// each other — Out is for "can't brew with this at all," Low is "still
// have some, but reorder before you plan around it."
function matchesTab(item: InventoryItem, tab: ViewTab): boolean {
  if (tab === "all") return true;
  if (tab === "out") return isOutOfStock(item);
  return isLowStock(item) && !isOutOfStock(item);
}

export function Inventory() {
  const { items, createItem, updateItem, removeItem } = useInventory();
  const [tab, setTab] = useState<ViewTab>("all");
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

  const tabbedItems = items.filter((i) => matchesTab(i, tab));

  return (
    <div className="inventory">
      <header className="inventory-header">
        <h1>Inventory</h1>
      </header>

      <div className="view-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`view-tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label} ({items.filter((i) => matchesTab(i, t.id)).length})
          </button>
        ))}
      </div>

      {CATEGORY_ORDER.filter((category) => category !== "misc" || items.some((i) => i.category === "misc")).map(
        (category) => {
          const categoryItems = tabbedItems.filter((i) => i.category === category).sort((a, b) => a.amount - b.amount);

          if (tab !== "all" && categoryItems.length === 0) return null;

          return (
            <section key={category} className="category-section">
              <div className="category-header">
                <h2>{CATEGORY_LABELS[category]}</h2>
                {tab === "all" && (
                  <button type="button" className="secondary" onClick={() => setAddingCategory(category)}>
                    + Add
                  </button>
                )}
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
                          {round(item.amount, 2)} {item.unit}
                        </span>
                        {item.category === "hops" && item.alphaAcid !== undefined && (
                          <span className="item-aa">{item.alphaAcid}% AA</span>
                        )}
                        {isOutOfStock(item) ? (
                          <span className="badge out">{outOfStockLabel(item)}</span>
                        ) : (
                          isLowStock(item) && <span className="badge low">low</span>
                        )}
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

      {tab !== "all" && tabbedItems.length === 0 && <p className="empty">Nothing in this view.</p>}
    </div>
  );
}

function FreshnessLabel({ item }: { item: InventoryItem }) {
  const days = daysSincePurchase(item);
  if (days === null) return <span className="item-freshness unknown">unknown age (baseline)</span>;
  if (days === 0) return <span className="item-freshness">added today</span>;
  return <span className="item-freshness">added {days}d ago</span>;
}
