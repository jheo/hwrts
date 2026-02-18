'use client';

import { cn } from '../../lib/cn';

export type InspectorTab = 'stats' | 'review' | 'summary';

interface InspectorHeaderProps {
  activeTab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  reviewCount?: number;
}

const tabs: { id: InspectorTab; label: string; disabled: boolean }[] = [
  { id: 'stats', label: '통계', disabled: false },
  { id: 'review', label: '리뷰', disabled: false },
  { id: 'summary', label: '요약', disabled: true },
];

export function InspectorHeader({ activeTab, onTabChange, reviewCount }: InspectorHeaderProps) {
  return (
    <div
      className="flex border-b px-4"
      style={{ borderColor: 'var(--border-default)' }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          disabled={tab.disabled}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'relative flex items-center gap-1.5 px-3 py-3 text-sm font-medium transition-colors',
            tab.disabled && 'cursor-not-allowed opacity-40',
            activeTab === tab.id
              ? 'text-[var(--text-active)]'
              : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]',
          )}
          title={tab.disabled ? 'Phase 2에서 활성화' : undefined}
        >
          {tab.label}
          {tab.id === 'review' && typeof reviewCount === 'number' && reviewCount > 0 && (
            <span
              className="inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium leading-none"
              style={{
                background: 'var(--review-spelling-bg)',
                color: 'var(--review-spelling-text)',
              }}
              aria-label={`${reviewCount}개 리뷰 항목`}
            >
              {reviewCount > 99 ? '99+' : reviewCount}
            </span>
          )}
          {activeTab === tab.id && (
            <span
              className="absolute bottom-0 left-0 right-0 h-0.5"
              style={{ background: 'var(--text-active)' }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
