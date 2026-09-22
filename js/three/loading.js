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

const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;

/**
 * 原版点阵瀑布加载。移动端：DPR=1、大格、30fps、遮罩仅在百分比变化时重算。
 * progress 到 100% 后仍等 ready 再收场。
 */
export function runLoading({ reduceMotion, ready, onDone }) {
    const screen = document.getElementById('loadingScreen');
    const canvas = document.getElementById('loadingGrid');
    const ui = document.getElementById('ui');
    if (!screen || !canvas || !ui) {
        onDone?.();
        return;
    }

    if (reduceMotion) {
        screen.classList.add('fade-out');
        setTimeout(() => {
            screen.classList.add('hidden');
            onDone?.();
        }, 200);
        return;
    }

    const dpr = coarse ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    const frameMs = coarse ? 1000 / 30 : 0;
    const ctx = canvas.getContext('2d', { alpha: false });
    let progress = 0;
    let phase = 'load';
    let dismissStart = 0;
    let cell = 16;
    let cols = 0;
    let rows = 0;
    let speeds = null;
    let phasesArr = null;
    let raf = 0;
    let disposed = false;
    let readyResolved = false;
    let lastText = '';
    let lastMaskText = '';
    let masked = null;
    let lastDraw = 0;
    let dotSz = 6;

    if (ready && typeof ready.then === 'function') {
        ready.then(() => { readyResolved = true; }).catch(() => { readyResolved = true; });
    } else {
        readyResolved = true;
    }
    setTimeout(() => { readyResolved = true; }, 7000);

    function resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cell = (coarse || w < 600) ? 20 : 16;
        cols = Math.ceil(w / cell);
        rows = Math.ceil(h / cell);
        dotSz = w < 600 ? 4 : 6;
        const n = cols * rows;
        speeds = new Float32Array(n);
        phasesArr = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            speeds[i] = 0.002 + Math.random() * 0.005;
            phasesArr[i] = Math.random() * Math.PI * 2;
        }
        lastText = '';
        lastMaskText = '';
        masked = null;
    }

    function buildMask(text, w, h) {
        const covered = new Set();
        const n = text.length;
        const charW = 5 * dotSz;
        const charH = 7 * dotSz;
        const mx = 6;
        const gap = mx * 2;
        const totalW = n * charW + (n - 1) * gap + mx * 2;
        const startX = (w - totalW) / 2;
        const startY = (h - charH) / 2;
        const pad = Math.max(1, Math.floor(dotSz * 0.2));

        for (let i = 0; i < n; i++) {
            const map = font[text[i]];
            if (!map) continue;
            const cX = startX + mx + i * (charW + gap);
            for (let row = 0; row < 7; row++) {
                for (let col = 0; col < 5; col++) {
                    if (map[row][col] !== '1') continue;
                    const sx = cX + col * dotSz - pad;
                    const sy = startY + row * dotSz - pad;
                    const ex = sx + dotSz + pad * 2;
                    const ey = sy + dotSz + pad * 2;
                    const sc = Math.floor(sx / cell);
                    const ec = Math.floor((ex - 1) / cell);
                    const sr = Math.floor(sy / cell);
                    const er = Math.floor((ey - 1) / cell);
                    for (let gr = sr; gr <= er; gr++) {
                        for (let gc = sc; gc <= ec; gc++) {
                            if (gr >= 0 && gr < rows && gc >= 0 && gc < cols) {
                                covered.add(gr + ',' + gc);
                            }
                        }
                    }
                }
            }
        }
        return covered;
    }

    function ensureMask(text, w, h) {
        const need = (phase === 'load' && progress >= 0.45) || phase === 'dismiss';
        if (!need) {
            masked = null;
            lastMaskText = '';
            return;
        }
        if (text !== lastMaskText || !masked) {
            masked = buildMask(text, w, h);
            lastMaskText = text;
        }
    }

    function renderDigits(text) {
        if (text === lastText) return;
        lastText = text;
        ui.textContent = '';
        for (const ch of text) {
            const d = document.createElement('div');
            d.className = 'digit';
            const map = font[ch];
            const frag = document.createDocumentFragment();
            for (let y = 0; y < 7; y++) {
                for (let x = 0; x < 5; x++) {
                    const dot = document.createElement('div');
                    dot.className = (map && map[y][x] === '1') ? 'dot on' : 'dot';
                    frag.appendChild(dot);
                }
            }
            d.appendChild(frag);
            ui.appendChild(d);
        }
    }

    function finish() {
        if (disposed) return;
        disposed = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        screen.classList.add('fade-out');
        setTimeout(() => {
            screen.classList.add('hidden');
            onDone?.();
        }, 800);
    }

    const alphaCache = [];
    function cachedAlpha(a) {
        const q = Math.min(12, Math.max(1, Math.round(a * 12)));
        return alphaCache[q] || (alphaCache[q] = 'rgba(255,255,255,' + (q / 12).toFixed(3) + ')');
    }

    function tick(now) {
        if (disposed) return;
        raf = requestAnimationFrame(tick);

        if (frameMs && now - lastDraw < frameMs) return;
        const dt = lastDraw ? Math.min(100, now - lastDraw) : 16;
        lastDraw = now;

        const w = window.innerWidth;
        const h = window.innerHeight;

        let loadScan = 0;
        let offScan = 0;

        if (phase === 'load') {
            const stepPerSec = coarse ? 0.55 : 0.85;
            if (progress < 1) {
                progress = Math.min(1, progress + (dt / 1000) * stepPerSec);
            }
            if (progress >= 1 && readyResolved) {
                phase = 'dismiss';
                dismissStart = performance.now();
            }
            loadScan = progress * h;
        } else {
            const t = (now - dismissStart) / 1000;
            loadScan = h;
            offScan = t * h * 1.2;
        }

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        const text = Math.floor(progress * 100) + '%';
        ensureMask(text, w, h);
        renderDigits(text);

        for (let r = 0; r < rows; r++) {
            const y = r * cell;
            if (y >= loadScan) break;
            if (phase === 'dismiss' && y <= offScan) continue;
            for (let c = 0; c < cols; c++) {
                if (masked && masked.has(r + ',' + c)) continue;
                const i = r * cols + c;
                const flick = Math.sin(now * speeds[i] + phasesArr[i]);
                const b = flick * 0.5 + 0.5;
                let fade = 1;
                if (phase === 'dismiss') fade = 1 - Math.min(1, offScan / h);
                const alpha = (0.1 + b * 0.4) * fade;
                if (alpha <= 0.02) continue;
                ctx.fillStyle = cachedAlpha(alpha);
                ctx.fillRect(c * cell, y, cell - 2, cell - 2);
            }
        }

        if (phase === 'load') return;
        if (offScan < h) return;
        finish();
    }

    window.addEventListener('resize', resize);
    resize();
    raf = requestAnimationFrame(tick);
}
