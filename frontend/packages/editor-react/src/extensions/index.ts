'use client';

import Placeholder from '@tiptap/extension-placeholder';
import type { Extensions } from '@tiptap/react';

import { FocusMode } from './focus-mode';
import type { InlineFeedbackOptions, ReviewItem } from './inline-feedback';
import { InlineFeedback } from './inline-feedback';
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
  /** Initial review items for InlineFeedback (optional). */
  reviewItems?: ReviewItem[];
}

export function createExtensions(options?: CreateExtensionsOptions): Extensions {
  return [
    CustomStarterKit,
    CustomLink,
    ParagraphFocus,
    FocusMode,
    InlineFeedback.configure({
      reviewItems: options?.reviewItems ?? [],
    } satisfies InlineFeedbackOptions),
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
export { InlineFeedback } from './inline-feedback';
export { inlineFeedbackPluginKey } from './inline-feedback';
export type { ReviewItem, InlineFeedbackOptions } from './inline-feedback';
export { TypingCollector } from './typing-collector';
export type { CollectorCallback } from './typing-collector';
