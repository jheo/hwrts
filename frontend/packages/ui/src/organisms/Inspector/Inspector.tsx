'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

import { InspectorHeader, type InspectorTab } from './InspectorHeader';
import type { ReviewItem } from './tabs/ReviewTab';
import { ReviewTab } from './tabs/ReviewTab';
import { StatsTab } from './tabs/StatsTab';
import { SummaryTab } from './tabs/SummaryTab';

interface InspectorProps {
  isOpen: boolean;
  activeTab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  onClose: () => void;
  stats: {
    wordCount: number;
    paragraphCount: number;
    readingTime: number;
    charCount: number;
  };
  reviewItems?: ReviewItem[];
  onReviewItemClick?: (item: ReviewItem) => void;
  onReviewAccept?: (item: ReviewItem) => void;
  onReviewIgnore?: (item: ReviewItem) => void;
  isReviewLoading?: boolean;
}

export function Inspector({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  stats,
  reviewItems,
  onReviewItemClick,
  onReviewAccept,
  onReviewIgnore,
  isReviewLoading,
}: InspectorProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: 360 }}
          animate={{ x: 0 }}
          exit={{ x: 360 }}
          transition={{
            type: 'tween',
            duration: 0.25,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          className="fixed right-0 top-0 z-30 flex h-full w-[360px] flex-col shadow-lg"
          style={{
            background: 'var(--surface-primary)',
            borderLeft: '1px solid var(--border-default)',
          }}
          role="complementary"
          aria-label="Inspector"
        >
          {/* Close button */}
          <div className="flex items-center justify-end px-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 transition-colors hover:bg-[var(--surface-secondary)]"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label="Inspector 닫기"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tab header */}
          <InspectorHeader
            activeTab={activeTab}
            onTabChange={onTabChange}
            reviewCount={reviewItems?.length}
          />

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'stats' && <StatsTab {...stats} />}
            {activeTab === 'review' && (
              <ReviewTab
                items={reviewItems}
                onItemClick={onReviewItemClick}
                onAccept={onReviewAccept}
                onIgnore={onReviewIgnore}
                isLoading={isReviewLoading}
              />
            )}
            {activeTab === 'summary' && <SummaryTab />}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
