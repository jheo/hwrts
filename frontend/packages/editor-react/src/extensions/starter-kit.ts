'use client';

import StarterKit from '@tiptap/starter-kit';

export const CustomStarterKit = StarterKit.configure({
  heading: {
    levels: [1, 2, 3],
  },
  // Disable link from StarterKit — we use our own CustomLink with custom config
  link: false,
  // blockquote, bold, italic, strike, code, history: enabled by default
});
