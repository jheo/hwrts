/**
 * E2E: Error & Degradation Flows
 *
 * Tests graceful degradation when external services fail:
 *   1. AI spelling endpoint failure:
 *      - Mock POST /api/ai/spelling → 500 Internal Server Error
 *      - Editor should still be fully functional (typing works)
 *      - Inspector Review tab should show "AI 서비스 일시 중단" or empty state
 *   2. Certificate issuance failure:
 *      - Mock POST /api/certificates → 500
 *      - CertificateModal should close (error handling in onIssue catch)
 *   3. Verify page backend unavailable:
 *      - GET /api/verify/:hash → network error
 *      - Should render not-found page
 *   4. Network offline simulation:
 *      - Auto-save still works locally (IndexedDB, no backend)
 *
 * Requires: Next.js dev server (http://localhost:3000)
 */

import { expect, test } from '@playwright/test';

test.describe('Error Flows - AI Service Failure', () => {
  test.beforeEach(async ({ page }) => {
    // Simulate AI service failure
    await page.route('**/api/ai/spelling', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error', message: 'AI service unavailable' }),
      });
    });
    await page.route('**/api/ai/fact-check', async (route) => {
      await route.fulfill({ status: 500, body: '' });
    });
    await page.route('**/api/ai/style', async (route) => {
      await route.fulfill({ status: 500, body: '' });
    });

    await page.goto('/editor');
    await page.waitForSelector('[role="textbox"][aria-label="Document editor"]', {
      timeout: 15_000,
    });
  });

  test('editor remains functional when AI service is down', async ({ page }) => {
    const editor = page.locator('[role="textbox"][aria-label="Document editor"]');
    await editor.click();

    // Typing should work normally
    await editor.type('AI 서비스 중단 상태에서도 에디터는 정상 동작해야 합니다.');

    await expect(editor).toContainText('AI 서비스 중단 상태에서도');

    // Title input should also work
    const titleInput = page.locator('input[placeholder="제목 없음"]');
    await titleInput.fill('에러 플로우 테스트');
    await expect(titleInput).toHaveValue('에러 플로우 테스트');
  });

  test('Inspector Review tab shows empty/error state when AI is down', async ({ page }) => {
    const editor = page.locator('[role="textbox"][aria-label="Document editor"]');
    await editor.click();
    await editor.type('AI가 실패할 때 UI가 어떻게 되는지 확인합니다.');

    // Open Inspector
    const inspectorTrigger = page.locator('button[aria-label="Inspector 열기"]');
    await inspectorTrigger.click();

    const inspectorPanel = page.locator('[role="complementary"][aria-label="Inspector"]');
    await expect(inspectorPanel).toBeVisible({ timeout: 2_000 });

    // Navigate to Review tab
    const reviewTabBtn = inspectorPanel.locator('button', { hasText: /리뷰|Review/i });
    await reviewTabBtn.click();

    // Wait for the AI call to fail and UI to settle (at least 2s for debounce)
    await page.waitForTimeout(2_500);

    // Review tab should either show empty state or AI service error message
    // It should NOT crash — the panel must still be visible
    await expect(inspectorPanel).toBeVisible();

    // Should not show any review items from the failed call
    const reviewItems = inspectorPanel.locator('[data-review-item]');
    const count = await reviewItems.count();
    expect(count).toBe(0);
  });

  test('save status works independently of AI (local auto-save)', async ({ page }) => {
    const titleInput = page.locator('input[placeholder="제목 없음"]');
    await titleInput.fill('로컬 저장 테스트');

    const editor = page.locator('[role="textbox"][aria-label="Document editor"]');
    await editor.click();
    await editor.type('AI가 꺼져도 로컬 저장은 동작합니다.');

    // Auto-save goes to IndexedDB (client-side only), so it should work
    const saveStatus = page.locator('.save-status');
    // Wait for debounce + save
    await expect(saveStatus).toContainText('저장됨', { timeout: 5_000 });
  });
});

test.describe('Error Flows - Certificate Issuance Failure', () => {
  test.beforeEach(async ({ page }) => {
    // Simulate certificate API failure
    await page.route('**/api/certificates', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Certificate service unavailable' }),
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

  test('CertificateModal closes gracefully on API failure', async ({ page }) => {
    const editor = page.locator('[role="textbox"][aria-label="Document editor"]');
    await editor.click();
    await editor.type('인증서 API 실패 테스트입니다.');

    // Open Inspector and trigger certification
    const inspectorTrigger = page.locator('button[aria-label="Inspector 열기"]');
    await inspectorTrigger.click();

    const certifyBtn = page.locator('button', { hasText: /인증서 발행|Certify/i }).first();
    await certifyBtn.click();

    const dialogContent = page.locator('[role="dialog"]');
    // Modal opens briefly in "analyzing" state
    await expect(dialogContent).toBeVisible({ timeout: 5_000 });

    // After the API call fails, the modal should close (catch → onOpenChange(false))
    await expect(dialogContent).not.toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Error Flows - Verify Page Unavailable', () => {
  test('verify page shows not-found when backend is unreachable', async ({ page }) => {
    const hash = 'offline000000000';

    // Simulate network failure for the verify endpoint
    await page.route(`**/api/verify/${hash}`, async (route) => {
      await route.abort('failed');
    });

    await page.goto(`/verify/${hash}`);

    // Should render the not-found page (Next.js calls notFound() when getCertificate returns null)
    const body = page.locator('body');
    await expect(body).toBeVisible({ timeout: 10_000 });

    // The page should not show a certificate card
    const certHeading = page.locator('h1', { hasText: 'Human Written Certificate' });
    await expect(certHeading).not.toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Error Flows - Network Simulation', () => {
  test('editor content is preserved after network interruption', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForSelector('[role="textbox"][aria-label="Document editor"]', {
      timeout: 15_000,
    });

    const editor = page.locator('[role="textbox"][aria-label="Document editor"]');
    await editor.click();
    const testContent = '네트워크 중단 후에도 내용이 보존됩니다.';
    await editor.type(testContent);

    // Wait for auto-save to IndexedDB
    const saveStatus = page.locator('.save-status');
    await expect(saveStatus).toContainText('저장됨', { timeout: 5_000 });

    // Simulate network going offline
    await page.context().setOffline(true);

    // Editor content should still be visible
    await expect(editor).toContainText('네트워크 중단 후에도');

    // Bring network back
    await page.context().setOffline(false);

    // Editor should still work
    await editor.type(' 추가 입력도 됩니다.');
    await expect(editor).toContainText('추가 입력도 됩니다.');
  });
});
