'use client';

import dynamic from 'next/dynamic';
import './editor.css';

const Editor = dynamic(
  () =>
    import('@humanwrites/editor-react').then((m) => ({ default: m.Editor })),
  { ssr: false },
);

export default function EditorPage() {
  return (
    <div className="min-h-screen w-full" style={{ background: 'var(--surface-primary)' }}>
      <div
        className="mx-auto w-full"
        style={{
          maxWidth: 'var(--editor-max-width)',
          paddingTop: '80px',
          paddingLeft: '1rem',
          paddingRight: '1rem',
        }}
      >
        {/* Title input */}
        <input
          type="text"
          placeholder="제목 없음"
          className="editor-title w-full border-none bg-transparent outline-none"
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: '2.25rem',
            fontWeight: 700,
            lineHeight: 1.2,
            color: 'var(--text-active)',
            marginBottom: '2rem',
            caretColor: 'var(--text-active)',
          }}
        />

        {/* Editor */}
        <Editor placeholder="글을 쓰기 시작하세요..." />
      </div>
    </div>
  );
}
