import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { StatItem } from '../molecules/StatItem/StatItem';
import { Inspector } from '../organisms/Inspector/Inspector';
import { InspectorHeader } from '../organisms/Inspector/InspectorHeader';
import { InspectorTrigger } from '../organisms/Inspector/InspectorTrigger';
import { ReviewTab } from '../organisms/Inspector/tabs/ReviewTab';
import { StatsTab } from '../organisms/Inspector/tabs/StatsTab';
import { SummaryTab } from '../organisms/Inspector/tabs/SummaryTab';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: {
    aside: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLElement> & { children: ReactNode }) => (
      <aside {...props}>{children}</aside>
    ),
  },
}));

describe('StatItem', () => {
  it('renders label and value', () => {
    render(<StatItem icon={<span>I</span>} label="Words" value={42} />);
    expect(screen.getByText('Words')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders string value', () => {
    render(<StatItem icon={<span>I</span>} label="Time" value="5분" />);
    expect(screen.getByText('5분')).toBeInTheDocument();
  });
});

describe('InspectorHeader', () => {
  it('renders three tabs', () => {
    const onTabChange = vi.fn();
    render(<InspectorHeader activeTab="stats" onTabChange={onTabChange} />);

    expect(screen.getByText('통계')).toBeInTheDocument();
    expect(screen.getByText('리뷰')).toBeInTheDocument();
    expect(screen.getByText('요약')).toBeInTheDocument();
  });

  it('calls onTabChange when clicking active tab', () => {
    const onTabChange = vi.fn();
    render(<InspectorHeader activeTab="stats" onTabChange={onTabChange} />);

    fireEvent.click(screen.getByText('통계'));
    expect(onTabChange).toHaveBeenCalledWith('stats');
  });

  it('disables review and summary tabs', () => {
    const onTabChange = vi.fn();
    render(<InspectorHeader activeTab="stats" onTabChange={onTabChange} />);

    const reviewBtn = screen.getByText('리뷰').closest('button');
    const summaryBtn = screen.getByText('요약').closest('button');
    expect(reviewBtn).toBeDisabled();
    expect(summaryBtn).toBeDisabled();
  });
});

describe('InspectorTrigger', () => {
  it('renders trigger button', () => {
    const onToggle = vi.fn();
    render(<InspectorTrigger onToggle={onToggle} />);

    const btn = screen.getByLabelText('Inspector 열기');
    expect(btn).toBeInTheDocument();
  });

  it('calls onToggle on click', () => {
    const onToggle = vi.fn();
    render(<InspectorTrigger onToggle={onToggle} />);

    fireEvent.click(screen.getByLabelText('Inspector 열기'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('calls onToggle after 500ms hover', () => {
    vi.useFakeTimers();
    const onToggle = vi.fn();
    render(<InspectorTrigger onToggle={onToggle} />);

    const btn = screen.getByLabelText('Inspector 열기');
    fireEvent.mouseEnter(btn);

    vi.advanceTimersByTime(500);
    expect(onToggle).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('cancels hover timer on mouse leave', () => {
    vi.useFakeTimers();
    const onToggle = vi.fn();
    render(<InspectorTrigger onToggle={onToggle} />);

    const btn = screen.getByLabelText('Inspector 열기');
    fireEvent.mouseEnter(btn);
    fireEvent.mouseLeave(btn);

    vi.advanceTimersByTime(500);
    expect(onToggle).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});

describe('StatsTab', () => {
  it('renders all stats', () => {
    render(
      <StatsTab wordCount={100} paragraphCount={5} readingTime={3} charCount={450} />,
    );

    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3분')).toBeInTheDocument();
    expect(screen.getByText('450')).toBeInTheDocument();
  });

  it('shows dash for zero reading time', () => {
    render(
      <StatsTab wordCount={0} paragraphCount={0} readingTime={0} charCount={0} />,
    );

    expect(screen.getByText('-')).toBeInTheDocument();
  });
});

describe('ReviewTab', () => {
  it('renders placeholder text', () => {
    render(<ReviewTab />);
    expect(screen.getByText('Phase 2에서 활성화')).toBeInTheDocument();
  });
});

describe('SummaryTab', () => {
  it('renders placeholder text', () => {
    render(<SummaryTab />);
    expect(screen.getByText('Phase 2에서 활성화')).toBeInTheDocument();
  });
});

describe('Inspector', () => {
  const defaultStats = {
    wordCount: 100,
    paragraphCount: 5,
    readingTime: 3,
    charCount: 450,
  };

  it('renders when open', () => {
    render(
      <Inspector
        isOpen={true}
        activeTab="stats"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
        stats={defaultStats}
      />,
    );

    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getByLabelText('Inspector 닫기')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Inspector
        isOpen={false}
        activeTab="stats"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
        stats={defaultStats}
      />,
    );

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <Inspector
        isOpen={true}
        activeTab="stats"
        onTabChange={vi.fn()}
        onClose={onClose}
        stats={defaultStats}
      />,
    );

    fireEvent.click(screen.getByLabelText('Inspector 닫기'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders stats tab content by default', () => {
    render(
      <Inspector
        isOpen={true}
        activeTab="stats"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
        stats={defaultStats}
      />,
    );

    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders review tab content', () => {
    render(
      <Inspector
        isOpen={true}
        activeTab="review"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
        stats={defaultStats}
      />,
    );

    expect(screen.getByText(/맞춤법 및 문법 검사/)).toBeInTheDocument();
  });

  it('renders summary tab content', () => {
    render(
      <Inspector
        isOpen={true}
        activeTab="summary"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
        stats={defaultStats}
      />,
    );

    expect(screen.getByText(/AI 문서 요약/)).toBeInTheDocument();
  });
});
