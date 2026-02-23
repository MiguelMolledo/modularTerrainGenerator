import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🔐 Authenticating with test user...');

  // Go directly to test-login endpoint (bypasses Google OAuth)
  await page.goto('http://localhost:4200/test-login');

  // Wait for redirect to home
  await page.waitForURL('http://localhost:4200/', { timeout: 5000 });

  console.log('✅ Authenticated! Now on home page.');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Take screenshot
  await page.screenshot({ path: 'screenshot.png', fullPage: true });
  console.log('📸 Screenshot saved: screenshot.png');

  // Check authentication UI
  const signOutButton = await page.locator('button:has-text("Sign out")').count();
  const userAvatar = await page.locator('img[alt*="avatar"], img[alt*="User"]').count();
  const userName = await page.locator('text=Test User').count();

  console.log('\n📊 Authentication Check:');
  console.log('   Sign out button:', signOutButton > 0 ? '✅ Found' : '❌ Not found');
  console.log('   User avatar:', userAvatar > 0 ? '✅ Found' : '❌ Not found');
  console.log('   User name "Test User":', userName > 0 ? '✅ Found' : '❌ Not found');

  if (signOutButton > 0) {
    console.log('\n🎉 SUCCESS! Test login works perfectly!\n');
  } else {
    console.log('\n❌ Something went wrong\n');
    const topNavHTML = await page.locator('nav').first().innerHTML();
    console.log('TopNav HTML:', topNavHTML.substring(0, 300));
  }

  console.log('Press Enter to close...');
  await new Promise(resolve => process.stdin.once('data', resolve));

  await browser.close();
})();
