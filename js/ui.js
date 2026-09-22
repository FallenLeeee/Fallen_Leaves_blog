/**
 * DOM 交互：项目列表、README 展开、打字机、触摸按压。
 * 点击用容器代理，避免 3D 变换影响命中。
 */
export function initProjects() {
    const container = document.getElementById('projects-container');
    if (!container) return;

    const projects = window.__projects || [];
    projects.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'project-card reveal';
        card.dataset.md = item.md;
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
                        '<div class="project-readme-loading">✦ 加载 README 中 ...</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        container.appendChild(card);
    });

    // 容器代理：只要点到卡内非链接区域就展开
    container.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        const card = e.target.closest('.project-card');
        if (!card || !container.contains(card)) return;

        const wrap = card.querySelector('.project-readme');
        if (wrap && !wrap.querySelector('.project-readme-inner')) {
            const l = wrap.querySelector('.project-readme-loading');
            if (l) l.remove();
            const inner = document.createElement('div');
            inner.className = 'project-readme-inner';
            const md = card.dataset.md || '';
            inner.innerHTML = (typeof marked !== 'undefined')
                ? marked.parse(md)
                : '<pre>' + md.replace(/[<>&]/g, s => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[s])) + '</pre>';
            wrap.appendChild(inner);
        }
        card.classList.toggle('expanded');
        window.dispatchEvent(new Event('cards-relayout'));
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
    let i = 0;
    (function tick() {
        if (i < text.length) {
            cursor.before(document.createTextNode(text[i++]));
            setTimeout(tick, 80 + Math.random() * 70);
        }
    })();
}

export function initFireflyParallax() {
    const wrap = document.querySelector('.firefly-wrap');
    if (!wrap) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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
