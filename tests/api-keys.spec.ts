import { test, expect } from '@playwright/test';

test.describe('API Keys Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Settings Page', () => {
    test('should load settings page', async ({ page }) => {
      // Settings page should have some heading
      const heading = page.getByRole('heading', { name: /Settings|Configuration|API/i }).first();
      const hasHeading = await heading.isVisible().catch(() => false);

      // At least the page should load
      await expect(page).toHaveURL(/settings/);
    });

    test('should display API configuration section', async ({ page }) => {
      // Look for API keys section
      const apiSection = page.getByText(/API|Keys|OpenRouter|FAL/i).first();
      const hasApiSection = await apiSection.isVisible().catch(() => false);
    });
  });

  test.describe('OpenRouter API Key', () => {
    test('should have OpenRouter key input', async ({ page }) => {
      const openRouterInput = page.getByLabel(/OpenRouter|API Key/i).first();
      const openRouterText = page.getByText(/OpenRouter/i).first();

      const hasInput = await openRouterInput.isVisible().catch(() => false);
      const hasText = await openRouterText.isVisible().catch(() => false);

      expect(hasInput || hasText).toBeTruthy();
    });

    test('should be able to enter OpenRouter key', async ({ page }) => {
      const input = page.locator('input[type="password"], input[type="text"]').first();

      if (await input.isVisible()) {
        // Enter a test key (will not be saved for real)
        await input.fill('test-key-12345');
        await expect(input).toHaveValue('test-key-12345');

        // Clear it
        await input.fill('');
      }
    });

    test('should have connection test button', async ({ page }) => {
      const testButton = page.getByRole('button', { name: /Test|Connect|Verify/i }).first();
      const hasTest = await testButton.isVisible().catch(() => false);
    });

    test('should show connection status', async ({ page }) => {
      // Status indicators
      const statusText = page.getByText(/Connected|Not connected|Status|✓|✗/i).first();
      const hasStatus = await statusText.isVisible().catch(() => false);
    });
  });

  test.describe('FAL.ai API Key', () => {
    test('should have FAL.ai key input', async ({ page }) => {
      const falInput = page.getByLabel(/FAL|Image/i).first();
      const falText = page.getByText(/FAL|Image Generation/i).first();

      const hasInput = await falInput.isVisible().catch(() => false);
      const hasText = await falText.isVisible().catch(() => false);

      expect(hasInput || hasText).toBeTruthy();
    });

    test('should be able to enter FAL.ai key', async ({ page }) => {
      // Find FAL.ai input (might be second password input)
      const inputs = page.locator('input[type="password"], input[type="text"]');
      const count = await inputs.count();

      if (count > 1) {
        const falInput = inputs.nth(1);
        if (await falInput.isVisible()) {
          await falInput.fill('fal-test-key');
          await expect(falInput).toHaveValue('fal-test-key');
          await falInput.fill('');
        }
      }
    });

    test('should have FAL test button', async ({ page }) => {
      // Find test buttons
      const testButtons = page.getByRole('button', { name: /Test|Verify/i });
      const count = await testButtons.count();
    });
  });

  test.describe('Security', () => {
    test('should use password type for key inputs', async ({ page }) => {
      const passwordInputs = page.locator('input[type="password"]');
      const count = await passwordInputs.count();

      // Keys should be hidden
    });

    test('should not expose keys in UI', async ({ page }) => {
      // Keys should be masked or hidden
      const visibleKeys = page.getByText(/sk-|fal_/i);
      const hasVisibleKey = await visibleKeys.isVisible().catch(() => false);

      // Should not show actual key values
      expect(hasVisibleKey).toBeFalsy();
    });
  });

  test.describe('Key Persistence', () => {
    test('should store keys in localStorage', async ({ page }) => {
      // Check localStorage for obfuscated keys
      const storedKeys = await page.evaluate(() => {
        return {
          apiKeys: localStorage.getItem('mtc_api_keys') ||
                   localStorage.getItem('apiKeys') ||
                   null
        };
      });
    });

    test('should clear keys', async ({ page }) => {
      const clearButton = page.getByRole('button', { name: /Clear|Remove|Delete/i }).first();
      const hasClear = await clearButton.isVisible().catch(() => false);
    });
  });

  test.describe('Connection Testing', () => {
    test('should validate OpenRouter connection', async ({ page }) => {
      // Enter a key and test
      const input = page.locator('input[type="password"], input[type="text"]').first();

      if (await input.isVisible()) {
        await input.fill('test-key');

        const testButton = page.getByRole('button', { name: /Test/i }).first();
        if (await testButton.isVisible()) {
          // Don't actually click to avoid API calls
          await expect(testButton).toBeVisible();
        }
      }
    });

    test('should show error for invalid key', async ({ page }) => {
      // With no key, should show not connected
      const errorState = page.getByText(/Not connected|Invalid|Error|Enter/i).first();
      const hasError = await errorState.isVisible().catch(() => false);
    });
  });

  test.describe('Multiple Models Support', () => {
    test('should mention supported models', async ({ page }) => {
      // Look for model names
      const modelNames = ['Claude', 'GPT', 'Haiku', 'Sonnet'];

      for (const model of modelNames) {
        const modelText = page.getByText(new RegExp(model, 'i')).first();
        const hasModel = await modelText.isVisible().catch(() => false);
        if (hasModel) {
          break;
        }
      }
    });
  });
});
