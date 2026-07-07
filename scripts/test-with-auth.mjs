/**
 * Example: Playwright test with authentication
 *
 * Run playwright-auth-setup.mjs first to create playwright-auth.json
 * Then run: node test-with-auth.mjs
 */

import { chromium } from '@playwright/test';
import { existsSync } from 'fs';

(async () => {
  // Check if auth state exists
  if (!existsSync('playwright-auth.json')) {
    console.error('❌ Authentication state not found!');
    console.error('\nPlease run: node playwright-auth-setup.mjs first\n');
    process.exit(1);
  }

  console.log('🚀 Running test with saved authentication...\n');

  const browser = await chromium.launch({ headless: false });

  // Use the saved authentication state
  const context = await browser.newContext({
    storageState: 'playwright-auth.json',
  });

  const page = await context.newPage();

  console.log('📱 Opening app (already logged in)...');
  await page.goto('http://localhost:4200');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  const url = page.url();
  console.log('✅ Current URL:', url);

  // Check if we're logged in
  const signOutButton = await page.locator('button:has-text("Sign out")').count();
  const avatar = await page.locator('img[alt*="avatar"], img[alt*="User"]').count();

  console.log('\n📊 Authentication Check:');
  console.log('   Sign out button:', signOutButton > 0 ? '✅ Found' : '❌ Not found');
  console.log('   User avatar:', avatar > 0 ? '✅ Found' : '❌ Not found');

  if (signOutButton > 0) {
    console.log('\n🎉 SUCCESS! You are logged in and can see the sign out button!\n');

    // Take a screenshot
    await page.screenshot({ path: 'test-authenticated.png', fullPage: false });
    console.log('📸 Screenshot saved: test-authenticated.png');
  } else {
    console.log('\n❌ Authentication failed - sign out button not visible\n');
  }

  console.log('\nPress Enter to close...');
  await new Promise(resolve => process.stdin.once('data', resolve));

  await browser.close();
})();
