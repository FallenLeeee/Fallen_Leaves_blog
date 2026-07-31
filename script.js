(function() {

    /* ─── Shared: DPR cap（防高分屏掉帧）& reduced-motion ─── */
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
        lCanvas.width = w * DPR; lCanvas.height = h * DPR;
        lCanvas.style.width = w + 'px'; lCanvas.style.height = h + 'px';
        lCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
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
                initReveals();
                startTypewriter();
                if (!reduceMotion) initParticles(80);
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
        bgCanvas.width = w * DPR; bgCanvas.height = h * DPR;
        bgCanvas.style.width = w + 'px'; bgCanvas.style.height = h + 'px';
        bgCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
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
    let particles = [];

    function resizeP() {
        pCanvas.width = innerWidth * DPR; pCanvas.height = innerHeight * DPR;
        pCanvas.style.width = innerWidth + 'px'; pCanvas.style.height = innerHeight + 'px';
        pCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
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

    let bgRaf = null;
    function animateBg(ts) {
        const now = ts || performance.now();
        drawBg(now); drawP(now);
        bgRaf = requestAnimationFrame(animateBg);
    }

    resizeBg(); resizeP();
    if (reduceMotion) { drawBg(0); }
    else { bgRaf = requestAnimationFrame(animateBg); }

    let rt;
    window.addEventListener('resize', () => {
        clearTimeout(rt);
        rt = setTimeout(() => {
            resizeBg(); resizeP();
            if (reduceMotion) drawBg(0);
        }, 200);
    });

    /* 标签页隐藏时暂停 canvas 渲染 */
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (bgRaf !== null) { cancelAnimationFrame(bgRaf); bgRaf = null; }
        } else if (bgRaf === null && !reduceMotion) {
            bgRaf = requestAnimationFrame(animateBg);
        }
    });

    /* ─── 3. Render projects from data ─── */
    (function() {
        var container = document.getElementById('projects-container');
        if (!container) return;

        var projects = window.__projects || [];
        projects.forEach(function(item, idx) {
            var card = document.createElement('div');
            card.className = 'project-card reveal';
            card.style.setProperty('--reveal-delay', (idx * 100) + 'ms');
            if (idx > 0) { card.style.marginTop = '16px'; }
            card.innerHTML =
                '<h3><a href="' + item.gh + '" target="_blank" rel="noopener">' + item.title + '</a></h3>' +
                '<p>' + item.desc + '</p>' +
                '<div class="meta">' +
                    '<span><a href="' + item.gh + '" target="_blank" rel="noopener">' + item.gh.replace('https://', '') + ' →</a></span>' +
                '</div>' +
                '<div class="project-readme">' +
                    '<div class="project-readme-loading">✦ 加载 README 中 ...</div>' +
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

    /* ─── 4. Scroll reveal（IntersectionObserver 驱动，loading 结束后启动）─── */
    function initReveals() {
        const reveals = document.querySelectorAll('.reveal');
        if (reduceMotion || !('IntersectionObserver' in window)) {
            reveals.forEach(el => el.classList.add('visible'));
            return;
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach(en => {
                if (en.isIntersecting) {
                    en.target.classList.add('visible');
                    io.unobserve(en.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
        reveals.forEach((el, i) => {
            if (!el.style.getPropertyValue('--reveal-delay'))
                el.style.setProperty('--reveal-delay', (Math.min(i, 3) * 90) + 'ms');
            io.observe(el);
        });
    }

    /* ─── 5. Hero 终端打字机 ─── */
    function startTypewriter() {
        const h1 = document.querySelector('.hero h1');
        if (!h1 || reduceMotion) return;
        const text = h1.textContent;
        h1.textContent = '';
        const cursor = document.createElement('span');
        cursor.className = 'cursor';
        cursor.textContent = '▌';
        h1.appendChild(cursor);
        let i = 0;
        (function tick() {
            if (i < text.length) {
                cursor.before(document.createTextNode(text[i++]));
                setTimeout(tick, 80 + Math.random() * 70);
            }
        })();
    }

    /* ─── 6. 流萤鼠标视差（lerp 平滑，反向轻移）─── */
    (function() {
        const wrap = document.querySelector('.firefly-wrap');
        if (!wrap || reduceMotion) return;
        let tx = 0, ty = 0, cx = 0, cy = 0;
        window.addEventListener('mousemove', (e) => {
            tx = e.clientX / innerWidth - 0.5;
            ty = e.clientY / innerHeight - 0.5;
        }, { passive: true });
        (function loop() {
            cx += (tx * -14 - cx) * 0.06;
            cy += (ty * -10 - cy) * 0.06;
            wrap.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0)';
            requestAnimationFrame(loop);
        })();
    })();

    /* ─── 7. 光标聚光（照亮边框/背景）+ 距离感应 3D 按压 ─── */
    (function() {
        if (reduceMotion || window.matchMedia('(hover: none)').matches) return;

        const SPOT_SEL = '.section, .skills-section, .github-section, .project-card, .social a, .skill-tag, .github-stats a';
        const PRESS_CFG = [
            ['.social a',       { depth: 10, tilt: 6,   lift: 2 }],
            ['.skill-tag',      { depth: 8,  tilt: 7,   lift: 1 }],
            ['.project-card',   { depth: 6,  tilt: 2.5, lift: 2 }],
            ['.github-stats a', { depth: 10, tilt: 5,   lift: 1 }],
            ['.section',        { depth: 3,  tilt: 1.0, lift: 0 }],
            ['.skills-section', { depth: 2.5,tilt: 1.0, lift: 0 }],
            ['.github-section', { depth: 2.5,tilt: 1.0, lift: 0 }],
            ['.section-title',  { depth: 2,  tilt: 1.5, lift: 0 }],
            ['.about-text',     { depth: 1.5,tilt: 1.2, lift: 0 }],
            ['.skills-grid',    { depth: 1.5,tilt: 0.6, lift: 0 }]
        ];
        const SPOT_RADIUS = 560;  // 与最大渐变半径一致，超出即停写
        let targets = [];
        let mx = -10000, my = -10000, rafPending = false;

        function collect() {
            const map = new Map();
            document.querySelectorAll(SPOT_SEL).forEach(el =>
                map.set(el, { el: el, spot: true, press: null, spotOn: false, pressOn: false }));
            PRESS_CFG.forEach(function(pair) {
                document.querySelectorAll(pair[0]).forEach(el => {
                    const t = map.get(el) || { el: el, spot: false, press: null, spotOn: false, pressOn: false };
                    t.press = pair[1];
                    map.set(el, t);
                });
            });
            targets = Array.from(map.values());
            measure();
        }

        /* 缓存文档坐标下的盒模型，避免逐帧 getBoundingClientRect */
        function measure() {
            const sx = window.scrollX, sy = window.scrollY;
            for (const t of targets) {
                const r = t.el.getBoundingClientRect();
                t.left = r.left + sx; t.top = r.top + sy;
                t.w = r.width; t.h = r.height;
                t.cx = t.left + t.w / 2; t.cy = t.top + t.h / 2;
                t.R = 140 + Math.max(t.w, t.h) * 0.6;  // 按压影响半径随元素尺寸放大
            }
        }

        function update() {
            rafPending = false;
            for (const t of targets) {
                if (t.spot) {
                    /* 光标到元素盒的最近距离，超出光圈半径则跳过（仅写一次复位值） */
                    const nx = Math.max(t.left, Math.min(mx, t.left + t.w));
                    const ny = Math.max(t.top, Math.min(my, t.top + t.h));
                    const sdx = mx - nx, sdy = my - ny;
                    if (sdx * sdx + sdy * sdy < SPOT_RADIUS * SPOT_RADIUS) {
                        t.el.style.setProperty('--mx', (mx - t.left) + 'px');
                        t.el.style.setProperty('--my', (my - t.top) + 'px');
                        if (!t.spotOn) { t.el.classList.add('spot-active'); t.spotOn = true; }
                    } else if (t.spotOn) {
                        t.el.classList.remove('spot-active');
                        t.el.style.setProperty('--mx', '-600px');
                        t.el.style.setProperty('--my', '-600px');
                        t.spotOn = false;
                    }
                }
                if (t.press) {
                    const dx = mx - t.cx, dy = my - t.cy;
                    let p = 1 - Math.sqrt(dx * dx + dy * dy) / t.R;
                    /* reveal 未完成的元素不接管 transform，避免挡住入场动画 */
                    const revealed = !t.el.classList.contains('reveal') || t.el.classList.contains('visible');
                    if (!revealed || p <= 0) {
                        if (t.pressOn) { t.el.style.transform = ''; t.pressOn = false; }
                        continue;
                    }
                    p = p * p * (3 - 2 * p);  // smoothstep 衰减
                    /* 展开的 project-card 按压强度减半，避免 README 区域过大的位移 */
                    let scale = 1;
                    if (t.el.classList.contains('project-card') && t.el.classList.contains('expanded'))
                        scale = 0.35;
                    const tx = Math.max(-1, Math.min(1, dx / (t.w / 2)));
                    const ty = Math.max(-1, Math.min(1, dy / (t.h / 2)));
                    t.el.style.transform =
                        'perspective(720px) translateZ(' + (-t.press.depth * p * scale).toFixed(2) + 'px)' +
                        ' translateY(' + (-t.press.lift * p * scale).toFixed(2) + 'px)' +
                        ' rotateX(' + (-ty * t.press.tilt * p * scale).toFixed(2) + 'deg)' +
                        ' rotateY(' + (tx * t.press.tilt * p * scale).toFixed(2) + 'deg)';
                    t.pressOn = true;
                }
            }
        }

        window.addEventListener('mousemove', (e) => {
            mx = e.pageX; my = e.pageY;
            if (!rafPending) { rafPending = true; requestAnimationFrame(update); }
        }, { passive: true });

        document.addEventListener('mouseleave', () => {
            mx = my = -10000;
            for (const t of targets) {
                if (t.spotOn) {
                    t.el.classList.remove('spot-active');
                    t.el.style.setProperty('--mx', '-600px');
                    t.el.style.setProperty('--my', '-600px');
                    t.spotOn = false;
                }
                if (t.pressOn) { t.el.style.transform = ''; t.pressOn = false; }
            }
        });

        let fxRt;
        window.addEventListener('resize', () => { clearTimeout(fxRt); fxRt = setTimeout(measure, 200); });
        window.addEventListener('load', measure);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
        /* 卡片展开/收起后高度变化，过渡结束后重测 */
        const pc = document.getElementById('projects-container');
        if (pc) pc.addEventListener('click', () => setTimeout(measure, 800));

        collect();
    })();

    /* ─── 8. 触摸按压反馈（JS 驱动 .pressed，松手/取消/移出/失焦一律清除，确保回正）─── */
    (function() {
        if (window.matchMedia('(hover: hover)').matches) return;
        const PRESS_SEL = '.social a, .skill-tag, .project-card, .github-stats a, .footer a, .project-card h3 a, .project-card .meta a, .project-readme-inner a';
        document.addEventListener('pointerdown', function(e) {
            if (e.pointerType === 'mouse') return;
            const el = e.target.closest(PRESS_SEL);
            if (!el) return;
            el.classList.add('pressed');
            const clear = function() {
                el.classList.remove('pressed');
                window.removeEventListener('pointerup', clear);
                window.removeEventListener('pointercancel', clear);
                window.removeEventListener('pointerout', clear);
            };
            window.addEventListener('pointerup', clear, { passive: true });
            window.addEventListener('pointercancel', clear, { passive: true });
            window.addEventListener('pointerout', clear, { passive: true });
        }, { passive: true });
        document.addEventListener('visibilitychange', function() {
            document.querySelectorAll('.pressed').forEach(function(el) { el.classList.remove('pressed'); });
        });
    })();
})();
