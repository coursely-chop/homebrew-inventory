import { useState, type FocusEvent } from "react";
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
// have some, but reorder before you plan around it." All excludes Out too —
// a kicked hop with dust in the bag doesn't need to clutter the main view
// now that it has its own tab.
function matchesTab(item: InventoryItem, tab: ViewTab): boolean {
  if (tab === "out") return isOutOfStock(item);
  if (isOutOfStock(item)) return false;
  if (tab === "low") return isLowStock(item);
  return true;
}

export function Inventory() {
  const { items, createItem, updateItem, removeItem } = useInventory();
  const [tab, setTab] = useState<ViewTab>("all");
  const [addingCategory, setAddingCategory] = useState<IngredientCategory | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
          const rawCategoryItems = items.filter((i) => i.category === category);
          // All: alphabetical — the Low/Out tabs already do the job of
          // surfacing what needs attention, so All doesn't need to double
          // as a priority list. Low/Out: amount ascending, most urgent first.
          const categoryItems = tabbedItems
            .filter((i) => i.category === category)
            .sort((a, b) => (tab === "all" ? a.name.localeCompare(b.name) : a.amount - b.amount));

          if (tab !== "all" && categoryItems.length === 0) return null;
          if (tab === "all" && rawCategoryItems.length === 0) return null;

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
                    <li key={item.id} className="item-row">
                      <span className="item-name">{item.name}</span>

                      <span className="item-amount-col">
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
                      </span>

                      <span className="item-meta">
                        {item.notes && <span className="item-notes">{item.notes}</span>}
                        <FreshnessLabel item={item} />
                      </span>

                      <RowMenu
                        open={openMenuId === item.id}
                        onToggle={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                        onClose={() => setOpenMenuId(null)}
                        onEdit={() => {
                          setEditingId(item.id);
                          setOpenMenuId(null);
                        }}
                        onDelete={() => {
                          removeItem(item.id);
                          setOpenMenuId(null);
                        }}
                      />
                    </li>
                  )
                )}
                {categoryItems.length === 0 && (
                  <li className="empty">Everything here is kicked/out — check the Out tab.</li>
                )}
              </ul>
            </section>
          );
        }
      )}

      {tab !== "all" && tabbedItems.length === 0 && <p className="empty">Nothing in this view.</p>}
    </div>
  );
}

function RowMenu({
  open,
  onToggle,
  onClose,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  function handleBlur(e: FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget)) onClose();
  }

  return (
    <div className="row-menu" onBlur={handleBlur}>
      <button type="button" className="row-menu-trigger" onClick={onToggle} aria-label="Item actions">
        ⋯
      </button>
      {open && (
        <div className="row-menu-dropdown">
          <button type="button" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function FreshnessLabel({ item }: { item: InventoryItem }) {
  const days = daysSincePurchase(item);
  if (days === null) return <span className="item-freshness unknown">baseline</span>;
  if (days === 0) return <span className="item-freshness">added today</span>;
  return <span className="item-freshness">added {days}d ago</span>;
}
