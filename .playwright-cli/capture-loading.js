async (page) => {
  await page.goto('http://localhost:5173/?v=load8', { waitUntil: 'commit' });
  await page.waitForSelector('#loadingScreen:not(.hidden)');
  await page.waitForFunction(() => {
    const el = document.querySelector('#ui');
    return el && el.textContent.length === 0 && el.children.length >= 3;
  }, null, { timeout: 10000 });
  // wait until percentage is 60-90
  await page.waitForFunction(() => {
    const digits = [...document.querySelectorAll('#ui .digit')];
    if (digits.length < 3) return false;
    // count on-dots roughly via text reconstruction isn't available; wait by canvas fill
    return true;
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'D:/CodeProject/blog/blog2.0/.playwright-cli/loading-mask.png' });
}
