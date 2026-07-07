import { chromium } from '@playwright/test';

(async () => {
  console.log('🔍 Checking sign out button after login...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Go to login page
    console.log('1. Going to login page...');
    await page.goto('http://localhost:4200/login');
    await page.waitForLoadState('networkidle');

    // Fill in credentials
    console.log('2. Filling credentials...');
    await page.fill('input[type="email"]', 'test@local.dev');
    await page.fill('input[type="password"]', 'test-password-dev-only');

    // Click sign in button
    console.log('3. Clicking sign in...');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL('http://localhost:4200/', { timeout: 10000 });
    console.log('✅ Redirected to home page\n');

    // Wait a bit for UI to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for sign out button
    console.log('📊 Checking UI elements:');
    const signOutButton = await page.locator('button:has-text("Sign out")').count();
    const signOutIcon = await page.locator('button[title="Sign out"]').count();
    const logOutIcon = await page.locator('svg').filter({ hasText: '' }).count();
    const topNav = await page.locator('nav').first().count();

    console.log('   TopNav present:', topNav > 0 ? '✅' : '❌');
    console.log('   Sign out button (text):', signOutButton > 0 ? '✅ Found' : '❌ Not found');
    console.log('   Sign out button (title):', signOutIcon > 0 ? '✅ Found' : '❌ Not found');

    // Get TopNav HTML
    if (topNav > 0) {
      const navHTML = await page.locator('nav').first().innerHTML();
      console.log('\n📝 TopNav HTML preview:');
      console.log(navHTML.substring(0, 500) + '...\n');
    }

    // Take screenshot
    await page.screenshot({ path: 'after-login.png', fullPage: true });
    console.log('📸 Screenshot saved: after-login.png\n');

    // Try to find any button in the nav
    const allButtons = await page.locator('nav button').count();
    console.log('🔍 Total buttons in nav:', allButtons);

    if (allButtons > 0) {
      console.log('\n   Buttons found:');
      for (let i = 0; i < allButtons; i++) {
        const buttonText = await page.locator('nav button').nth(i).textContent();
        const buttonTitle = await page.locator('nav button').nth(i).getAttribute('title');
        console.log(`   ${i + 1}. Text: "${buttonText?.trim()}" | Title: "${buttonTitle}"`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\nPress Enter to close...');
  await new Promise(resolve => process.stdin.once('data', resolve));

  await browser.close();
})();
