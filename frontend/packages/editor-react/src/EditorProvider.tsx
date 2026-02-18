'use client';

import type { Editor } from '@tiptap/react';
import { createContext, useContext, type ReactNode } from 'react';

interface EditorContextValue {
  editor: Editor | null;
}

const EditorContext = createContext<EditorContextValue>({ editor: null });

export function EditorProvider({
  editor,
  children,
}: {
  editor: Editor | null;
  children: ReactNode;
}) {
  return (
    <EditorContext.Provider value={{ editor }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditorContext(): EditorContextValue {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditorContext must be used within an EditorProvider');
  }
  return context;
}
