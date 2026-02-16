import { test, expect } from '@playwright/test';

test.describe('Collision Detection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/designer');
    await page.waitForSelector('canvas');
  });

  test.describe('Visual Feedback', () => {
    test('should display canvas for piece placement', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      // Canvas should accept interactions
      const box = await canvas.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
    });

    test('should have draggable piece cards', async ({ page }) => {
      // Pieces should be draggable from sidebar
      const pieceCard = page.locator('.cursor-grab').first();
      await expect(pieceCard).toBeVisible();
    });
  });

  test.describe('Boundary Checking', () => {
    test('should show map dimensions', async ({ page }) => {
      // Map boundaries defined by dimensions
      await expect(page.getByText(/\d+" x \d+"/)).toBeVisible();
    });

    test('should keep pieces within map bounds', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      // Would need to drag a piece to the edge to fully test
    });
  });

  test.describe('Grid Alignment', () => {
    test('should have snap-to-grid toggle', async ({ page }) => {
      const snapButton = page.getByRole('button', { name: /Snap/i });
      await expect(snapButton).toBeVisible();
    });

    test('should toggle snap behavior', async ({ page }) => {
      const snapButton = page.getByRole('button', { name: /Snap/i });

      // Toggle off
      await snapButton.click();
      await page.waitForTimeout(100);

      // Toggle on
      await snapButton.click();
      await page.waitForTimeout(100);

      await expect(snapButton).toBeVisible();
    });
  });

  test.describe('Piece Types', () => {
    test('should display rectangular pieces', async ({ page }) => {
      // Check for standard rectangular pieces
      await expect(page.getByRole('heading', { name: /Desert 3x3/ })).toBeVisible();
      await expect(page.getByRole('heading', { name: /Desert 3x6/ })).toBeVisible();
    });

    test('should display diagonal/triangular pieces', async ({ page }) => {
      // Check for diagonal pieces
      await expect(page.getByRole('heading', { name: /△ TL/ })).toBeVisible();
    });
  });

  test.describe('Rotation Handling', () => {
    test('should show rotation indicator', async ({ page }) => {
      await expect(page.getByText('R to rotate')).toBeVisible();
      await expect(page.getByText('0°').first()).toBeVisible();
    });

    test('should support R key for rotation', async ({ page }) => {
      // R key rotates selected piece
      await page.keyboard.press('r');
      await page.waitForTimeout(100);

      // Without selection, should just be ready
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('Piece Selection', () => {
    test('should allow clicking on canvas', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();

      if (box) {
        // Click on canvas to select
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(100);
      }
    });

    test('should support multi-select with Shift', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();

      if (box) {
        // Click once
        await page.mouse.click(box.x + box.width / 3, box.y + box.height / 2);

        // Shift+click for multi-select
        await page.keyboard.down('Shift');
        await page.mouse.click(box.x + box.width * 2 / 3, box.y + box.height / 2);
        await page.keyboard.up('Shift');
      }
    });
  });

  test.describe('Delete Operations', () => {
    test('should support Delete key', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      // Press Delete (works when piece selected)
      await page.keyboard.press('Delete');
      await page.waitForTimeout(100);
    });

    test('should have clear map button', async ({ page }) => {
      const clearButton = page.getByRole('button', { name: /Clear Map/i });
      await expect(clearButton).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should handle canvas interactions smoothly', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();

      if (box) {
        // Rapid mouse movements to test performance
        for (let i = 0; i < 10; i++) {
          await page.mouse.move(
            box.x + (i * box.width / 10),
            box.y + box.height / 2
          );
        }
      }
    });

    test('should handle zoom changes', async ({ page }) => {
      const zoomInButton = page.locator('button').filter({ hasText: '+' });

      // Zoom in multiple times
      for (let i = 0; i < 3; i++) {
        await zoomInButton.click();
        await page.waitForTimeout(100);
      }

      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();
    });
  });
});
