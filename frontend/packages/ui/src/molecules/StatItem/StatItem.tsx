'use client';

import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

interface StatItemProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  className?: string;
}

export function StatItem({ icon, label, value, className }: StatItemProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between py-2',
        className,
      )}
    >
      <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
        <span className="flex h-5 w-5 items-center justify-center">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <span
        className="text-sm font-medium tabular-nums"
        style={{ color: 'var(--text-active)' }}
      >
        {value}
      </span>
    </div>
  );
}
