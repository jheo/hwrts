'use client';

import { Info } from 'lucide-react';
import { useCallback, useRef } from 'react';

interface InspectorTriggerProps {
  onToggle: () => void;
}

export function InspectorTrigger({ onToggle }: InspectorTriggerProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    timerRef.current = setTimeout(() => {
      onToggle();
    }, 500);
  }, [onToggle]);

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="fixed right-0 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-md px-1.5 py-3 transition-opacity hover:opacity-60"
      style={{
        opacity: 0.3,
        color: 'var(--text-tertiary)',
        background: 'var(--surface-secondary)',
      }}
      aria-label="Inspector 열기"
    >
      <Info size={16} />
      <span
        className="h-8 w-px"
        style={{ background: 'var(--border-default)', opacity: 0.5 }}
      />
    </button>
  );
}
