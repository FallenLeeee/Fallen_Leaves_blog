import { createCore, reduceMotion, isTouch } from './three/core.js';
import { runLoading } from './three/loading.js';
import { createGridField } from './three/gridField.js';
import { createFireflies } from './three/fireflies.js';
import { createCardShells } from './three/cards.js';
import { createSpotlight } from './three/spotlight.js';
import { createScrollDirector } from './three/scrollDirector.js';
import {
    initProjects,
    startTypewriter,
    initFireflyParallax,
    initTouchPress
} from './ui.js';

function boot() {
    initProjects();
    initTouchPress();

    const canvas = document.getElementById('webgl');
    let core = null;
    let grid = null;
    let flies = null;
    let cards = null;
    let scrollDir = null;
    let spotlight = null;

    try {
        core = createCore(canvas);
    } catch (err) {
        console.warn('WebGL unavailable, falling back to DOM-only.', err);
        document.body.classList.add('no-webgl');
        canvas.style.display = 'none';
    }

    if (core) {
        const { state } = core;
        grid = createGridField(state);
        flies = createFireflies(state);
        cards = createCardShells(state);
        scrollDir = createScrollDirector(state);
        spotlight = createSpotlight();

        window.addEventListener('mousemove', (e) => {
            state.mouse.x = e.clientX;
            state.mouse.y = e.clientY;
            state.mouse.nx = (e.clientX / window.innerWidth) * 2 - 1;
            state.mouse.ny = -((e.clientY / window.innerHeight) * 2 - 1);
        }, { passive: true });

        window.addEventListener('cards-relayout', () => {
            cards.syncLayout();
            spotlight?.remeasure();
        });

        window.addEventListener('scroll', () => {
            cards.syncLayout();
        }, { passive: true });

        let last = performance.now();
        function frame(now) {
            if (!state.running) return;
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            state.time = now * 0.001;

            grid.update(state.time, dt);
            flies.update(state.time, dt);
            cards.update(state.time, dt, state.mouse);
            scrollDir.update(state.time, dt);

            if (state.useBloom) state.composer.render();
            else state.renderer.render(state.scene, state.camera);

            requestAnimationFrame(frame);
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                state.running = false;
            } else if (!state.running) {
                state.running = true;
                last = performance.now();
                requestAnimationFrame(frame);
            }
        });

        // 加载完成后启动场景
        runLoading({
            reduceMotion,
            onDone() {
                grid.boostIntro();
                scrollDir.initReveals();
                startTypewriter();
                initFireflyParallax();
                cards.syncLayout();
                requestAnimationFrame(frame);
            }
        });
    } else {
        // 无 WebGL：仍走加载与 reveal
        runLoading({
            reduceMotion,
            onDone() {
                document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
                startTypewriter();
                initFireflyParallax();
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
