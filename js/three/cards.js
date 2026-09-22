import * as THREE from 'three';
import { reduceMotion, isTouch } from './core.js';

/**
 * 距离感应 3D 按压。
 * 3D 打在 .card-inner（视觉层），.project-card 只做稳定命中盒。
 */
export function createCardShells(state) {
    const group = new THREE.Group();
    state.scene.add(group);
    const shells = [];
    const extras = [];

    const WEAK_CFG = [
        { sel: '.social a', depth: 10, tilt: 6, lift: 2, R: 280 },
        { sel: '.skill-tag', depth: 8, tilt: 5, lift: 1.5, R: 220 },
        { sel: '.github-stats a', depth: 10, tilt: 5, lift: 1.5, R: 320 },
        { sel: '.section:not(#projects-section), .skills-section, .github-section', depth: 3, tilt: 1.2, lift: 0, R: 420 },
        { sel: '.section-title', depth: 2, tilt: 1.5, lift: 0, R: 260 },
        { sel: '.about-text', depth: 1.5, tilt: 1.0, lift: 0, R: 280 },
        { sel: '.skills-grid', depth: 1.5, tilt: 0.8, lift: 0, R: 280 }
    ];
    const CARD_CFG = { depth: 8, tilt: 4.5, lift: 2.5, R: 300 };

    function bindDomCards() {
        while (group.children.length) {
            const c = group.children[0];
            group.remove(c);
            c.traverse?.(n => {
                n.geometry?.dispose?.();
                n.material?.dispose?.();
            });
        }
        shells.length = 0;
        extras.length = 0;

        document.querySelectorAll('.project-card').forEach((el) => {
            let inner = el.querySelector('.card-inner');
            let frame = el.querySelector('.card-frame');
            let body = el.querySelector('.card-body');
            if (!inner) {
                inner = document.createElement('div');
                inner.className = 'card-inner';
                while (el.firstChild) inner.appendChild(el.firstChild);
                el.appendChild(inner);
            }
            if (!frame) {
                frame = document.createElement('div');
                frame.className = 'card-frame';
                inner.prepend(frame);
            }
            if (!body) {
                body = document.createElement('div');
                body.className = 'card-body';
                while (inner.firstChild !== frame && inner.firstChild) {
                    // keep frame first; move rest into body if needed
                    break;
                }
                if (!inner.querySelector('.card-body')) {
                    body = document.createElement('div');
                    body.className = 'card-body';
                    while (frame.nextSibling) body.appendChild(frame.nextSibling);
                    inner.appendChild(body);
                } else {
                    body = inner.querySelector('.card-body');
                }
            }

            const geo = new THREE.PlaneGeometry(1, 1);
            const mat = new THREE.MeshBasicMaterial({
                color: 0x0c1210,
                transparent: true,
                opacity: 0.08,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.userData.press = 0;
            mesh.userData.baseX = 0;
            mesh.userData.baseY = 0;
            mesh.userData.baseSX = 1;
            mesh.userData.baseSY = 1;
            group.add(mesh);
            shells.push({ mesh, el, inner, frame, body, rect: null, cfg: CARD_CFG });
        });

        WEAK_CFG.forEach((cfg) => {
            document.querySelectorAll(cfg.sel).forEach((el) => {
                if (el.classList.contains('project-card') || el.closest('.project-card')) return;
                if (el.id === 'projects-section' || el.querySelector('.project-card')) return;
                extras.push({ el, press: 0, rect: null, cfg });
            });
        });
    }

    function measure(el) {
        const r = el.getBoundingClientRect();
        return {
            left: r.left,
            top: r.top,
            w: r.width,
            h: r.height,
            cx: r.left + r.width / 2,
            cy: r.top + r.height / 2
        };
    }

    function syncLayout() {
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const camZ = state.camera.position.z;
        const fov = THREE.MathUtils.degToRad(state.camera.fov);
        const worldH = 2 * Math.tan(fov / 2) * camZ;
        const worldW = worldH * (vw / vh);

        for (const s of shells) {
            // 量外层命中盒（无 transform），避免反馈
            const r = measure(s.el);
            const nx = (r.cx / vw) * 2 - 1;
            const ny = -((r.cy / vh) * 2 - 1);
            s.mesh.userData.baseX = (nx * worldW) / 2;
            s.mesh.userData.baseY = (ny * worldH) / 2;
            s.mesh.userData.baseSX = (r.w / vw) * worldW;
            s.mesh.userData.baseSY = (r.h / vh) * worldH;
            s.rect = r;
        }
        for (const e of extras) {
            e.rect = measure(e.el);
        }
    }

    function pressParams(mouse, r, scale, R0) {
        if (!mouse || mouse.x <= -9000 || !r) return { p: 0, tx: 0, ty: 0 };
        const dx = mouse.x - r.cx;
        const dy = mouse.y - r.cy;
        const R = (R0 || 240) + Math.max(r.w, r.h) * 0.55;
        let p = 1 - Math.hypot(dx, dy) / R;
        if (p < 0) p = 0;
        p = p * p * (3 - 2 * p) * scale;
        const tx = Math.max(-1, Math.min(1, dx / Math.max(8, r.w / 2)));
        const ty = Math.max(-1, Math.min(1, dy / Math.max(8, r.h / 2)));
        return { p, tx, ty };
    }

    function applyTransform(el, cfg, press, tx, ty, scale) {
        el.style.transform =
            'translateY(' + (-cfg.lift * press * scale).toFixed(2) + 'px)' +
            ' translateZ(' + (-cfg.depth * press * scale).toFixed(2) + 'px)' +
            ' rotateX(' + (-ty * cfg.tilt * press * scale).toFixed(2) + 'deg)' +
            ' rotateY(' + (tx * cfg.tilt * press * scale).toFixed(2) + 'deg)';
    }

    function update(t, dt, mouse) {
        const enable3d = !reduceMotion && !isTouch;
        syncLayout();

        for (const s of shells) {
            try {
                const u = s.mesh.userData;
                const r = s.rect;
                if (!r) continue;

                const expScale = s.el.classList.contains('expanded') ? 0.35 : 1;
                const cfg = s.cfg;
                const { p, tx, ty } = pressParams(mouse, r, enable3d ? expScale : 0, cfg.R);
                u.press += (p - u.press) * Math.min(1, dt * 10);
                const press = u.press;

                s.mesh.position.set(u.baseX, u.baseY + press * 0.03, press * 0.08);
                s.mesh.rotation.x = enable3d ? -ty * 0.05 * press : 0;
                s.mesh.rotation.y = enable3d ? tx * 0.05 * press : 0;
                s.mesh.scale.set(u.baseSX, u.baseSY, 1);
                if (s.mesh.material) s.mesh.material.opacity = 0.06 + press * 0.06;

                // 3D 只打在 .card-inner，外层 .project-card 不动 → 点击稳定
                if (enable3d && press > 0.001) {
                    applyTransform(s.inner, cfg, press, tx, ty, expScale);
                } else if (s.inner) {
                    s.inner.style.transform = '';
                }

                if (mouse && mouse.x > -9000) {
                    const mx = mouse.x - r.left;
                    const my = mouse.y - r.top;
                    const sd = Math.hypot(mouse.x - r.cx, mouse.y - r.cy);
                    if (sd < 640) {
                        s.el.style.setProperty('--mx', mx + 'px');
                        s.el.style.setProperty('--my', my + 'px');
                        s.el.classList.add('spot-active');
                    } else if (s.el.classList.contains('spot-active')) {
                        s.el.classList.remove('spot-active');
                        s.el.style.setProperty('--mx', '-600px');
                        s.el.style.setProperty('--my', '-600px');
                    }
                }
            } catch (_) { /* 单卡失败不影响其它 */ }
        }

        for (const e of extras) {
            try {
                const r = e.rect;
                if (!r) continue;
                const { p, tx, ty } = pressParams(mouse, r, enable3d ? 1 : 0, e.cfg.R);
                e.press += (p - e.press) * Math.min(1, dt * 10);
                if (enable3d && e.press > 0.001) {
                    applyTransform(e.el, e.cfg, e.press, tx, ty, 1);
                } else {
                    e.el.style.transform = '';
                }

                if (mouse && mouse.x > -9000 && !e.el.classList.contains('about-text') && !e.el.classList.contains('skills-grid') && !e.el.classList.contains('section-title')) {
                    const mx = mouse.x - r.left;
                    const my = mouse.y - r.top;
                    const sd = Math.hypot(mouse.x - r.cx, mouse.y - r.cy);
                    if (sd < 640) {
                        e.el.style.setProperty('--mx', mx + 'px');
                        e.el.style.setProperty('--my', my + 'px');
                        e.el.classList.add('spot-active');
                    } else if (e.el.classList.contains('spot-active')) {
                        e.el.classList.remove('spot-active');
                        e.el.style.setProperty('--mx', '-600px');
                        e.el.style.setProperty('--my', '-600px');
                    }
                }
            } catch (_) { /* ignore */ }
        }
    }

    bindDomCards();
    syncLayout();

    return { group, shells, extras, bindDomCards, syncLayout, update };
}
