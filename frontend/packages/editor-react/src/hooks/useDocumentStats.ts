'use client';

import type { Editor } from '@tiptap/react';
import { useCallback, useEffect, useState } from 'react';

export interface DocumentStats {
  wordCount: number;
  paragraphCount: number;
  readingTime: number; // minutes
  charCount: number;   // excluding spaces
}

const INITIAL_STATS: DocumentStats = {
  wordCount: 0,
  paragraphCount: 0,
  readingTime: 0,
  charCount: 0,
};

// Korean: ~500 chars/min, English: ~200 words/min
const KOREAN_CHARS_PER_MIN = 500;
const ENGLISH_WORDS_PER_MIN = 200;

const KOREAN_REGEX = /[\uAC00-\uD7AF\u3130-\u318F\uA960-\uA97F]/g;
const WORD_REGEX = /[a-zA-Z0-9]+(?:['-][a-zA-Z0-9]+)*/g;

function calculateStats(text: string): DocumentStats {
  if (!text.trim()) return INITIAL_STATS;

  // Character count (excluding spaces)
  const charCount = text.replace(/\s/g, '').length;

  // Count Korean characters
  const koreanChars = text.match(KOREAN_REGEX) ?? [];
  const koreanCount = koreanChars.length;

  // Count English words (non-Korean)
  const textWithoutKorean = text.replace(KOREAN_REGEX, ' ');
  const englishWords = textWithoutKorean.match(WORD_REGEX) ?? [];
  const englishWordCount = englishWords.length;

  // Total "word count" = Korean chars + English words
  const wordCount = koreanCount + englishWordCount;

  // Paragraph count: non-empty lines
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const paragraphCount = Math.max(paragraphs.length, text.trim() ? 1 : 0);

  // Reading time: hybrid calculation
  const koreanMinutes = koreanCount / KOREAN_CHARS_PER_MIN;
  const englishMinutes = englishWordCount / ENGLISH_WORDS_PER_MIN;
  const readingTime = Math.max(1, Math.ceil(koreanMinutes + englishMinutes));

  return { wordCount, paragraphCount, readingTime, charCount };
}

export function useDocumentStats(editor: Editor | null): DocumentStats {
  const [stats, setStats] = useState<DocumentStats>(INITIAL_STATS);

  const updateStats = useCallback(() => {
    if (!editor) return;

    const text = editor.getText();
    const newStats = calculateStats(text);
    setStats(newStats);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    // Initial calculation
    updateStats();

    // Listen for updates with requestIdleCallback debounce
    let idleId: number | null = null;

    const handler = () => {
      if (idleId !== null) {
        cancelIdleCallback(idleId);
      }
      idleId = requestIdleCallback(() => {
        updateStats();
      });
    };

    editor.on('update', handler);

    return () => {
      editor.off('update', handler);
      if (idleId !== null) {
        cancelIdleCallback(idleId);
      }
    };
  }, [editor, updateStats]);

  return stats;
}

// Export for testing
export { calculateStats };
