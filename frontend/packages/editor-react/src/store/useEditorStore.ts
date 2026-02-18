import { create } from 'zustand';

export type FocusModeState = 'off' | 'soft';

export interface EditorState {
  title: string;
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  isDirty: boolean;
  lastSavedAt: number | null;
  focusMode: FocusModeState;
}

export interface EditorActions {
  setTitle: (title: string) => void;
  updateStats: (
    wordCount: number,
    characterCount: number,
    paragraphCount: number,
  ) => void;
  markDirty: () => void;
  markClean: () => void;
  setFocusMode: (mode: FocusModeState) => void;
  toggleFocusMode: () => void;
}

export const useEditorStore = create<EditorState & EditorActions>((set) => ({
  title: '',
  wordCount: 0,
  characterCount: 0,
  paragraphCount: 0,
  isDirty: false,
  lastSavedAt: null,
  focusMode: 'off',

  setTitle: (title) => set({ title, isDirty: true }),

  updateStats: (wordCount, characterCount, paragraphCount) =>
    set({ wordCount, characterCount, paragraphCount }),

  markDirty: () => set({ isDirty: true }),

  markClean: () => set({ isDirty: false, lastSavedAt: Date.now() }),

  setFocusMode: (focusMode) => set({ focusMode }),

  toggleFocusMode: () =>
    set((state) => ({
      focusMode: state.focusMode === 'off' ? 'soft' : 'off',
    })),
}));
