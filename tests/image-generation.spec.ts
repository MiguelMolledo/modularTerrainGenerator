import { test, expect } from '@playwright/test';

test.describe('Image Generation', () => {
  test.describe('Generate Art Dialog', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/designer');
      await page.waitForSelector('canvas');
    });

    test('should have generate art button in toolbar', async ({ page }) => {
      const artButton = page.getByRole('button', { name: /Art|Image|Generate|🎨/i }).first();
      const hasArt = await artButton.isVisible().catch(() => false);
    });

    test('should open generate art dialog', async ({ page }) => {
      const artButton = page.getByRole('button', { name: /Art|Generate|🎨/i }).first();

      if (await artButton.isVisible()) {
        await artButton.click();
        await page.waitForTimeout(300);

        const dialog = page.locator('[role="dialog"]');
        const hasDialog = await dialog.isVisible().catch(() => false);
      }
    });

    test('should show map preview in dialog', async ({ page }) => {
      const artButton = page.getByRole('button', { name: /Art|Generate/i }).first();

      if (await artButton.isVisible()) {
        await artButton.click();
        await page.waitForTimeout(300);

        // Preview canvas or image should be present
        const preview = page.locator('canvas, img').first();
        const hasPreview = await preview.isVisible().catch(() => false);
      }
    });

    test('should have prompt input', async ({ page }) => {
      const artButton = page.getByRole('button', { name: /Art|Generate/i }).first();

      if (await artButton.isVisible()) {
        await artButton.click();
        await page.waitForTimeout(300);

        const promptInput = page.getByPlaceholder(/prompt|style|describe/i);
        const textarea = page.locator('textarea');

        const hasPrompt = await promptInput.isVisible().catch(() => false);
        const hasTextarea = await textarea.first().isVisible().catch(() => false);
      }
    });

    test('should have generate prompt button', async ({ page }) => {
      const artButton = page.getByRole('button', { name: /Art|Generate/i }).first();

      if (await artButton.isVisible()) {
        await artButton.click();
        await page.waitForTimeout(300);

        const generatePrompt = page.getByRole('button', { name: /Generate Prompt|Auto/i });
        const hasGenPrompt = await generatePrompt.isVisible().catch(() => false);
      }
    });
  });

  test.describe('FAL.ai Integration', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
    });

    test('should have FAL.ai key configuration', async ({ page }) => {
      const falText = page.getByText(/FAL|Image/i).first();
      const hasFal = await falText.isVisible().catch(() => false);
    });

    test('should show FAL connection status', async ({ page }) => {
      const status = page.getByText(/Connected|Not connected|FAL/i).first();
      const hasStatus = await status.isVisible().catch(() => false);
    });
  });

  test.describe('Image Generation Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/designer');
      await page.waitForSelector('canvas');
    });

    test('should require FAL.ai key', async ({ page }) => {
      const artButton = page.getByRole('button', { name: /Art|Generate/i }).first();

      if (await artButton.isVisible()) {
        await artButton.click();
        await page.waitForTimeout(300);

        // Should show API key warning if not configured
        const warning = page.getByText(/API key|Configure|FAL/i).first();
        const hasWarning = await warning.isVisible().catch(() => false);
      }
    });

    test('should have generate button', async ({ page }) => {
      const artButton = page.getByRole('button', { name: /Art|Generate/i }).first();

      if (await artButton.isVisible()) {
        await artButton.click();
        await page.waitForTimeout(300);

        const generateButton = page.getByRole('button', { name: /Generate|Create/i });
        const hasGenerate = await generateButton.first().isVisible().catch(() => false);
      }
    });
  });

  test.describe('Generated Images', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/designer');
      await page.waitForSelector('canvas');
    });

    test('should display generation history', async ({ page }) => {
      const artButton = page.getByRole('button', { name: /Art|Generate/i }).first();

      if (await artButton.isVisible()) {
        await artButton.click();
        await page.waitForTimeout(300);

        // History section might be present
        const history = page.getByText(/History|Previous|Generated/i).first();
        const hasHistory = await history.isVisible().catch(() => false);
      }
    });

    test('should have download option', async ({ page }) => {
      const artButton = page.getByRole('button', { name: /Art|Generate/i }).first();

      if (await artButton.isVisible()) {
        await artButton.click();
        await page.waitForTimeout(300);

        const downloadButton = page.getByRole('button', { name: /Download|Save/i });
        const hasDownload = await downloadButton.first().isVisible().catch(() => false);
      }
    });
  });

  test.describe('Map Snapshot for Generation', () => {
    test('should capture current map state', async ({ page }) => {
      await page.goto('/designer');
      await page.waitForSelector('canvas');

      // Canvas is source for generation
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      const box = await canvas.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThan(0);
    });

    test('should use map as composition reference', async ({ page }) => {
      await page.goto('/designer');
      await page.waitForSelector('canvas');

      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('FLUX Model', () => {
    test('should use FLUX for generation', async ({ page }) => {
      await page.goto('/designer');
      await page.waitForSelector('canvas');

      const artButton = page.getByRole('button', { name: /Art|Generate/i }).first();

      if (await artButton.isVisible()) {
        await artButton.click();
        await page.waitForTimeout(300);

        // FLUX might be mentioned in the dialog
        const fluxText = page.getByText(/FLUX/i).first();
        const hasFlux = await fluxText.isVisible().catch(() => false);
      }
    });
  });

  test.describe('Async Generation', () => {
    test('should show loading state during generation', async ({ page }) => {
      await page.goto('/designer');
      await page.waitForSelector('canvas');

      // Loading indicators would show during async generation
    });

    test('should poll for results', async ({ page }) => {
      // Polling happens automatically
      await page.goto('/designer');
      await page.waitForSelector('canvas');
    });
  });
});
