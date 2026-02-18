'use client';

import Placeholder from '@tiptap/extension-placeholder';
import type { Extensions } from '@tiptap/react';

import { FocusMode } from './focus-mode';
import { CustomLink } from './link';
import { ParagraphFocus } from './paragraph-focus';
import { CustomStarterKit } from './starter-kit';
import type { CollectorCallback } from './typing-collector';
import { TypingCollector } from './typing-collector';

export interface CreateExtensionsOptions {
  placeholder?: string;
  /** Called for every keystroke / edit event collected by TypingCollector. */
  onTypingEvent?: CollectorCallback;
  /** Enable or disable keystroke collection (default: true). */
  collectingEnabled?: boolean;
}

export function createExtensions(options?: CreateExtensionsOptions): Extensions {
  return [
    CustomStarterKit,
    CustomLink,
    ParagraphFocus,
    FocusMode,
    TypingCollector.configure({
      onEvent: options?.onTypingEvent,
      enabled: options?.collectingEnabled ?? true,
    }),
    Placeholder.configure({
      placeholder: options?.placeholder ?? '글을 쓰기 시작하세요...',
    }),
  ];
}

export { CustomStarterKit } from './starter-kit';
export { CustomLink } from './link';
export { ParagraphFocus } from './paragraph-focus';
export { FocusMode } from './focus-mode';
export { TypingCollector } from './typing-collector';
export type { CollectorCallback } from './typing-collector';
