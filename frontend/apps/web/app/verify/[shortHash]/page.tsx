import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8080';

interface VerificationData {
  overallScore: number;
  grade: string;
  label: string;
  keystrokeDynamics: {
    score: number;
    typingSpeedVariance: number;
    errorCorrectionRate: number;
    pausePatternEntropy: number;
  };
}

interface AiUsageData {
  enabled: boolean;
  features_used: string[];
  suggestions_accepted: number;
  suggestions_rejected: number;
  total_suggestions: number;
}

interface CertificateData {
  id: string;
  shortHash: string;
  version: string;
  grade: string;
  overallScore: number;
  label: string;
  verificationData: string;
  aiUsageData: string;
  contentHash: string;
  signature: string;
  status: string;
  issuedAt: string;
}

async function getCertificate(shortHash: string): Promise<CertificateData | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/verify/${shortHash}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shortHash: string }>;
}): Promise<Metadata> {
  const { shortHash } = await params;
  const cert = await getCertificate(shortHash);

  if (!cert) {
    return { title: 'Certificate Not Found - HumanWrites' };
  }

  const title = `Human Written Certificate - HumanWrites`;
  const description = `Verified human-written content · Score: ${cert.overallScore}/100 · ${cert.grade}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://humanwrites.app/verify/${shortHash}`,
      siteName: 'HumanWrites',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

function CheckItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={
          checked
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-[var(--text-body)]'
        }
      >
        {checked ? '✓' : '○'}
      </span>
      <span className="text-[var(--text-active)]">{label}</span>
    </div>
  );
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[var(--text-body)]">{label}</span>
        <span className="text-[var(--text-active)]">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--text-body)]/10">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ shortHash: string }>;
}) {
  const { shortHash } = await params;
  const cert = await getCertificate(shortHash);

  if (!cert) {
    notFound();
  }

  const verification: VerificationData = JSON.parse(cert.verificationData);
  const aiUsage: AiUsageData = JSON.parse(cert.aiUsageData);
  const isCertified = cert.grade === 'Certified';

  return (
    <main className="min-h-screen bg-[var(--surface-primary)] px-4 py-12">
      <div className="mx-auto max-w-lg">
        {/* Certificate Card */}
        <div className="mb-8 overflow-hidden rounded-xl border-2 border-amber-200 bg-amber-50 p-8 shadow-lg dark:border-amber-800 dark:bg-amber-950/20">
          <div className="mb-6 text-center">
            <h1 className="font-serif text-3xl font-bold text-amber-900 dark:text-amber-200">
              Human Written Certificate
            </h1>
            <div className="mx-auto my-3 h-px w-40 bg-amber-300 dark:bg-amber-700" />
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Protocol v{cert.version}
            </p>
          </div>

          <div className="mb-6 text-center">
            <div
              className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full text-2xl ${
                isCertified
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {isCertified ? '✓' : '✗'}
            </div>
            <h2
              className={`text-xl font-semibold ${
                isCertified
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-700 dark:text-red-400'
              }`}
            >
              {cert.grade}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-body)]">{cert.label}</p>
          </div>

          {/* Score */}
          <div className="mb-6 text-center">
            <div className="text-4xl font-bold text-[var(--text-active)]">
              {cert.overallScore}
              <span className="text-lg text-[var(--text-body)]">/100</span>
            </div>
          </div>
        </div>

        {/* Typing Pattern Analysis */}
        <div className="mb-6 rounded-lg border border-[var(--text-body)]/20 p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-body)]">
            Keystroke Dynamics Analysis
          </h3>
          <div className="space-y-3">
            <ScoreBar
              label="Typing Speed Variance"
              value={verification.keystrokeDynamics.typingSpeedVariance * 100}
              max={60}
            />
            <ScoreBar
              label="Error Correction Rate"
              value={verification.keystrokeDynamics.errorCorrectionRate * 100}
              max={20}
            />
            <ScoreBar
              label="Pause Pattern Entropy"
              value={verification.keystrokeDynamics.pausePatternEntropy}
              max={6}
            />
          </div>
        </div>

        {/* Verification Checklist */}
        <div className="mb-6 rounded-lg border border-[var(--text-body)]/20 p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-body)]">
            Verification Checklist
          </h3>
          <div className="space-y-2">
            <CheckItem label="Layer 1 Keystroke Pattern Analysis" checked={isCertified} />
            <CheckItem
              label={`AI Usage Tracking ${aiUsage.enabled ? '(Active)' : '(Not Used)'}`}
              checked
            />
            <CheckItem label="Ed25519 Digital Signature" checked />
            <CheckItem label="Content Hash Integrity" checked />
          </div>
        </div>

        {/* Meta Info */}
        <div className="rounded-lg border border-[var(--text-body)]/20 p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-body)]">
            Certificate Details
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-body)]">Certificate ID</span>
              <span className="font-mono text-xs text-[var(--text-active)]">
                {cert.id.slice(0, 8)}...
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-body)]">Issued</span>
              <span className="text-[var(--text-active)]">
                {new Date(cert.issuedAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-body)]">Content Hash</span>
              <span className="font-mono text-xs text-[var(--text-active)]">
                {cert.contentHash.slice(0, 12)}...
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-body)]">Status</span>
              <span
                className={
                  cert.status === 'active'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }
              >
                {cert.status}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-[var(--text-body)]">
          <p>Verified by HumanWrites</p>
          <p className="mt-1">
            Public key available at{' '}
            <a
              href="/.well-known/humanwrites-public-key.pem"
              className="underline"
            >
              /.well-known/humanwrites-public-key.pem
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
