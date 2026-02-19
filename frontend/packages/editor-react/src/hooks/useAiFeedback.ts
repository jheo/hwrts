'use client';

import type { Editor } from '@tiptap/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { ReviewItem } from '../extensions/inline-feedback';

// ---------------------------------------------------------------------------
// Helpers (locale)
// ---------------------------------------------------------------------------

/** Simple locale detection: Korean chars present → 'ko', otherwise 'en'. */
function detectLocale(text: string): string {
  return /[\u3131-\u3163\uac00-\ud7a3]/.test(text) ? 'ko' : 'en';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_DEBOUNCE_MS = 1500;
const API_ENDPOINT = '/api/ai/spelling';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface UseAiFeedbackOptions {
  /** Enable or disable AI feedback (default: true). */
  enabled?: boolean;
  /** Debounce delay in ms after typing stops (default: 1500). */
  debounceMs?: number;
  /** Override API endpoint for testing (default: '/api/ai/spelling'). */
  apiEndpoint?: string;
  /** Document ID to include in AI feedback requests. */
  documentId?: string;
  /** Locale override ('ko' | 'en'). Auto-detected if not provided. */
  locale?: string;
}

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseAiFeedbackReturn {
  /** Whether a request is currently in progress. */
  isLoading: boolean;
  /** Current review items from the last successful response. */
  reviewItems: ReviewItem[];
  /** Error message from the last failed request, or null. */
  error: string | null;
  /** Manually trigger a re-check of the current paragraph. */
  refresh: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the text content of the paragraph at the current cursor position.
 * Returns null if the cursor is in a code block or the paragraph is empty.
 */
function getCurrentParagraphText(editor: Editor): string | null {
  const { state } = editor;
  const { $from } = state.selection;

  // Walk up to find the nearest block node
  const depth = $from.depth;
  for (let d = depth; d >= 0; d--) {
    const node = $from.node(d);

    // Skip code blocks
    if (node.type.name === 'codeBlock' || node.type.name === 'code_block') {
      return null;
    }

    // Found a paragraph or heading
    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      const text = node.textContent.trim();
      return text.length > 0 ? text : null;
    }
  }

  return null;
}

/**
 * Get the absolute range of the current paragraph node.
 * Returns null if no paragraph is found.
 */
function getCurrentParagraphRange(
  editor: Editor,
): { from: number; to: number } | null {
  const { state } = editor;
  const { $from } = state.selection;

  const depth = $from.depth;
  for (let d = depth; d >= 0; d--) {
    const node = $from.node(d);
    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      const start = $from.start(d);
      return { from: start, to: start + node.content.size };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAiFeedback(
  editor: Editor | null,
  options?: UseAiFeedbackOptions,
): UseAiFeedbackReturn {
  const enabled = options?.enabled ?? true;
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const apiEndpoint = options?.apiEndpoint ?? API_ENDPOINT;
  const documentId = options?.documentId;
  const locale = options?.locale;

  const [isLoading, setIsLoading] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Refs for debounce/abort management
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastCheckedTextRef = useRef<string | null>(null);

  // ---- fetchFeedback ------------------------------------------------------

  const fetchFeedback = useCallback(
    async (text: string, paragraphRange: { from: number; to: number }) => {
      // Abort any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            locale: locale ?? detectLocale(text),
            documentId,
          }),
          signal: controller.signal,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`AI feedback request failed: ${response.status}`);
        }

        const data = (await response.json()) as {
          items?: Array<{
            id?: string;
            type?: string;
            severity?: string;
            range?: { from: number; to: number };
            message?: string;
            suggestion?: string;
          }>;
        };

        // Map response items to ReviewItem with absolute document positions
        const items: ReviewItem[] = (data.items ?? [])
          .filter(
            (item): item is typeof item & { range: { from: number; to: number }; message: string } =>
              item.range != null && item.message != null,
          )
          .map((item, index) => ({
            id: item.id ?? `ai-${Date.now()}-${String(index)}`,
            type: (item.type === 'grammar' ? 'grammar' : 'spelling') as
              | 'spelling'
              | 'grammar',
            severity: (item.severity === 'error'
              ? 'error'
              : item.severity === 'info'
                ? 'info'
                : 'warning') as 'info' | 'warning' | 'error',
            range: {
              from: paragraphRange.from + item.range.from,
              to: paragraphRange.from + item.range.to,
            },
            message: item.message,
            suggestion: item.suggestion,
            source: 'ai_model' as const,
          }));

        setReviewItems(items);
        lastCheckedTextRef.current = text;

        // Dispatch to the InlineFeedback extension
        if (editor && !editor.isDestroyed) {
          editor.commands.setReviewItems(items);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Request was aborted, not an error
          return;
        }
        const message =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [editor, apiEndpoint, documentId, locale],
  );

  // ---- Debounced trigger on editor updates --------------------------------

  useEffect(() => {
    if (!editor || !enabled) return;

    const handleUpdate = () => {
      // Clear any pending debounce
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        if (!editor || editor.isDestroyed) return;

        const text = getCurrentParagraphText(editor);
        const range = getCurrentParagraphRange(editor);

        // Skip if no text, or text unchanged since last check
        if (!text || !range) return;
        if (text === lastCheckedTextRef.current) return;

        void fetchFeedback(text, range);
      }, debounceMs);
    };

    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      lastCheckedTextRef.current = null;  // Reset on editor change
    };
  }, [editor, enabled, debounceMs, fetchFeedback]);

  // ---- Cleanup on unmount -------------------------------------------------

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ---- refresh: manual re-check -------------------------------------------

  const refresh = useCallback(() => {
    if (!editor || editor.isDestroyed || !enabled) return;

    const text = getCurrentParagraphText(editor);
    const range = getCurrentParagraphRange(editor);

    if (!text || !range) return;

    // Force re-check by clearing the last checked text
    lastCheckedTextRef.current = null;
    void fetchFeedback(text, range);
  }, [editor, enabled, fetchFeedback]);

  // ---- Return when disabled ------------------------------------------------

  if (!enabled) {
    return { isLoading: false, reviewItems: [], error: null, refresh: () => {} };
  }

  return { isLoading, reviewItems, error, refresh };
}
