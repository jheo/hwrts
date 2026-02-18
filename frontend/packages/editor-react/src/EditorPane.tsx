'use client';

interface EditorPaneProps {
  documentId?: string;
}

export function EditorPane({ documentId: _documentId }: EditorPaneProps) {
  return (
    <div className="mx-auto max-w-[var(--editor-max-width)] pt-[var(--editor-padding-top)]">
      <p className="text-[var(--text-body)]">Editor will be initialized here with TipTap v2.</p>
    </div>
  );
}
