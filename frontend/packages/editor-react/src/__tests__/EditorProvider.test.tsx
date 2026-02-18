import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EditorProvider, useEditorContext } from '../EditorProvider';

function TestConsumer() {
  const { editor } = useEditorContext();
  return <div data-testid="consumer">{editor ? 'has-editor' : 'no-editor'}</div>;
}

describe('EditorProvider', () => {
  it('provides null editor by default', () => {
    render(
      <EditorProvider editor={null}>
        <TestConsumer />
      </EditorProvider>,
    );

    expect(screen.getByTestId('consumer')).toHaveTextContent('no-editor');
  });

  it('renders children', () => {
    render(
      <EditorProvider editor={null}>
        <div data-testid="child">Child content</div>
      </EditorProvider>,
    );

    expect(screen.getByTestId('child')).toHaveTextContent('Child content');
  });
});
