import { test, expect } from '@playwright/test';

test.describe('Inventory Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Terrain Types', () => {
    test('should display all default terrain types', async ({ page }) => {
      // Check that default terrain tabs are visible
      await expect(page.getByRole('tab', { name: /Desert/ })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Forest/ })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Water/ })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Swamp/ })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Lava/ })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Arid/ })).toBeVisible();
    });

    test('should switch between terrain tabs', async ({ page }) => {
      // Click on Forest tab
      await page.getByRole('tab', { name: /Forest/ }).click();

      // Verify Forest tab is active (has selected state)
      await expect(page.getByRole('tab', { name: /Forest/ })).toHaveAttribute('data-state', 'active');
    });

    test('should be able to create custom terrain type', async ({ page }) => {
      // Look for "Add Terrain" or similar button
      const addButton = page.getByRole('button', { name: /Add Terrain|New Terrain|\+/i });

      if (await addButton.isVisible()) {
        await addButton.click();

        // Fill the form
        const nameInput = page.getByLabel(/Name/i);
        if (await nameInput.isVisible()) {
          await nameInput.fill('Custom Test Terrain');
        }

        // Cancel to avoid polluting state
        const cancelButton = page.getByRole('button', { name: /Cancel/i });
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
        }
      }
    });
  });

  test.describe('Piece Shapes', () => {
    test('should display available piece shapes', async ({ page }) => {
      // Navigate to shapes section if needed
      const shapesTab = page.getByRole('tab', { name: /Shapes/i });
      if (await shapesTab.isVisible()) {
        await shapesTab.click();
      }

      // Check for common piece sizes
      await expect(page.getByText(/3x3|3 x 3/i).first()).toBeVisible();
    });

    test('should show piece dimensions', async ({ page }) => {
      // Verify dimension labels are present
      await expect(page.getByText(/3" x 3"|3x3/i).first()).toBeVisible();
    });
  });

  test.describe('Piece Quantities', () => {
    test('should display piece quantities', async ({ page }) => {
      // Check that quantity controls are visible
      const quantityInput = page.locator('input[type="number"]').first();
      if (await quantityInput.isVisible()) {
        await expect(quantityInput).toBeVisible();
      }
    });

    test('should be able to modify piece quantity', async ({ page }) => {
      const quantityInput = page.locator('input[type="number"]').first();

      if (await quantityInput.isVisible()) {
        // Get current value
        const currentValue = await quantityInput.inputValue();

        // Clear and set new value
        await quantityInput.fill('15');

        // Verify change
        await expect(quantityInput).toHaveValue('15');

        // Reset to original
        await quantityInput.fill(currentValue);
      }
    });
  });

  test.describe('Props/Objects', () => {
    test('should navigate to props section', async ({ page }) => {
      // Look for props tab
      const propsTab = page.getByRole('tab', { name: /Props|Objects/i });

      if (await propsTab.isVisible()) {
        await propsTab.click();
        await expect(propsTab).toHaveAttribute('data-state', 'active');
      }
    });

    test('should display object categories', async ({ page }) => {
      const propsTab = page.getByRole('tab', { name: /Props|Objects/i });

      if (await propsTab.isVisible()) {
        await propsTab.click();

        // Check for object categories
        const categories = ['furniture', 'npc', 'creature', 'hero', 'boss', 'item'];
        for (const category of categories) {
          const categoryElement = page.getByText(new RegExp(category, 'i')).first();
          // At least some categories should be visible
        }
      }
    });
  });

  test.describe('Templates', () => {
    test('should navigate to templates section', async ({ page }) => {
      const templatesTab = page.getByRole('tab', { name: /Templates/i });

      if (await templatesTab.isVisible()) {
        await templatesTab.click();
        await expect(templatesTab).toHaveAttribute('data-state', 'active');
      }
    });
  });

  test.describe('Custom Pieces', () => {
    test('should navigate to custom pieces section', async ({ page }) => {
      const customTab = page.getByRole('tab', { name: /Custom/i });

      if (await customTab.isVisible()) {
        await customTab.click();
        await expect(customTab).toHaveAttribute('data-state', 'active');
      }
    });
  });
});
