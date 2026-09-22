import { reduceMotion } from './core.js';
import { initReveals as initRevealsDOM } from '../ui.js';

/**
 * 滚动编排：只跟 scroll，不做鼠标视差（背景网格要求不参与）。
 */
export function createScrollDirector(state) {
    let progress = 0;
    let targetCamY = 0;

    function onScroll() {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        progress = window.scrollY / max;
        state.scroll = progress;
        targetCamY = -progress * 0.35;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    function initReveals() {
        initRevealsDOM();
    }

    function update(t, dt) {
        if (reduceMotion) return;
        // 仅滚动驱动相机，鼠标不挪相机
        state.camera.position.y += (targetCamY - state.camera.position.y) * Math.min(1, dt * 3);
        state.camera.position.x = 0;
        state.camera.lookAt(0, state.camera.position.y * 0.2, 0);
    }

    return {
        initReveals,
        update,
        get progress() { return progress; }
    };
}
