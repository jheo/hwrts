'use client';

import type { Editor } from '@tiptap/react';
import { useCallback, useEffect, useRef } from 'react';

import { useEditorStore } from '../store/useEditorStore';

const DEBOUNCE_MS = 2000;

export interface AutoSaveOptions {
  documentId: string;
  save: (data: { id: string; title: string; content: string; wordCount: number }) => Promise<void>;
  load: (id: string) => Promise<{ title: string; content: string } | undefined>;
}

export type SaveStatus = 'saved' | 'saving' | 'unsaved';

export function useAutoSave(
  editor: Editor | null,
  options: AutoSaveOptions,
): SaveStatus {
  const title = useEditorStore((s) => s.title);
  const wordCount = useEditorStore((s) => s.wordCount);
  const isDirty = useEditorStore((s) => s.isDirty);
  const markClean = useEditorStore((s) => s.markClean);

  const saveStatusRef = useRef<SaveStatus>('saved');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  const performSave = useCallback(async () => {
    if (!editor || isSavingRef.current) return;

    isSavingRef.current = true;
    saveStatusRef.current = 'saving';

    try {
      const content = JSON.stringify(editor.getJSON());
      await options.save({
        id: options.documentId,
        title,
        content,
        wordCount,
      });
      markClean();
      saveStatusRef.current = 'saved';
    } catch {
      saveStatusRef.current = 'unsaved';
    } finally {
      isSavingRef.current = false;
    }
  }, [editor, options, title, wordCount, markClean]);

  // Debounced save on content change
  useEffect(() => {
    if (!isDirty || !editor) return;

    saveStatusRef.current = 'unsaved';

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      void performSave();
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isDirty, editor, performSave]);

  // Load document on mount
  useEffect(() => {
    if (!editor) return;

    void (async () => {
      const data = await options.load(options.documentId);
      if (data) {
        useEditorStore.getState().setTitle(data.title);
        try {
          const json = JSON.parse(data.content) as Record<string, unknown>;
          editor.commands.setContent(json);
        } catch {
          // Content is not valid JSON, skip
        }
        markClean();
      }
    })();
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Save on beforeunload
  useEffect(() => {
    const handler = () => {
      if (isDirty && editor) {
        const content = JSON.stringify(editor.getJSON());
        void options.save({
          id: options.documentId,
          title,
          content,
          wordCount,
        });
      }
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, editor, options, title, wordCount]);

  return saveStatusRef.current;
}
