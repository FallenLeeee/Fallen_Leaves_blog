/**
 * DOM 交互：项目列表、README 展开、打字机、触摸按压、滚动 reveal。
 * 点击用容器代理，避免 3D 变换影响命中。
 */

export function initReveals() {
    const reveals = document.querySelectorAll('.reveal');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
        if (!el.style.getPropertyValue('--reveal-delay')) {
            const step = window.matchMedia('(hover: none)').matches ? 40 : 90;
            el.style.setProperty('--reveal-delay', (Math.min(i, 3) * step) + 'ms');
        }
        io.observe(el);
    });
}

export function initProjects() {
    const container = document.getElementById('projects-container');
    if (!container) return;

    const projects = window.__projects || [];
    const entries = projects.map((item, idx) => {
        const card = document.createElement('div');
        card.className = 'project-card reveal';
        card.style.setProperty('--reveal-delay', (idx * 100) + 'ms');
        card.innerHTML =
            '<div class="card-inner">' +
                '<div class="card-frame" aria-hidden="true"></div>' +
                '<div class="card-body">' +
                    '<h3><a href="' + item.gh + '" target="_blank" rel="noopener">' + item.title + '</a></h3>' +
                    '<p>' + item.desc + '</p>' +
                    '<div class="meta">' +
                        '<span><a href="' + item.gh + '" target="_blank" rel="noopener">' + item.gh.replace('https://', '') + ' →</a></span>' +
                    '</div>' +
                    '<div class="project-readme">' +
                        '<div class="rm-collapse">' +
                            '<div class="project-readme-loading">✦ 加载 README 中 ...</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        container.appendChild(card);
        return { card, md: item.md, parsed: null };
    });

    function parseMd(md) {
        return (typeof marked !== 'undefined')
            ? marked.parse(md)
            : '<pre>' + md.replace(/[<>&]/g, s => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[s])) + '</pre>';
    }

    // 空闲预解析：点击时不再同步跑 marked
    const parseAll = () => {
        entries.forEach((entry) => {
            if (entry.parsed == null) entry.parsed = parseMd(entry.md || '');
        });
    };
    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(parseAll, { timeout: 2000 });
    } else {
        setTimeout(parseAll, 400);
    }

    function ensureReadme(entry) {
        const host = entry.card.querySelector('.project-readme .rm-collapse');
        if (!host || host.querySelector('.project-readme-inner')) return;
        if (entry.parsed == null) entry.parsed = parseMd(entry.md || '');
        host.textContent = '';
        const inner = document.createElement('div');
        inner.className = 'project-readme-inner';
        inner.innerHTML = entry.parsed;
        host.appendChild(inner);
    }

    container.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        const card = e.target.closest('.project-card');
        if (!card || !container.contains(card)) return;
        const entry = entries.find((x) => x.card === card);
        if (!entry) return;

        const willExpand = !card.classList.contains('expanded');
        if (willExpand) ensureReadme(entry);
        card.classList.toggle('expanded', willExpand);

        // 触控无 3D cards，跳过 relayout
        if (!window.matchMedia('(hover: none)').matches) {
            window.dispatchEvent(new Event('cards-relayout'));
        }
    });
}

export function startTypewriter() {
    const h1 = document.querySelector('.hero h1');
    if (!h1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const text = h1.textContent;
    h1.textContent = '';
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    cursor.textContent = '▌';
    h1.appendChild(cursor);
    const isTouch = window.matchMedia('(hover: none)').matches;
    const base = isTouch ? 45 : 80;
    let i = 0;
    (function tick() {
        if (i < text.length) {
            cursor.before(document.createTextNode(text[i++]));
            setTimeout(tick, base + Math.random() * (isTouch ? 40 : 70));
        } else if (isTouch) {
            cursor.remove();
        }
    })();
}

export function initFireflyParallax() {
    const wrap = document.querySelector('.firefly-wrap');
    if (!wrap) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(hover: none)').matches) return;

    let tx = 0, ty = 0, cx = 0, cy = 0;
    window.addEventListener('mousemove', (e) => {
        tx = e.clientX / window.innerWidth - 0.5;
        ty = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });

    (function loop() {
        cx += (tx * -14 - cx) * 0.06;
        cy += (ty * -10 - cy) * 0.06;
        wrap.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0)';
        requestAnimationFrame(loop);
    })();
}

export function initTouchPress() {
    if (window.matchMedia('(hover: hover)').matches) return;
    const PRESS_SEL = '.social a, .skill-tag, .project-card, .github-stats a, .footer a, .project-card h3 a, .project-card .meta a, .project-readme-inner a';
    document.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse') return;
        const el = e.target.closest(PRESS_SEL);
        if (!el) return;
        el.classList.add('pressed');
        const clear = function () {
            el.classList.remove('pressed');
            window.removeEventListener('pointerup', clear);
            window.removeEventListener('pointercancel', clear);
            window.removeEventListener('pointerout', clear);
        };
        window.addEventListener('pointerup', clear, { passive: true });
        window.addEventListener('pointercancel', clear, { passive: true });
        window.addEventListener('pointerout', clear, { passive: true });
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
        document.querySelectorAll('.pressed').forEach(el => el.classList.remove('pressed'));
    });
}

/**
 * 加载屏期间必须就绪的关键资源：GitHub 统计图、字体。
 * 超时兜底，避免第三方挂了卡死加载。
 */
export function waitForCritical({ timeout = 5000 } = {}) {
    const imgs = Array.from(document.querySelectorAll('.github-stats img'));
    imgs.forEach((img) => {
        img.loading = 'eager';
        if (!img.complete && img.getAttribute('src')) {
            // 触发已 lazy 的图立即拉取
            const src = img.getAttribute('src');
            img.removeAttribute('src');
            img.setAttribute('src', src);
        }
    });

    const imgDone = Promise.all(imgs.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
        });
    }));

    const fontDone = (document.fonts && document.fonts.ready)
        ? document.fonts.ready.catch(() => {})
        : Promise.resolve();

    const ready = Promise.all([imgDone, fontDone]).then(() => {});
    const budget = new Promise((resolve) => setTimeout(resolve, timeout));

    return Promise.race([ready, budget]);
}
