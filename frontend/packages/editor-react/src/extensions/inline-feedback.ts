'use client';

import type { Command } from '@tiptap/react';
import { Extension } from '@tiptap/react';
import type { Transaction } from '@tiptap/pm/state';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ReviewItem {
  id: string;
  type: 'spelling' | 'grammar';
  severity: 'info' | 'warning' | 'error';
  range: { from: number; to: number };
  message: string;
  suggestion?: string;
  source: 'ai_model' | 'user_ignore';
}

// ---------------------------------------------------------------------------
// Module augmentation for TipTap command types
// ---------------------------------------------------------------------------

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineFeedback: {
      /**
       * Set review items and render inline feedback decorations.
       */
      setReviewItems: (items: ReviewItem[]) => ReturnType;
      /**
       * Clear all review items and remove inline feedback decorations.
       */
      clearReviewItems: () => ReturnType;
    };
  }
}

// ---------------------------------------------------------------------------
// Plugin key (exported so hooks can access plugin state)
// ---------------------------------------------------------------------------

export const inlineFeedbackPluginKey = new PluginKey<InlineFeedbackPluginState>(
  'inlineFeedback',
);

// ---------------------------------------------------------------------------
// Plugin state
// ---------------------------------------------------------------------------

interface InlineFeedbackPluginState {
  reviewItems: ReviewItem[];
  decorationSet: DecorationSet;
}

// ---------------------------------------------------------------------------
// Transaction meta key for setting/clearing review items
// ---------------------------------------------------------------------------

const SET_REVIEW_ITEMS_META = 'setReviewItems';
const CLEAR_REVIEW_ITEMS_META = 'clearReviewItems';

// ---------------------------------------------------------------------------
// Helper: build DecorationSet from review items
// ---------------------------------------------------------------------------

function buildDecorations(
  items: ReviewItem[],
  doc: { nodeSize: number },
): DecorationSet {
  const decorations: Decoration[] = [];

  for (const item of items) {
    // Validate range is within document bounds
    if (
      item.range.from < 0 ||
      item.range.to > doc.nodeSize - 2 ||
      item.range.from >= item.range.to
    ) {
      continue;
    }

    const className = `inline-feedback-${item.type}`;

    decorations.push(
      Decoration.inline(item.range.from, item.range.to, {
        class: className,
        'data-feedback-id': item.id,
        'data-feedback-type': item.type,
        'data-feedback-severity': item.severity,
      }),
    );
  }

  return DecorationSet.create(
    doc as Parameters<typeof DecorationSet.create>[0],
    decorations,
  );
}

// ---------------------------------------------------------------------------
// TipTap Extension
// ---------------------------------------------------------------------------

export interface InlineFeedbackOptions {
  /** Initial review items (optional). */
  reviewItems?: ReviewItem[];
}

export const InlineFeedback = Extension.create<InlineFeedbackOptions>({
  name: 'inlineFeedback',

  addOptions() {
    return {
      reviewItems: [],
    };
  },

  addCommands() {
    return {
      setReviewItems:
        (items: ReviewItem[]): Command =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(SET_REVIEW_ITEMS_META, items);
            dispatch(tr);
          }
          return true;
        },

      clearReviewItems:
        (): Command =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(CLEAR_REVIEW_ITEMS_META, true);
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const initialItems = this.options.reviewItems ?? [];

    return [
      new Plugin<InlineFeedbackPluginState>({
        key: inlineFeedbackPluginKey,

        state: {
          init(_, state): InlineFeedbackPluginState {
            return {
              reviewItems: initialItems,
              decorationSet: buildDecorations(initialItems, state.doc),
            };
          },

          apply(
            tr: Transaction,
            pluginState: InlineFeedbackPluginState,
          ): InlineFeedbackPluginState {
            // Handle setReviewItems command
            const newItems = tr.getMeta(SET_REVIEW_ITEMS_META) as
              | ReviewItem[]
              | undefined;
            if (newItems) {
              return {
                reviewItems: newItems,
                decorationSet: buildDecorations(newItems, tr.doc),
              };
            }

            // Handle clearReviewItems command
            const shouldClear = tr.getMeta(CLEAR_REVIEW_ITEMS_META) as
              | boolean
              | undefined;
            if (shouldClear) {
              return {
                reviewItems: [],
                decorationSet: DecorationSet.empty,
              };
            }

            // If the document changed, remap decorations
            if (tr.docChanged) {
              return {
                reviewItems: pluginState.reviewItems,
                decorationSet: pluginState.decorationSet.map(
                  tr.mapping,
                  tr.doc,
                ),
              };
            }

            return pluginState;
          },
        },

        props: {
          decorations(state) {
            const pluginState = inlineFeedbackPluginKey.getState(state);
            return pluginState?.decorationSet ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
