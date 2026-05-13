/**
 * Toggles an id in a selection set.
 * - If id is in the set, returns a new Set without it.
 * - If id is not in the set, returns a new Set with it added.
 *
 * This is an involution: toggleSelection(toggleSelection(set, id), id) === set
 * (applying the same toggle twice returns the original set).
 *
 * Pure function — returns a new Set, does not mutate the input.
 */
export function toggleSelection(selection: Set<string>, id: string): Set<string> {
  const next = new Set(selection);

  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }

  return next;
}
