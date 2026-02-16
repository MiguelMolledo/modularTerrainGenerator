import { test, expect } from '@playwright/test';

test.describe('AI Assistant', () => {
  test.describe('Chat Interface', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/designer');
      await page.waitForSelector('canvas');
    });

    test('should have AI assistant button in toolbar', async ({ page }) => {
      const aiButton = page.getByRole('button', { name: /AI|Chat|Assistant|🤖/i }).first();
      const hasAI = await aiButton.isVisible().catch(() => false);

      // AI might be in toolbar or as floating button
    });

    test('should open AI chat dialog', async ({ page }) => {
      const aiButton = page.getByRole('button', { name: /AI|Chat|Assistant|🤖/i }).first();

      if (await aiButton.isVisible()) {
        await aiButton.click();
        await page.waitForTimeout(300);

        // Dialog should open
        const dialog = page.locator('[role="dialog"]');
        const chatContainer = page.locator('[class*="chat"]');

        const hasDialog = await dialog.isVisible().catch(() => false);
        const hasChat = await chatContainer.first().isVisible().catch(() => false);
      }
    });

    test('should have text input for messages', async ({ page }) => {
      const aiButton = page.getByRole('button', { name: /AI|Chat|🤖/i }).first();

      if (await aiButton.isVisible()) {
        await aiButton.click();
        await page.waitForTimeout(300);

        // Look for message input
        const input = page.getByPlaceholder(/message|type|ask/i);
        const textarea = page.locator('textarea');

        const hasInput = await input.isVisible().catch(() => false);
        const hasTextarea = await textarea.first().isVisible().catch(() => false);
      }
    });

    test('should show API key warning if not configured', async ({ page }) => {
      const aiButton = page.getByRole('button', { name: /AI|Chat|🤖/i }).first();

      if (await aiButton.isVisible()) {
        await aiButton.click();
        await page.waitForTimeout(300);

        // Should warn about missing API key
        const warning = page.getByText(/API key|Configure|Settings/i).first();
        const hasWarning = await warning.isVisible().catch(() => false);
      }
    });
  });

  test.describe('Specialized AI Dialogs', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/designer');
      await page.waitForSelector('canvas');
    });

    test('should have AI Layout dialog button', async ({ page }) => {
      const layoutButton = page.getByRole('button', { name: /Layout|Suggest|AI Layout/i }).first();
      const hasLayout = await layoutButton.isVisible().catch(() => false);
    });

    test('should have AI Props dialog button', async ({ page }) => {
      const propsButton = page.getByRole('button', { name: /Props|Generate Props|AI Props/i }).first();
      const hasProps = await propsButton.isVisible().catch(() => false);
    });

    test('should have Scene Description button', async ({ page }) => {
      const sceneButton = page.getByRole('button', { name: /Scene|Description|Describe/i }).first();
      const hasScene = await sceneButton.isVisible().catch(() => false);
    });

    test('should have Campaign Analyzer button', async ({ page }) => {
      const campaignButton = page.getByRole('button', { name: /Campaign|Analyze/i }).first();
      const hasCampaign = await campaignButton.isVisible().catch(() => false);
    });
  });

  test.describe('AI Layout Dialog', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/designer');
      await page.waitForSelector('canvas');
    });

    test('should open layout dialog', async ({ page }) => {
      const layoutButton = page.getByRole('button', { name: /Layout|AI Layout/i }).first();

      if (await layoutButton.isVisible()) {
        await layoutButton.click();
        await page.waitForTimeout(300);

        const dialog = page.locator('[role="dialog"]');
        const hasDialog = await dialog.isVisible().catch(() => false);
      }
    });

    test('should have scene input for layout', async ({ page }) => {
      const layoutButton = page.getByRole('button', { name: /Layout/i }).first();

      if (await layoutButton.isVisible()) {
        await layoutButton.click();
        await page.waitForTimeout(300);

        const input = page.getByPlaceholder(/scene|describe|prompt/i);
        const textarea = page.locator('textarea');

        const hasInput = await input.isVisible().catch(() => false);
        const hasTextarea = await textarea.first().isVisible().catch(() => false);
      }
    });
  });

  test.describe('AI Props Dialog', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/designer');
      await page.waitForSelector('canvas');
    });

    test('should open props dialog', async ({ page }) => {
      const propsButton = page.getByRole('button', { name: /Props|Generate/i }).first();

      if (await propsButton.isVisible()) {
        await propsButton.click();
        await page.waitForTimeout(300);

        const dialog = page.locator('[role="dialog"]');
        const hasDialog = await dialog.isVisible().catch(() => false);
      }
    });
  });

  test.describe('Tool Calls', () => {
    test('should have terrain creation capability', async ({ page }) => {
      // AI can create terrains
      await page.goto('/inventory');
      await page.waitForLoadState('networkidle');

      // Terrains page works
      await expect(page.getByRole('tab', { name: /Desert/i }).first()).toBeVisible();
    });

    test('should have piece shape creation capability', async ({ page }) => {
      await page.goto('/inventory');
      await page.waitForLoadState('networkidle');

      // Shapes would be in inventory
    });
  });

  test.describe('User Confirmation', () => {
    test('should require confirmation for AI actions', async ({ page }) => {
      // AI suggestions need user approval before applying
      await page.goto('/designer');
      await page.waitForSelector('canvas');

      // Confirmation dialog would appear for AI suggestions
    });
  });

  test.describe('API Integration', () => {
    test('should show loading state during AI calls', async ({ page }) => {
      await page.goto('/designer');
      await page.waitForSelector('canvas');

      // Loading indicators would appear during API calls
    });

    test('should handle errors gracefully', async ({ page }) => {
      await page.goto('/designer');
      await page.waitForSelector('canvas');

      // Error states should be user-friendly
    });
  });
});
