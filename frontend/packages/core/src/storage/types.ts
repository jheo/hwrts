export interface LocalDocument {
  id: string;
  title: string;
  content: string; // TipTap JSON stringified
  wordCount: number;
  updatedAt: number; // timestamp
}
