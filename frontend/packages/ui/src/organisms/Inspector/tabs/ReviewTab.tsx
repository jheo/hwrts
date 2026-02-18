'use client';

import { AlertCircle, Check, FileText, Loader2, SpellCheck, X } from 'lucide-react';

import { cn } from '../../../lib/cn';

export interface ReviewItem {
  id: string;
  type: 'spelling' | 'grammar';
  severity: 'info' | 'warning' | 'error';
  range: { from: number; to: number };
  message: string;
  suggestion?: string;
  source: 'ai_model' | 'user_ignore';
}

export interface ReviewTabProps {
  items?: ReviewItem[];
  onItemClick?: (item: ReviewItem) => void;
  onAccept?: (item: ReviewItem) => void;
  onIgnore?: (item: ReviewItem) => void;
  isLoading?: boolean;
}

const typeConfig = {
  spelling: {
    label: '맞춤법',
    icon: SpellCheck,
    badgeClass: 'bg-[var(--review-spelling-bg)] text-[var(--review-spelling-text)]',
  },
  grammar: {
    label: '문법',
    icon: FileText,
    badgeClass: 'bg-[var(--review-style-bg)] text-[var(--review-style-text)]',
  },
} as const;

const severityConfig = {
  info: { icon: AlertCircle, colorVar: 'var(--review-style-text)' },
  warning: { icon: AlertCircle, colorVar: 'var(--review-spelling-text)' },
  error: { icon: AlertCircle, colorVar: 'var(--review-fact-text)' },
} as const;

function ReviewItemCard({
  item,
  onItemClick,
  onAccept,
  onIgnore,
}: {
  item: ReviewItem;
  onItemClick?: (item: ReviewItem) => void;
  onAccept?: (item: ReviewItem) => void;
  onIgnore?: (item: ReviewItem) => void;
}) {
  const typeInfo = typeConfig[item.type];
  const TypeIcon = typeInfo.icon;

  return (
    <div
      className={cn(
        'rounded-lg px-3 py-3 transition-colors',
        onItemClick && 'cursor-pointer',
      )}
      style={{
        background: 'var(--surface-secondary)',
        border: '1px solid var(--border-primary)',
      }}
      onClick={() => onItemClick?.(item)}
      role={onItemClick ? 'button' : undefined}
      tabIndex={onItemClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onItemClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onItemClick(item);
        }
      }}
      aria-label={onItemClick ? `${typeInfo.label} 이슈로 이동: ${item.message}` : undefined}
    >
      {/* Header row: type badge + severity icon */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            typeInfo.badgeClass,
          )}
        >
          <TypeIcon size={11} />
          {typeInfo.label}
        </span>
        <span
          className="text-xs"
          style={{ color: severityConfig[item.severity].colorVar }}
          aria-label={`심각도: ${item.severity}`}
        >
          {item.severity === 'error' ? '오류' : item.severity === 'warning' ? '경고' : '정보'}
        </span>
      </div>

      {/* Message */}
      <p className="mb-1 text-sm" style={{ color: 'var(--text-primary)' }}>
        {item.message}
      </p>

      {/* Suggestion */}
      {item.suggestion && (
        <p className="mb-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          제안:{' '}
          <span
            className="font-medium"
            style={{ color: 'var(--review-spelling-text)' }}
          >
            {item.suggestion}
          </span>
        </p>
      )}

      {/* Actions */}
      <div
        className="flex gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {item.suggestion && onAccept && (
          <button
            type="button"
            onClick={() => onAccept(item)}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80"
            style={{
              background: 'var(--accent-primary)',
              color: 'var(--accent-primary-text)',
            }}
            aria-label={`수정 적용: ${item.suggestion}`}
          >
            <Check size={11} />
            수정
          </button>
        )}
        {onIgnore && (
          <button
            type="button"
            onClick={() => onIgnore(item)}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            style={{
              background: 'var(--surface-tertiary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-primary)',
            }}
            aria-label="무시"
          >
            <X size={11} />
            무시
          </button>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="animate-pulse rounded-lg px-3 py-3"
      style={{
        background: 'var(--surface-secondary)',
        border: '1px solid var(--border-primary)',
      }}
      aria-hidden="true"
    >
      <div className="mb-2 flex items-center gap-2">
        <div
          className="h-5 w-16 rounded-full"
          style={{ background: 'var(--surface-tertiary)' }}
        />
      </div>
      <div
        className="mb-1 h-4 w-full rounded"
        style={{ background: 'var(--surface-tertiary)' }}
      />
      <div
        className="h-3 w-2/3 rounded"
        style={{ background: 'var(--surface-tertiary)' }}
      />
    </div>
  );
}

export function ReviewTab({
  items = [],
  onItemClick,
  onAccept,
  onIgnore,
  isLoading = false,
}: ReviewTabProps) {
  if (isLoading) {
    return (
      <div className="px-4 py-3" aria-label="리뷰 항목 로딩 중" aria-busy="true">
        <div className="mb-2 flex items-center gap-2 pb-1">
          <Loader2
            size={13}
            className="animate-spin"
            style={{ color: 'var(--text-tertiary)' }}
          />
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            검사 중...
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12">
        <div
          className="mb-3 flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: 'var(--surface-secondary)' }}
        >
          <Check size={20} style={{ color: 'var(--accent-verified)' }} />
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          이슈 없음
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          맞춤법 및 문법 오류가 발견되지 않았습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
          {items.length}개 항목
        </span>
      </div>
      <div className="flex flex-col gap-2" role="list" aria-label="리뷰 항목 목록">
        {items.map((item) => (
          <div key={item.id} role="listitem">
            <ReviewItemCard
              item={item}
              onItemClick={onItemClick}
              onAccept={onAccept}
              onIgnore={onIgnore}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
