import * as THREE from 'three';
import { reduceMotion } from './core.js';

/**
 * 背景白色点阵 —— 全屏 shader，按当前视口 UV 实时算格子与左上角衰减。
 * 顶点直接输出裁剪坐标，不受相机 / 鼠标视差 / 滚动影响。
 */
export function createGridField(state) {
    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.NormalBlending,
        uniforms: {
            uTime: { value: 0 },
            uIntro: { value: 0 },
            uRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
        },
        vertexShader: /* glsl */`
            varying vec2 vUv;
            void main() {
                vUv = uv;
                // 裁剪空间全屏，与 resolution 实时绑定
                gl_Position = vec4(position.xy, 0.0, 1.0);
            }
        `,
        fragmentShader: /* glsl */`
            precision highp float;
            uniform float uTime;
            uniform float uIntro;
            uniform vec2 uRes;
            varying vec2 vUv;

            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }

            void main() {
                // 屏幕像素，原点左上 —— 实时分辨率
                vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uRes;
                float cell = uRes.x < 600.0 ? 14.0 : 16.0;
                vec2 id = floor(px / cell);
                vec2 f = fract(px / cell);

                float block = step(0.1, f.x) * step(f.x, 0.9) * step(0.1, f.y) * step(f.y, 0.9);

                // 归一化屏幕坐标，左上角 (0,0)
                vec2 n = vec2(vUv.x, 1.0 - vUv.y);
                float d = length(n * vec2(1.15, 0.95));
                float fade = max(0.0, 1.0 - d * 1.35);

                float h = hash(id);
                float speed = 2.8 + h * 4.5;
                float phase = h * 6.2831853;
                float flick = sin(uTime * speed + phase);
                float b = clamp(flick * 0.65 + 0.35, 0.0, 1.0);

                float a = fade * b * block * 0.42 * uIntro;
                if (a < 0.004) discard;
                gl_FragColor = vec4(1.0, 1.0, 1.0, a);
            }
        `
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = -10;
    state.scene.add(mesh);

    let intro = reduceMotion ? 1 : 0;

    function onResize() {
        mat.uniforms.uRes.value.set(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);

    return {
        mesh,
        update(t, dt) {
            mat.uniforms.uTime.value = t;
            if (intro < 1) {
                intro = Math.min(1, intro + dt * 0.55);
                mat.uniforms.uIntro.value = intro;
            }
        },
        boostIntro() {
            intro = 0.5;
            mat.uniforms.uIntro.value = intro;
        }
    };
}
