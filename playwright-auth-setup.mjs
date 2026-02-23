/**
 * Playwright Authentication Setup
 * Run this once to save your authenticated session for tests
 *
 * Usage: node playwright-auth-setup.mjs
 */

import { chromium } from '@playwright/test';

(async () => {
  console.log('🔐 Setting up Playwright authentication...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('1. Opening login page...');
  await page.goto('http://localhost:4200/login');

  console.log('2. Please login with Google in the browser window...');
  console.log('   (Waiting for you to complete the OAuth flow)\n');

  // Wait for successful redirect to home page after login
  await page.waitForURL('http://localhost:4200/', { timeout: 120000 });

  console.log('✅ Login successful!');
  console.log('3. Saving authentication state...');

  // Save the authentication state to a file
  await context.storageState({ path: 'playwright-auth.json' });

  console.log('✅ Auth state saved to: playwright-auth.json\n');

  console.log('🎉 Setup complete!');
  console.log('\nNow you can use this in your Playwright tests:');
  console.log('━'.repeat(60));
  console.log(`
import { test } from '@playwright/test';

test.use({ storageState: 'playwright-auth.json' });

test('my test', async ({ page }) => {
  await page.goto('http://localhost:4200');
  // You're already logged in! 🎉
});
  `);
  console.log('━'.repeat(60));

  await browser.close();
  process.exit(0);
})();
