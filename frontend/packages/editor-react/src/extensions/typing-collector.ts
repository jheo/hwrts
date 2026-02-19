'use client';

import type { EditEvent, EditType, KeyCategory, KeystrokeEvent } from '@humanwrites/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { Extension } from '@tiptap/react';

export type { EditEvent, EditType, KeyCategory, KeystrokeEvent };

/** Callback invoked for every collected keystroke or edit event. */
export type CollectorCallback = (event: KeystrokeEvent | EditEvent) => void;

// ---------------------------------------------------------------------------
// Plugin key
// ---------------------------------------------------------------------------

const typingCollectorKey = new PluginKey('typingCollector');

// ---------------------------------------------------------------------------
// Key classifier  -- PRIVACY: actual key values are NEVER stored
// ---------------------------------------------------------------------------

const MODIFIER_KEYS = new Set([
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'CapsLock',
]);

const NAVIGATION_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Tab',
]);

/** Classify a keyboard key into a privacy-safe category. */
export function classifyKey(key: string): KeyCategory {
  // Single-character keys
  if (key.length === 1) {
    // Latin + Korean Jamo + Korean Syllables
    if (/[a-zA-Z\u3131-\u3163\uac00-\ud7a3]/.test(key)) return 'letter';
    if (/[0-9]/.test(key)) return 'number';
    return 'punct';
  }

  if (MODIFIER_KEYS.has(key)) return 'modifier';
  if (NAVIGATION_KEYS.has(key)) return 'navigation';

  // Function keys: F1 – F24
  if (/^F\d{1,2}$/.test(key)) return 'function';

  return 'other';
}

// ---------------------------------------------------------------------------
// Plugin state shape
// ---------------------------------------------------------------------------

interface CollectorPluginState {
  lastKeyupTime: number;
  isComposing: boolean;
  /** Maps a key string to its keydown timestamp for dwell-time calculation. */
  activeKeys: Map<string, number>;
}

// ---------------------------------------------------------------------------
// TipTap Extension
// ---------------------------------------------------------------------------

export interface TypingCollectorOptions {
  /** Called for every keystroke / edit event. */
  onEvent?: CollectorCallback;
  /** Toggle collection on/off without removing the plugin. */
  enabled?: boolean;
}

export const TypingCollector = Extension.create<TypingCollectorOptions>({
  name: 'typingCollector',

  addOptions() {
    return {
      onEvent: undefined,
      enabled: true,
    };
  },

  addProseMirrorPlugins() {
    const extensionOptions = this.options;

    // If there is no callback we still install a no-op plugin so the
    // extension name is registered — but we skip all heavy work.
    if (!extensionOptions.onEvent) return [];

    return [
      new Plugin({
        key: typingCollectorKey,

        // ---- plugin state ------------------------------------------------
        state: {
          init(): CollectorPluginState {
            return {
              lastKeyupTime: 0,
              isComposing: false,
              activeKeys: new Map(),
            };
          },
          apply(_tr, value) {
            return value; // state is mutated in-place by handlers
          },
        },

        // ---- DOM event handlers ------------------------------------------
        props: {
          handleKeyDown(view: EditorView, event: KeyboardEvent) {
            if (!extensionOptions.enabled || !extensionOptions.onEvent) return false;

            const pluginState = typingCollectorKey.getState(view.state) as
              | CollectorPluginState
              | undefined;
            if (!pluginState || pluginState.isComposing) return false;

            const now = performance.now();
            const keyCategory = classifyKey(event.key);

            // Flight time = gap since the previous keyup
            const flightTime =
              pluginState.lastKeyupTime > 0
                ? now - pluginState.lastKeyupTime
                : undefined;

            // Track keydown timestamp for dwell-time calculation later
            pluginState.activeKeys.set(event.key, now);

            const keystrokeEvent: KeystrokeEvent = {
              type: 'keydown',
              keyCategory,
              timestamp: now,
              flightTime,
            };

            extensionOptions.onEvent(keystrokeEvent);
            return false; // never prevent default
          },

          handlePaste(view: EditorView, event: ClipboardEvent) {
            if (!extensionOptions.enabled || !extensionOptions.onEvent) return false;

            const text = event.clipboardData?.getData('text/plain') ?? '';
            const { from, to } = view.state.selection;

            const pasteEvent: EditEvent = {
              type: 'paste',
              position: { from, to },
              contentLength: text.length,
              timestamp: performance.now(),
              source: 'paste',
            };

            extensionOptions.onEvent(pasteEvent);
            return false;
          },
        },

        // ---- DOM event listeners (keyup + IME composition) ----------------
        view(editorView: EditorView) {
          const getPluginState = () =>
            typingCollectorKey.getState(editorView.state) as
              | CollectorPluginState
              | undefined;

          // -- keyup (not available via props.handleKeyUp in ProseMirror) --
          const handleKeyUp = (event: KeyboardEvent) => {
            if (!extensionOptions.enabled || !extensionOptions.onEvent) return;

            const pluginState = getPluginState();
            if (!pluginState || pluginState.isComposing) return;

            const now = performance.now();
            const keyCategory = classifyKey(event.key);

            // Dwell time = duration the key was held down
            const keydownTime = pluginState.activeKeys.get(event.key);
            const dwellTime =
              keydownTime !== undefined ? now - keydownTime : undefined;
            pluginState.activeKeys.delete(event.key);
            pluginState.lastKeyupTime = now;

            const keystrokeEvent: KeystrokeEvent = {
              type: 'keyup',
              keyCategory,
              timestamp: now,
              dwellTime,
            };

            extensionOptions.onEvent(keystrokeEvent);
          };

          // -- IME composition ---
          const handleCompositionStart = () => {
            const pluginState = getPluginState();
            if (pluginState) pluginState.isComposing = true;
          };

          const handleCompositionEnd = () => {
            const pluginState = getPluginState();
            if (pluginState) pluginState.isComposing = false;
          };

          editorView.dom.addEventListener('keyup', handleKeyUp);
          editorView.dom.addEventListener('compositionstart', handleCompositionStart);
          editorView.dom.addEventListener('compositionend', handleCompositionEnd);

          return {
            destroy() {
              editorView.dom.removeEventListener('keyup', handleKeyUp);
              editorView.dom.removeEventListener(
                'compositionstart',
                handleCompositionStart,
              );
              editorView.dom.removeEventListener(
                'compositionend',
                handleCompositionEnd,
              );
            },
          };
        },

        // ---- Document-change detection -----------------------------------
        appendTransaction(transactions, _oldState, _newState) {
          if (!extensionOptions.enabled || !extensionOptions.onEvent) return null;

          for (const tr of transactions) {
            if (!tr.docChanged) continue;

            tr.steps.forEach((step) => {
              const stepJson = step.toJSON();
              const now = performance.now();

              if (stepJson.stepType === 'replace') {
                const from: number = stepJson.from ?? 0;
                const to: number = stepJson.to ?? 0;
                const hasContent =
                  stepJson.slice?.content != null &&
                  stepJson.slice.content.length > 0;

                let editType: EditType;
                if (from === to && hasContent) {
                  editType = 'insert';
                } else if (!hasContent) {
                  editType = 'delete';
                } else {
                  editType = 'replace';
                }

                const editEvent: EditEvent = {
                  type: editType,
                  position: { from, to },
                  contentLength: hasContent
                    ? JSON.stringify(stepJson.slice).length
                    : 0,
                  timestamp: now,
                  source: 'keyboard',
                };

                extensionOptions.onEvent!(editEvent);
              }
            });
          }

          return null;
        },
      }),
    ];
  },
});
