'use client';

import { forwardRef } from 'react';

import { cn } from '../lib/cn';

type BadgeSeverity = 'info' | 'warning' | 'error' | 'success';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  severity?: BadgeSeverity;
  children: React.ReactNode;
}

const severityStyles: Record<BadgeSeverity, string> = {
  info: 'bg-[var(--review-style-bg)] text-[var(--review-style-text)]',
  warning: 'bg-[var(--review-spelling-bg)] text-[var(--review-spelling-text)]',
  error: 'bg-[var(--review-fact-bg)] text-[var(--review-fact-text)]',
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ severity = 'info', className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
          severityStyles[severity],
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';
