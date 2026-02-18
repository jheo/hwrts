import type { KeystrokeStatVector } from '../typing-analyzer/keystroke';

export interface LocalDocument {
  id: string;
  title: string;
  content: string; // TipTap JSON stringified
  wordCount: number;
  updatedAt: number; // timestamp
}

export interface StoredKeystrokeSession {
  id?: number; // auto-increment
  sessionId: string;
  documentId: string;
  vectors: KeystrokeStatVector[];
  createdAt: number;
}
