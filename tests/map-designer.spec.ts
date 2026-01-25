import { test, expect } from '@playwright/test';

test.describe('Map Designer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/designer');
    // Wait for the app to fully load
    await page.waitForSelector('canvas');
  });

  test('should load the map designer page', async ({ page }) => {
    // Check that main elements are present using more specific locators
    await expect(page.getByRole('heading', { name: 'Pieces', exact: true })).toBeVisible();
    await expect(page.locator('input[value="Untitled Map"]')).toBeVisible();
    await expect(page.getByText('Level:', { exact: true })).toBeVisible();
  });

  test('should display terrain tabs in sidebar', async ({ page }) => {
    // Check terrain tabs are visible using role
    await expect(page.getByRole('tab', { name: /Desert/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Forest/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Water/ })).toBeVisible();
  });

  test('should display pieces in the sidebar', async ({ page }) => {
    // Desert tab should be active by default, check for desert pieces
    await expect(page.getByRole('heading', { name: 'Desert 3x3' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Desert 3x6' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Desert 6x3' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Desert △ TL' })).toBeVisible();
  });

  test('should switch between terrain tabs', async ({ page }) => {
    // Click on Forest tab
    await page.getByRole('tab', { name: /Forest/ }).click();
    await expect(page.getByRole('heading', { name: 'Forest 3x3' })).toBeVisible();

    // Click on Water tab
    await page.getByRole('tab', { name: /Water/ }).click();
    await expect(page.getByRole('heading', { name: 'Water 3x3' })).toBeVisible();
  });

  test('should toggle grid visibility', async ({ page }) => {
    const gridButton = page.getByRole('button', { name: 'Grid' });

    // Grid should be on by default
    await expect(gridButton).toBeVisible();

    // Click to toggle off
    await gridButton.click();

    // Click to toggle back on
    await gridButton.click();
  });

  test('should toggle snap to grid', async ({ page }) => {
    const snapButton = page.getByRole('button', { name: 'Snap' });

    await expect(snapButton).toBeVisible();

    // Toggle snap
    await snapButton.click();
    await snapButton.click();
  });

  test('should toggle view lock', async ({ page }) => {
    // Find the unlock button
    const unlockButton = page.getByRole('button', { name: '🔓' });
    await expect(unlockButton).toBeVisible();

    // Click to lock
    await unlockButton.click();

    // Should now show locked button
    await expect(page.getByRole('button', { name: '🔒' })).toBeVisible();
  });

  test('should change zoom level with buttons', async ({ page }) => {
    // Check initial zoom text in the toolbar (specific span)
    const zoomSpan = page.locator('span.text-gray-400.w-12');
    await expect(zoomSpan).toContainText('100%');

    // Click zoom in button (the + button)
    const zoomInButton = page.locator('button').filter({ hasText: '+' });
    await zoomInButton.click();

    // Should now show 110%
    await expect(zoomSpan).toContainText('110%');
  });

  test('should have level buttons', async ({ page }) => {
    // Check level buttons exist in toolbar
    const toolbar = page.locator('.h-14.bg-gray-800');
    await expect(toolbar.getByText('Level:', { exact: true })).toBeVisible();

    // Level buttons should be present
    await expect(page.locator('button:has-text("B1")').first()).toBeVisible();
  });

  test('should edit map name', async ({ page }) => {
    const nameInput = page.locator('input[value="Untitled Map"]');

    await nameInput.click();
    await nameInput.fill('My Test Map');

    await expect(page.locator('input[value="My Test Map"]')).toBeVisible();
  });

  test('should show rotation indicator', async ({ page }) => {
    // Check rotation indicator is visible in toolbar
    await expect(page.getByText('R to rotate')).toBeVisible();
    // Check rotation value is shown (in toolbar or sidebar)
    await expect(page.getByText('0°').first()).toBeVisible();
  });

  test('should show help text', async ({ page }) => {
    await expect(page.getByText('R: Rotate selected')).toBeVisible();
  });

  test('should show map dimensions in footer', async ({ page }) => {
    // Check map dimensions are displayed
    await expect(page.getByText(/72" x 45"/)).toBeVisible();
  });

  test('should show piece count in sidebar footer', async ({ page }) => {
    await expect(page.getByText('Pieces on map:')).toBeVisible();
  });

  test('should clear map button exists and is functional', async ({ page }) => {
    const clearButton = page.getByRole('button', { name: 'Clear Map' });
    await expect(clearButton).toBeVisible();

    // Just click it to ensure it works (no pieces to clear initially)
    await clearButton.click();
  });

  test('should have interactive piece cards', async ({ page }) => {
    // Check that piece cards are visible and have grab cursor (indicating they can be dragged)
    const pieceCard = page.locator('.cursor-grab').first();
    await expect(pieceCard).toBeVisible();
  });

  test('should display piece sizes in cards', async ({ page }) => {
    // Check that piece sizes are shown
    await expect(page.getByText('3" x 3"').first()).toBeVisible();
    await expect(page.getByText('3" x 6"').first()).toBeVisible();
  });

  test('should display piece quantities', async ({ page }) => {
    // Check that quantities are shown (e.g., /10 for Desert Base)
    await expect(page.getByText('/10').first()).toBeVisible();
  });

  test('should reset view when clicking reset button', async ({ page }) => {
    const zoomSpan = page.locator('span.text-gray-400.w-12');

    // First zoom in
    const zoomInButton = page.locator('button').filter({ hasText: '+' });
    await zoomInButton.click();
    await expect(zoomSpan).toContainText('110%');

    // Click reset view button (⟲)
    const resetButton = page.getByRole('button', { name: '⟲' });
    await resetButton.click();

    // Should be back to 100%
    await expect(zoomSpan).toContainText('100%');
  });

  test('canvas should be present and have correct size', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Check canvas has non-zero dimensions
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test('should show current level in sidebar', async ({ page }) => {
    // Check current level is shown
    await expect(page.getByText('Current level:')).toBeVisible();
    await expect(page.getByText('Ground')).toBeVisible();
  });

  test('sidebar should show terrain type colors', async ({ page }) => {
    // Check that tabs have colored borders (style attribute with border)
    const desertTab = page.getByRole('tab', { name: /Desert/ });
    await expect(desertTab).toHaveAttribute('style', /border-bottom/);
  });
});
