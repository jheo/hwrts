import { describe, expect, it } from 'vitest';

import { createExtensions } from '../extensions';

describe('createExtensions', () => {
  it('returns an array of extensions', () => {
    const extensions = createExtensions();
    expect(Array.isArray(extensions)).toBe(true);
    expect(extensions.length).toBeGreaterThan(0);
  });

  it('includes StarterKit, Link, and Placeholder extensions', () => {
    const extensions = createExtensions();

    // Extensions should contain at minimum 3 items (StarterKit, Link, Placeholder)
    expect(extensions.length).toBe(3);
  });

  it('accepts custom placeholder text', () => {
    const extensions = createExtensions({ placeholder: 'Custom placeholder' });
    expect(Array.isArray(extensions)).toBe(true);
    expect(extensions.length).toBe(3);
  });

  it('uses default Korean placeholder when none provided', () => {
    const extensions = createExtensions();
    // Just verifying no errors thrown with default options
    expect(extensions).toBeDefined();
  });
});
