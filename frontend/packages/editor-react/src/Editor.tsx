'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import DOMPurify from 'dompurify';

import { EditorProvider } from './EditorProvider';
import { createExtensions } from './extensions';
import { useEditorState } from './hooks/useEditorState';

export interface EditorProps {
  content?: string;
  placeholder?: string;
  onUpdate?: (html: string) => void;
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

export function Editor({ content, placeholder, onUpdate }: EditorProps) {
  const sanitizedContent = content ? sanitize(content) : undefined;

  const editor = useEditor({
    extensions: createExtensions({ placeholder }),
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

  return (
    <EditorProvider editor={editor}>
      <EditorContent editor={editor} />
    </EditorProvider>
  );
}
