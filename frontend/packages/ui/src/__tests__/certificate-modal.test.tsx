import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CertificateModal } from '../organisms/CertificateModal/CertificateModal';
import type { CertificateData } from '../organisms/CertificateModal/CertificateModal';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

const makeCertData = (grade: 'Certified' | 'Not Certified' = 'Certified'): CertificateData => ({
  documentTitle: 'Test Document',
  authorName: 'Test Author',
  wordCount: 500,
  paragraphCount: 5,
  overallScore: 85,
  grade,
  label: grade === 'Certified' ? '인간 작성 인증됨' : '인증 불가',
  typingSpeedVariance: 0.15,
  errorCorrectionRate: 0.08,
  pausePatternEntropy: 2.34,
  shortHash: 'abc123',
  verifyUrl: 'https://humanwrites.app/verify/abc123',
});

describe('CertificateModal', () => {
  it('renders analyzing step when opened', async () => {
    const onIssue = vi.fn(() => new Promise<CertificateData>(() => {})); // never resolves
    render(
      <CertificateModal
        open={true}
        onOpenChange={vi.fn()}
        onIssue={onIssue}
      />,
    );

    expect(screen.getByText('Analyzing Writing Patterns')).toBeInTheDocument();
    expect(screen.getByText('글쓰기 패턴을 분석하고 있습니다...')).toBeInTheDocument();
    expect(screen.getByText('Analyzing your writing patterns...')).toBeInTheDocument();
  });

  it('renders review step with Certified result after onIssue resolves', async () => {
    vi.useFakeTimers();
    const certData = makeCertData('Certified');
    const onIssue = vi.fn().mockResolvedValue(certData);

    render(
      <CertificateModal
        open={true}
        onOpenChange={vi.fn()}
        onIssue={onIssue}
      />,
    );

    // Wait for onIssue to resolve and state to update
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('Analysis Result')).toBeInTheDocument();
    expect(screen.getByText('Certified')).toBeInTheDocument();
    expect(screen.getByText('85/100')).toBeInTheDocument();
    expect(screen.getByText('인증서 발행')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('renders review step with Not Certified result and guidance message', async () => {
    vi.useFakeTimers();
    const certData = makeCertData('Not Certified');
    const onIssue = vi.fn().mockResolvedValue(certData);

    render(
      <CertificateModal
        open={true}
        onOpenChange={vi.fn()}
        onIssue={onIssue}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('Not Certified')).toBeInTheDocument();
    expect(
      screen.getByText('더 자연스러운 타이핑 패턴이 필요합니다. 글을 계속 작성해 보세요.'),
    ).toBeInTheDocument();
    // Should show close button for non-certified
    expect(screen.getByText('닫기')).toBeInTheDocument();
    // Should NOT show issue button
    expect(screen.queryByText('인증서 발행')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('proceeds to signing step when 인증서 발행 is clicked', async () => {
    vi.useFakeTimers();
    const certData = makeCertData('Certified');
    const onIssue = vi.fn().mockResolvedValue(certData);

    render(
      <CertificateModal
        open={true}
        onOpenChange={vi.fn()}
        onIssue={onIssue}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    // Click 인증서 발행
    fireEvent.click(screen.getByText('인증서 발행'));

    expect(screen.getByText('Signing Certificate')).toBeInTheDocument();
    expect(screen.getByText('인증서에 서명하는 중...')).toBeInTheDocument();
    expect(screen.getByText('Signing certificate with Ed25519...')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('proceeds to complete step after signing animation', async () => {
    vi.useFakeTimers();
    const certData = makeCertData('Certified');
    const onIssue = vi.fn().mockResolvedValue(certData);

    render(
      <CertificateModal
        open={true}
        onOpenChange={vi.fn()}
        onIssue={onIssue}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    // Click 인증서 발행
    fireEvent.click(screen.getByText('인증서 발행'));

    // Advance signing timer
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText('Certificate Issued')).toBeInTheDocument();
    expect(screen.getByText('Human Written Certificate')).toBeInTheDocument();
    expect(screen.getByText('Test Document')).toBeInTheDocument();
    expect(screen.getByText('by Test Author')).toBeInTheDocument();
    expect(screen.getByText('Share on X')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByText('Copy Link')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('calls onOpenChange(false) when onIssue rejects', async () => {
    const onOpenChange = vi.fn();
    const onIssue = vi.fn().mockRejectedValue(new Error('API error'));

    render(
      <CertificateModal
        open={true}
        onOpenChange={onOpenChange}
        onIssue={onIssue}
      />,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve(); // extra tick for rejection handling
    });

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('displays score metrics in review step', async () => {
    vi.useFakeTimers();
    const certData = makeCertData('Certified');
    const onIssue = vi.fn().mockResolvedValue(certData);

    render(
      <CertificateModal
        open={true}
        onOpenChange={vi.fn()}
        onIssue={onIssue}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    // typingSpeedVariance: 0.15 -> 15.0%
    expect(screen.getByText('15.0%')).toBeInTheDocument();
    // errorCorrectionRate: 0.08 -> 8.0%
    expect(screen.getByText('8.0%')).toBeInTheDocument();
    // pausePatternEntropy: 2.34
    expect(screen.getByText('2.34')).toBeInTheDocument();

    vi.useRealTimers();
  });
});
