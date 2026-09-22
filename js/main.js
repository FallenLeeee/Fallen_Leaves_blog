import { runLoading } from './three/loading.js?v=3';
import {
    initProjects,
    initReveals,
    startTypewriter,
    initFireflyParallax,
    initTouchPress,
    waitForCritical
} from './ui.js?v=3';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCoarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
const isNarrow = Math.min(window.innerWidth, window.innerHeight) < 640;
// 手机 / 触控 / 窄屏：走旧版 2D 栈，不加载 Three.js（带不动）
const useLegacy = isCoarse || isNarrow;

function finishDomReveal({ withBg = true } = {}) {
    initReveals();
    startTypewriter();
    if (withBg) {
        import('./legacyBg.js?v=3').then(({ startLegacyBg }) => {
            startLegacyBg({ reduceMotion });
        }).catch(() => {});
    }
    if (!window.matchMedia('(hover: none)').matches) {
        initFireflyParallax();
    }
}

function bootLegacy({ skipLoading = false } = {}) {
    if (skipLoading) {
        finishDomReveal();
        return;
    }
    // ready 等 GitHub 图 + 字体；背景不在加载中启动
    const critical = waitForCritical({ timeout: 4000 });
    runLoading({
        reduceMotion,
        ready: critical,
        onDone: () => finishDomReveal()
    });
}

function bootDesktop() {
    // 动态拉 three（与加载动画并行）
    const scenePromise = (async () => {
        const { createCore } = await import('./three/core.js');
        const { createGridField } = await import('./three/gridField.js');
        const { createFireflies } = await import('./three/fireflies.js');
        const { createCardShells } = await import('./three/cards.js');
        const { createSpotlight } = await import('./three/spotlight.js');
        const { createScrollDirector } = await import('./three/scrollDirector.js');

        const canvas = document.getElementById('webgl');
        let core;
        try {
            core = createCore(canvas);
        } catch (err) {
            console.warn('WebGL unavailable.', err);
            return { failed: true };
        }

        const { state } = core;
        const grid = createGridField(state);
        const flies = createFireflies(state);
        const cards = createCardShells(state);
        const scrollDir = createScrollDirector(state);
        const spotlight = createSpotlight();

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

        // 滚动：rAF 合并，避免每个 scroll 事件都 syncLayout
        let relayoutRaf = 0;
        window.addEventListener('scroll', () => {
            if (relayoutRaf) return;
            relayoutRaf = requestAnimationFrame(() => {
                relayoutRaf = 0;
                cards.syncLayout();
            });
        }, { passive: true });

        // 加载屏背后预热：编译着色器 + 首帧布局，避免收场瞬间卡一下
        cards.syncLayout();
        state.renderer.render(state.scene, state.camera);

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

        return {
            failed: false,
            start() {
                grid.boostIntro();
                scrollDir.initReveals();
                startTypewriter();
                initFireflyParallax();
                cards.syncLayout();
                requestAnimationFrame(frame);
            }
        };
    })().catch((err) => {
        console.warn('Three.js load failed.', err);
        return { failed: true };
    });

    // 加载动画立刻开跑；ready = 关键资源 + 场景预热
    const critical = waitForCritical({ timeout: 5000 });
    const ready = Promise.all([critical, scenePromise]).then(() => {});

    runLoading({
        reduceMotion,
        ready,
        onDone() {
            scenePromise.then((scene) => {
                if (scene.failed) {
                    // 加载屏已走完，直接补 2D 背景，不再重跑 loading
                    bootLegacy({ skipLoading: true });
                    return;
                }
                scene.start();
            });
        }
    });
}

async function boot() {
    initProjects();
    initTouchPress();

    if (useLegacy) {
        // 先开加载屏（ready 等资源），背景与 reveal 收场后再起
        bootLegacy();
        return;
    }

    bootDesktop();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
