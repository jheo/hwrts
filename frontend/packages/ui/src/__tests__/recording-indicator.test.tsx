import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RecordingIndicator } from '../molecules/RecordingIndicator/RecordingIndicator';

describe('RecordingIndicator', () => {
  it('renders recording state', () => {
    render(<RecordingIndicator isRecording={true} />);
    expect(screen.getByText('Recording')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', '키스트로크 수집 중');
  });

  it('renders inactive state', () => {
    render(<RecordingIndicator isRecording={false} />);
    expect(screen.getByText('대기 중')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', '키스트로크 수집 대기 중');
  });

  it('shows keystroke count when recording', () => {
    render(<RecordingIndicator isRecording={true} totalKeystrokes={1234} />);
    expect(screen.getByText('1,234 keys')).toBeInTheDocument();
  });

  it('shows WPM when recording and WPM > 0', () => {
    render(<RecordingIndicator isRecording={true} totalKeystrokes={100} currentWpm={65} />);
    expect(screen.getByText('65 WPM')).toBeInTheDocument();
  });

  it('hides WPM when zero', () => {
    render(<RecordingIndicator isRecording={true} totalKeystrokes={100} currentWpm={0} />);
    expect(screen.queryByText('0 WPM')).not.toBeInTheDocument();
  });

  it('renders compact mode (dot only, no text)', () => {
    render(<RecordingIndicator isRecording={true} compact={true} />);
    expect(screen.queryByText('Recording')).not.toBeInTheDocument();
    // Dot should still be present via role="status"
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<RecordingIndicator isRecording={true} className="mt-4" />);
    expect(screen.getByRole('status')).toHaveClass('mt-4');
  });
});
