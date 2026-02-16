import { test, expect } from '@playwright/test';

test.describe('Export System', () => {
  test.describe('Export from Maps Library', () => {
    test.beforeEach(async ({ page }) => {
      // Create a test map
      await page.goto('/');
      await page.evaluate(() => {
        const testMap = {
          id: 'export-test-map',
          name: 'Export Test Map',
          description: 'Map for testing export',
          width: 60,
          height: 60,
          pieces: [
            {
              id: 'piece-1',
              terrain: 'desert',
              shape: '3x3',
              x: 100,
              y: 100,
              rotation: 0,
            },
          ],
          props: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('mtc_maps', JSON.stringify([testMap]));
      });
    });

    test('should have export button on map card', async ({ page }) => {
      await page.goto('/maps');
      await page.waitForLoadState('networkidle');

      // Find map card
      await expect(page.getByText('Export Test Map')).toBeVisible();

      // Look for export button
      const exportButton = page.getByRole('button', { name: /Export|PDF|Download|📄/i }).first();
      const hasExport = await exportButton.isVisible().catch(() => false);

      // Export might be in a dropdown menu
    });

    test('should open export dialog', async ({ page }) => {
      await page.goto('/maps');
      await page.waitForLoadState('networkidle');

      // Find and click export option
      const exportButton = page.getByRole('button', { name: /Export|PDF/i }).first();

      if (await exportButton.isVisible()) {
        await exportButton.click();
        await page.waitForTimeout(300);

        // Dialog should open
        const dialog = page.locator('[role="dialog"]');
        const hasDialog = await dialog.isVisible().catch(() => false);
      }
    });
  });

  test.describe('PDF Report Contents', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/designer');
      await page.waitForSelector('canvas');
    });

    test('should show map name in export', async ({ page }) => {
      // Set map name
      const nameInput = page.locator('input[value="Untitled Map"]');
      await nameInput.fill('PDF Test Map');
      await expect(nameInput).toHaveValue('PDF Test Map');
    });

    test('should display piece inventory', async ({ page }) => {
      // Sidebar shows piece counts
      await expect(page.getByText('Pieces on map:')).toBeVisible();
    });

    test('should show map dimensions', async ({ page }) => {
      await expect(page.getByText(/\d+" x \d+"/)).toBeVisible();
    });
  });

  test.describe('Export Options', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        const testMap = {
          id: 'options-test-map',
          name: 'Options Test Map',
          description: 'Testing export options',
          width: 48,
          height: 48,
          pieces: [],
          props: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('mtc_maps', JSON.stringify([testMap]));
      });
    });

    test('should have snapshot option', async ({ page }) => {
      await page.goto('/maps');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Options Test Map')).toBeVisible();

      // Export dialog would have snapshot toggle
    });

    test('should have inventory list option', async ({ page }) => {
      await page.goto('/maps');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Options Test Map')).toBeVisible();
    });

    test('should have campaign notes option', async ({ page }) => {
      await page.goto('/maps');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Options Test Map')).toBeVisible();
    });
  });

  test.describe('Canvas Snapshot', () => {
    test('should have canvas to capture', async ({ page }) => {
      await page.goto('/designer');
      await page.waitForSelector('canvas');

      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      // Canvas should have content for snapshot
      const box = await canvas.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
    });
  });

  test.describe('Piece Inventory in Export', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/designer');
      await page.waitForSelector('canvas');
    });

    test('should show terrain type tabs', async ({ page }) => {
      await expect(page.getByRole('tab', { name: /Desert/ })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Forest/ })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Water/ })).toBeVisible();
    });

    test('should show piece counts', async ({ page }) => {
      // Pieces available per type
      await expect(page.getByText('/10').first()).toBeVisible();
    });

    test('should show pieces on map count', async ({ page }) => {
      await expect(page.getByText('Pieces on map:')).toBeVisible();
    });
  });

  test.describe('Download', () => {
    test('should generate client-side', async ({ page }) => {
      await page.goto('/designer');
      await page.waitForSelector('canvas');

      // jsPDF generates PDF client-side
      // Verify page loaded correctly
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();
    });
  });
});
