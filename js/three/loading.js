const font = {
    '0': ['01110','10001','10011','10101','11001','10001','01110'],
    '1': ['00100','01100','00100','00100','00100','00100','01110'],
    '2': ['01110','10001','00001','00010','00100','01000','11111'],
    '3': ['11110','00001','00001','01110','00001','00001','11110'],
    '4': ['00010','00110','01010','10010','11111','00010','00010'],
    '5': ['11111','10000','10000','11110','00001','00001','11110'],
    '6': ['01110','10000','10000','11110','10001','10001','01110'],
    '7': ['11111','00001','00010','00100','01000','01000','01000'],
    '8': ['01110','10001','10001','01110','10001','10001','01110'],
    '9': ['01110','10001','10001','01111','00001','00001','01110'],
    '%': ['10001','00010','00100','01000','00100','01000','10001']
};

/**
 * 点阵百分比加载仪式：DOM 点阵字 + 进度条扫过，结束后 fade 并回调。
 * 网格收束由 gridField 在 onDone 后衔接。
 */
export function runLoading({ reduceMotion, onDone }) {
    const screen = document.getElementById('loadingScreen');
    const ui = document.getElementById('ui');
    if (!screen || !ui) {
        onDone?.();
        return;
    }

    if (reduceMotion) {
        screen.classList.add('fade-out');
        setTimeout(() => {
            screen.classList.add('hidden');
            onDone?.();
        }, 200);
        return;
    }

    let progress = 0;
    let phase = 'load';
    let dismissStart = 0;

    function renderDigits(text) {
        ui.innerHTML = '';
        for (const ch of text) {
            const d = document.createElement('div');
            d.className = 'digit';
            const map = font[ch];
            for (let y = 0; y < 7; y++) {
                for (let x = 0; x < 5; x++) {
                    const dot = document.createElement('div');
                    dot.className = 'dot';
                    if (map && map[y][x] === '1') dot.classList.add('on');
                    d.appendChild(dot);
                }
            }
            ui.appendChild(d);
        }
    }

    function tick(now) {
        if (phase === 'load') {
            progress += 0.008;
            if (progress >= 1) {
                progress = 1;
                phase = 'dismiss';
                dismissStart = performance.now();
            }
        }

        const text = Math.floor(progress * 100) + '%';
        renderDigits(text);

        if (phase === 'load') {
            requestAnimationFrame(tick);
            return;
        }

        const t = (now - dismissStart) / 700;
        if (t < 1) {
            screen.style.opacity = String(1 - t * 0.3);
            requestAnimationFrame(tick);
            return;
        }

        screen.classList.add('fade-out');
        setTimeout(() => {
            screen.classList.add('hidden');
            onDone?.();
        }, 800);
    }

    requestAnimationFrame(tick);
}
