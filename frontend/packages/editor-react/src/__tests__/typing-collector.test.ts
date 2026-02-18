import { Editor } from '@tiptap/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createExtensions } from '../extensions';
import { classifyKey } from '../extensions/typing-collector';
import type { CollectorCallback } from '../extensions/typing-collector';

// ---------------------------------------------------------------------------
// classifyKey — unit tests
// ---------------------------------------------------------------------------

describe('classifyKey', () => {
  it('classifies lowercase Latin letters as "letter"', () => {
    expect(classifyKey('a')).toBe('letter');
    expect(classifyKey('z')).toBe('letter');
    expect(classifyKey('m')).toBe('letter');
  });

  it('classifies uppercase Latin letters as "letter"', () => {
    expect(classifyKey('A')).toBe('letter');
    expect(classifyKey('Z')).toBe('letter');
  });

  it('classifies Korean Jamo characters as "letter"', () => {
    expect(classifyKey('\u3131')).toBe('letter'); // ㄱ
    expect(classifyKey('\u3163')).toBe('letter'); // ㅣ
    expect(classifyKey('\u314E')).toBe('letter'); // ㅎ
  });

  it('classifies Korean syllable characters as "letter"', () => {
    expect(classifyKey('\uAC00')).toBe('letter'); // 가
    expect(classifyKey('\uD7A3')).toBe('letter'); // 힣
    expect(classifyKey('한')).toBe('letter');
  });

  it('classifies digits as "number"', () => {
    expect(classifyKey('0')).toBe('number');
    expect(classifyKey('5')).toBe('number');
    expect(classifyKey('9')).toBe('number');
  });

  it('classifies single-char punctuation as "punct"', () => {
    expect(classifyKey('.')).toBe('punct');
    expect(classifyKey(',')).toBe('punct');
    expect(classifyKey('!')).toBe('punct');
    expect(classifyKey('@')).toBe('punct');
    expect(classifyKey(' ')).toBe('punct');
    expect(classifyKey('-')).toBe('punct');
    expect(classifyKey('+')).toBe('punct');
  });

  it('classifies modifier keys as "modifier"', () => {
    expect(classifyKey('Shift')).toBe('modifier');
    expect(classifyKey('Control')).toBe('modifier');
    expect(classifyKey('Alt')).toBe('modifier');
    expect(classifyKey('Meta')).toBe('modifier');
    expect(classifyKey('CapsLock')).toBe('modifier');
  });

  it('classifies navigation keys as "navigation"', () => {
    expect(classifyKey('ArrowUp')).toBe('navigation');
    expect(classifyKey('ArrowDown')).toBe('navigation');
    expect(classifyKey('ArrowLeft')).toBe('navigation');
    expect(classifyKey('ArrowRight')).toBe('navigation');
    expect(classifyKey('Home')).toBe('navigation');
    expect(classifyKey('End')).toBe('navigation');
    expect(classifyKey('PageUp')).toBe('navigation');
    expect(classifyKey('PageDown')).toBe('navigation');
    expect(classifyKey('Tab')).toBe('navigation');
  });

  it('classifies function keys as "function"', () => {
    expect(classifyKey('F1')).toBe('function');
    expect(classifyKey('F5')).toBe('function');
    expect(classifyKey('F12')).toBe('function');
    expect(classifyKey('F24')).toBe('function');
  });

  it('classifies unknown multi-char keys as "other"', () => {
    expect(classifyKey('Enter')).toBe('other');
    expect(classifyKey('Backspace')).toBe('other');
    expect(classifyKey('Delete')).toBe('other');
    expect(classifyKey('Escape')).toBe('other');
    expect(classifyKey('Insert')).toBe('other');
  });
});

// ---------------------------------------------------------------------------
// Privacy: key values are never stored
// ---------------------------------------------------------------------------

