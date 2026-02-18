'use client';

import { cn } from '../../lib/cn';

interface RecordingIndicatorProps {
  isRecording: boolean;
  totalKeystrokes?: number;
  currentWpm?: number;
  compact?: boolean;
  className?: string;
}

export function RecordingIndicator({
  isRecording,
  totalKeystrokes,
  currentWpm,
  compact = false,
  className,
}: RecordingIndicatorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2',
        compact ? 'px-2 py-1' : 'px-4 py-3',
        className,
      )}
      role="status"
      aria-label={isRecording ? '키스트로크 수집 중' : '키스트로크 수집 대기 중'}
    >
      {/* Pulsing dot */}
      <span
        className={cn(
          'inline-block h-2 w-2 rounded-full',
          isRecording
            ? 'animate-pulse bg-emerald-500'
            : 'bg-[var(--text-body)] opacity-40',
        )}
      />

      {!compact && (
        <>
          <span
            className={cn(
              'text-xs',
              isRecording
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'opacity-60',
            )}
            style={isRecording ? undefined : { color: 'var(--text-body)' }}
          >
            {isRecording ? 'Recording' : '대기 중'}
          </span>

          {/* Optional stats when recording */}
          {isRecording && totalKeystrokes !== undefined && (
            <div
              className="ml-auto flex items-center gap-3 text-xs"
              style={{ color: 'var(--text-body)' }}
            >
              <span>{totalKeystrokes.toLocaleString()} keys</span>
              {currentWpm !== undefined && currentWpm > 0 && (
                <span>{currentWpm} WPM</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
