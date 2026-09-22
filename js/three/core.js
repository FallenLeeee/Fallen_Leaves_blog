import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export const DPR = Math.min(window.devicePixelRatio || 1, 2);
export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isTouch = window.matchMedia('(hover: none)').matches;

export function createCore(canvas) {
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(DPR);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x050505, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.035);

    const camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );
    camera.position.set(0, 0, 8);

    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(DPR);
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.addPass(new RenderPass(scene, camera));

    const bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.15,
        0.45,
        0.95
    );
    // 移动端 / 减弱动态：关掉 Bloom，保底可读
    const useBloom = false; // 视觉干净优先，关掉 Bloom

    const state = {
        renderer,
        scene,
        camera,
        composer,
        bloom,
        useBloom,
        time: 0,
        scroll: 0,
        mouse: { x: 0, y: 0, nx: 0, ny: 0 },
        running: true
    };

    function resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h);
        composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        composer.setSize(w, h);
        bloom.setSize(w, h);
    }

    window.addEventListener('resize', () => {
        clearTimeout(state._rt);
        state._rt = setTimeout(resize, 150);
    });

    return { state, resize };
}
