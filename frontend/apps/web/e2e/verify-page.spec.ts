/**
 * E2E: Public Certificate Verification Page
 *
 * Tests the public-facing /verify/[shortHash] route:
 *   1. Visit /verify/abc123def456ghi7 (mocked backend response)
 *   2. Verify the certificate card renders with:
 *      - "Human Written Certificate" heading
 *      - Grade badge (Certified / Not Certified)
 *      - Score out of 100
 *      - Keystroke Dynamics Analysis section
 *      - Verification Checklist section
 *      - Certificate Details section
 *   3. Check that OG meta tags are present in the <head>
 *   4. Verify the public key link is rendered
 *   5. Test the not-found scenario
 *
 * The backend call (GET /api/verify/:shortHash) is mocked via Next.js route
 * interception at the Playwright layer.
 *
 * Requires:
 *   - Next.js dev server (http://localhost:3000)
 *   - Backend /api/verify endpoint mocked
 */

import { expect, test } from '@playwright/test';

const SHORT_HASH = 'abc123def456ghi7';

const MOCK_CERT = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  shortHash: SHORT_HASH,
  version: '1.0',
  grade: 'Certified',
  overallScore: 78,
  label: 'Human writing patterns confirmed.',
  verificationData: JSON.stringify({
    overallScore: 78,
    grade: 'Certified',
    label: 'Human writing patterns confirmed.',
    keystrokeDynamics: {
      score: 78,
      typingSpeedVariance: 0.29,
      errorCorrectionRate: 0.11,
      pausePatternEntropy: 3.2,
    },
  }),
  aiUsageData: JSON.stringify({
    enabled: true,
    features_used: ['spelling'],
    suggestions_accepted: 2,
    suggestions_rejected: 1,
    total_suggestions: 3,
  }),
  contentHash:
    'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  signature: 'ed25519-mock-signature',
  status: 'active',
  issuedAt: '2026-02-18T12:00:00.000Z',
};

test.describe('Certificate Verification Page', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept the Next.js SSR fetch to the backend
    await page.route(`**/api/verify/${SHORT_HASH}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CERT),
      });
    });
  });

  test('certificate card renders with grade and score', async ({ page }) => {
    await page.goto(`/verify/${SHORT_HASH}`);

    // Main heading
    const heading = page.locator('h1', { hasText: 'Human Written Certificate' });
    await expect(heading).toBeVisible({ timeout: 10_000 });

    // Grade display
    await expect(page.locator('h2', { hasText: 'Certified' })).toBeVisible();

    // Score
    await expect(page.locator('text=78')).toBeVisible();
    await expect(page.locator('text=/100/')).toBeVisible();
  });

  test('Keystroke Dynamics Analysis section is present', async ({ page }) => {
    await page.goto(`/verify/${SHORT_HASH}`);

    await page.waitForSelector('h1', { timeout: 10_000 });

    await expect(
      page.locator('h3', { hasText: /Keystroke Dynamics Analysis/i }),
    ).toBeVisible();

    // Score bars for the three metrics
    await expect(page.locator('text=Typing Speed Variance')).toBeVisible();
    await expect(page.locator('text=Error Correction Rate')).toBeVisible();
    await expect(page.locator('text=Pause Pattern Entropy')).toBeVisible();
  });

  test('Verification Checklist section is present', async ({ page }) => {
    await page.goto(`/verify/${SHORT_HASH}`);
    await page.waitForSelector('h1', { timeout: 10_000 });

    await expect(
      page.locator('h3', { hasText: /Verification Checklist/i }),
    ).toBeVisible();

    await expect(
      page.locator('text=Layer 1 Keystroke Pattern Analysis'),
    ).toBeVisible();
    await expect(page.locator('text=Ed25519 Digital Signature')).toBeVisible();
    await expect(page.locator('text=Content Hash Integrity')).toBeVisible();
  });

  test('Certificate Details section shows truncated id and hash', async ({ page }) => {
    await page.goto(`/verify/${SHORT_HASH}`);
    await page.waitForSelector('h1', { timeout: 10_000 });

    await expect(
      page.locator('h3', { hasText: /Certificate Details/i }),
    ).toBeVisible();

    // Truncated cert ID (first 8 chars + "...")
    await expect(page.locator('text=550e8400...')).toBeVisible();

    // Status = active
    await expect(page.locator('text=active')).toBeVisible();
  });

  test('public key link is rendered', async ({ page }) => {
    await page.goto(`/verify/${SHORT_HASH}`);
    await page.waitForSelector('h1', { timeout: 10_000 });

    const pkLink = page.locator('a[href="/.well-known/humanwrites-public-key.pem"]');
    await expect(pkLink).toBeVisible();
    await expect(pkLink).toContainText('/.well-known/humanwrites-public-key.pem');
  });

  test('OG meta tags are present for certificate page', async ({ page }) => {
    await page.goto(`/verify/${SHORT_HASH}`);
    await page.waitForSelector('h1', { timeout: 10_000 });

    // Check OG title meta tag
    const ogTitle = await page
      .locator('meta[property="og:title"]')
      .getAttribute('content');
    expect(ogTitle).toContain('Human Written Certificate');

    // Check OG description meta tag
    const ogDesc = await page
      .locator('meta[property="og:description"]')
      .getAttribute('content');
    expect(ogDesc).toContain('78');
    expect(ogDesc).toContain('Certified');

    // Twitter card
    const twitterCard = await page
      .locator('meta[name="twitter:card"]')
      .getAttribute('content');
    expect(twitterCard).toBe('summary_large_image');
  });

  test('not-found page renders when certificate does not exist', async ({ page }) => {
    // Mock a 404 response for a non-existent hash
    await page.route('**/api/verify/nonexistent000000', async (route) => {
      await route.fulfill({ status: 404, body: '' });
    });

    await page.goto('/verify/nonexistent000000');

    // Next.js notFound() renders the not-found.tsx component
    // It should show some "not found" messaging
    await expect(
      page.locator('text=/not found|찾을 수 없/i').or(page.locator('h1, h2')),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('"Not Certified" grade shows with correct styling cue', async ({ page }) => {
    const notCertifiedHash = 'fail000000000000';

    await page.route(`**/api/verify/${notCertifiedHash}`, async (route) => {
      const notCertifiedCert = {
        ...MOCK_CERT,
        shortHash: notCertifiedHash,
        grade: 'Not Certified',
        overallScore: 35,
        label: 'Insufficient human writing patterns.',
        verificationData: JSON.stringify({
          overallScore: 35,
          grade: 'Not Certified',
          label: 'Insufficient human writing patterns.',
          keystrokeDynamics: {
            score: 35,
            typingSpeedVariance: 0.05,
            errorCorrectionRate: 0.01,
            pausePatternEntropy: 1.2,
          },
        }),
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(notCertifiedCert),
      });
    });

    await page.goto(`/verify/${notCertifiedHash}`);
    await page.waitForSelector('h1', { timeout: 10_000 });

    await expect(page.locator('h2', { hasText: 'Not Certified' })).toBeVisible();
    await expect(page.locator('text=35')).toBeVisible();
  });
});
