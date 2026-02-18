import { Editor } from '@tiptap/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
