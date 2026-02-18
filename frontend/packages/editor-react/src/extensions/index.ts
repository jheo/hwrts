'use client';

import Placeholder from '@tiptap/extension-placeholder';
import type { Extensions } from '@tiptap/react';

import { FocusMode } from './focus-mode';
import { CustomLink } from './link';
import { ParagraphFocus } from './paragraph-focus';
import { CustomStarterKit } from './starter-kit';

export interface CreateExtensionsOptions {
  placeholder?: string;
}

export function createExtensions(options?: CreateExtensionsOptions): Extensions {
  return [
    CustomStarterKit,
    CustomLink,
    ParagraphFocus,
    FocusMode,
    Placeholder.configure({
      placeholder: options?.placeholder ?? '글을 쓰기 시작하세요...',
    }),
  ];
}

export { CustomStarterKit } from './starter-kit';
export { CustomLink } from './link';
export { ParagraphFocus } from './paragraph-focus';
export { FocusMode } from './focus-mode';
