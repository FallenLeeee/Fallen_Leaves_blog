/**
 * 旧版 2D 背景点阵：手机/触控专用，刻意压负载。
 * - DPR 锁 1、格子加大、预计算 fade
 * - 渐变+静态格只画一次缓存，每帧只贴缓存再刷闪烁格
 * - 粗指针 ~24fps
 */
export function startLegacyBg({ reduceMotion = false } = {}) {
    document.body.classList.add('no-webgl', 'legacy-bg');
    const webgl = document.getElementById('webgl');
    if (webgl) webgl.style.display = 'none';

    let canvas = document.getElementById('bgCanvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'bgCanvas';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.insertBefore(canvas, document.body.firstChild);
    }

    const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    const ctx = canvas.getContext('2d', { alpha: false });
    const base = document.createElement('canvas');
    const bctx = base.getContext('2d', { alpha: false });

    let cell = 22;
    let cols = 0;
    let rows = 0;
    let speeds = null;
    let phases = null;
    let fades = null;
    let raf = 0;
    let running = true;
    let lastDraw = 0;
    let scrolling = false;
    let scrollTimer = 0;
    const frameMs = coarse ? 1000 / 24 : 1000 / 30;

    function rebuild(w, h) {
        cell = w < 600 ? 22 : 18;
        cols = Math.ceil(w / cell) + 1;
        rows = Math.ceil(h / cell) + 1;
        const n = cols * rows;
        speeds = new Float32Array(n);
        phases = new Float32Array(n);
        fades = new Float32Array(n);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const i = r * cols + c;
                const nx = c / cols;
                const ny = 1 - r / rows;
                // 介于 1.4（右侧切掉）和 0.85（铺太满）之间
                const d = Math.sqrt(nx * nx + (1 - ny) * (1 - ny));
                fades[i] = Math.max(0, 1 - d * 1.15);
                speeds[i] = 0.002 + Math.random() * 0.006;
                phases[i] = Math.random() * Math.PI * 2;
            }
        }
    }

    function paintBase(w, h) {
        bctx.setTransform(1, 0, 0, 1, 0, 0);
        bctx.fillStyle = '#050505';
        bctx.fillRect(0, 0, w, h);

        const s = cell * 0.85;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const fade = fades[r * cols + c];
                if (fade <= 0.02) continue;
                // 按 fade 连续透明度，避免阈值一刀切出硬边
                bctx.fillStyle = 'rgba(255,255,255,' + (0.02 + fade * 0.14).toFixed(3) + ')';
                bctx.fillRect(
                    c * cell + (cell - s) / 2,
                    r * cell + (cell - s) / 2,
                    s,
                    s
                );
            }
        }

        const grad = bctx.createRadialGradient(
            w * 0.2, h * 0.8, 0,
            w * 0.2, h * 0.8, Math.max(w, h) * 0.9
        );
        grad.addColorStop(0, 'rgba(5,5,5,0.9)');
        grad.addColorStop(0.5, 'rgba(5,5,5,0.55)');
        grad.addColorStop(1, 'rgba(5,5,5,0.25)');
        bctx.fillStyle = grad;
        bctx.fillRect(0, 0, w, h);
    }

    function resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        base.width = w;
        base.height = h;
        rebuild(w, h);
        paintBase(w, h);
        ctx.drawImage(base, 0, 0);
        lastDraw = 0;
    }

    const alphaCache = [];
    function cachedAlpha(a) {
        const q = Math.min(15, Math.max(1, Math.round(a * 15)));
        return alphaCache[q] || (alphaCache[q] = 'rgba(255,255,255,' + (q / 15).toFixed(3) + ')');
    }

    function draw(now) {
        if (!running) return;
        raf = requestAnimationFrame(draw);
        if (now - lastDraw < frameMs) return;
        lastDraw = now;

        ctx.drawImage(base, 0, 0);
        // 滚动中也继续闪烁，不暂停
        if (reduceMotion || !fades) return;

        const s = cell * 0.85;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const i = r * cols + c;
                const fade = fades[i];
                if (fade <= 0.12) continue;
                const flick = Math.sin(now * speeds[i] + phases[i]);
                const b = Math.max(0, Math.min(1, flick * 0.6 + 0.4));
                const alpha = fade * b * 0.4;
                if (alpha <= 0.03) continue;
                ctx.fillStyle = cachedAlpha(alpha);
                ctx.fillRect(
                    c * cell + (cell - s) / 2,
                    r * cell + (cell - s) / 2,
                    s,
                    s
                );
            }
        }
    }

    let resizeTimer = 0;
    function onResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 200);
    }

    function onScroll() {
        scrolling = true;
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(function () { scrolling = false; }, 160);
    }

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            running = false;
            cancelAnimationFrame(raf);
        } else if (!running) {
            running = true;
            lastDraw = 0;
            raf = requestAnimationFrame(draw);
        }
    });

    resize();
    raf = requestAnimationFrame(draw);

    return {
        stop() {
            running = false;
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', onResize);
        }
    };
}
