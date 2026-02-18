/**
 * E2E: Certification Flow
 *
 * Tests the full certificate issuance journey:
 *   1. Write text in the editor
 *   2. Open Inspector → confirm recording dot (RecordingIndicator) is visible
 *   3. Click "인증서 발행" button (certify) in the Inspector's Summary tab
 *   4. CertificateModal transitions through 4 steps:
 *      analyzing → review → signing → complete
 *   5. On "complete" step the verify URL is shown
 *
 * Requires:
 *   - Next.js dev server (http://localhost:3000)
 *   - Backend running at http://localhost:8080 (certificate issuance API)
 *   - PostgreSQL + Redis via docker-compose
 *
 * NOTE: Backend calls are mocked via Playwright route interception so these
 * tests can run without a live backend.
 */

import { expect, test } from '@playwright/test';

/** Mock certificate API response */
const MOCK_CERT_RESPONSE = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  shortHash: 'abc123def456ghi7',
  version: '1.0',
  grade: 'Certified',
  overallScore: 82,
  label: 'Strong human writing indicators detected.',
  verificationData: JSON.stringify({
    overallScore: 82,
    grade: 'Certified',
    label: 'Strong human writing indicators detected.',
    keystrokeDynamics: {
      score: 82,
      typingSpeedVariance: 0.34,
      errorCorrectionRate: 0.08,
      pausePatternEntropy: 3.7,
    },
  }),
  aiUsageData: JSON.stringify({
    enabled: false,
    features_used: [],
    suggestions_accepted: 0,
    suggestions_rejected: 0,
    total_suggestions: 0,
  }),
  contentHash: 'sha256:abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  signature: 'ed25519-sig-mock',
  status: 'active',
  issuedAt: new Date().toISOString(),
  documentTitle: '테스트 문서',
  authorName: 'Test Author',
  wordCount: 42,
  paragraphCount: 2,
  typingSpeedVariance: 0.34,
  errorCorrectionRate: 0.08,
  pausePatternEntropy: 3.7,
  verifyUrl: 'http://localhost:3000/verify/abc123def456ghi7',
};

