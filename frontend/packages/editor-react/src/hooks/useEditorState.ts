'use client';

import type { Editor } from '@tiptap/react';
import { useEffect } from 'react';

import { useEditorStore } from '../store/useEditorStore';

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function useEditorState(editor: Editor | null): void {
  const updateStats = useEditorStore((s) => s.updateStats);
  const markDirty = useEditorStore((s) => s.markDirty);

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const text = editor.getText();
      const wordCount = countWords(text);
      const characterCount = text.length;

      const json = editor.getJSON();
      const paragraphCount = (json.content ?? []).filter(
        (node) =>
          node.type === 'paragraph' &&
          node.content &&
          node.content.length > 0,
      ).length;

      updateStats(wordCount, characterCount, paragraphCount);
      markDirty();
    };

    editor.on('update', handleUpdate);
    // Run initial calculation
    handleUpdate();

    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, updateStats, markDirty]);
}
