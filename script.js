(function() {

    /* ─── 0. Loading screen (scan + digit mask) ─── */
    const loadingScreen = document.getElementById('loadingScreen');
    const lCanvas = document.getElementById('loadingGrid');
    const lCtx = lCanvas.getContext('2d');
    const ui = document.getElementById('ui');

    let lProgress = 0, lPhase = 'load', lDismissStart = 0;
    let lCell = 16, lCols, lRows, lGrid = [];

    const font = {
        '0': ['01110','10001','10011','10101','11001','10001','01110'],
        '1': ['00100','01100','00100','00100','00100','00100','01110'],
        '2': ['01110','10001','00001','00010','00100','01000','11111'],
        '3': ['11110','00001','00001','01110','00001','00001','11110'],
        '4': ['00010','00110','01010','10010','11111','00010','00010'],
        '5': ['11111','10000','10000','11110','00001','00001','11110'],
        '6': ['01110','10000','10000','11110','10001','10001','01110'],
        '7': ['11111','00001','00010','00100','01000','01000','01000'],
        '8': ['01110','10001','10001','01110','10001','10001','01110'],
        '9': ['01110','10001','10001','01111','00001','00001','01110'],
        '%': ['10001','00010','00100','01000','00100','01000','10001']
    };

    function getDigitMask(text, w, h, dotSz, pad) {
        const covered = new Set();
        const n = text.length, charW = 5 * dotSz, charH = 7 * dotSz;
        const mx = 6, gap = mx * 2;
        const totalW = n * charW + (n - 1) * gap + mx * 2, totalH = charH;
        const startX = (w - totalW) / 2, startY = (h - totalH) / 2;
        for (let i = 0; i < n; i++) {
            const map = font[text[i]];
            if (!map) continue;
            const cX = startX + mx + i * (charW + gap);
            for (let row = 0; row < 7; row++)
                for (let col = 0; col < 5; col++) {
                    if (map[row][col] !== '1') continue;
                    const sx = cX + col * dotSz - pad, sy = startY + row * dotSz - pad;
                    const ex = sx + dotSz + pad * 2, ey = sy + dotSz + pad * 2;
                    const sc = Math.floor(sx / lCell), ec = Math.floor((ex - 1) / lCell);
                    const sr = Math.floor(sy / lCell), er = Math.floor((ey - 1) / lCell);
                    for (let gr = sr; gr <= er; gr++)
                        for (let gc = sc; gc <= ec; gc++)
                            if (gr >= 0 && gr < lRows && gc >= 0 && gc < lCols)
                                covered.add(gr + ',' + gc);
                }
        }
        return covered;
    }

    function renderDigits(text) {
        ui.innerHTML = '';
        for (const ch of text) {
            const d = document.createElement('div'); d.className = 'digit';
            const map = font[ch];
            for (let y = 0; y < 7; y++)
                for (let x = 0; x < 5; x++) {
                    const dot = document.createElement('div'); dot.className = 'dot';
                    if (map && map[y][x] === '1') dot.classList.add('on');
                    d.appendChild(dot);
                }
            ui.appendChild(d);
        }
    }

    function resizeLoad() {
        const w = innerWidth, h = innerHeight;
        lCanvas.width = w * devicePixelRatio; lCanvas.height = h * devicePixelRatio;
        lCanvas.style.width = w + 'px'; lCanvas.style.height = h + 'px';
        lCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        lCell = (w < 600) ? 14 : 16;
        lCols = Math.ceil(w / lCell); lRows = Math.ceil(h / lCell);
        lGrid = [];
        for (let r = 0; r < lRows; r++) {
            lGrid[r] = [];
            for (let c = 0; c < lCols; c++)
                lGrid[r][c] = { speed: 0.002 + Math.random() * 0.005, phase: Math.random() * Math.PI * 2 };
        }
    }

    function drawLoad(now) {
        const w = innerWidth, h = innerHeight;
        lCtx.fillStyle = '#000'; lCtx.fillRect(0, 0, w, h);
        let loadScan = 0, offScan = 0;
        if (lPhase === 'load') {
            lProgress += 0.006;
            if (lProgress >= 1) { lProgress = 1; lPhase = 'dismiss'; lDismissStart = performance.now(); }
            loadScan = lProgress * h; offScan = 0;
        } else {
            const t = (performance.now() - lDismissStart) / 1000;
            loadScan = h; offScan = t * h * 1.2;
        }
        const text = Math.floor(lProgress * 100) + '%';
        const masked = getDigitMask(text, w, h, 8, 1);
        for (let r = 0; r < lRows; r++) {
            const y = r * lCell;
            for (let c = 0; c < lCols; c++) {
                const x = c * lCell;
                if (masked.has(r + ',' + c)) continue;
                const cell = lGrid[r][c], loaded = y < loadScan, alive = y > offScan;
                if (!loaded || !alive) continue;
                const flick = Math.sin(now * cell.speed + cell.phase);
                const b = flick * 0.5 + 0.5;
                let fade = 1;
                if (lPhase === 'dismiss') fade = 1 - Math.min(1, offScan / h);
                const alpha = (0.1 + b * 0.4) * fade;
                lCtx.fillStyle = `rgba(255,255,255,${alpha})`;
                lCtx.fillRect(x, y, lCell - 2, lCell - 2);
            }
        }
        renderDigits(text);
        if (lPhase === 'load' || lPhase === 'dismiss') {
            const stillLoading = lPhase === 'load' && lProgress < 1;
            const stillDismissing = lPhase === 'dismiss' && offScan < h;
            if (stillLoading || stillDismissing) { requestAnimationFrame(drawLoad); return; }
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                const reveals = document.querySelectorAll('.reveal');
                reveals.forEach((el, i) => {
                    setTimeout(() => {
                        el.classList.add('visible');
                        if (i === reveals.length - 1) initParticles(80);
                    }, i * 180);
                });
            }, 800);
        }
    }

    window.addEventListener('resize', resizeLoad);
    resizeLoad();
    requestAnimationFrame(drawLoad);

    /* ─── 1. Background grid ─── */
    const bgCanvas = document.getElementById('bgCanvas');
    const bgCtx = bgCanvas.getContext('2d');
    let CELL = 18, cols, rows, grid = [];

    function resizeBg() {
        const w = innerWidth, h = innerHeight;
        bgCanvas.width = w * devicePixelRatio; bgCanvas.height = h * devicePixelRatio;
        bgCanvas.style.width = w + 'px'; bgCanvas.style.height = h + 'px';
        bgCtx.scale(devicePixelRatio, devicePixelRatio);
        CELL = (w < 600) ? 12 : 18;
        cols = Math.ceil(w / CELL) + 2; rows = Math.ceil(h / CELL) + 2;
        grid = [];
        for (let r = 0; r < rows; r++) {
            grid[r] = [];
            for (let c = 0; c < cols; c++)
                grid[r][c] = { state: Math.random() > 0.85 ? 1 : 0, speed: 0.002 + Math.random() * 0.006, phase: Math.random() * Math.PI * 2 };
        }
    }

    function drawBg(now) {
        const w = innerWidth, h = innerHeight;
        bgCtx.fillStyle = '#000'; bgCtx.fillRect(0, 0, w, h);
        for (let r = 0; r < rows; r++)
            for (let c = 0; c < cols; c++) {
                const nx = c / cols, ny = 1 - r / rows;
                const d = Math.sqrt(nx * nx + (1 - ny) * (1 - ny));
                const fade = Math.max(0, 1 - d * 1.4);
                const cell = grid[r][c];
                const flick = Math.sin(now * cell.speed + cell.phase);
                const b = Math.max(0, Math.min(1, flick * 0.6 + 0.4));
                const alpha = fade * b * 0.55;
                if (alpha <= 0.005) continue;
                const s = CELL * 0.85;
                bgCtx.fillStyle = `rgba(255,255,255,${alpha})`;
                bgCtx.fillRect(c * CELL + (CELL - s) / 2, r * CELL + (CELL - s) / 2, s, s);
            }
        const grad = bgCtx.createRadialGradient(w * 0.2, h * 0.8, 0, w * 0.2, h * 0.8, Math.max(w, h) * 0.9);
        grad.addColorStop(0, 'rgba(0,0,0,0.85)'); grad.addColorStop(0.5, 'rgba(0,0,0,0.30)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
        bgCtx.fillStyle = grad; bgCtx.fillRect(0, 0, w, h);
    }

    /* ─── 2. Firefly particles ─── */
    const pCanvas = document.getElementById('particleCanvas');
    const pCtx = pCanvas.getContext('2d');
    let particles = [], particlesRunning = false;

    function resizeP() {
        pCanvas.width = innerWidth * devicePixelRatio; pCanvas.height = innerHeight * devicePixelRatio;
        pCanvas.style.width = innerWidth + 'px'; pCanvas.style.height = innerHeight + 'px';
        pCtx.scale(devicePixelRatio, devicePixelRatio);
    }

    function initParticles(count) {
        const w = innerWidth, h = innerHeight;
        particles = [];
        for (let i = 0; i < count; i++)
            particles.push({
                x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.4,
                vy: -0.15 - Math.random() * 0.35, size: 1 + Math.random() * 2.5,
                life: 0.3 + Math.random() * 0.7, phase: Math.random() * Math.PI * 2,
                speed: 0.3 + Math.random() * 0.5, drift: (Math.random() - 0.5) * 0.3
            });
        if (!particlesRunning) { particlesRunning = true; animateBg(); }
    }

    function drawP(now) {
        const w = innerWidth, h = innerHeight;
        pCtx.clearRect(0, 0, w, h);
        if (!particles.length) return;
        for (const p of particles) {
            p.x += p.vx + p.drift * Math.sin(now * 0.0005 + p.phase);
            p.y += p.vy;
            if (p.y < -20) { p.y = h + 10; p.x = Math.random() * w; }
            if (p.x < -20) p.x = w + 20;
            if (p.x > w + 20) p.x = -20;
            const glow = (Math.sin(now * p.speed * 0.002 + p.phase) * 0.4 + 0.6) * p.life;
            const r = p.size * 5;
            const g = pCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            g.addColorStop(0, `rgba(0,255,136,${glow * 0.35})`);
            g.addColorStop(0.4, `rgba(0,255,136,${glow * 0.12})`);
            g.addColorStop(1, 'rgba(0,255,136,0)');
            pCtx.fillStyle = g; pCtx.beginPath(); pCtx.arc(p.x, p.y, r, 0, Math.PI * 2); pCtx.fill();
            pCtx.fillStyle = `rgba(180,255,220,${glow * 0.9})`;
            pCtx.beginPath(); pCtx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2); pCtx.fill();
        }
    }

    function animateBg(ts) {
        const now = ts || performance.now();
        drawBg(now); drawP(now);
        requestAnimationFrame(animateBg);
    }

    resizeBg(); resizeP(); animateBg();

    let rt;
    window.addEventListener('resize', () => {
        clearTimeout(rt);
        rt = setTimeout(() => { resizeBg(); resizeP(); }, 200);
    });

    /* ─── 3. Render projects from data ─── */
    (function() {
        var container = document.getElementById('projects-container');
        if (!container) return;

        var projects = window.__projects || [];
        projects.forEach(function(item, idx) {
            var card = document.createElement('div');
            card.className = 'project-card';
            if (idx > 0) { card.style.marginTop = '16px'; }
            card.innerHTML =
                '<h3><a href="' + item.gh + '" target="_blank" rel="noopener">' + item.title + '</a></h3>' +
                '<p>' + item.desc + '</p>' +
                '<div class="meta">' +
                    '<span><a href="' + item.gh + '" target="_blank" rel="noopener">' + item.gh.replace('https://', '') + ' \u2192</a></span>' +
                '</div>' +
                '<div class="project-readme">' +
                    '<div class="project-readme-loading">\u2726 \u52a0\u8f7d README \u4e2d ...</div>' +
                '</div>';
            var md = item.md;
            card.addEventListener('click', function(e) {
                if (e.target.closest('a')) return;
                var wrap = card.querySelector('.project-readme');
                if (!wrap.querySelector('.project-readme-inner')) {
                    var l = wrap.querySelector('.project-readme-loading');
                    if (l) l.remove();
                    var inner = document.createElement('div');
                    inner.className = 'project-readme-inner';
                    inner.innerHTML = marked.parse(md);
                    wrap.appendChild(inner);
                }
                card.classList.toggle('expanded');
            });
            container.appendChild(card);
        });
    })();
})();
