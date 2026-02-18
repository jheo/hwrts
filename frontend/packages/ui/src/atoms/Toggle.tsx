'use client';

import * as TogglePrimitive from '@radix-ui/react-toggle';
import { forwardRef } from 'react';

import { cn } from '../lib/cn';

interface ToggleProps extends React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> {
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles: Record<string, string> = {
  sm: 'h-7 px-2 text-xs',
  md: 'h-9 px-3 text-sm',
  lg: 'h-11 px-4 text-base',
};

export const Toggle = forwardRef<React.ComponentRef<typeof TogglePrimitive.Root>, ToggleProps>(
  ({ className, size = 'md', ...props }, ref) => {
    return (
      <TogglePrimitive.Root
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]',
          'data-[state=on]:bg-[var(--surface-tertiary)] data-[state=on]:text-[var(--text-active)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          sizeStyles[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Toggle.displayName = 'Toggle';
