async (page) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !t.includes('favicon')) errors.push(t);
  });

  // Mobile viewport + touch
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5173/?v=mperf-run', { waitUntil: 'domcontentloaded' });

  // Sample frame times during loading
  await page.evaluate(() => new Promise((resolve) => {
    const times = [];
    let last = performance.now();
    let n = 0;
    function f(now) {
      times.push(now - last);
      last = now;
      n++;
      if (n < 40) requestAnimationFrame(f);
      else resolve(times);
    }
    requestAnimationFrame(f);
  })).then((times) => {
    page.__loadFrames = times;
  });

  await page.waitForSelector('#loadingScreen.hidden', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);

  // Sample after load while idle
  const idle = await page.evaluate(() => new Promise((resolve) => {
    const times = [];
    let last = performance.now();
    let n = 0;
    function f(now) {
      times.push(now - last);
      last = now;
      n++;
      if (n < 50) requestAnimationFrame(f);
      else resolve(times);
    }
    requestAnimationFrame(f);
  }));

  // Scroll sample
  await page.evaluate(() => new Promise((resolve) => {
    let y = 0;
    const start = performance.now();
    function step(now) {
      y += 18;
      window.scrollTo(0, y);
      if (now - start < 800) requestAnimationFrame(step);
      else resolve(performance.now() - start);
    }
    requestAnimationFrame(step);
  }));

  const state = await page.evaluate(() => {
    const loadFrames = window.__loadFrames;
    return {
      legacy: document.body.classList.contains('legacy-bg'),
      bgCanvas: !!document.getElementById('bgCanvas'),
      webglHidden: getComputedStyle(document.getElementById('webgl')).display === 'none',
      loadingHidden: document.getElementById('loadingScreen').classList.contains('hidden'),
      ghLoaded: [...document.querySelectorAll('.github-stats img')].every(i => i.complete && i.naturalWidth > 0)
    };
  });

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const max = (arr) => Math.max(...arr);
  const p95 = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))];
  };

  await page.screenshot({ path: 'D:/CodeProject/blog/blog2.0/.playwright-cli/qa-mobile-perf.png' });

  return {
    errors,
    state,
    idle: { avg: +avg(idle).toFixed(1), p95: +p95(idle).toFixed(1), max: +max(idle).toFixed(1) },
    load: page.__loadFrames ? {
      avg: +avg(page.__loadFrames).toFixed(1),
      p95: +p95(page.__loadFrames).toFixed(1),
      max: +max(page.__loadFrames).toFixed(1)
    } : null
  };
}
