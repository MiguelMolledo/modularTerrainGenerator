import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navegando a localhost:4200...');
  await page.goto('http://localhost:4200');

  // Wait for navigation to complete
  await page.waitForLoadState('networkidle');

  const url = page.url();
  console.log('URL actual:', url);

  // Take screenshot
  await page.screenshot({ path: 'screenshot.png', fullPage: true });
  console.log('Screenshot guardado en screenshot.png');

  // Check if sign out button exists
  const signOutButton = await page.locator('button:has-text("Sign out")').count();
  console.log('Botón "Sign out" encontrado:', signOutButton > 0 ? 'SÍ' : 'NO');

  // Check if user info is visible
  const userAvatar = await page.locator('img[alt*="avatar"]').count();
  console.log('Avatar de usuario encontrado:', userAvatar > 0 ? 'SÍ' : 'NO');

  // Get the top nav HTML
  const topNavHTML = await page.locator('nav').first().innerHTML();
  console.log('\n=== HTML del TopNav ===');
  console.log(topNavHTML.substring(0, 500) + '...');

  console.log('\nPresiona Enter para cerrar el navegador...');
  await new Promise(resolve => process.stdin.once('data', resolve));

  await browser.close();
})();