describe('TypingCollector privacy', () => {
  let editor: Editor;
  const collectedEvents: Array<Record<string, unknown>> = [];
  const callback: CollectorCallback = (event) => {
    collectedEvents.push(event as unknown as Record<string, unknown>);
  };

  beforeEach(() => {
    collectedEvents.length = 0;

    const el = document.createElement('div');
    document.body.appendChild(el);

    editor = new Editor({
      element: el,
      extensions: createExtensions({
        placeholder: 'Test',
        onTypingEvent: callback,
        collectingEnabled: true,
      }),
      content: '<p>Hello</p>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  it('never includes raw key values in emitted events', () => {
    // Simulate a keydown via the editor view
    const view = editor.view;
    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true });
    view.dom.dispatchEvent(event);

    // Wait a tick for any event processing
    for (const collected of collectedEvents) {
      // Ensure no property contains the actual key value 'a' as a stored field
      // The only expected string fields are: type, keyCategory, source
      const stringValues = Object.values(collected).filter(
        (v) => typeof v === 'string',
      );
      for (const _val of stringValues) {
        // 'a' could appear in 'paste' or 'navigation' etc., so we check
        // that there's no 'key' property
        expect(collected).not.toHaveProperty('key');
        expect(collected).not.toHaveProperty('keyValue');
        expect(collected).not.toHaveProperty('rawKey');
      }
    }
  });

  it('emitted keystroke events only contain allowed fields', () => {
    const view = editor.view;
    const keydownEvent = new KeyboardEvent('keydown', { key: 'b', bubbles: true });
    view.dom.dispatchEvent(keydownEvent);

    const allowedKeystrokeFields = new Set([
      'type',
      'keyCategory',
      'timestamp',
      'dwellTime',
      'flightTime',
    ]);

    for (const collected of collectedEvents) {
      if ('keyCategory' in collected) {
        for (const key of Object.keys(collected)) {
          expect(allowedKeystrokeFields.has(key)).toBe(true);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// TypingCollector extension integration
// ---------------------------------------------------------------------------

describe('TypingCollector extension', () => {
  let editor: Editor;
  const collectedEvents: Array<Record<string, unknown>> = [];
  const callback: CollectorCallback = (event) => {
    collectedEvents.push(event as unknown as Record<string, unknown>);
  };

  beforeEach(() => {
    collectedEvents.length = 0;

    const el = document.createElement('div');
    document.body.appendChild(el);

    editor = new Editor({
      element: el,
      extensions: createExtensions({
        placeholder: 'Test',
        onTypingEvent: callback,
        collectingEnabled: true,
      }),
      content: '<p>Hello</p>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  it('registers the typingCollector extension on the editor', () => {
    const names = editor.extensionManager.extensions.map((e) => e.name);
    expect(names).toContain('typingCollector');
  });

  it('collects edit events when document changes via editor commands', () => {
    // Insert text via editor command (triggers appendTransaction)
    editor.commands.focus();
    editor.commands.insertContent('World');

    const editEvents = collectedEvents.filter(
      (e) => !('keyCategory' in e) && 'source' in e,
    );
    expect(editEvents.length).toBeGreaterThan(0);
    expect(editEvents[0]).toHaveProperty('type');
    expect(editEvents[0]).toHaveProperty('position');
    expect(editEvents[0]).toHaveProperty('timestamp');
    expect(editEvents[0]).toHaveProperty('source', 'keyboard');
  });

  it('does not collect events when disabled', () => {
    // Create a disabled editor
    editor.destroy();
    collectedEvents.length = 0;

    const el = document.createElement('div');
    document.body.appendChild(el);

    editor = new Editor({
      element: el,
      extensions: createExtensions({
        placeholder: 'Test',
        onTypingEvent: callback,
        collectingEnabled: false,
      }),
      content: '<p>Hello</p>',
    });

    editor.commands.focus();
    editor.commands.insertContent('Disabled');

    // No events should be collected
    expect(collectedEvents.length).toBe(0);
  });

  it('works without a callback (no-op mode)', () => {
    editor.destroy();

    const el = document.createElement('div');
    document.body.appendChild(el);

    // Should not throw
    editor = new Editor({
      element: el,
      extensions: createExtensions({
        placeholder: 'Test',
        // no onTypingEvent
      }),
      content: '<p>Hello</p>',
    });

    editor.commands.focus();
    editor.commands.insertContent('NoOp');
    expect(editor.getText()).toContain('NoOp');
  });
});

// ---------------------------------------------------------------------------
// keyup DOM event handling (lines 207-231)
// ---------------------------------------------------------------------------

describe('TypingCollector keyup handling', () => {
  let editor: Editor;
  const collectedEvents: Array<Record<string, unknown>> = [];
  const callback: CollectorCallback = (event) => {
    collectedEvents.push(event as unknown as Record<string, unknown>);
  };

  beforeEach(() => {
    collectedEvents.length = 0;

    const el = document.createElement('div');
    document.body.appendChild(el);

    editor = new Editor({
      element: el,
      extensions: createExtensions({
        placeholder: 'Test',
        onTypingEvent: callback,
        collectingEnabled: true,
      }),
      content: '<p>Hello</p>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  it('emits a keyup event when keyup fires on the editor DOM', () => {
    const view = editor.view;
    view.dom.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', bubbles: true }));

    const keyupEvents = collectedEvents.filter((e) => e['type'] === 'keyup');
    expect(keyupEvents.length).toBeGreaterThan(0);
    expect(keyupEvents[0]).toHaveProperty('type', 'keyup');
    expect(keyupEvents[0]).toHaveProperty('keyCategory', 'letter');
    expect(keyupEvents[0]).toHaveProperty('timestamp');
  });

  it('calculates dwellTime when a matching keydown preceded the keyup', () => {
    const view = editor.view;

    // Fire keydown first (registers in activeKeys via handleKeyDown prop)
    view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));
    // Fire keyup
    view.dom.dispatchEvent(new KeyboardEvent('keyup', { key: 'x', bubbles: true }));

    const keyupEvents = collectedEvents.filter((e) => e['type'] === 'keyup');
    expect(keyupEvents.length).toBeGreaterThan(0);
    // dwellTime should be defined because a keydown preceded it
    expect(keyupEvents[0]).toHaveProperty('dwellTime');
    expect(typeof keyupEvents[0]!['dwellTime']).toBe('number');
  });

  it('emits keyup without dwellTime when no prior keydown was tracked', () => {
    const view = editor.view;

    // Fire keyup without a preceding keydown for this key
    view.dom.dispatchEvent(new KeyboardEvent('keyup', { key: 'z', bubbles: true }));

    const keyupEvents = collectedEvents.filter((e) => e['type'] === 'keyup');
    expect(keyupEvents.length).toBeGreaterThan(0);
    expect(keyupEvents[0]!['dwellTime']).toBeUndefined();
  });

  it('updates lastKeyupTime so subsequent keydown gets a flightTime', () => {
    const view = editor.view;

    // First keyup sets lastKeyupTime
    view.dom.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', bubbles: true }));

    // Then a keydown should include flightTime
    view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true }));

    const keydownEvents = collectedEvents.filter((e) => e['type'] === 'keydown');
    // The second keydown (after a keyup) should have flightTime
    const withFlight = keydownEvents.filter((e) => e['flightTime'] !== undefined);
    expect(withFlight.length).toBeGreaterThan(0);
    expect(typeof withFlight[0]!['flightTime']).toBe('number');
  });

  it('does not emit keyup events when collector is disabled', () => {
    editor.destroy();
    collectedEvents.length = 0;

    const el = document.createElement('div');
    document.body.appendChild(el);

    editor = new Editor({
      element: el,
      extensions: createExtensions({
        placeholder: 'Test',
        onTypingEvent: callback,
        collectingEnabled: false,
      }),
      content: '<p>Hello</p>',
    });

    editor.view.dom.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', bubbles: true }));

    const keyupEvents = collectedEvents.filter((e) => e['type'] === 'keyup');
    expect(keyupEvents.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// IME composition handling (lines 234-241)
// ---------------------------------------------------------------------------

describe('TypingCollector IME composition handling', () => {
  let editor: Editor;
  const collectedEvents: Array<Record<string, unknown>> = [];
  const callback: CollectorCallback = (event) => {
    collectedEvents.push(event as unknown as Record<string, unknown>);
  };

  beforeEach(() => {
    collectedEvents.length = 0;

    const el = document.createElement('div');
    document.body.appendChild(el);

    editor = new Editor({
      element: el,
      extensions: createExtensions({
        placeholder: 'Test',
        onTypingEvent: callback,
        collectingEnabled: true,
      }),
      content: '<p>Hello</p>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  it('suppresses keydown events during IME composition', () => {
    const view = editor.view;

    // Start composition (Korean IME)
    view.dom.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));

    // keydown fired during composition should be suppressed
    view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'ㅎ', bubbles: true }));

    const keydownEvents = collectedEvents.filter((e) => e['type'] === 'keydown');
    expect(keydownEvents.length).toBe(0);
  });

  it('suppresses keyup events during IME composition', () => {
    const view = editor.view;

    view.dom.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    view.dom.dispatchEvent(new KeyboardEvent('keyup', { key: 'ㅎ', bubbles: true }));

    const keyupEvents = collectedEvents.filter((e) => e['type'] === 'keyup');
    expect(keyupEvents.length).toBe(0);
  });

  it('resumes collecting keyup events after compositionend (composition flag resets)', () => {
    const view = editor.view;

    // Start composition — suppress all events
    view.dom.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    view.dom.dispatchEvent(new KeyboardEvent('keyup', { key: 'ㅎ', bubbles: true }));
    expect(collectedEvents.filter((e) => e['type'] === 'keyup').length).toBe(0);

    // End composition — flag should reset
    view.dom.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));

    // keyup after compositionend should be collected (verifies isComposing = false)
    view.dom.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', bubbles: true }));
    const keyupEvents = collectedEvents.filter((e) => e['type'] === 'keyup');
    expect(keyupEvents.length).toBeGreaterThan(0);
  });

  it('resumes collecting keyup events after compositionend', () => {
    const view = editor.view;

    view.dom.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    view.dom.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));

    view.dom.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', bubbles: true }));

    const keyupEvents = collectedEvents.filter((e) => e['type'] === 'keyup');
    expect(keyupEvents.length).toBeGreaterThan(0);
  });

  it('removes event listeners on destroy without errors', () => {
    const view = editor.view;
    const removeListenerSpy = vi.spyOn(view.dom, 'removeEventListener');

    editor.destroy();

    // Verify that removeEventListener was called for the three event types
    const removedTypes = removeListenerSpy.mock.calls.map((args) => args[0]);
    expect(removedTypes).toContain('keyup');
    expect(removedTypes).toContain('compositionstart');
    expect(removedTypes).toContain('compositionend');
  });
});

// ---------------------------------------------------------------------------
// appendTransaction: replace edit type (lines 284-287)
// ---------------------------------------------------------------------------

describe('TypingCollector appendTransaction replace editType', () => {
  let editor: Editor;
  const collectedEvents: Array<Record<string, unknown>> = [];
  const callback: CollectorCallback = (event) => {
    collectedEvents.push(event as unknown as Record<string, unknown>);
  };

  beforeEach(() => {
    collectedEvents.length = 0;

    const el = document.createElement('div');
    document.body.appendChild(el);

    editor = new Editor({
      element: el,
      extensions: createExtensions({
        placeholder: 'Test',
        onTypingEvent: callback,
        collectingEnabled: true,
      }),
      content: '<p>Hello world</p>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  it('emits an insert edit event when content is inserted at a cursor (from === to)', () => {
    editor.commands.focus();
    editor.commands.insertContentAt(6, '!');

    const editEvents = collectedEvents.filter(
      (e) => !('keyCategory' in e) && 'source' in e,
    );
    const insertEvents = editEvents.filter((e) => e['type'] === 'insert');
    expect(insertEvents.length).toBeGreaterThan(0);
    expect(insertEvents[0]).toHaveProperty('source', 'keyboard');
    expect(insertEvents[0]).toHaveProperty('position');
  });

  it('emits a delete edit event when content is deleted (no content in step)', () => {
    editor.commands.focus();
    // Select "Hello" (positions 1-6) and delete
    editor.commands.deleteRange({ from: 1, to: 6 });

    const editEvents = collectedEvents.filter(
      (e) => !('keyCategory' in e) && 'source' in e,
    );
    const deleteEvents = editEvents.filter((e) => e['type'] === 'delete');
    expect(deleteEvents.length).toBeGreaterThan(0);
    expect(deleteEvents[0]).toHaveProperty('contentLength', 0);
  });

  it('emits a replace edit event when a range is replaced with new content (from !== to, hasContent)', () => {
    editor.commands.focus();
    // Replace "Hello" (1–6) with "Goodbye" — from !== to AND has content
    editor.commands.insertContentAt({ from: 1, to: 6 }, 'Goodbye');

    const editEvents = collectedEvents.filter(
      (e) => !('keyCategory' in e) && 'source' in e,
    );
    const replaceEvents = editEvents.filter((e) => e['type'] === 'replace');
    expect(replaceEvents.length).toBeGreaterThan(0);
    expect(replaceEvents[0]).toHaveProperty('source', 'keyboard');
    // contentLength should be positive for replace events
    expect(replaceEvents[0]!['contentLength']).toBeGreaterThan(0);
  });

  it('does not emit edit events when enabled is false', () => {
    editor.destroy();
    collectedEvents.length = 0;

    const el = document.createElement('div');
    document.body.appendChild(el);

    editor = new Editor({
      element: el,
      extensions: createExtensions({
        placeholder: 'Test',
        onTypingEvent: callback,
        collectingEnabled: false,
      }),
      content: '<p>Hello world</p>',
    });

    editor.commands.insertContentAt({ from: 1, to: 6 }, 'Goodbye');
    expect(collectedEvents.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// handlePaste (lines 180-196)
// ---------------------------------------------------------------------------

// NOTE: Paste handling tests removed — jsdom does not implement DataTransfer
// or ClipboardEvent, so clipboard paste cannot be tested in this environment.
// Paste behaviour is covered by Playwright E2E tests instead.
