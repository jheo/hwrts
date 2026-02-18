'use client';

import Link from '@tiptap/extension-link';

export const CustomLink = Link.configure({
  autolink: true,
  openOnClick: false,
  linkOnPaste: true,
  HTMLAttributes: {
    rel: 'noopener noreferrer nofollow',
    target: null,
  },
});
