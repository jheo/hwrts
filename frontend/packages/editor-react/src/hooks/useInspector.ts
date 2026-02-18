'use client';

import { create } from 'zustand';

export type InspectorTab = 'stats' | 'review' | 'summary';

export interface InspectorState {
  isOpen: boolean;
  activeTab: InspectorTab;
}

export interface InspectorActions {
  open: () => void;
  close: () => void;
  toggle: () => void;
  setTab: (tab: InspectorTab) => void;
}

export const useInspectorStore = create<InspectorState & InspectorActions>(
  (set) => ({
    isOpen: false,
    activeTab: 'stats',

    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    toggle: () => set((state) => ({ isOpen: !state.isOpen })),
    setTab: (activeTab) => set({ activeTab, isOpen: true }),
  }),
);

export function useInspector() {
  const isOpen = useInspectorStore((s) => s.isOpen);
  const activeTab = useInspectorStore((s) => s.activeTab);
  const open = useInspectorStore((s) => s.open);
  const close = useInspectorStore((s) => s.close);
  const toggle = useInspectorStore((s) => s.toggle);
  const setTab = useInspectorStore((s) => s.setTab);

  return { isOpen, activeTab, open, close, toggle, setTab };
}
