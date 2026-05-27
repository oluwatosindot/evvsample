const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  const page = await context.newPage();

  // Capture ALL console messages
  page.on('console', msg => console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));
  page.on('requestfailed', req => console.log(`[REQUEST FAILED] ${req.url()} - ${req.failure()?.errorText}`));

  // Track network requests
  let requestCount = 0;
  page.on('request', req => {
    requestCount++;
    if (req.url().includes('index-') || req.url().includes('api') || req.url().includes('login')) {
      console.log(`[REQUEST] ${req.method()} ${req.url()}`);
    }
  });
  page.on('response', res => {
    if (res.url().includes('index-') || res.url().includes('api') || res.url().includes('login')) {
      console.log(`[RESPONSE] ${res.status()} ${res.url()}`);
    }
  });

  console.log('Navigating to portal...');
  await page.goto('https://portal.geoh.app/login', { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait and monitor
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(5000);
    const inputs = await page.locator('input').count();
    const bodyText = await page.evaluate(() => document.body?.innerText?.trim().substring(0, 200) || '');
    console.log(`[CHECK ${(i+1)*5}s] inputs=${inputs}, text="${bodyText}", requests=${requestCount}`);

    if (inputs > 0) {
      console.log('LOGIN FORM FOUND!');
      break;
    }
  }

  // Final state
  const html = await page.content();
  const rootDiv = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? root.innerHTML.substring(0, 1000) : 'no #root found';
  });
  console.log(`\n[ROOT DIV] ${rootDiv}`);

  await page.screenshot({ path: 'C:/xampp/htdocs/evvsample/docs/geoh-mapping/debug-final.png', fullPage: true });
  console.log('Screenshot saved as debug-final.png');

  await browser.close();
}

main().catch(err => console.error('Fatal:', err));
