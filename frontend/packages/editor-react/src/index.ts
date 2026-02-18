export { Editor } from './Editor';
export type { EditorProps } from './Editor';
export { EditorProvider, useEditorContext } from './EditorProvider';
export { useEditorStore } from './store/useEditorStore';
export type {
  EditorState,
  EditorActions,
  FocusModeState,
} from './store/useEditorStore';
export { useEditorState } from './hooks/useEditorState';
export { useAutoSave } from './hooks/useAutoSave';
export type { AutoSaveOptions, SaveStatus } from './hooks/useAutoSave';
export { useFocusMode } from './hooks/useFocusMode';
export { useDocumentStats } from './hooks/useDocumentStats';
export type { DocumentStats } from './hooks/useDocumentStats';
export { useInspector, useInspectorStore } from './hooks/useInspector';
export type { InspectorState, InspectorActions } from './hooks/useInspector';
export { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
export { createExtensions } from './extensions';
export type { CreateExtensionsOptions } from './extensions';
export { TypingCollector } from './extensions/typing-collector';
export type { CollectorCallback } from './extensions/typing-collector';
export { useTypingMetrics } from './hooks/useTypingMetrics';
export type { TypingMetrics, UseTypingMetricsReturn } from './hooks/useTypingMetrics';
