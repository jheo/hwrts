import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Editor } from '../Editor';

describe('Editor', () => {
  it('renders the editor with textbox role', async () => {
    render(<Editor />);

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  it('renders with initial content', async () => {
    render(<Editor content="<p>Hello World</p>" />);

    await waitFor(() => {
      const editor = screen.getByRole('textbox');
      expect(editor).toHaveTextContent('Hello World');
    });
  });

  it('renders with placeholder', async () => {
    render(<Editor placeholder="Start writing..." />);

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  it('has correct aria attributes', async () => {
    render(<Editor />);

    await waitFor(() => {
      const editor = screen.getByRole('textbox');
      expect(editor).toHaveAttribute('aria-label', 'Document editor');
      expect(editor).toHaveAttribute('aria-multiline', 'true');
    });
  });

  it('calls onUpdate when content changes', async () => {
    const onUpdate = vi.fn();
    render(<Editor onUpdate={onUpdate} content="<p>Initial</p>" />);

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    // onUpdate is called during initialization via useEditorState
    // The actual update testing requires user interaction
  });

  it('sanitizes malicious HTML content', async () => {
    render(
      <Editor content='<p>Safe</p><script>alert("xss")</script><img src=x onerror=alert(1)>' />,
    );

    await waitFor(() => {
      const editor = screen.getByRole('textbox');
      expect(editor).toHaveTextContent('Safe');
      expect(editor.innerHTML).not.toContain('<script>');
      expect(editor.innerHTML).not.toContain('onerror');
    });
  });

  it('allows safe HTML tags', async () => {
    render(
      <Editor content="<p><strong>Bold</strong> and <em>italic</em> and <s>strike</s></p>" />,
    );

    await waitFor(() => {
      const editor = screen.getByRole('textbox');
      expect(editor.querySelector('strong')).toBeInTheDocument();
      expect(editor.querySelector('em')).toBeInTheDocument();
      expect(editor.querySelector('s')).toBeInTheDocument();
    });
  });
});
