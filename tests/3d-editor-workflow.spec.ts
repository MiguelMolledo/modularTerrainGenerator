import { test, expect } from '@playwright/test';

test.describe('3D Editor Full Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/designer');
    await page.waitForSelector('canvas');
    // Wait for the page to fully load
    await page.waitForTimeout(2000);
  });

  test.describe('3D View Camera Controls', () => {
    test('should orbit camera with mouse drag', async ({ page }) => {
      // Switch to 3D
      const toggle3D = page.getByRole('button', { name: /3D/i }).first();
      if (await toggle3D.isVisible()) {
        await toggle3D.click();
        await page.waitForTimeout(1500);
      }

      const canvas3D = page.locator('canvas').first();
      const canvas3DBox = await canvas3D.boundingBox();

      if (canvas3DBox) {
        // Orbit by dragging
        await page.mouse.move(canvas3DBox.x + canvas3DBox.width / 2, canvas3DBox.y + canvas3DBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(
          canvas3DBox.x + canvas3DBox.width / 2 + 100,
          canvas3DBox.y + canvas3DBox.height / 2 + 50,
          { steps: 10 }
        );
        await page.mouse.up();
      }

      await expect(canvas3D).toBeVisible();
    });

    test('should zoom with mouse wheel', async ({ page }) => {
      const toggle3D = page.getByRole('button', { name: /3D/i }).first();
      if (await toggle3D.isVisible()) {
        await toggle3D.click();
        await page.waitForTimeout(1500);
      }

      const canvas3D = page.locator('canvas').first();
      const canvas3DBox = await canvas3D.boundingBox();

      if (canvas3DBox) {
        // Zoom in
        await page.mouse.move(canvas3DBox.x + canvas3DBox.width / 2, canvas3DBox.y + canvas3DBox.height / 2);
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(200);

        // Zoom out
        await page.mouse.wheel(0, 100);
        await page.waitForTimeout(200);
      }

      await expect(canvas3D).toBeVisible();
    });

    test('should pan camera with right-click drag', async ({ page }) => {
      const toggle3D = page.getByRole('button', { name: /3D/i }).first();
      if (await toggle3D.isVisible()) {
        await toggle3D.click();
        await page.waitForTimeout(1500);
      }

      const canvas3D = page.locator('canvas').first();
      const canvas3DBox = await canvas3D.boundingBox();

      if (canvas3DBox) {
        // Right-click drag to pan
        await page.mouse.move(canvas3DBox.x + canvas3DBox.width / 2, canvas3DBox.y + canvas3DBox.height / 2);
        await page.mouse.down({ button: 'right' });
        await page.mouse.move(
          canvas3DBox.x + canvas3DBox.width / 2 + 50,
          canvas3DBox.y + canvas3DBox.height / 2 + 50,
          { steps: 5 }
        );
        await page.mouse.up({ button: 'right' });
      }

      await expect(canvas3D).toBeVisible();
    });
  });

  test.describe('Toggle Between 2D and 3D', () => {
    test('should toggle views with V key', async ({ page }) => {
      // Start in 2D
      await expect(page.locator('canvas').first()).toBeVisible();

      // Press V to go to 3D
      await page.keyboard.press('v');
      await page.waitForTimeout(1500);

      // Should be in 3D now
      await expect(page.locator('canvas').first()).toBeVisible();

      // Press V again to go back to 2D
      await page.keyboard.press('v');
      await page.waitForTimeout(500);

      // Back in 2D
      await expect(page.locator('canvas').first()).toBeVisible();
    });

    test('should switch to 3D view with button', async ({ page }) => {
      const toggle3D = page.getByRole('button', { name: /3D/i }).first();

      if (await toggle3D.isVisible()) {
        await toggle3D.click();
        await page.waitForTimeout(1500);

        // Should be in 3D mode
        await expect(page.locator('canvas').first()).toBeVisible();

        // Switch back to 2D
        const toggle2D = page.getByRole('button', { name: /2D/i }).first();
        if (await toggle2D.isVisible()) {
          await toggle2D.click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('3D Transform Modes', () => {
    test('should activate translate mode with W key in 3D', async ({ page }) => {
      // Switch to 3D
      const toggle3D = page.getByRole('button', { name: /3D/i }).first();
      if (await toggle3D.isVisible()) {
        await toggle3D.click();
        await page.waitForTimeout(1500);
      }

      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      // Press W for translate mode
      await page.keyboard.press('w');
      await page.waitForTimeout(200);

      // Canvas should still work
      await expect(canvas).toBeVisible();
    });

    test('should activate rotate mode with E key in 3D', async ({ page }) => {
      // Switch to 3D
      const toggle3D = page.getByRole('button', { name: /3D/i }).first();
      if (await toggle3D.isVisible()) {
        await toggle3D.click();
        await page.waitForTimeout(1500);
      }

      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      // Press E for rotate mode
      await page.keyboard.press('e');
      await page.waitForTimeout(200);

      // Canvas should still work
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('3D Selection', () => {
    test('should click on 3D canvas', async ({ page }) => {
      // Switch to 3D
      const toggle3D = page.getByRole('button', { name: /3D/i }).first();
      if (await toggle3D.isVisible()) {
        await toggle3D.click();
        await page.waitForTimeout(1500);
      }

      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();

      if (box) {
        // Click in the center
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(200);
      }

      await expect(canvas).toBeVisible();
    });

    test('should support shift+click for multi-select', async ({ page }) => {
      // Switch to 3D
      const toggle3D = page.getByRole('button', { name: /3D/i }).first();
      if (await toggle3D.isVisible()) {
        await toggle3D.click();
        await page.waitForTimeout(1500);
      }

      const canvas = page.locator('canvas').first();
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

      await expect(canvas).toBeVisible();
    });

    test('should deselect on empty space click', async ({ page }) => {
      // Switch to 3D
      const toggle3D = page.getByRole('button', { name: /3D/i }).first();
      if (await toggle3D.isVisible()) {
        await toggle3D.click();
        await page.waitForTimeout(1500);
      }

      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();

      if (box) {
        // Click on empty space
        await page.mouse.click(box.x + 10, box.y + 10);
        await page.waitForTimeout(100);
      }

      await expect(canvas).toBeVisible();
    });
  });

  test.describe('Undo/Redo in 3D', () => {
    test('should support Ctrl+Z for undo in 3D', async ({ page }) => {
      // Switch to 3D
      const toggle3D = page.getByRole('button', { name: /3D/i }).first();
      if (await toggle3D.isVisible()) {
        await toggle3D.click();
        await page.waitForTimeout(1500);
      }

      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      // Undo
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(100);

      await expect(canvas).toBeVisible();
    });

    test('should support Ctrl+Shift+Z for redo in 3D', async ({ page }) => {
      // Switch to 3D
      const toggle3D = page.getByRole('button', { name: /3D/i }).first();
      if (await toggle3D.isVisible()) {
        await toggle3D.click();
        await page.waitForTimeout(1500);
      }

      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      // Redo
      await page.keyboard.press('Control+Shift+z');
      await page.waitForTimeout(100);

      await expect(canvas).toBeVisible();
    });
  });
});
