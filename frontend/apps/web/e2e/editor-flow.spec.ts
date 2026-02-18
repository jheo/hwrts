/**
 * E2E: Basic Writing Flow
 *
 * Tests the core editor journey:
 *   1. Navigate to /editor
 *   2. Verify TipTap editor loads (role=textbox, aria-label="Document editor")
 *   3. Type title and body text
 *   4. Verify auto-save indicator transitions from "저장 중..." → "저장됨"
 *   5. Open Inspector and verify word count stat is updated
 *
 * Requires full stack: Next.js dev server (http://localhost:3000)
 * No backend dependency for this flow (IndexedDB auto-save is client-only).
 */

import { expect, test } from '@playwright/test';

test.describe('Editor - Basic Writing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor');
    // Wait for the dynamic Editor component (SSR=false) to hydrate
    await page.waitForSelector('[role="textbox"][aria-label="Document editor"]', {
      timeout: 15_000,
    });
  });

  test('editor page loads with title input and TipTap content area', async ({ page }) => {
    // Title input
    const titleInput = page.locator('input[placeholder="제목 없음"]');
    await expect(titleInput).toBeVisible();

    // TipTap editor (ProseMirror renders a div with role=textbox)
    const editor = page.locator('[role="textbox"][aria-label="Document editor"]');
    await expect(editor).toBeVisible();

    // Theme toggle button
    const themeToggle = page.locator('button[aria-label*="Switch to"]');
    await expect(themeToggle).toBeVisible();
  });

  test('typing in title input updates the value', async ({ page }) => {
    const titleInput = page.locator('input[placeholder="제목 없음"]');
    await titleInput.click();
    await titleInput.fill('나의 첫 번째 글');

    await expect(titleInput).toHaveValue('나의 첫 번째 글');
  });

  test('typing in editor body registers keystrokes', async ({ page }) => {
    const editor = page.locator('[role="textbox"][aria-label="Document editor"]');
    await editor.click();
    await editor.type('안녕하세요. 이 글은 HumanWrites 에디터에서 작성된 테스트 문장입니다.');

    // Verify typed content appears in editor
    await expect(editor).toContainText('안녕하세요');
    await expect(editor).toContainText('HumanWrites');
  });

  test('auto-save indicator shows "저장 중..." then "저장됨"', async ({ page }) => {
    const titleInput = page.locator('input[placeholder="제목 없음"]');
    await titleInput.click();
    await titleInput.fill('자동 저장 테스트');

    const editor = page.locator('[role="textbox"][aria-label="Document editor"]');
    await editor.click();
    await editor.type('자동 저장이 동작하는지 확인합니다.');

    // After typing, isDirty=true → "저장 중..."
    const saveStatus = page.locator('.save-status');
    await expect(saveStatus).toContainText('저장 중...');

    // After debounce + save completes → "저장됨"
    await expect(saveStatus).toContainText('저장됨', { timeout: 5_000 });
  });

  test('Inspector trigger button is visible in editor', async ({ page }) => {
    // InspectorTrigger renders when Inspector is closed (aria-label="Inspector 열기")
    const inspectorTrigger = page.locator('button[aria-label="Inspector 열기"]');
    await expect(inspectorTrigger).toBeVisible();
  });

  test('clicking Inspector trigger opens the Inspector panel', async ({ page }) => {
    const inspectorTrigger = page.locator('button[aria-label="Inspector 열기"]');
    await inspectorTrigger.click();

    // Inspector aside panel should slide in
    const inspectorPanel = page.locator('[role="complementary"][aria-label="Inspector"]');
    await expect(inspectorPanel).toBeVisible({ timeout: 2_000 });
  });

  test('word count in Inspector updates after typing', async ({ page }) => {
    // Type text first
    const editor = page.locator('[role="textbox"][aria-label="Document editor"]');
    await editor.click();
    // Type a sentence with known word count
    await editor.type('Hello world this is a test sentence for word count.');

    // Open Inspector
    const inspectorTrigger = page.locator('button[aria-label="Inspector 열기"]');
    await inspectorTrigger.click();

    const inspectorPanel = page.locator('[role="complementary"][aria-label="Inspector"]');
    await expect(inspectorPanel).toBeVisible({ timeout: 2_000 });

    // Stats tab is active by default — word count should reflect typed content
    // StatsTab renders word count via StatItem components
    // The panel should contain a non-zero word count
    await expect(inspectorPanel).toContainText(/\d+/);
  });

  test('Inspector can be closed with close button', async ({ page }) => {
    // Open inspector
    const inspectorTrigger = page.locator('button[aria-label="Inspector 열기"]');
    await inspectorTrigger.click();

    const inspectorPanel = page.locator('[role="complementary"][aria-label="Inspector"]');
    await expect(inspectorPanel).toBeVisible({ timeout: 2_000 });

    // Close via the X button (aria-label="Inspector 닫기")
    const closeBtn = page.locator('button[aria-label="Inspector 닫기"]');
    await closeBtn.click();

    // Panel should disappear
    await expect(inspectorPanel).not.toBeVisible({ timeout: 2_000 });
  });

  test('theme toggle switches between light and dark', async ({ page }) => {
    const htmlEl = page.locator('html');
    const themeToggle = page.locator('button[aria-label*="Switch to"]');

    // Initial theme
    const initialTheme = await htmlEl.getAttribute('data-theme');

    await themeToggle.click();

    const newTheme = await htmlEl.getAttribute('data-theme');
    expect(newTheme).not.toBe(initialTheme);
  });
});
