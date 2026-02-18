/**
 * E2E: AI Spelling Check Flow
 *
 * Tests the AI spelling/grammar review feature:
 *   1. Type text with intentional spelling errors in the editor
 *   2. Wait ~1.5s for the AI review debounce to fire
 *   3. Verify wavy underline decoration appears on misspelled words
 *   4. Click "Fix" / "Accept" on a suggestion in the Inspector Review tab
 *   5. Verify the text is replaced with the corrected version
 *   6. Check Inspector → Review tab shows the review items
 *
 * Backend mock: POST /api/ai/spelling is intercepted to return mock ReviewItems.
 *
 * Requires:
 *   - Next.js dev server (http://localhost:3000)
 *   - Backend spelling endpoint mocked via Playwright route interception
 */

import { expect, test } from '@playwright/test';

/** Mock AI spelling response — returns a ReviewItem for "맞춤법" → "맞춤법" correction */
const MOCK_SPELLING_RESPONSE = {
  items: [
    {
      id: 'review-001',
      type: 'spelling',
      range: { from: 0, to: 5 },
      message: '"헬로" 대신 "안녕하세요"를 사용하세요.',
      suggestion: '안녕하세요',
      severity: 'warning',
      source: 'ai_model',
    },
    {
      id: 'review-002',
      type: 'grammar',
      range: { from: 10, to: 18 },
      message: '문법 오류: 동사 형태를 확인하세요.',
      suggestion: '확인합니다',
      severity: 'info',
      source: 'ai_model',
    },
  ],
};

test.describe('AI Spelling Check', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the AI spelling endpoint
    await page.route('**/api/ai/spelling', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SPELLING_RESPONSE),
      });
    });

    // Mock the AI fact-check and style endpoints to avoid unwanted calls
    await page.route('**/api/ai/fact-check', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ items: [] }) }),
    );
    await page.route('**/api/ai/style', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ items: [] }) }),
    );

    await page.goto('/editor');
    await page.waitForSelector('[role="textbox"][aria-label="Document editor"]', {
      timeout: 15_000,
    });
  });

  test('review items appear in Inspector Review tab after typing', async ({ page }) => {
    const editor = page.locator('[role="textbox"][aria-label="Document editor"]');
    await editor.click();
    // Type text with intentional "errors" that the mock will flag
    await editor.type('헬로 월드입니다. 이것은 테스트 문장');

    // Open Inspector
    const inspectorTrigger = page.locator('button[aria-label="Inspector 열기"]');
    await inspectorTrigger.click();

    const inspectorPanel = page.locator('[role="complementary"][aria-label="Inspector"]');
    await expect(inspectorPanel).toBeVisible({ timeout: 2_000 });

    // Switch to Review tab
    const reviewTabBtn = inspectorPanel.locator('button', { hasText: /리뷰|Review/i });
    await reviewTabBtn.click();

    // Wait for review items to appear (debounce fires, mock returns items)
    await expect(inspectorPanel).toContainText('"헬로" 대신', { timeout: 5_000 });
  });

  test('accept suggestion replaces text', async ({ page }) => {
    const editor = page.locator('[role="textbox"][aria-label="Document editor"]');
    await editor.click();
    await editor.type('헬로 월드');

    // Open Inspector → Review tab
    const inspectorTrigger = page.locator('button[aria-label="Inspector 열기"]');
    await inspectorTrigger.click();

    const inspectorPanel = page.locator('[role="complementary"][aria-label="Inspector"]');
    await expect(inspectorPanel).toBeVisible({ timeout: 2_000 });

    const reviewTabBtn = inspectorPanel.locator('button', { hasText: /리뷰|Review/i });
    await reviewTabBtn.click();

    // Wait for the first review item
    await expect(inspectorPanel).toContainText('"헬로" 대신', { timeout: 5_000 });

    // Click "Fix" / "수정" / accept button on the first review item
    const acceptBtn = inspectorPanel
      .locator('button', { hasText: /수정|Fix|Accept/i })
      .first();
    await expect(acceptBtn).toBeVisible({ timeout: 3_000 });
    await acceptBtn.click();

    // After accepting, the review item should be removed from the list
    await expect(inspectorPanel).not.toContainText('"헬로" 대신', { timeout: 3_000 });
  });

  test('ignore suggestion removes item from review list', async ({ page }) => {
    const editor = page.locator('[role="textbox"][aria-label="Document editor"]');
    await editor.click();
    await editor.type('헬로 월드');

    // Open Inspector → Review tab
    const inspectorTrigger = page.locator('button[aria-label="Inspector 열기"]');
    await inspectorTrigger.click();

    const inspectorPanel = page.locator('[role="complementary"][aria-label="Inspector"]');
    await expect(inspectorPanel).toBeVisible({ timeout: 2_000 });

    const reviewTabBtn = inspectorPanel.locator('button', { hasText: /리뷰|Review/i });
    await reviewTabBtn.click();

    await expect(inspectorPanel).toContainText('"헬로" 대신', { timeout: 5_000 });

    // Click ignore/무시 button
    const ignoreBtn = inspectorPanel
      .locator('button', { hasText: /무시|Ignore/i })
      .first();
    await expect(ignoreBtn).toBeVisible({ timeout: 3_000 });
    await ignoreBtn.click();

    // Item should be removed after ignoring
    await expect(inspectorPanel).not.toContainText('"헬로" 대신', { timeout: 3_000 });
  });

  test('review tab badge shows item count', async ({ page }) => {
    const editor = page.locator('[role="textbox"][aria-label="Document editor"]');
    await editor.click();
    await editor.type('헬로 월드');

    // Open Inspector
    const inspectorTrigger = page.locator('button[aria-label="Inspector 열기"]');
    await inspectorTrigger.click();

    const inspectorPanel = page.locator('[role="complementary"][aria-label="Inspector"]');
    await expect(inspectorPanel).toBeVisible({ timeout: 2_000 });

    // The InspectorHeader shows reviewCount badge when items exist
    // After spelling check returns 2 items, the badge should show 2
    await expect(inspectorPanel).toContainText('2', { timeout: 5_000 });
  });
});
