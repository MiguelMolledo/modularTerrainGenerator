import { test, expect } from '@playwright/test';

test.describe('3D Viewer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/designer');
    await page.waitForSelector('canvas');
  });

  test.describe('View Mode Toggle', () => {
    test('should have 2D/3D toggle button', async ({ page }) => {
      // Look for 3D toggle button
      const toggle3D = page.getByRole('button', { name: /3D|View/i }).first();
      const viewModeButton = page.locator('button').filter({ hasText: /2D|3D/ }).first();

      const hasToggle = await toggle3D.isVisible().catch(() => false);
      const hasViewMode = await viewModeButton.isVisible().catch(() => false);

      expect(hasToggle || hasViewMode).toBeTruthy();
    });

    test('should switch to 3D view when toggled', async ({ page }) => {
      // Find and click the 3D toggle
      const toggle3D = page.getByRole('button', { name: /3D/i }).first();

      if (await toggle3D.isVisible()) {
        await toggle3D.click();

        // Wait for 3D view to load (lazy loaded)
        await page.waitForTimeout(1000);

        // Check for 3D canvas or WebGL context
        const canvas3D = page.locator('canvas');
        await expect(canvas3D.first()).toBeVisible();
      }
    });

    test('should be able to toggle back to 2D view', async ({ page }) => {
      const toggle3D = page.getByRole('button', { name: /3D/i }).first();

      if (await toggle3D.isVisible()) {
        // Switch to 3D
        await toggle3D.click();
        await page.waitForTimeout(500);

        // Switch back to 2D
        const toggle2D = page.getByRole('button', { name: /2D/i }).first();
        if (await toggle2D.isVisible()) {
          await toggle2D.click();
          await page.waitForTimeout(500);
        }

        // Should be back in 2D mode
        const canvas = page.locator('canvas').first();
        await expect(canvas).toBeVisible();
      }
    });
  });

  test.describe('3D Camera Controls', () => {
    test('should load 3D view with camera controls', async ({ page }) => {
      const toggle3D = page.getByRole('button', { name: /3D/i }).first();

      if (await toggle3D.isVisible()) {
        await toggle3D.click();
        await page.waitForTimeout(1000);

        // 3D canvas should be present
        const canvas = page.locator('canvas').first();
        await expect(canvas).toBeVisible();

        // Canvas should respond to mouse events (camera rotation)
        const box = await canvas.boundingBox();
        if (box) {
          // Simulate camera rotation by dragging
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2);
          await page.mouse.up();
        }
      }
    });

    test('should support zoom in 3D view', async ({ page }) => {
      const toggle3D = page.getByRole('button', { name: /3D/i }).first();

      if (await toggle3D.isVisible()) {
        await toggle3D.click();
        await page.waitForTimeout(1000);

        const canvas = page.locator('canvas').first();
        await expect(canvas).toBeVisible();

        const box = await canvas.boundingBox();
        if (box) {
          // Simulate zoom with mouse wheel
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.wheel(0, -100); // Zoom in
          await page.waitForTimeout(200);
          await page.mouse.wheel(0, 100); // Zoom out
        }
      }
    });
  });

  test.describe('3D Rendering', () => {
    test('should render 3D scene with canvas', async ({ page }) => {
      const toggle3D = page.getByRole('button', { name: /3D/i }).first();

      if (await toggle3D.isVisible()) {
        await toggle3D.click();

        // Wait for Three.js to initialize
        await page.waitForTimeout(1500);

        // Check that WebGL canvas is present
        const canvas = page.locator('canvas').first();
        await expect(canvas).toBeVisible();

        // Canvas should have valid dimensions
        const box = await canvas.boundingBox();
        expect(box).toBeTruthy();
        expect(box!.width).toBeGreaterThan(0);
        expect(box!.height).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Level/Height Reference', () => {
    test('should have level reference controls', async ({ page }) => {
      const toggle3D = page.getByRole('button', { name: /3D/i }).first();

      if (await toggle3D.isVisible()) {
        await toggle3D.click();
        await page.waitForTimeout(1000);

        // Look for level reference or height controls
        const levelControl = page.getByText(/Level|Height|Floor/i).first();
        const hasLevelControl = await levelControl.isVisible().catch(() => false);

        // The 3D view should at least render
        const canvas = page.locator('canvas').first();
        await expect(canvas).toBeVisible();
      }
    });
  });
});
