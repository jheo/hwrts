import { create } from 'zustand';

export interface EditorState {
  title: string;
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  isDirty: boolean;
  lastSavedAt: number | null;
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
}

export const useEditorStore = create<EditorState & EditorActions>((set) => ({
  title: '',
  wordCount: 0,
  characterCount: 0,
  paragraphCount: 0,
  isDirty: false,
  lastSavedAt: null,

  setTitle: (title) => set({ title, isDirty: true }),

  updateStats: (wordCount, characterCount, paragraphCount) =>
    set({ wordCount, characterCount, paragraphCount }),

  markDirty: () => set({ isDirty: true }),

  markClean: () => set({ isDirty: false, lastSavedAt: Date.now() }),
}));
