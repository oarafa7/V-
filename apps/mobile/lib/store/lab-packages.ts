/**
 * Selection state for lab-test packages — shared by the "Book Lab Tests" tab and
 * the "Add-on Lab Tests" booking step so a selection carries between them.
 */
import { create } from 'zustand';

interface LabPackageSelectionState {
  selected: string[]; // selected lab test ids
  toggle: (id: string) => void;
  /** Select or clear a whole package's tests (used by "select all"). */
  setMany: (ids: string[], on: boolean) => void;
  isSelected: (id: string) => boolean;
  clear: () => void;
}

export const useLabPackageStore = create<LabPackageSelectionState>((set, get) => ({
  selected: [],
  toggle: (id) =>
    set((s) => ({
      selected: s.selected.includes(id)
        ? s.selected.filter((x) => x !== id)
        : [...s.selected, id],
    })),
  setMany: (ids, on) =>
    set((s) => {
      const set2 = new Set(s.selected);
      for (const id of ids) {
        if (on) set2.add(id);
        else set2.delete(id);
      }
      return { selected: [...set2] };
    }),
  isSelected: (id) => get().selected.includes(id),
  clear: () => set({ selected: [] }),
}));
