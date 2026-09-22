async (page) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !t.includes('favicon')) errors.push(t);
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/?v=desk-check', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loadingScreen.hidden', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const state = await page.evaluate(() => ({
    legacy: document.body.classList.contains('legacy-bg'),
    webglShown: getComputedStyle(document.getElementById('webgl')).display !== 'none',
    loadingHidden: document.getElementById('loadingScreen').classList.contains('hidden')
  }));
  await page.screenshot({ path: 'D:/CodeProject/blog/blog2.0/.playwright-cli/qa-desktop-still.png' });
  return { errors, state };
}
