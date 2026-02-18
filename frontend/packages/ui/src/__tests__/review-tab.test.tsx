import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ReviewItem } from '../organisms/Inspector/tabs/ReviewTab';
import { ReviewTab } from '../organisms/Inspector/tabs/ReviewTab';

const spellingItem: ReviewItem = {
  id: 'item-1',
  type: 'spelling',
  severity: 'error',
  range: { from: 0, to: 5 },
  message: '"있읍니다"는 "있습니다"로 써야 합니다.',
  suggestion: '있습니다',
  source: 'ai_model',
};

const grammarItem: ReviewItem = {
  id: 'item-2',
  type: 'grammar',
  severity: 'warning',
  range: { from: 10, to: 20 },
  message: '문장이 너무 깁니다. 나눠 쓰는 것을 고려하세요.',
  source: 'ai_model',
};

const infoItem: ReviewItem = {
  id: 'item-3',
  type: 'spelling',
  severity: 'info',
  range: { from: 30, to: 35 },
  message: '구어체 표현입니다.',
  suggestion: '문어체로 변경',
  source: 'ai_model',
};

describe('ReviewTab', () => {
  describe('empty state', () => {
    it('shows "이슈 없음" when items is empty and not loading', () => {
      render(<ReviewTab items={[]} />);
      expect(screen.getByText('이슈 없음')).toBeInTheDocument();
    });

    it('shows descriptive empty message', () => {
      render(<ReviewTab items={[]} />);
      expect(screen.getByText(/맞춤법 및 문법 오류가 발견되지 않았습니다/)).toBeInTheDocument();
    });

    it('shows "이슈 없음" when items prop is omitted', () => {
      render(<ReviewTab />);
      expect(screen.getByText('이슈 없음')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading indicator when isLoading is true', () => {
      render(<ReviewTab isLoading={true} />);
      expect(screen.getByText('검사 중...')).toBeInTheDocument();
    });

    it('marks container as busy when loading', () => {
      render(<ReviewTab isLoading={true} />);
      const container = screen.getByLabelText('리뷰 항목 로딩 중');
      expect(container).toHaveAttribute('aria-busy', 'true');
    });

    it('does not show empty state when loading', () => {
      render(<ReviewTab isLoading={true} items={[]} />);
      expect(screen.queryByText('이슈 없음')).not.toBeInTheDocument();
    });

    it('shows skeleton cards when loading', () => {
      render(<ReviewTab isLoading={true} />);
      // skeleton cards are hidden from accessibility tree
      const skeletons = document.querySelectorAll('[aria-hidden="true"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('item rendering', () => {
    it('renders a spelling item with badge', () => {
      render(<ReviewTab items={[spellingItem]} />);
      expect(screen.getByText('맞춤법')).toBeInTheDocument();
    });

    it('renders a grammar item with badge', () => {
      render(<ReviewTab items={[grammarItem]} />);
      expect(screen.getByText('문법')).toBeInTheDocument();
    });

    it('renders item message', () => {
      render(<ReviewTab items={[spellingItem]} />);
      expect(screen.getByText(spellingItem.message)).toBeInTheDocument();
    });

    it('renders suggestion when present', () => {
      render(<ReviewTab items={[spellingItem]} />);
      expect(screen.getByText('있습니다')).toBeInTheDocument();
    });

    it('does not render suggestion row when suggestion is absent', () => {
      render(<ReviewTab items={[grammarItem]} />);
      expect(screen.queryByText('제안:')).not.toBeInTheDocument();
    });

    it('renders multiple items', () => {
      render(<ReviewTab items={[spellingItem, grammarItem, infoItem]} />);
      expect(screen.getByText(spellingItem.message)).toBeInTheDocument();
      expect(screen.getByText(grammarItem.message)).toBeInTheDocument();
      expect(screen.getByText(infoItem.message)).toBeInTheDocument();
    });

    it('shows item count', () => {
      render(<ReviewTab items={[spellingItem, grammarItem]} />);
      expect(screen.getByText('2개 항목')).toBeInTheDocument();
    });

    it('renders list with proper role', () => {
      render(<ReviewTab items={[spellingItem]} />);
      expect(screen.getByRole('list', { name: '리뷰 항목 목록' })).toBeInTheDocument();
    });

    it('renders severity label for error', () => {
      render(<ReviewTab items={[spellingItem]} />);
      expect(screen.getByText('오류')).toBeInTheDocument();
    });

    it('renders severity label for warning', () => {
      render(<ReviewTab items={[grammarItem]} />);
      expect(screen.getByText('경고')).toBeInTheDocument();
    });

    it('renders severity label for info', () => {
      render(<ReviewTab items={[infoItem]} />);
      expect(screen.getByText('정보')).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('renders "수정" button when suggestion and onAccept provided', () => {
      render(<ReviewTab items={[spellingItem]} onAccept={vi.fn()} />);
      expect(screen.getByRole('button', { name: /수정 적용/ })).toBeInTheDocument();
    });

    it('does not render "수정" button when no suggestion', () => {
      render(<ReviewTab items={[grammarItem]} onAccept={vi.fn()} />);
      expect(screen.queryByRole('button', { name: /수정 적용/ })).not.toBeInTheDocument();
    });

    it('does not render "수정" button when onAccept not provided', () => {
      render(<ReviewTab items={[spellingItem]} />);
      expect(screen.queryByRole('button', { name: /수정 적용/ })).not.toBeInTheDocument();
    });

    it('renders "무시" button when onIgnore provided', () => {
      render(<ReviewTab items={[spellingItem]} onIgnore={vi.fn()} />);
      expect(screen.getByRole('button', { name: '무시' })).toBeInTheDocument();
    });

    it('does not render "무시" button when onIgnore not provided', () => {
      render(<ReviewTab items={[spellingItem]} />);
      expect(screen.queryByRole('button', { name: '무시' })).not.toBeInTheDocument();
    });

    it('calls onAccept with item when "수정" is clicked', () => {
      const onAccept = vi.fn();
      render(<ReviewTab items={[spellingItem]} onAccept={onAccept} />);
      fireEvent.click(screen.getByRole('button', { name: /수정 적용/ }));
      expect(onAccept).toHaveBeenCalledWith(spellingItem);
    });

    it('calls onIgnore with item when "무시" is clicked', () => {
      const onIgnore = vi.fn();
      render(<ReviewTab items={[spellingItem]} onIgnore={onIgnore} />);
      fireEvent.click(screen.getByRole('button', { name: '무시' }));
      expect(onIgnore).toHaveBeenCalledWith(spellingItem);
    });

    it('does not call onItemClick when action button is clicked', () => {
      const onItemClick = vi.fn();
      const onIgnore = vi.fn();
      render(<ReviewTab items={[spellingItem]} onItemClick={onItemClick} onIgnore={onIgnore} />);
      fireEvent.click(screen.getByRole('button', { name: '무시' }));
      expect(onItemClick).not.toHaveBeenCalled();
    });
  });

  describe('item click interaction', () => {
    it('calls onItemClick when item card is clicked', () => {
      const onItemClick = vi.fn();
      render(<ReviewTab items={[spellingItem]} onItemClick={onItemClick} />);
      fireEvent.click(screen.getByRole('button', { name: /이슈로 이동/ }));
      expect(onItemClick).toHaveBeenCalledWith(spellingItem);
    });

    it('calls onItemClick on Enter keydown', () => {
      const onItemClick = vi.fn();
      render(<ReviewTab items={[spellingItem]} onItemClick={onItemClick} />);
      fireEvent.keyDown(screen.getByRole('button', { name: /이슈로 이동/ }), { key: 'Enter' });
      expect(onItemClick).toHaveBeenCalledWith(spellingItem);
    });

    it('calls onItemClick on Space keydown', () => {
      const onItemClick = vi.fn();
      render(<ReviewTab items={[spellingItem]} onItemClick={onItemClick} />);
      fireEvent.keyDown(screen.getByRole('button', { name: /이슈로 이동/ }), { key: ' ' });
      expect(onItemClick).toHaveBeenCalledWith(spellingItem);
    });

    it('does not add button role when onItemClick not provided', () => {
      render(<ReviewTab items={[spellingItem]} />);
      expect(screen.queryByRole('button', { name: /이슈로 이동/ })).not.toBeInTheDocument();
    });
  });
});
