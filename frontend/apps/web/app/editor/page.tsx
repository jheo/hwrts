'use client';

import { documentStore } from '@humanwrites/core';
import {
  useEditorStore,
  useFocusMode,
  type AutoSaveOptions,
} from '@humanwrites/editor-react';
import { useTheme } from '@humanwrites/ui';
import { Moon, Sun } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useMemo } from 'react';

import { EditorLayout } from './EditorLayout';

import './editor.css';

const Editor = dynamic(
  () =>
    import('@humanwrites/editor-react').then((m) => ({ default: m.Editor })),
  { ssr: false },
);

const DOC_ID = 'default';

export default function EditorPage() {
  const { theme, toggleTheme } = useTheme();
  const { focusMode } = useFocusMode();
  const setTitle = useEditorStore((s) => s.setTitle);
  const title = useEditorStore((s) => s.title);
  const isDirty = useEditorStore((s) => s.isDirty);

  const autoSaveOptions = useMemo<AutoSaveOptions>(
    () => ({
      documentId: DOC_ID,
      save: async (data) => {
        await documentStore.save({
          id: data.id,
          title: data.title,
          content: data.content,
          wordCount: data.wordCount,
          updatedAt: Date.now(),
        });
      },
      load: async (id) => {
        const doc = await documentStore.get(id);
        if (!doc) return undefined;
        return { title: doc.title, content: doc.content };
      },
    }),
    [],
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(e.target.value);
    },
    [setTitle],
  );

  return (
    <div
      className={`min-h-screen w-full ${focusMode === 'soft' ? 'focus-mode-soft' : ''}`}
      style={{ background: 'var(--surface-primary)' }}
    >
      {/* Theme toggle button - top right */}
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed right-6 top-6 z-10 rounded-full p-2 transition-colors hover:bg-[var(--surface-secondary)]"
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        style={{ color: 'var(--text-tertiary)' }}
      >
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </button>

      <div
        className="mx-auto w-full"
        style={{
          maxWidth: 'var(--editor-max-width)',
          paddingTop: '80px',
          paddingLeft: '1rem',
          paddingRight: '1rem',
        }}
      >
        {/* Title input */}
        <input
          type="text"
          placeholder="제목 없음"
          value={title}
          onChange={handleTitleChange}
          className="editor-title w-full border-none bg-transparent outline-none"
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: '2.25rem',
            fontWeight: 700,
            lineHeight: 1.2,
            color: 'var(--text-active)',
            marginBottom: '2rem',
            caretColor: 'var(--text-active)',
          }}
        />

        {/* Editor with Inspector */}
        <Editor placeholder="글을 쓰기 시작하세요..." autoSaveOptions={autoSaveOptions}>
          <EditorLayout />
        </Editor>

        {/* Save status */}
        <div className="save-status mt-4 text-center">
          {isDirty ? '저장 중...' : '저장됨'}
        </div>
      </div>
    </div>
  );
}
