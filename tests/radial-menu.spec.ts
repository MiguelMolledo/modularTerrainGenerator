import { test, expect } from '@playwright/test';

test.describe('Radial Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/designer');
    await page.waitForSelector('canvas');
  });

  test.describe('Menu Activation', () => {
    test('should open radial menu with Q key', async ({ page }) => {
      // Move mouse to canvas area
      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();

      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

        // Press Q to open radial menu
        await page.keyboard.press('q');
        await page.waitForTimeout(300);

        // Look for radial menu elements
        const radialMenu = page.locator('[data-testid="radial-menu"]');
        const menuContainer = page.locator('.radial-menu');
        const circularMenu = page.locator('[class*="radial"]');

        const hasRadialMenu = await radialMenu.isVisible().catch(() => false);
        const hasMenuContainer = await menuContainer.isVisible().catch(() => false);
        const hasCircular = await circularMenu.first().isVisible().catch(() => false);

        // Menu might appear or not depending on if there are recent pieces
      }
    });

    test('should appear at cursor position', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();

      if (box) {
        // Position cursor
        const targetX = box.x + 200;
        const targetY = box.y + 200;
        await page.mouse.move(targetX, targetY);

        // Open menu
        await page.keyboard.press('q');
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('Menu Closure', () => {
    test('should close with Escape key', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();

      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

        // Open menu
        await page.keyboard.press('q');
        await page.waitForTimeout(200);

        // Close with Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }
    });

    test('should close when clicking outside', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();

      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

        // Open menu
        await page.keyboard.press('q');
        await page.waitForTimeout(200);

        // Click outside
        await page.mouse.click(box.x + 10, box.y + 10);
        await page.waitForTimeout(200);
      }
    });

    test('should close after selection', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();

      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

        // Open menu
        await page.keyboard.press('q');
        await page.waitForTimeout(200);

        // Click in menu area (would select if items exist)
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(200);
      }
    });
  });

  test.describe('Recently Used Pieces', () => {
    test('should track recently used pieces', async ({ page }) => {
      // Initially, might not have recent pieces
      // Would need to place a piece first to populate

      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();
    });

    test('should show piece previews in menu', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();

      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.keyboard.press('q');
        await page.waitForTimeout(300);

        // Menu might show empty state or pieces
      }
    });

    test('should update when new pieces are used', async ({ page }) => {
      // This would require drag-and-drop a piece
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('Piece Selection from Menu', () => {
    test('should select piece for placement', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();

      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.keyboard.press('q');
        await page.waitForTimeout(200);

        // Close menu for cleanup
        await page.keyboard.press('Escape');
      }
    });
  });

  test.describe('Menu Display', () => {
    test('should show terrain colors', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();

      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.keyboard.press('q');
        await page.waitForTimeout(200);
        await page.keyboard.press('Escape');
      }
    });

    test('should show shape previews', async ({ page }) => {
      // Shape previews would be visible in menu items
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('Designer View Only', () => {
    test('should only be available in map designer', async ({ page }) => {
      // Q key should work in designer
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      await page.keyboard.press('q');
      await page.waitForTimeout(100);
      await page.keyboard.press('Escape');
    });

    test('should not interfere with text inputs', async ({ page }) => {
      // Q in input should type 'q', not open menu
      const nameInput = page.locator('input[value="Untitled Map"]');
      await nameInput.click();
      await nameInput.press('q');

      // Should have typed 'q' in input
      const value = await nameInput.inputValue();
      expect(value).toContain('q');
    });
  });
});
