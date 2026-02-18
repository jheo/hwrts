'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import DOMPurify from 'dompurify';
import { useMemo } from 'react';

import { EditorProvider } from './EditorProvider';
import { createExtensions } from './extensions';
import { useAutoSave, type AutoSaveOptions } from './hooks/useAutoSave';
import { useEditorState } from './hooks/useEditorState';

export interface EditorProps {
  content?: string;
  placeholder?: string;
  onUpdate?: (html: string) => void;
  autoSaveOptions?: AutoSaveOptions;
  children?: React.ReactNode;
}

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  's',
  'code',
  'h1',
  'h2',
  'h3',
  'blockquote',
  'a',
  'ul',
  'ol',
  'li',
];

const ALLOWED_ATTR = ['href', 'target', 'rel'];

function sanitize(html: string): string {
  if (typeof window === 'undefined') return html;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}

const noopAutoSave: AutoSaveOptions = {
  documentId: '',
  save: async () => {},
  load: async () => undefined,
};

export function Editor({
  content,
  placeholder,
  onUpdate,
  autoSaveOptions,
  children,
}: EditorProps) {
  const sanitizedContent = content ? sanitize(content) : undefined;

  const extensions = useMemo(
    () => createExtensions({ placeholder }),
    [placeholder],
  );

  const editor = useEditor({
    extensions,
    content: sanitizedContent,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': 'Document editor',
        'aria-multiline': 'true',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      onUpdate?.(html);
    },
  });

  // Connect editor updates to Zustand store
  useEditorState(editor);

  // Auto-save to IndexedDB (always called, noop when no options)
  useAutoSave(
    autoSaveOptions ? editor : null,
    autoSaveOptions ?? noopAutoSave,
  );

  return (
    <EditorProvider editor={editor}>
      <EditorContent editor={editor} />
      {children}
    </EditorProvider>
  );
}
