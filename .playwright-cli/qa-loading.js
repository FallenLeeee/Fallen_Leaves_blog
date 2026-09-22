async (page) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  // Desktop path
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/?v=qa-desktop', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'D:/CodeProject/blog/blog2.0/.playwright-cli/qa-load-early.png' });
  // wait for loading to finish (up to 12s)
  await page.waitForSelector('#loadingScreen.hidden', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'D:/CodeProject/blog/blog2.0/.playwright-cli/qa-desktop-done.png' });
  const desktopLegacy = await page.evaluate(() => document.body.classList.contains('legacy-bg'));
  const hasWebgl = await page.evaluate(() => {
    const c = document.getElementById('webgl');
    return !!(c && c.style.display !== 'none' && c.width > 0);
  });

  // Check github images
  const gh = await page.evaluate(() => {
    return [...document.querySelectorAll('.github-stats img')].map(img => ({
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      display: getComputedStyle(img).display
    }));
  });

  // Mobile path
  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto('http://localhost:5173/?v=qa-mobile', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'D:/CodeProject/blog/blog2.0/.playwright-cli/qa-mobile-load.png' });
  await page.waitForSelector('#loadingScreen.hidden', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'D:/CodeProject/blog/blog2.0/.playwright-cli/qa-mobile-done.png' });
  const mobileState = await page.evaluate(() => ({
    legacy: document.body.classList.contains('legacy-bg'),
    bgCanvas: !!document.getElementById('bgCanvas'),
    webglDisplay: document.getElementById('webgl')?.style.display || getComputedStyle(document.getElementById('webgl')).display
  }));

  return { errors, desktopLegacy, hasWebgl, gh, mobileState };
}
