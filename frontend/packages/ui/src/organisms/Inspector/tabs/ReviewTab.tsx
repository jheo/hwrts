'use client';

export function ReviewTab() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12">
      <p
        className="text-sm"
        style={{ color: 'var(--text-tertiary)' }}
      >
        맞춤법 및 문법 검사 결과가
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
