'use client';

import {
  useDocumentStats,
  useEditorContext,
  useInspector,
  useKeyboardShortcuts,
} from '@humanwrites/editor-react';
import { Inspector, InspectorTrigger } from '@humanwrites/ui';

export function EditorLayout() {
  const { editor } = useEditorContext();
  const stats = useDocumentStats(editor);
  const { isOpen, activeTab, toggle, close, setTab } = useInspector();

  useKeyboardShortcuts();

  return (
    <>
      {/* Inspector trigger (visible when inspector is closed) */}
      {!isOpen && <InspectorTrigger onToggle={toggle} />}

      {/* Inspector panel */}
      <Inspector
        isOpen={isOpen}
        activeTab={activeTab}
        onTabChange={setTab}
        onClose={close}
        stats={stats}
      />
    </>
  );
}
