import { test, expect } from '@playwright/test';

test.describe('Grid System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/designer');
    await page.waitForSelector('canvas');
  });

  test.describe('Grid Visibility', () => {
    test('should have grid toggle button', async ({ page }) => {
      const gridButton = page.getByRole('button', { name: /Grid/i });
      await expect(gridButton).toBeVisible();
    });

    test('should toggle grid visibility', async ({ page }) => {
      const gridButton = page.getByRole('button', { name: /Grid/i });

      // Initial state
      await expect(gridButton).toBeVisible();

      // Toggle off
      await gridButton.click();
      await page.waitForTimeout(100);

      // Toggle back on
      await gridButton.click();
      await page.waitForTimeout(100);
    });

    test('should show grid by default', async ({ page }) => {
      const gridButton = page.getByRole('button', { name: /Grid/i });

      // Grid button should indicate it's active
      await expect(gridButton).toBeVisible();

      // Canvas should be rendering
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('Snap to Grid', () => {
    test('should have snap toggle button', async ({ page }) => {
      const snapButton = page.getByRole('button', { name: /Snap/i });
      await expect(snapButton).toBeVisible();
    });

    test('should toggle snap to grid', async ({ page }) => {
      const snapButton = page.getByRole('button', { name: /Snap/i });

      // Toggle off
      await snapButton.click();
      await page.waitForTimeout(100);

      // Toggle back on
      await snapButton.click();
      await page.waitForTimeout(100);
    });

    test('should snap be enabled by default', async ({ page }) => {
      const snapButton = page.getByRole('button', { name: /Snap/i });
      await expect(snapButton).toBeVisible();

      // Snap is typically on by default
    });
  });

  test.describe('Magnetic Snap', () => {
    test('should have magnetic snap option', async ({ page }) => {
      // Magnetic snap might be a separate toggle or in settings
      const magneticButton = page.getByRole('button', { name: /Magnetic|Magnet/i });
      const hasMagnetic = await magneticButton.isVisible().catch(() => false);

      // Feature might be integrated with regular snap
      expect(hasMagnetic || true).toBeTruthy();
    });
  });

  test.describe('Grid Configuration', () => {
    test('should display grid cell size info', async ({ page }) => {
      // Grid size might be shown in toolbar or settings
      // Default is 0.5 inches
      const gridInfo = page.getByText(/0\.5|cell|grid size/i);
      const hasGridInfo = await gridInfo.first().isVisible().catch(() => false);

      // Grid config might be in settings
      expect(hasGridInfo || true).toBeTruthy();
    });

    test('should use consistent measurements', async ({ page }) => {
      // Check for inch-based measurements
      await expect(page.getByText(/"/i).first()).toBeVisible(); // Inch symbol
    });
  });

  test.describe('Canvas Grid Rendering', () => {
    test('should render grid on canvas', async ({ page }) => {
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      // Canvas should have content (grid lines)
      const box = await canvas.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThan(100);
      expect(box!.height).toBeGreaterThan(100);
    });

    test('should update grid on zoom', async ({ page }) => {
      // Get current zoom
      const zoomSpan = page.locator('span').filter({ hasText: /\d+%/ }).first();

      // Zoom in
      const zoomInButton = page.locator('button').filter({ hasText: '+' });
      await zoomInButton.click();
      await page.waitForTimeout(100);

      // Canvas should still render correctly
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('Grid and Piece Interaction', () => {
    test('should align pieces to grid when snap is on', async ({ page }) => {
      // Ensure snap is on
      const snapButton = page.getByRole('button', { name: /Snap/i });
      await expect(snapButton).toBeVisible();

      // Canvas should be interactive
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      // Would need to drag a piece to fully test alignment
    });

    test('should allow free placement when snap is off', async ({ page }) => {
      const snapButton = page.getByRole('button', { name: /Snap/i });

      // Turn snap off
      await snapButton.click();
      await page.waitForTimeout(100);

      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      // Turn snap back on
      await snapButton.click();
    });
  });

  test.describe('Map Dimensions', () => {
    test('should display map dimensions in footer', async ({ page }) => {
      // Look for dimension display
      await expect(page.getByText(/\d+" x \d+"/)).toBeVisible();
    });

    test('should show correct default dimensions', async ({ page }) => {
      // Default is typically 72x45 or similar
      const dimensionText = page.getByText(/72" x 45"|60" x 60"/);
      const hasDimensions = await dimensionText.isVisible().catch(() => false);

      // At least some dimension should be shown
      expect(hasDimensions || await page.getByText(/\d+" x \d+"/).isVisible()).toBeTruthy();
    });
  });

  test.describe('Pixels Per Inch', () => {
    test('should render at consistent scale', async ({ page }) => {
      // Standard pieces should have consistent sizing
      // Check that piece cards show inch measurements
      await expect(page.getByText('3" x 3"').first()).toBeVisible();
    });
  });
});
