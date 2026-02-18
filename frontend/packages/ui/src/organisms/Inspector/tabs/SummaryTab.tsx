'use client';

export function SummaryTab() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12">
      <p
        className="text-sm"
        style={{ color: 'var(--text-tertiary)' }}
      >
        AI 문서 요약이
        <br />
        여기에 표시됩니다.
      </p>
      <p
        className="mt-2 text-xs"
        style={{ color: 'var(--text-quaternary, var(--text-tertiary))' }}
      >
        Phase 2에서 활성화
      </p>
    </div>
  );
}
