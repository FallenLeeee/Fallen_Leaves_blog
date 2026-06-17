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

    /* ─── 3. Dynamic projects from md/ ─── */
    (function() {
        var container = document.getElementById('projects-container');
        if (!container) return;

        var embedded = [
            {
                file: 'PassiveMapRecorder.md',
                md: '# PassiveMapRecorder\n\n一个纯客户端的 Fabric 模组，被动记录玩家已加载区块的地形数据，直接写入存档文件。\n\n> Minecraft 1.21.11 \u00b7 Fabric Loader 0.18.4+ \u00b7 Java 21+\n\n---\n\n## \u529f\u80fd\u7279\u6027\n\n- **\u7eaf\u88ab\u52a8\u8bb0\u5f55** \u2014 \u4ec5\u5904\u7406\u670d\u52a1\u5668\u4e3b\u52a8\u63a8\u9001\u7684\u533a\u5757\u6570\u636e\u5305\uff0c\u96f6\u7f51\u7edc\u53d1\u5305\uff0c\u65e0\u6cd5\u88ab\u68c0\u6d4b\n- **\u5185\u5b58\u5b89\u5168** \u2014 \u7ebf\u7a0b\u5b89\u5168\u961f\u5217 + \u6309 tick \u9650\u901f\u5199\u5165\uff0c\u4e0d\u5361\u987f\u4e0d\u6ea2\u51fa\n- **HUD \u8fdb\u5ea6\u63d0\u793a** \u2014 \u5c4f\u5e55\u5e95\u90e8\u5c45\u4e2d\u663e\u793a\u5b9e\u65f6\u5199\u5165\u8fdb\u5ea6\uff1a\u2018\u5df2\u5199\u5165 XX / XX \u533a\u5757\uff0c\u8fdb\u5ea6 XX.X%\u2019\n- **\u5f00\u59cb\u5373\u626b\u63cf** \u2014 \u5f00\u59cb\u8bb0\u5f55\u65f6\u81ea\u52a8\u626b\u63cf\u6240\u6709\u5df2\u52a0\u8f7d\u533a\u5757\uff0c\u4e0d\u6f0f\u8bb0\u5f55\n- **\u81ea\u52a8\u53bb\u91cd** \u2014 \u540c\u4e00\u533a\u5757\u4e0d\u4f1a\u88ab\u91cd\u590d\u8bb0\u5f55\n\n## \u5b89\u88c5\n\n### \u524d\u7f6e\u8981\u6c42\n\n- Minecraft **1.21.11**\n- Fabric Loader **0.18.4+**\n- [Fabric API](https://modrinth.com/mod/fabric-api)\uff08\u5fc5\u9700\uff09\n- Java 21+\n\n### \u5b89\u88c5\u65b9\u6cd5\n\n1. \u4ece [Releases](https://github.com/passivemaprecorder/passivemaprecorder/releases) \u4e0b\u8f7d\u6700\u65b0\u7248 JAR\n2. \u653e\u5165 `.minecraft/mods/` \u76ee\u5f55\n3. \u542f\u52a8\u6e38\u620f\u5373\u53ef\n\n## \u6309\u952e\u7ed1\u5b9a\n\n| \u6309\u952e | \u529f\u80fd |\n|------|------|\n| **F6** | \u5f00\u59cb / \u505c\u6b62\u8bb0\u5f55 |\n\n## \u4f7f\u7528\u6d41\u7a0b\n\n1. \u6309 **F6** \u6253\u5f00\u5b58\u6863\u9009\u62e9\u754c\u9762 \u2192 \u9009\u62e9\u8981\u66ff\u6362\u533a\u5757\u7684\u5b58\u6863\n2. \u5f00\u59cb\u8bb0\u5f55\u540e\uff0cHUD \u663e\u793a\u5b9e\u65f6\u8fdb\u5ea6\n3. \u79fb\u52a8\u63a2\u7d22\uff0c\u5df2\u52a0\u8f7d\u533a\u5757\u81ea\u52a8\u5199\u5165\u76ee\u6807\u5b58\u6863\n4. \u6309 **F6** \u505c\u6b62\u8bb0\u5f55\n5. \u5728\u6e38\u620f\u5355\u4eba\u6a21\u5f0f\u4e2d\u52a0\u8f7d\u76ee\u6807\u5b58\u6863\u5373\u53ef\u67e5\u770b\n\n> **\u6ce8\u610f**\uff1a\u5bfc\u5165\u7684\u5b58\u6863\u4f1a\u66ff\u6362\u539f\u5b58\u6863\u7684\u533a\u5757\u6570\u636e\uff0c\u5efa\u8bae**\u5148\u5907\u4efd**\u3002\n\n## \u914d\u7f6e\u6587\u4ef6\n\n\u4f4d\u4e8e `.minecraft/config/passivemaprecorder.json`\uff0c\u9996\u6b21\u8fd0\u884c\u65f6\u81ea\u52a8\u751f\u6210\u3002\n\n```json\n{\n  \"superflatSavePath\": \"saves/passivemaprecorder_superflat\",\n  \"showChunkNotifications\": false,\n  \"verbosityLevel\": 1,\n  \"maxChunksPerTick\": 10\n}\n```\n\n| \u914d\u7f6e\u9879 | \u8bf4\u660e | \u9ed8\u8ba4\u503c |\n|--------|------|--------|\n| `superflatSavePath` | \u8d85\u5e73\u5766\u5b58\u6863\u8def\u5f84\uff08\u76f8\u5bf9 .minecraft\uff09 | `saves/passivemaprecorder_superflat` |\n| `showChunkNotifications` | \u662f\u5426\u5728\u65e5\u5fd7\u4e2d\u663e\u793a\u6bcf\u4e2a\u533a\u5757\u7684\u52a0\u8f7d\u901a\u77e5 | `false` |\n| `verbosityLevel` | \u65e5\u5fd7\u8be6\u7ec6\u7a0b\u5ea6\uff080=\u9ed8\u5959, 1=\u57fa\u672c, 2=\u8be6\u7ec6\uff09 | `1` |\n| `maxChunksPerTick` | \u6bcf tick \u6700\u591a\u5904\u7406\u7684\u533a\u5757\u6570 | `10` |\n\n## \u5f00\u6e90\u8bb8\u53ef\n\n\u672c\u9879\u76ee\u91c7\u7528 **MIT \u8bb8\u53ef\u8bc1** \u5f00\u6e90\u3002\u8be6\u89c1 [LICENSE](LICENSE) \u6587\u4ef6\u3002'
            },
            {
                file: 'UnlockVirtualization.md',
                md: '# CPU \u865a\u62df\u5316\u89e3\u9501\u5de5\u5177\n\n\u68c0\u6d4b\u5e76\u7ba1\u7406\u5360\u7528 CPU \u865a\u62df\u5316\u7684\u5e94\u7528\u7a0b\u5e8f\u548c\u670d\u52a1\u3002\n\n## \u529f\u80fd\n\n- \u626b\u63cf\u6240\u6709\u865a\u62df\u5316\u76f8\u5173\u8fdb\u7a0b\u5e76\u5206\u7c7b\u5c55\u793a\n- \u663e\u793a\u8fdb\u7a0b PID\u3001\u5185\u5b58\u5360\u7528\u3001\u7c7b\u578b\u3001\u53ef\u6267\u884c\u8def\u5f84\n- \u652f\u6301\u5355\u4e2a/\u6279\u91cf/\u5168\u90e8\u7ed3\u675f\u9009\u4e2d\u7684\u865a\u62df\u5316\u8fdb\u7a0b\n- \u5c55\u793a Windows \u865a\u62df\u5316\u76f8\u5173\u670d\u52a1\u72b6\u6001\n- \u81ea\u52a8\u63d0\u53d6\u5e76\u663e\u793a\u8fdb\u7a0b\u56fe\u6807\n- **\u6df1\u5ea6\u626b\u63cf\u6a21\u5f0f** \u2014 \u4e09\u5c42\u5185\u6838\u7ea7\u68c0\u6d4b\uff0c\u7ed5\u8fc7\u5e38\u89c4\u8fdb\u7a0b\u540d\u5339\u914d\n  - \u53ef\u6267\u884c\u8def\u5f84\u626b\u63cf\uff08\u6309\u5b89\u88c5\u76ee\u5f55\u6807\u8bb0\u5339\u914d\uff09\n  - WMI \u547d\u4ee4\u884c\u626b\u63cf\uff08\u6309\u542f\u52a8\u53c2\u6570\u5339\u914d\uff09\n  - \u7236\u8fdb\u7a0b\u94fe\u626b\u63cf\uff08\u6309\u8fdb\u7a0b\u6811\u5173\u7cfb\u9012\u5f52\u5339\u914d\uff09\n- **\u865a\u62df\u5316\u5185\u6838\u9a71\u52a8\u68c0\u6d4b** \u2014 \u901a\u8fc7 `EnumDeviceDrivers` \u679a\u4e3e\u5df2\u52a0\u8f7d\u7684\u5185\u6838\u9a71\u52a8\n- WinUI 3 \u73b0\u4ee3\u754c\u9762\uff0c\u652f\u6301 Mica \u80cc\u666f\n\n## \u7cfb\u7edf\u8981\u6c42\n\n- Windows 10 (build 17763+) / Windows 11\n\n## \u5c0f\u8bb0\n\n\u4e3b\u8981\u662f\u56e0\u4e3a\u4e4b\u524d\u88ab\u4e09\u89d2\u6d32\u7684\u865a\u62df\u5316\u5f39\u7a97\u641e\u7834\u9632\u4e86(\u660e\u660e\u6240\u6709\u865a\u62df\u5316\u8f6f\u4ef6\u548c\u670d\u52a1\u90fd\u5173\u4e86\u4e5f\u6ca1\u7528)\u5b9e\u5728\u6ca1\u62db\u5c31\u5199\u4e86\u4e2a\u5de5\u5177\u6765\u68c0\u6d4b\n\n## \u6280\u672f\u6808\n\n- .NET 8 + WinUI 3 (Windows App SDK)\n- System.Management (WMI \u8fdb\u7a0b/\u670d\u52a1\u67e5\u8be2)\n- System.Drawing.Common (\u56fe\u6807\u63d0\u53d6)\n- psapi.dll P/Invoke (`EnumDeviceDrivers` \u5185\u6838\u9a71\u52a8\u679a\u4e3e)\n\n## \u8bb8\u53ef\n\nMIT'
            }
        ];

        function renderProjects(projects) {
            projects.forEach(function(item) {
                var lines = item.md.split('\n');
                var title = '', desc = '';
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    if (line.indexOf('# ') === 0 && !title) {
                        title = line.replace('# ', '').trim();
                        continue;
                    }
                    if (title && line.trim() && line.indexOf('#') !== 0 && line.indexOf('---') !== 0 && line.indexOf('>') !== 0) {
                        desc = line.trim();
                        break;
                    }
                }
                var repoName = item.file.replace(/\.md$/i, '');
                var ghUrl = 'https://github.com/FallenLeeee/' + repoName;
                var card = document.createElement('div');
                card.className = 'project-card';
                if (container.children.length > 0) { card.style.marginTop = '16px'; }
                card.innerHTML =
                    '<h3><a href="' + ghUrl + '" target="_blank" rel="noopener">' + title + '</a></h3>' +
                    '<p>' + desc + '</p>' +
                    '<div class="meta">' +
                        '<span><a href="' + ghUrl + '" target="_blank" rel="noopener">github.com/FallenLeeee/' + repoName + ' \u2192</a></span>' +
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
        }

        fetch('md/manifest.json')
            .then(function(r) { return r.json(); })
            .then(function(files) {
                var fetched = [];
                var pending = files.length;
                if (pending === 0) { renderProjects(embedded); return; }
                files.forEach(function(filename) {
                    fetch('md/' + filename)
                        .then(function(r) { return r.text(); })
                        .then(function(md) {
                            fetched.push({ file: filename, md: md });
                            pending--;
                            if (pending === 0) {
                                container.innerHTML = '';
                                renderProjects(fetched);
                            }
                        })
                        .catch(function() {
                            pending--;
                            if (pending === 0) {
                                container.innerHTML = '';
                                renderProjects(fetched.length ? fetched : embedded);
                            }
                        });
                });
            })
            .catch(function() {
                renderProjects(embedded);
            });
    })();
})();
