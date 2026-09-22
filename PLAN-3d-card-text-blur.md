# 计划：优化 project 3D 卡片文字模糊

> 范围：只出方案，不改代码。目标是让 `.project-card` 在距离感应 3D 按压时文字仍清晰。

---

## 1. 现状与根因

### 1.1 相关实现

| 位置 | 作用 |
|------|------|
| `script.js` §7 `PRESS_CFG` | 给 `.project-card` 配 `{ depth: 6, tilt: 2.5, lift: 2 }` |
| `script.js` `update()` | 每帧写入 `perspective(720px) translateZ translateY rotateX rotateY` |
| `style.css` `.project-card` | `backdrop-filter: blur(10px)` + 半透明渐变背景 |
| `style.css` 卡片文字 | `h3` 1.15rem / `p` 0.92rem / `.meta` 0.78rem / `.tag` 0.75rem，字重 400 |

### 1.2 为什么会糊（按影响排序）

1. **非轴对齐 3D 变换重采样**  
   `rotateX` / `rotateY` 会把整卡（含文字）先栅格化成 GPU 纹理，再按倾斜角双线性采样。这是模糊的主因。哪怕只有 1–2.5°，字形边缘就会被抹开。

2. **透视 + 亚像素平移**  
   `perspective(720px)` + `translateZ`（负值推远）会让纹理按非整数比例缩放；`toFixed(2)` 的小数位移/旋转每帧都在变，持续触发重采样。

3. **`backdrop-filter: blur(10px)`**  
   额外合成层，和 3D transform 叠在同一元素上时，部分浏览器会降低该层的栅格化分辨率或再次模糊内容。

4. **小字号 + 细字重等宽字体**  
   `.meta` / `.tag` / 正文在 0.75–0.92rem、`font-weight: 400` 下，任何轻微重采样都会立刻显得糊。`-webkit-font-smoothing: antialiased` 会让字更「瘦」，更容易被放大成糊感。

5. **持续写 transform**  
   鼠标靠近时每帧改角度/位移，文字一直处于「被变换的纹理」状态，没有机会以清晰位图呈现。

> 结论：不是字体文件或 `text-rendering` 的问题，而是 **文字跟卡片一起做了 3D 旋转**。

---

## 2. 优化策略（按推荐优先级）

### 方案 A — 分层：壳 3D、字平面（推荐，效果最好）

**思路**：3D 只作用在「壳」上；文字层保持轴对齐，最多做纯 `translateY`，绝不 `rotate`。

```
.project-card                    ← 不做 3D（或只做极轻 translateY）
├── .card-shell                   ← perspective + rotateX/Y + translateZ
│     边框 / 背景 / 高光 / 聚光 ::after
└── .card-content                 ← 文字、tag、链接
      仅允许 translateY(≤2px) 或 translateZ(0)
```

**实现要点**（`script.js` + `script.js` 渲染处 + `style.css`）：

1. `loadProjects()` 里给卡片包一层 `.card-shell`（或把现有装饰 `::before/::after`、边框、背景挪到 shell）。
2. `PRESS_CFG` 中 transform 写在 `shell` 上；`content` 只同步 `translateY`（lift），不旋转。
3. 需要「纸片被按下去」的深度感时，可让 content 额外 `translateZ(1px)` 抬离壳面，避免 z-fighting，但仍不 rotate。

**预期**：文字始终 1:1 像素对齐，清晰度等同静态；壳仍可倾斜，立体感保留。  
**代价**：DOM 结构多一层；JS 的 `t.el` 目标要改成 shell；聚光 `--mx/--my` 仍挂在卡片上即可。

---

### 方案 B — 去掉卡片旋转，只留位移（改动最小、最稳）

**思路**：project 卡片文字最多，直接禁止 `rotateX/Y`。

1. `PRESS_CFG` 中 `.project-card`：`tilt: 0`（或 0.5 以下且量化）。
2. 只保留 `translateY(-lift)` + 极轻 `translateZ`（depth 可从 6 降到 2–3）。
3. 其它文字少的元素（`.skill-tag`、`.social a`）可保留 tilt，它们糊感不明显。

**预期**：立刻消除主因模糊；立体感弱一些，但仍有按压/悬浮。  
**代价**：几乎为零，5 分钟可验。

---

### 方案 C — 变换量化 + 闲时回正（与 A/B 叠加）

1. 旋转角量化到 `0.5°` 步进；位移量化到 `0.5px` 或 `1px`（按 `devicePixelRatio` 对齐到物理像素更佳）。
2. `p` 很小（例如 `p < 0.08`）时直接清空 `transform`，不要写接近 0 的垃圾值。
3. 鼠标停住 > 80ms 或 `p` 低于阈值：弹簧回 `transform: none`，让文字回到清晰静态栅格。
4. 展开 README 时（已有 `scale = 0.35`）可直接禁用 rotate，只留极轻 lift。

**预期**：减少每帧重采样次数，减轻「一直糊」的观感。  
**代价**：低。

---

### 方案 D — 按压期间降级 backdrop-filter

1. 写入 3D transform 的同时给卡片加 `.pressing`。
2. `.project-card.pressing { backdrop-filter: none; }`（背景用更实的渐变顶替，避免突然变透）。
3. transform 清空后移除 `.pressing`，恢复 blur。

**预期**：去掉合成层叠加导致的二次糊。  
**代价**：交互瞬间背景质感略变，需微调背景透明度过渡。

