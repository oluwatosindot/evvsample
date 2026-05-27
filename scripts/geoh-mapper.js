const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'docs', 'geoh-mapping');
const BASE_URL = 'https://portal.geoh.app';
const USERNAME = process.env.GEOH_EMAIL;
const PASSWORD = process.env.GEOH_PASSWORD;

if (!USERNAME || !PASSWORD) {
  console.error('ERROR: Set GEOH_EMAIL and GEOH_PASSWORD environment variables');
  process.exit(1);
}

let counter = 0;

async function snap(page, name, wait = 3000) {
  await page.waitForTimeout(wait);
  const num = String(counter++).padStart(2, '0');
  const file = path.join(SCREENSHOTS_DIR, `${num}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  [${num}] ${name}.png`);
}

async function waitForContent(page, timeout = 20000) {
  try {
    await page.waitForFunction(
      () => (document.querySelectorAll('input').length > 0 ||
             document.querySelectorAll('button').length > 1 ||
             (document.body?.innerText?.trim().length || 0) > 100),
      { timeout }
    );
  } catch (_) {}
}

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-web-security'],
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  // Capture errors
  page.on('pageerror', err => console.log(`[ERROR] ${err.message}`));

  // ===== LOGIN =====
  console.log('\n--- LOGIN ---');

  // The app sometimes fails to load dynamic modules on first try - retry up to 3 times
  let loginFormFound = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`  Load attempt ${attempt}...`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(8000);

    const inputCount = await page.locator('input').count();
    if (inputCount > 0) {
      loginFormFound = true;
      console.log(`  Login form loaded on attempt ${attempt}`);
      break;
    }

    console.log(`  No inputs found, retrying...`);
    await page.waitForTimeout(3000);
  }

  if (!loginFormFound) {
    console.log('  FATAL: Could not load login form after 3 attempts');
    await snap(page, 'login-failed');
    await browser.close();
    return;
  }
  await snap(page, 'login-page');

  await page.locator('input[name="username"]').fill(USERNAME);
  await page.locator('input[name="password"], input[type="password"]').first().fill(PASSWORD);
  await snap(page, 'login-filled', 1000);

  await page.locator('button:has-text("LOGIN")').click();
  console.log('  Clicked LOGIN, waiting for dashboard...');

  // Wait for URL to change away from /login
  try {
    await page.waitForURL(url => !url.pathname.includes('login'), { timeout: 30000 });
  } catch (_) {
    // Check if still on login (bad credentials)
    const text = await page.evaluate(() => document.body?.innerText || '');
    if (text.includes('Invalid')) {
      console.log('  ERROR: Invalid credentials!');
      await snap(page, 'login-invalid');
      await browser.close();
      return;
    }
  }

  await waitForContent(page, 15000);
  await snap(page, 'dashboard', 5000);
  console.log(`  Landed on: ${page.url()}`);

  // ===== DISCOVER SIDEBAR/NAV =====
  console.log('\n--- DISCOVERING NAVIGATION ---');

  const navItems = await page.evaluate(() => {
    const items = [];
    const seen = new Set();

    // Get all links
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      const text = a.innerText?.trim();
      if (href && text && text.length > 0 && text.length < 60 && !seen.has(href) && href !== '#') {
        seen.add(href);
        items.push({ href, text, source: 'link' });
      }
    });

    // Get sidebar/menu text items that might be clickable
    const menuSelectors = [
      '[class*="sidebar"] [class*="item"]',
      '[class*="Sidebar"] [class*="item"]',
      '[class*="menu"] [class*="item"]',
      '[class*="Menu"] [class*="item"]',
      'aside li', 'nav li',
      '[class*="drawer"] li',
    ];
    menuSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        const text = el.innerText?.trim();
        if (text && text.length > 0 && text.length < 50 && !seen.has(text)) {
          seen.add(text);
          items.push({ href: null, text, source: 'menu' });
        }
      });
    });

    return items;
  });

  console.log(`  Found ${navItems.length} navigation items:`);
  navItems.forEach(n => console.log(`    [${n.source}] "${n.text}" -> ${n.href || '(click)'}`));

  // ===== SCREENSHOT EACH NAV LINK =====
  console.log('\n--- SCREENSHOTTING NAV SECTIONS ---');
  const visited = new Set();

  for (const nav of navItems) {
    if (!nav.href || nav.href === '/login' || nav.href === '/logout') continue;

    const resolvedUrl = nav.href.startsWith('http') ? nav.href : `${BASE_URL}${nav.href}`;
    if (visited.has(resolvedUrl)) continue;
    visited.add(resolvedUrl);

    const safeName = nav.text.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').toLowerCase().substring(0, 40);
    try {
      console.log(`\n  -> "${nav.text}" (${nav.href})`);
      await page.goto(resolvedUrl, { waitUntil: 'networkidle', timeout: 20000 });
      await waitForContent(page);
      await snap(page, `nav-${safeName}`, 4000);

      // Capture tabs if present
      const tabs = await page.locator('[role="tab"]').all();
      if (tabs.length > 1 && tabs.length <= 8) {
        console.log(`    ${tabs.length} tabs found`);
        for (let i = 0; i < tabs.length; i++) {
          try {
            const tabText = (await tabs[i].textContent()).trim();
            if (tabText && tabText.length < 40) {
              await tabs[i].click();
              const tabName = tabText.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().substring(0, 20);
              await snap(page, `nav-${safeName}-tab-${tabName}`, 2000);
              console.log(`      Tab: "${tabText}"`);
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      console.log(`    Skip: ${err.message.substring(0, 80)}`);
    }
  }

  // ===== TRY CLICKING SIDEBAR MENU ITEMS (non-link) =====
  console.log('\n--- CLICKING SIDEBAR ITEMS ---');
  // Go back to dashboard first
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 20000 });
  await waitForContent(page, 10000);
  await page.waitForTimeout(3000);

  // Try clicking each sidebar text item
  const menuTexts = navItems.filter(n => n.source === 'menu').map(n => n.text);
  for (const menuText of menuTexts) {
    try {
      const item = page.locator(`text="${menuText}"`).first();
      if (await item.isVisible()) {
        await item.click();
        await page.waitForTimeout(3000);
        const safeName = menuText.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').toLowerCase().substring(0, 40);
        await snap(page, `menu-${safeName}`, 2000);
        console.log(`  Clicked: "${menuText}" -> ${page.url()}`);
      }
    } catch (_) {}
  }

  // ===== COMMON ROUTES PROBE =====
  console.log('\n--- PROBING COMMON ROUTES ---');
  const routes = [
    '/dashboard', '/home', '/schedule', '/scheduling', '/calendar',
    '/visits', '/evv', '/verification', '/caregivers', '/employees',
    '/staff', '/workers', '/clients', '/patients', '/customers',
    '/billing', '/invoices', '/claims', '/payroll', '/payments',
    '/reports', '/analytics', '/settings', '/admin', '/configuration',
    '/messages', '/notifications', '/alerts', '/documents', '/forms',
    '/map', '/tracking', '/live-map', '/shifts', '/appointments',
    '/agencies', '/users', '/roles', '/compliance', '/audit',
    '/tasks', '/notes', '/logs', '/authorizations', '/services',
  ];

  for (const route of routes) {
    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 8000 });
      await page.waitForTimeout(3000);
      const url = page.url();
      if (url.includes('login') || visited.has(url)) continue;

      const len = await page.evaluate(() => document.body?.innerText?.trim().length || 0);
      if (len > 50) {
        visited.add(url);
        const safeName = route.replace(/\//g, '');
        console.log(`  Found: ${route} -> ${url} (${len} chars)`);
        await snap(page, `route-${safeName}`);
      }
    } catch (_) {}
  }

  console.log(`\n=== DONE: ${counter} screenshots saved to docs/geoh-mapping/ ===`);
  await browser.close();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
