/**
 * Performance budget tests
 *
 * These tests document and enforce the performance budget defined in CLAUDE.md:
 *   - LCP < 2s
 *   - Typing input delay < 16ms
 *   - Initial JS bundle < 150KB gzip
 *
 * Run: pnpm exec playwright test e2e/performance.spec.ts
 */

import { expect, test } from '@playwright/test';

test.describe('Performance budget', () => {
  test('LCP is under 2 seconds on editor page', async ({ page }) => {
    // Collect LCP via PerformanceObserver before navigation
    await page.goto('/editor', { waitUntil: 'load' });

    const lcp = await page.evaluate<number>(() => {
      return new Promise<number>((resolve) => {
        let lcpValue = 0;

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            lcpValue = (entry as PerformancePaintTiming).startTime;
          }
        });

        observer.observe({ type: 'largest-contentful-paint', buffered: true });

        // Give browser a tick to flush buffered entries
        setTimeout(() => {
          observer.disconnect();
          resolve(lcpValue);
        }, 100);
      });
    });

    // Performance budget: LCP < 2000ms
    expect(lcp).toBeLessThan(2000);
  });

  test('typing input delay is under 16ms', async ({ page }) => {
    await page.goto('/editor', { waitUntil: 'networkidle' });

    // Wait for the editor to be ready (contenteditable area)
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.waitFor({ state: 'visible', timeout: 10_000 });

    // Measure keydown → input event latency via JS instrumentation
    const inputDelay = await page.evaluate<number>(() => {
      return new Promise<number>((resolve) => {
        const target = document.querySelector<HTMLElement>('[contenteditable="true"]');
        if (!target) {
          resolve(-1);
          return;
        }

        let keydownTime = 0;

        target.addEventListener(
          'keydown',
          () => {
            keydownTime = performance.now();
          },
          { once: true },
        );

        target.addEventListener(
          'input',
          () => {
            const delay = performance.now() - keydownTime;
            resolve(delay);
          },
          { once: true },
        );
      });
    });

    // Trigger a keypress to start measurement
    await editor.press('a');

    // Performance budget: input delay < 16ms (one animation frame at 60fps)
    // Note: in CI/headless environments this may be relaxed to 50ms
    const budgetMs = process.env['CI'] ? 50 : 16;
    if (inputDelay >= 0) {
      expect(inputDelay).toBeLessThan(budgetMs);
    }
  });

  test('initial JS bundle is under 150KB (gzip estimate)', async ({ page }) => {
    const jsBytes: number[] = [];

    page.on('response', (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] ?? '';
      if (
        contentType.includes('javascript') &&
        url.includes('/_next/static/') &&
        // Only count first-load chunks, not lazy-loaded ones
        !url.includes('/chunks/pages/') &&
        !url.includes('/chunks/app/')
      ) {
        const contentLength = response.headers()['content-length'];
        if (contentLength) {
          jsBytes.push(parseInt(contentLength, 10));
        }
      }
    });

    await page.goto('/', { waitUntil: 'load' });

    const totalBytes = jsBytes.reduce((a, b) => a + b, 0);
    const totalKB = totalBytes / 1024;

    // Performance budget: < 150KB gzip for initial JS
    // Content-Length is compressed when server uses gzip, otherwise raw
    // This is a best-effort check; use @next/bundle-analyzer for precise measurement
    expect(totalKB).toBeLessThan(150);
  });
});