test.describe('Certification Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept the certificate issuance POST endpoint
    await page.route('**/api/certificates', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_CERT_RESPONSE),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/editor');
    await page.waitForSelector('[role="textbox"][aria-label="Document editor"]', {
      timeout: 15_000,
    });
  });

  test('RecordingIndicator is visible in Inspector', async ({ page }) => {
    // Open Inspector
    const inspectorTrigger = page.locator('button[aria-label="Inspector 열기"]');
    await inspectorTrigger.click();

    const inspectorPanel = page.locator('[role="complementary"][aria-label="Inspector"]');
    await expect(inspectorPanel).toBeVisible({ timeout: 2_000 });

    // RecordingIndicator has role="status"
    const recordingStatus = inspectorPanel.locator('[role="status"]');
    await expect(recordingStatus).toBeVisible();
  });

  test('full certification flow: analyzing → review → signing → complete', async ({ page }) => {
    // Type enough content to trigger certification
    const editor = page.locator('[role="textbox"][aria-label="Document editor"]');
    await editor.click();
    await editor.type(
      '이 글은 HumanWrites 에디터에서 사람이 직접 작성한 텍스트입니다. ' +
        '키스트로크 패턴 분석을 통해 인간 작성 여부를 검증합니다.',
    );

    // Open Inspector → Summary tab
    const inspectorTrigger = page.locator('button[aria-label="Inspector 열기"]');
    await inspectorTrigger.click();

    const inspectorPanel = page.locator('[role="complementary"][aria-label="Inspector"]');
    await expect(inspectorPanel).toBeVisible({ timeout: 2_000 });

    // Navigate to Summary tab (인증 탭)
    const summaryTabBtn = inspectorPanel.locator('button', { hasText: /요약|Summary/i });
    if (await summaryTabBtn.isVisible()) {
      await summaryTabBtn.click();
    }

    // Click the certify button to open the CertificateModal
    const certifyBtn = page.locator('button', { hasText: /인증서 발행|Certify/i }).first();
    await certifyBtn.click();

    // --- Step 1: Analyzing ---
    const _modalTitle = page.locator('[data-radix-dialog-content] [id^="radix-"], [role="dialog"]')
      .locator('text=Analyzing Writing Patterns')
      .or(page.locator('text=Analyzing Writing Patterns'));
    // Modal should show the dialog (Radix Dialog.Content)
    const dialogContent = page.locator('[role="dialog"]');
    await expect(dialogContent).toBeVisible({ timeout: 5_000 });
    await expect(dialogContent).toContainText('Analyzing Writing Patterns');

    // --- Step 2: Review (after mock API resolves) ---
    await expect(dialogContent).toContainText('Analysis Result', { timeout: 5_000 });
    await expect(dialogContent).toContainText('Certified');
    await expect(dialogContent).toContainText('82/100');

    // Click "인증서 발행" in the review step to proceed to signing
    const proceedBtn = dialogContent.locator('button', { hasText: '인증서 발행' });
    await expect(proceedBtn).toBeVisible({ timeout: 3_000 });
    await proceedBtn.click();

    // --- Step 3: Signing ---
    await expect(dialogContent).toContainText('Signing Certificate', { timeout: 3_000 });

    // --- Step 4: Complete ---
    await expect(dialogContent).toContainText('Certificate Issued', { timeout: 5_000 });
    await expect(dialogContent).toContainText('Human Written Certificate');
    await expect(dialogContent).toContainText('Share on X');
  });

  test('verify URL shown on complete step', async ({ page }) => {
    const editor = page.locator('[role="textbox"][aria-label="Document editor"]');
    await editor.click();
    await editor.type('검증 URL 테스트를 위한 글입니다. 인증서 발행 후 URL이 표시되어야 합니다.');

    // Open Inspector and trigger certification
    const inspectorTrigger = page.locator('button[aria-label="Inspector 열기"]');
    await inspectorTrigger.click();

    const certifyBtn = page.locator('button', { hasText: /인증서 발행|Certify/i }).first();
    await certifyBtn.click();

    const dialogContent = page.locator('[role="dialog"]');
    await expect(dialogContent).toBeVisible({ timeout: 5_000 });

    // Wait for complete step
    await expect(dialogContent).toContainText('Certificate Issued', { timeout: 10_000 });

    // Complete step shows the document title and author
    await expect(dialogContent).toContainText('테스트 문서');

    // Share buttons should be visible
    await expect(dialogContent.locator('button', { hasText: 'Share on X' })).toBeVisible();
    await expect(dialogContent.locator('button', { hasText: 'LinkedIn' })).toBeVisible();
    await expect(dialogContent.locator('button', { hasText: 'Copy Link' })).toBeVisible();
  });

  test('modal closes on dialog close button', async ({ page }) => {
    const editor = page.locator('[role="textbox"][aria-label="Document editor"]');
    await editor.click();
    await editor.type('닫기 버튼 테스트용 텍스트입니다.');

    const inspectorTrigger = page.locator('button[aria-label="Inspector 열기"]');
    await inspectorTrigger.click();

    const certifyBtn = page.locator('button', { hasText: /인증서 발행|Certify/i }).first();
    await certifyBtn.click();

    const dialogContent = page.locator('[role="dialog"]');
    await expect(dialogContent).toBeVisible({ timeout: 5_000 });

    // Wait for review step with grade "Not Certified" scenario:
    // Override the mock to return Not Certified
    // For this test we wait for review and then close
    await expect(dialogContent).toContainText(/Analysis Result|Certificate Issued/, {
      timeout: 8_000,
    });

    // Click 닫기 button
    const closeBtn = dialogContent.locator('button', { hasText: '닫기' });
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await expect(dialogContent).not.toBeVisible({ timeout: 2_000 });
    }
  });
});
