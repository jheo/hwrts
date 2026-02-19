'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

export type CertificateStep = 'analyzing' | 'review' | 'signing' | 'complete';

export interface CertificateData {
  documentTitle: string;
  authorName: string;
  wordCount: number;
  paragraphCount: number;
  overallScore: number;
  grade: 'Certified' | 'Not Certified';
  label: string;
  typingSpeedVariance: number;
  errorCorrectionRate: number;
  pausePatternEntropy: number;
  shortHash?: string;
  verifyUrl?: string;
}

export interface CertificateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIssue: () => Promise<CertificateData>;
  data?: CertificateData;
}

const stepVariants = {
  enter: { opacity: 0, x: 20 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

function AnalyzingStep() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      <motion.div
        className="h-16 w-16 rounded-full border-4 border-[var(--text-body)] border-t-[var(--text-active)]"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      <p className="text-lg text-[var(--text-active)]">
        글쓰기 패턴을 분석하고 있습니다...
      </p>
      <p className="text-sm text-[var(--text-body)]">
        Analyzing your writing patterns...
      </p>
    </div>
  );
}

function ReviewStep({ data }: { data: CertificateData }) {
  const isCertified = data.grade === 'Certified';
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div
          className={`mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full text-3xl ${
            isCertified
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          }`}
        >
          {isCertified ? '✓' : '?'}
        </div>
        <h3 className="text-xl font-semibold text-[var(--text-active)]">
          {data.grade}
        </h3>
        <p className="text-sm text-[var(--text-body)]">{data.label}</p>
      </div>

      <div className="rounded-lg border border-[var(--text-body)]/20 p-4">
        <div className="mb-3 text-sm font-medium text-[var(--text-active)]">
          분석 결과
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-[var(--text-body)]">종합 점수</span>
            <div className="text-lg font-bold text-[var(--text-active)]">
              {data.overallScore}/100
            </div>
          </div>
          <div>
            <span className="text-[var(--text-body)]">타이핑 변동성</span>
            <div className="text-lg font-bold text-[var(--text-active)]">
              {(data.typingSpeedVariance * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <span className="text-[var(--text-body)]">오류 수정률</span>
            <div className="text-lg font-bold text-[var(--text-active)]">
              {(data.errorCorrectionRate * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <span className="text-[var(--text-body)]">패턴 엔트로피</span>
            <div className="text-lg font-bold text-[var(--text-active)]">
              {data.pausePatternEntropy.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {!isCertified && (
        <p className="text-center text-sm text-[var(--text-body)]">
          더 자연스러운 타이핑 패턴이 필요합니다. 글을 계속 작성해 보세요.
        </p>
      )}
    </div>
  );
}

function SigningStep() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      <motion.div
        className="text-5xl"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        🔏
      </motion.div>
      <p className="text-lg text-[var(--text-active)]">
        인증서에 서명하는 중...
      </p>
      <p className="text-sm text-[var(--text-body)]">
        Signing certificate with Ed25519...
      </p>
    </div>
  );
}

function CompleteStep({
  data,
  onShare,
}: {
  data: CertificateData;
  onShare: (platform: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Certificate Card - ceremonial style */}
      <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/20">
        <div className="mb-4 text-center">
          <h3 className="font-serif text-2xl font-bold text-amber-900 dark:text-amber-200">
            Human Written Certificate
          </h3>
          <div className="mx-auto my-2 h-px w-32 bg-amber-300 dark:bg-amber-700" />
        </div>

        <div className="space-y-2 text-center text-sm">
          <p className="font-serif text-lg text-amber-800 dark:text-amber-300">
            {data.documentTitle}
          </p>
          <p className="text-amber-700 dark:text-amber-400">by {data.authorName}</p>
          <p className="text-amber-600 dark:text-amber-500">
            {data.wordCount.toLocaleString()} words · Score: {data.overallScore}/100
          </p>
        </div>

        <div className="mt-4 text-center">
          <span className="inline-block rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            ✓ {data.grade}
          </span>
        </div>
      </div>

      {/* Share buttons */}
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={() => onShare('twitter')}
          className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          Share on X
        </button>
        <button
          type="button"
          onClick={() => onShare('linkedin')}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          LinkedIn
        </button>
        <button
          type="button"
          onClick={() => onShare('copy')}
          className="rounded-lg border border-[var(--text-body)]/30 px-4 py-2 text-sm text-[var(--text-active)] hover:bg-[var(--text-body)]/10"
        >
          Copy Link
        </button>
      </div>
    </div>
  );
}

export function CertificateModal({
  open,
  onOpenChange,
  onIssue,
  data: initialData,
}: CertificateModalProps) {
  const [step, setStep] = useState<CertificateStep>('analyzing');
  const [certData, setCertData] = useState<CertificateData | undefined>(initialData);
  const issuedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      issuedRef.current = false;
      return;
    }
    if (issuedRef.current) return;
    issuedRef.current = true;

    setStep('analyzing');
    setCertData(undefined);

    const doIssue = async () => {
      try {
        const data = await onIssue();
        setCertData(data);
        setStep('review');
      } catch {
        onOpenChange(false);
      }
    };
    void doIssue();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  const handleShare = (platform: string) => {
    if (!certData?.verifyUrl) return;
    const url = certData.verifyUrl;
    const text = `My writing "${certData.documentTitle}" has been certified as human-written by HumanWrites! Score: ${certData.overallScore}/100`;

    switch (platform) {
      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
          '_blank',
        );
        break;
      case 'linkedin':
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
          '_blank',
        );
        break;
      case 'copy':
        void navigator.clipboard.writeText(url);
        break;
    }
  };

  const handleProceedToSigning = () => {
    setStep('signing');
    setTimeout(() => setStep('complete'), 2000);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            className="fixed inset-0 z-50 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[var(--surface-primary)] p-6 shadow-xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Dialog.Title className="mb-4 text-center text-lg font-semibold text-[var(--text-active)]">
              {step === 'analyzing' && 'Analyzing Writing Patterns'}
              {step === 'review' && 'Analysis Result'}
              {step === 'signing' && 'Signing Certificate'}
              {step === 'complete' && 'Certificate Issued'}
            </Dialog.Title>
            <VisuallyHidden>
              <Dialog.Description>
                Human Written certification analysis and issuance dialog
              </Dialog.Description>
            </VisuallyHidden>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                {step === 'analyzing' && <AnalyzingStep />}
                {step === 'review' && certData && <ReviewStep data={certData} />}
                {step === 'signing' && <SigningStep />}
                {step === 'complete' && certData && (
                  <CompleteStep data={certData} onShare={handleShare} />
                )}
              </motion.div>
            </AnimatePresence>

            {step === 'review' && certData?.grade === 'Certified' && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={handleProceedToSigning}
                  className="rounded-lg bg-emerald-600 px-6 py-2 text-white hover:bg-emerald-700"
                >
                  인증서 발행
                </button>
              </div>
            )}

            {((step === 'review' && certData?.grade !== 'Certified') ||
              step === 'complete') && (
              <div className="mt-4 flex justify-center">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--text-body)]/30 px-6 py-2 text-sm text-[var(--text-active)]"
                  >
                    닫기
                  </button>
                </Dialog.Close>
              </div>
            )}
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
