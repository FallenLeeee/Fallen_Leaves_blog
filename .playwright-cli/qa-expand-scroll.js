async (page) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !t.includes('favicon')) errors.push(t);
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5173/?v=final-run', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loadingScreen.hidden', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(500);

  await page.evaluate(() => {
    document.getElementById('projects-section')?.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(300);

  const expand = await page.evaluate(() => new Promise((resolve) => {
    const card = document.querySelector('.project-card');
    if (!card) return resolve({ ok: false });
    const t0 = performance.now();
    card.click();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      resolve({
        ok: true,
        expanded: card.classList.contains('expanded'),
        hasReadme: !!card.querySelector('.project-readme-inner'),
        height: Math.round(card.getBoundingClientRect().height),
        ms: +(performance.now() - t0).toFixed(1)
      });
    }));
  }));

  const scroll = await page.evaluate(() => new Promise((resolve) => {
    const times = [];
    let last = performance.now();
    let y = 0;
    let n = 0;
    function step(now) {
      times.push(now - last);
      last = now;
      y += 24;
      window.scrollTo(0, y);
      n++;
      if (n < 50) requestAnimationFrame(step);
      else resolve(times);
    }
    requestAnimationFrame(step);
  }));

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const max = (arr) => Math.max(...arr);
  const p95 = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))];
  };

  await page.screenshot({ path: 'D:/CodeProject/blog/blog2.0/.playwright-cli/qa-expand.png' });

  return {
    errors,
    expand,
    scroll: {
      avg: +avg(scroll).toFixed(1),
      p95: +p95(scroll).toFixed(1),
      max: +max(scroll).toFixed(1)
    }
  };
}
