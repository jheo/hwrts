'use client';

import Placeholder from '@tiptap/extension-placeholder';
import type { Extensions } from '@tiptap/react';

import { CustomLink } from './link';
import { CustomStarterKit } from './starter-kit';

export interface CreateExtensionsOptions {
  placeholder?: string;
}

export function createExtensions(options?: CreateExtensionsOptions): Extensions {
  return [
    CustomStarterKit,
    CustomLink,
    Placeholder.configure({
      placeholder: options?.placeholder ?? '글을 쓰기 시작하세요...',
    }),
  ];
}

export { CustomStarterKit } from './starter-kit';
export { CustomLink } from './link';
