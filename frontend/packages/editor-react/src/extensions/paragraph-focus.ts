'use client';

import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Extension } from '@tiptap/react';

const paragraphFocusKey = new PluginKey('paragraphFocus');

export const ParagraphFocus = Extension.create({
  name: 'paragraphFocus',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: paragraphFocusKey,
        props: {
          decorations(state) {
            const { doc, selection } = state;
            const decorations: Decoration[] = [];
            const cursorPos = selection.$head.pos;

            // Find the block node containing the cursor
            const resolvedPos = doc.resolve(cursorPos);
            let activeNodePos: number | null = null;

            // Walk up to find the top-level block node
            for (let depth = resolvedPos.depth; depth > 0; depth--) {
              const node = resolvedPos.node(depth);
              if (
                node.type.name === 'paragraph' ||
                node.type.name === 'blockquote'
              ) {
                activeNodePos = resolvedPos.before(depth);
                break;
              }
            }

            // If cursor is directly in a top-level paragraph
            if (activeNodePos === null && resolvedPos.depth >= 1) {
              const node = resolvedPos.node(1);
              if (node.type.name === 'paragraph') {
                activeNodePos = resolvedPos.before(1);
              }
            }

            doc.forEach((node, pos) => {
              // Headings are always active - skip
              if (node.type.name === 'heading') return;

              if (node.type.name === 'paragraph' || node.type.name === 'blockquote') {
                const isActive = pos === activeNodePos;
                if (!isActive) {
                  decorations.push(
                    Decoration.node(pos, pos + node.nodeSize, {
                      class: 'paragraph-inactive',
                    }),
                  );
                }
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