---

### 方案 E — 字体与字形硬化（辅助，不单独做）

1. 正文/摘要在小屏或交互态略微加粗：`font-weight: 500`（等宽字体细体糊感更强）。
2. `.meta` / `.tag` 字号从 0.75–0.78rem 提到 0.8–0.82rem。
3. 可试验去掉 `-webkit-font-smoothing: antialiased`（Windows 上 subpixel 有时更实），用截图 A/B。
4. **不要**指望 `text-rendering` / `font-smoothing` 解决 3D 重采样——它们管不到 GPU 纹理。

---

### 方案 F — 交互降级为 2D（保底 / 可访问性）

若追求「文字绝对清晰」优先于「立体」：

- project 卡片改用移动端同款 `.pressed { transform: scale(0.985); }` + 阴影加深。
- 3D 按压只留给无长文本的元素。
- `prefers-reduced-motion` 已有，可再加「低性能设备 / `deviceMemory` 过低时关闭 3D」。

---

## 3. 推荐落地路径

| 阶段 | 内容 | 预期收益 |
|------|------|----------|
| **P0 快赢** | 方案 B（卡片 `tilt: 0`）+ 方案 C（量化 + 闲时清空） | 消除大部分模糊，改动只在 `script.js` 的 `PRESS_CFG` 与 `update()` |
| **P1 质感** | 方案 D（按压时关 backdrop-filter）+ 方案 E（小字加粗/略放大） | 边缘更实，小字更易读 |
| **P2 结构** | 方案 A（壳 3D / 字平面） | 3D 与清晰度兼得，作为最终形态 |
| **P3 可选** | 方案 F | 低端机或极端清晰度需求时降级 |

**建议执行顺序：P0 → 截图对比 → 若仍不满意再上 P2。**  
P0 成本最低，且很可能已经够用（当前 tilt 仅 2.5°，去掉后糊感应消失大半）。

---

## 4. 具体改动清单（待实施时用）

### 4.1 P0

- [ ] `script.js` `PRESS_CFG`：`.project-card` 的 `tilt` → `0`，`depth` → `2~3`
- [ ] `script.js` `update()`：  
  - `rotate` 结果量化（`Math.round(x * 2) / 2`）  
  - `p < 0.08` 或 `scale` 后角度/位移绝对值过小时写 `''`  
  - 可选：`requestAnimationFrame` 内对 tx/ty 先量化再算
- [ ] 验证：鼠标划过 project 卡片，标题/摘要/ meta 是否清晰；展开 README 后是否仍稳

### 4.2 P1

- [ ] `style.css`：`.project-card.pressing { backdrop-filter: none; -webkit-backdrop-filter: none; }` + 背景补偿
- [ ] `script.js`：写 transform 时 `classList.add('pressing')`，清空时 `remove`
- [ ] `style.css`：`.project-card p` / `.meta` / `.tag` 字重 500；必要时字号 +0.05rem

### 4.3 P2

- [ ] `script.js` `loadProjects()`：卡片 DOM 拆成 `.card-shell` + `.card-content`
- [ ] `script.js` `update()`：3D 只写 shell；content 只写 `translateY`
- [ ] `style.css`：shell 承接原 `border` / `background` / `::before` / `::after` / `backdrop-filter`；content 相对定位叠上
- [ ] 注意：`measure()` 的盒模型仍量 `.project-card` 外框；点击展开逻辑仍绑 `.project-card`

---

## 5. 验证方式

1. **静态 vs 动态截图对比**  
   DevTools 设 `deviceScaleFactor = 2`（模拟 Retina），分别截「无 transform」与「最大 p 时」的卡片标题区域，放大看字形边缘。
2. **快速划过**  
   连续划过卡片，观察是否「运动中糊、停下仍糊」——P0 后应变成「停下立刻清晰」。
3. **展开 README**  
   长文本 + `max-height` 动画时不得出现持续旋转导致的正文模糊。
4. **机型抽查**  
   Windows Chrome / Edge（DPR 1 与 1.5/2）各看一次；DPR 1 更容易暴露重采样问题。
5. **回归**  
   聚光描边、按压缩放回弹、触摸端 `.pressed`、`prefers-reduced-motion` 行为不变。

---

## 6. 风险与边界

| 风险 | 处理 |
|------|------|
| 去掉 tilt 后「立体按压」变弱 | 用 `translateY` + `box-shadow` + 边框高光补足；或只在 P2 用壳倾斜 |
| 分层后命中/点击区域变化 | 交互仍绑外层 `.project-card`，shell/content `pointer-events: none` 于装饰层 |
| 按压时关 backdrop-filter 闪一下 | 背景用双层渐变过渡（`transition: background`），或 shell 持有 blur、content 不参与 |
| 过多 `will-change: transform` 占显存 | 只在 `pressOn` 为 true 的目标上临时加，清空 transform 时移除 |

---

## 7. 结论

文字模糊的主因是 **`.project-card` 在距离感应按压中对含文字的整体做了 `rotateX/rotateY` + 透视缩放**，GPU 纹理重采样导致字形发糊；`backdrop-filter` 与小字细体是加重项。

**最优解是方案 A（壳 3D、字平面）；最快有效是方案 B+C（卡片去旋转 + 变换量化与闲时回正）。**  
建议先做 P0 截图对比，达标则不必动 DOM；未达标再上 P2 分层。
