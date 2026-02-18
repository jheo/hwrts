import { describe, expect, it } from 'vitest';

import { createExtensions } from '../extensions';

describe('createExtensions', () => {
  it('returns an array of extensions', () => {
    const extensions = createExtensions();
    expect(Array.isArray(extensions)).toBe(true);
    expect(extensions.length).toBeGreaterThan(0);
  });

  it('includes all expected extensions', () => {
    const extensions = createExtensions();

    // StarterKit, Link, ParagraphFocus, FocusMode, InlineFeedback, TypingCollector, Placeholder
    expect(extensions.length).toBe(7);
  });

  it('accepts custom placeholder text', () => {
    const extensions = createExtensions({ placeholder: 'Custom placeholder' });
    expect(Array.isArray(extensions)).toBe(true);
    expect(extensions.length).toBe(7);
  });

  it('uses default Korean placeholder when none provided', () => {
    const extensions = createExtensions();
    // Just verifying no errors thrown with default options
    expect(extensions).toBeDefined();
  });
});
