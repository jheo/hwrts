export type EditType = 'insert' | 'delete' | 'replace' | 'cursor_move' | 'paste';
export type EditSource = 'keyboard' | 'paste' | 'ai_suggestion';

export interface EditEvent {
  type: EditType;
  position: { from: number; to: number };
  contentLength?: number; // content length only, NOT actual content (privacy)
  timestamp: number;
  source: EditSource;
}

export interface PasteEvent extends EditEvent {
  type: 'paste';
  source: 'paste';
  pastedLength: number;
}
