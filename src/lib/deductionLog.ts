import type { DeductionLogEntry } from "../types";

export const STORAGE_KEY = "homebrew-deduction-log";

export function loadDeductionLog(): DeductionLogEntry[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as DeductionLogEntry[]) : [];
}

function saveDeductionLog(entries: DeductionLogEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/** Prepends a new entry (most recent first) and persists. */
export function addDeductionLogEntry(entry: DeductionLogEntry): DeductionLogEntry[] {
  const entries = [entry, ...loadDeductionLog()];
  saveDeductionLog(entries);
  return entries;
}

/** Marks an entry as undone (never deleted — the record that a deduction
 * happened and was later reversed is itself worth keeping). */
export function markDeductionUndone(id: string, undoneAt: string): DeductionLogEntry[] {
  const entries = loadDeductionLog().map((e) => (e.id === id ? { ...e, undoneAt } : e));
  saveDeductionLog(entries);
  return entries;
}
