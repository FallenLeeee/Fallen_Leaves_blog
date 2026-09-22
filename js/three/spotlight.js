/**
 * DOM 层光标聚光：给 section / social / skill / github 写 --mx/--my。
 * 卡片聚光在 cards.js 内处理。
 */
export function createSpotlight() {
    const SEL = '.section, .skills-section, .github-section, .social a, .skill-tag, .github-stats a, .project-card';
    const SPOT_RADIUS = 640;
    let targets = [];
    let mx = -10000, my = -10000;

    function measure() {
        const sx = window.scrollX, sy = window.scrollY;
        for (const t of targets) {
            const r = t.el.getBoundingClientRect();
            t.left = r.left + sx;
            t.top = r.top + sy;
            t.w = r.width;
            t.h = r.height;
            t.cx = t.left + t.w / 2;
            t.cy = t.top + t.h / 2;
        }
    }

    function collect() {
        targets = Array.from(document.querySelectorAll(SEL)).map(el => ({
            el, spotOn: false
        }));
        measure();
    }

    function update() {
        for (const t of targets) {
            const nx = Math.max(t.left, Math.min(mx, t.left + t.w));
            const ny = Math.max(t.top, Math.min(my, t.top + t.h));
            const sdx = mx - nx, sdy = my - ny;
            if (sdx * sdx + sdy * sdy < SPOT_RADIUS * SPOT_RADIUS) {
                t.el.style.setProperty('--mx', (mx - t.left) + 'px');
                t.el.style.setProperty('--my', (my - t.top) + 'px');
                if (!t.spotOn) {
                    t.el.classList.add('spot-active');
                    t.spotOn = true;
                }
            } else if (t.spotOn) {
                t.el.classList.remove('spot-active');
                t.el.style.setProperty('--mx', '-600px');
                t.el.style.setProperty('--my', '-600px');
                t.spotOn = false;
            }
        }
    }

    function onMove(e) {
        mx = e.pageX;
        my = e.pageY;
        update();
    }

    function clear() {
        mx = my = -10000;
        for (const t of targets) {
            if (t.spotOn) {
                t.el.classList.remove('spot-active');
                t.el.style.setProperty('--mx', '-600px');
                t.el.style.setProperty('--my', '-600px');
                t.spotOn = false;
            }
        }
    }

    const enable = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        && !window.matchMedia('(hover: none)').matches;

    if (enable) {
        collect();
        window.addEventListener('mousemove', onMove, { passive: true });
        document.addEventListener('mouseleave', clear);
        let rt;
        window.addEventListener('resize', () => {
            clearTimeout(rt);
            rt = setTimeout(measure, 200);
        });
        window.addEventListener('load', measure);
    }

    return {
        remeasure: () => { collect(); },
        update
    };
}
