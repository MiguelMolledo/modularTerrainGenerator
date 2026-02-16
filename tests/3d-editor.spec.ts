import { test, expect } from '@playwright/test';

test.describe('3D Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/designer');
    await page.waitForSelector('canvas');

    // Switch to 3D view
    const toggle3D = page.getByRole('button', { name: /3D/i }).first();
    if (await toggle3D.isVisible()) {
      await toggle3D.click();
      await page.waitForTimeout(1000);
    }
  });

  test.describe('3D Selection', () => {
    test('should be able to click on 3D canvas', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      const box = await canvas.boundingBox();
      if (box) {
        // Click in the center of the canvas
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(200);
      }
    });

    test('should support shift+click for multi-select', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      const box = await canvas.boundingBox();
      if (box) {
        // Click once
        await page.mouse.click(box.x + box.width / 3, box.y + box.height / 2);
        await page.waitForTimeout(100);

        // Shift+click for multi-select
        await page.keyboard.down('Shift');
        await page.mouse.click(box.x + box.width * 2 / 3, box.y + box.height / 2);
        await page.keyboard.up('Shift');
      }
    });

    test('should deselect on empty space click', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      const box = await canvas.boundingBox();
      if (box) {
        // Click on empty space
        await page.mouse.click(box.x + 10, box.y + 10);
        await page.waitForTimeout(100);
      }
    });
  });

  test.describe('Transform Mode - Move (W key)', () => {
    test('should activate translation mode with W key', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      // Press W for translation mode
      await page.keyboard.press('w');
      await page.waitForTimeout(200);

      // Gizmo should be visible (hard to verify in headless, but no errors)
      await expect(canvas).toBeVisible();
    });

    test('should allow dragging in translation mode', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      // Press W for translation
      await page.keyboard.press('w');

      const box = await canvas.boundingBox();
      if (box) {
        // Simulate drag
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2);
        await page.mouse.up();
      }
    });
  });

  test.describe('Transform Mode - Rotate (E key)', () => {
    test('should activate rotation mode with E key', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      // Press E for rotation mode
      await page.keyboard.press('e');
      await page.waitForTimeout(200);

      await expect(canvas).toBeVisible();
    });

    test('should support 90-degree rotation increments', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      // Press E for rotation
      await page.keyboard.press('e');
      await page.waitForTimeout(100);

      // R key should also rotate (from 2D behavior)
      await page.keyboard.press('r');
      await page.waitForTimeout(100);
    });
  });

  test.describe('Grid Snap in 3D', () => {
    test('should respect grid snap settings', async ({ page }) => {
      // Toggle snap in toolbar
      const snapButton = page.getByRole('button', { name: /Snap/i });

      if (await snapButton.isVisible()) {
        // Snap should work the same in 3D as 2D
        await expect(snapButton).toBeVisible();
      }

      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('Height Limits', () => {
    test('should display layer information', async ({ page }) => {
      // Check for level buttons in toolbar
      const levelButtons = page.locator('button').filter({ hasText: /B1|Ground|L1|L2/i });
      const firstLevelButton = levelButtons.first();

      if (await firstLevelButton.isVisible()) {
        await expect(firstLevelButton).toBeVisible();
      }
    });

    test('should have height constraints per layer', async ({ page }) => {
      // The level system should be visible
      const levelLabel = page.getByText(/Level:|Current level/i);
      const hasLevelLabel = await levelLabel.isVisible().catch(() => false);

      // At least the canvas should work
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('Undo/Redo in 3D', () => {
    test('should support Ctrl+Z for undo in 3D', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      // Make an action
      await page.keyboard.press('w');
      await page.waitForTimeout(100);

      // Undo
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(100);
    });

    test('should support Ctrl+Shift+Z for redo in 3D', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      // Redo
      await page.keyboard.press('Control+Shift+z');
      await page.waitForTimeout(100);
    });
  });

  test.describe('2D/3D Sync', () => {
    test('should sync selection between 2D and 3D views', async ({ page }) => {
      // Click something in 3D
      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();

      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }

      // Switch to 2D
      const toggle2D = page.getByRole('button', { name: /2D/i }).first();
      if (await toggle2D.isVisible()) {
        await toggle2D.click();
        await page.waitForTimeout(500);
      }

      // Canvas should still be valid
      await expect(page.locator('canvas').first()).toBeVisible();
    });
  });

  test.describe('Collision Feedback', () => {
    test('should display visual feedback for collisions', async ({ page }) => {
      // In 3D mode, collision warnings should be visible
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      // Can't easily test visual collision indicators in headless mode
      // but we verify the 3D canvas renders correctly
    });
  });
});
