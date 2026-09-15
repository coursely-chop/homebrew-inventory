import { useState, type FocusEvent } from "react";
import { useInventory } from "../lib/InventoryContext";
import { ItemForm, type ItemFormValues } from "../components/ItemForm";
import { LogPastBrew } from "../components/LogPastBrew";
import { CATEGORY_LABELS, CATEGORY_ORDER, freshnessLabel, isLowStock, isOutOfStock } from "../lib/inventory";
import { round } from "../lib/format";
import type { DeductionLogEntry, IngredientCategory, InventoryItem } from "../types";

type ViewTab = "all" | "low" | "out" | "history";

const TABS: { id: ViewTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "low", label: "Low" },
  { id: "out", label: "Out" },
  { id: "history", label: "History" },
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
  const { items, deductionLog, createItem, updateItem, removeItem, undoDeduction } = useInventory();
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
            {t.label} ({t.id === "history" ? deductionLog.length : items.filter((i) => matchesTab(i, t.id)).length})
          </button>
        ))}
      </div>

      {tab === "history" ? (
        <DeductionHistory log={deductionLog} onUndo={undoDeduction} />
      ) : (
        <>
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
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => setAddingCategory(category)}
                        aria-label={`Add ${CATEGORY_LABELS[category]}`}
                      >
                        +
                      </button>
                    )}
                  </div>

                  {addingCategory === category && (
                    <ItemForm
                      defaultCategory={category}
                      onSubmit={handleCreate}
                      onCancel={() => setAddingCategory(null)}
                    />
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
                          <span className="item-name-col">
                            <span className="item-name">{item.name}</span>
                            {item.category === "hops" && item.alphaAcid !== undefined && (
                              <span className="item-aa">{item.alphaAcid}% AA</span>
                            )}
                          </span>

                          <span className="item-amount-col">
                            <span
                              className={`item-amount${
                                tab === "all" && isOutOfStock(item)
                                  ? " status-out"
                                  : tab === "all" && isLowStock(item)
                                    ? " status-low"
                                    : ""
                              }`}
                            >
                              {round(item.amount, 1)} {item.unit}
                            </span>
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
        </>
      )}
    </div>
  );
}

function DeductionHistory({ log, onUndo }: { log: DeductionLogEntry[]; onUndo: (id: string) => void }) {
  return (
    <>
      <LogPastBrew />

      {log.length === 0 ? (
        <p className="empty">No deductions logged yet — brewing something will show up here.</p>
      ) : (
        <ul className="deduction-history">
          {log.map((entry) => (
            <li key={entry.id} className={`history-entry${entry.undoneAt ? " undone" : ""}`}>
              <div className="history-entry-header">
                <span className="history-recipe-name">{entry.recipeName}</span>
                <span className="history-date">{formatHistoryDate(entry.deductedAt)}</span>
              </div>
              <ul className="history-items">
                {entry.items.map((line) => (
                  <li key={line.itemId}>
                    {line.name}: {round(line.amount, 2)} {line.unit}
                  </li>
                ))}
              </ul>
              {entry.undoneAt ? (
                <p className="history-undone-note">Undone {formatHistoryDate(entry.undoneAt)}</p>
              ) : entry.appliedToInventory ? (
                <button type="button" className="secondary" onClick={() => onUndo(entry.id)}>
                  Undo — restore to inventory
                </button>
              ) : (
                <p className="history-undone-note">Logged only — doesn't affect current inventory</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function formatHistoryDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
  const label = freshnessLabel(item);
  return <span className={`item-freshness${item.purchaseDate ? "" : " unknown"}`}>{label}</span>;
}
