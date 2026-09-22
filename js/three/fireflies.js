import * as THREE from 'three';
import { reduceMotion, isTouch } from './core.js';

/**
 * 萤火虫：少而精的绿色微光，不要满屏粒子。
 */
export function createFireflies(state) {
    const isMobile = window.innerWidth < 600;
    const count = reduceMotion ? 10 : (isMobile || isTouch ? 18 : 32);

    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const lifes = new Float32Array(count);
    const phases = new Float32Array(count);
    const data = [];

    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 11;
        const y = (Math.random() - 0.5) * 7;
        const z = (Math.random() - 0.5) * 2;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        sizes[i] = 0.5 + Math.random() * 1.1;
        lifes[i] = 0.25 + Math.random() * 0.5;
        phases[i] = Math.random() * Math.PI * 2;
        data.push({
            x, y, z,
            vx: (Math.random() - 0.5) * 0.1,
            vy: -0.05 - Math.random() * 0.12,
            drift: (Math.random() - 0.5) * 0.12,
            phase: phases[i]
        });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aLife', new THREE.BufferAttribute(lifes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uTime: { value: 0 },
            uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
        },
        vertexShader: /* glsl */`
            attribute float aSize;
            attribute float aLife;
            attribute float aPhase;
            uniform float uTime;
            uniform float uPixelRatio;
            varying float vGlow;

            void main() {
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                float pulse = sin(uTime * 0.9 + aPhase) * 0.3 + 0.55;
                vGlow = pulse * aLife;
                gl_PointSize = aSize * 18.0 * uPixelRatio / max(0.5, -mv.z);
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: /* glsl */`
            varying float vGlow;
            void main() {
                vec2 uv = gl_PointCoord - 0.5;
                float d = length(uv);
                if (d > 0.5) discard;
                float core = smoothstep(0.35, 0.0, d);
                float halo = smoothstep(0.5, 0.15, d) * 0.35;
                vec3 col = vec3(0.0, 0.95, 0.5);
                float a = (core * 0.7 + halo) * vGlow;
                if (a < 0.01) discard;
                gl_FragColor = vec4(col, a);
            }
        `
    });

    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    state.scene.add(points);
    const pos = geo.attributes.position.array;

    return {
        points,
        update(t, dt) {
            mat.uniforms.uTime.value = t;
            if (reduceMotion) return;
            for (let i = 0; i < count; i++) {
                const p = data[i];
                p.x += (p.vx + p.drift * Math.sin(t * 0.4 + p.phase)) * dt;
                p.y += p.vy * dt;
                if (p.y < -4) { p.y = 4; p.x = (Math.random() - 0.5) * 11; }
                if (p.x < -6.5) p.x = 6.5;
                if (p.x > 6.5) p.x = -6.5;
                pos[i * 3] = p.x;
                pos[i * 3 + 1] = p.y + state.scroll * 0.1;
                pos[i * 3 + 2] = p.z;
            }
            geo.attributes.position.needsUpdate = true;
        }
    };
}
