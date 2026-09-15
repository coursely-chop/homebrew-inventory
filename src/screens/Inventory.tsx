import { useState, type FocusEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { useInventory } from "../lib/InventoryContext";
import { ItemForm, type ItemFormValues } from "../components/ItemForm";
import { LogPastBrew } from "../components/LogPastBrew";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  degradationBackground,
  effectiveAlphaAcid,
  freshnessLabel,
  isLowStock,
  isOutOfStock,
} from "../lib/inventory";
import { round } from "../lib/format";
import type { DeductionLogEntry, IngredientCategory, InventoryItem } from "../types";

export function Inventory() {
  const { items, deductionLog, createItem, updateItem, removeItem, undoDeduction } = useInventory();
  const showHistory = useLocation().pathname === "/history";
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

  return (
    <div className="inventory">
      <header className="inventory-header">
        <h1>
          <Link to="/">Inventory</Link>
        </h1>
        <Link to={showHistory ? "/" : "/history"} className="header-link">
          {showHistory ? "‹ Inventory" : `History (${deductionLog.length})`}
        </Link>
      </header>

      {showHistory ? (
        <DeductionHistory log={deductionLog} onUndo={undoDeduction} />
      ) : (
        CATEGORY_ORDER.filter((category) => items.some((i) => i.category === category && !isOutOfStock(i))).map(
          (category) => {
            const categoryItems = items
              .filter((i) => i.category === category && !isOutOfStock(i))
              .sort((a, b) => a.name.localeCompare(b.name));

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
                  <ItemForm
                    defaultCategory={category}
                    onSubmit={handleCreate}
                    onCancel={() => setAddingCategory(null)}
                  />
                )}

                <ul className="item-list">
                  {categoryItems.map((item) => {
                    const effAA = item.category === "hops" ? effectiveAlphaAcid(item) : undefined;
                    return editingId === item.id ? (
                      <li key={item.id} className="item-row editing">
                        <ItemForm
                          initial={item}
                          onSubmit={(values) => handleUpdate(item, values)}
                          onCancel={() => setEditingId(null)}
                        />
                      </li>
                    ) : (
                      <li
                        key={item.id}
                        className="item-row"
                        style={{ backgroundColor: degradationBackground(item) }}
                      >
                        <span className="item-name-col">
                          <span className="item-name">{item.name}</span>
                          {item.category === "hops" && item.alphaAcid !== undefined && (
                            <span className={`item-aa${item.sealed ? "" : " unsealed"}`}>
                              {item.alphaAcid}% AA
                              {effAA !== undefined && round(effAA, 1) !== round(item.alphaAcid, 1) ? (
                                <span className="item-aa-eff"> → {round(effAA, 1)}% eff.</span>
                              ) : (
                                ""
                              )}
                            </span>
                          )}
                        </span>

                        <span className="item-amount-col">
                          <span
                            className={`item-amount${
                              isOutOfStock(item) ? " status-out" : isLowStock(item) ? " status-low" : ""
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
                    );
                  })}
                </ul>
              </section>
            );
          }
        )
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
