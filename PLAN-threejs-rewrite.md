# 计划：用 Three.js 全站重写 FallenLeaves 博客

> **范围声明**：本文档只交付计划，**不改任何站点代码**。  
> **Git**：当前已在新分支 `threejs`（自 `main` 切出），满足「新分支」约束。实施前无需再建分支。  
> **状态**：待批准。批准后再说「implement this plan」开始动代码。

---

## 0. 结论先行

**推荐方向**：用 **Three.js 接管全部视觉与交互层**（加载、背景网格、粒子/流萤、3D 卡片壳、滚动叙事、光标聚光/按压），**正文与 README 仍用 DOM 叠在 WebGL 之上**（Hybrid，awwwards 叙事站标配），本地 vendored three，无构建步骤，继续 GitHub Pages 静态部署。

**一句话风格锁定**：  
**「轻科技终端 × 流萤印象：黑底萤火绿粒子全息 + 等宽编辑排版 + 可按压的 3D 玻璃卡片」**  
（2D：Cyber/Sci-fi 轻终端编辑风；3D：Particle / Holographic / Glass 异色透射）

**不采用**：整站纯 WebGL 字体渲染（MSDF/ troika-text）——本站核心是中文长 README，WebGL 文字在长文可读性、SEO、无障碍、复制粘贴上全面劣于 DOM，且会把已知的「3D 重采样文字发糊」问题放大一个数量级。

---

## 1. 现状盘点（证据）

| 资产 | 位置 | 重写时的命运 |
|------|------|----------------|
| 单页结构：Hero / About / Tech Stack / GitHub Stats / Projects / Footer | `index.html` | 结构保留，外壳改为 `#webgl` + `#ui-root` |
| 加载屏：扫描线 + 点阵百分比 | `script.js` §0 + `#loadingGrid` | 迁入 Three.js：点阵网格 mesh + 点阵数字（或 DOM 点阵保留作字形，网格 3D 化） |
| 背景动态网格 + 径向渐隐 | `script.js` §1 `#bgCanvas` | 合并为单一 WebGL 场景的 GPU 粒子/点阵平面 |
| 萤火虫粒子（上浮 + 绿辉） | `script.js` §2 `#particleCanvas` | Three.js `Points` + 自定义 shader 辉光 |
| 角落流萤 SVG + 呼吸 + 鼠标视差 | `firefly.svg` + `.firefly-wrap` | 保留 SVG 资源作纹理/精灵；三维浮动 + 视差改场景相机/精灵偏移 |
| 项目卡片 + 点击展开 README（marked） | `projects-data.js` + `script.js` §3 | 数据源原样保留；卡片壳 3D，README 仍是 DOM |
| 滚动 reveal | `script.js` §4 | 改为与滚动进度绑定的 Three.js/透明度编排（或保留 IO，与 3D 入场同步） |
| Hero 打字机 | `script.js` §5 | 保留 DOM 打字机（字必须清晰） |
| 距离感应 3D 按压 + 光标聚光 | `script.js` §7 | **升级为真 3D**：射线拾取 + 壳 mesh 变换；字层不倾斜（直接消灭 `PLAN-3d-card-text-blur.md` 根因） |
| 触摸 `.pressed` | `script.js` §8 | 保留 2D 缩放反馈；可选 3D 轻按 |
| 样式令牌：`#050505` / `#00ff88` / JetBrains Mono | `style.css` `:root` | **原样继承**，不换色系 |
| README 源文件 + 同步脚本 | `md/*` `scripts/sync_portfolio.py` | **不动** |
| GitHub Stats 远程图 | `index.html` | 保留 `<img>` DOM（外链图不适合进 WebGL 纹理流） |

内容文案（标题、About、技能、社交链接、项目列表、页脚）**一字不改**地迁移。

---

## 2. 设计方向（实施时按此锁定，不临场改）

### 2.1 Style anchor（风格锚点）

- **真实参照**：暗色终端 IDE + 《崩坏：星穹铁道》流萤/萤火虫意象的粒子辉光 + awwwards 叙事个人站（单栏长文 + 全屏 WebGL 底）。
- **2D**：轻 Cyber / 编辑排版（大标题等宽 + 小字 meta + 细线分区）。
- **3D**：Particle / Holographic / 玻璃壳（低几何、高材质、Bloom 点光）。
- **禁止**：赛博霓虹乱闪、多色渐变堆砌、拟物重阴影、卡通低多边形。

### 2.2 Palette（具体色值）

| 角色 | Hex | 用途 |
|------|-----|------|
| 背景 | `#050505` | `scene.background` / body |
| 主文字 | `#c6c6c6` | 正文 |
| 亮文字 | `#ececec` | 标题 |
| 次文字 | `#9a9a9a` / `#666666` | meta / faint |
| **主强调（萤火绿）** | `#00ff88` | 粒子辉光、选中、链接 hover、按压高光 |
| 点缀青 | `#67e8f9` | 极少量（技能 tag hover / 章节星标可选） |
| 点缀暖橙 | `#ffd97a` | 极少量（流萤核心辉光暖芯） |
| 线框 | `rgba(255,255,255,0.04–0.10)` | 卡片/分区描边 |

Bloom/发光统一偏绿，暖橙只做流萤内核 5–10% 面积，避免花。

### 2.3 Typography

- **唯一字体族**：`'JetBrains Mono', 'Cascadia Code', …, monospace`（继续 Google Fonts 引入，失败则系统等宽）。
- **标题**：H1 约 2.4–3rem / 400–500；章节 `section-title` 约 1.05rem + 字距。
- **正文**：0.95rem / 行高 1.8；卡片摘要 0.92rem。
- **meta/tag**：0.78–0.82rem，字重 **500**（避免小字糊）。
- **原则**：WebGL 层**不绘制**正文汉字；仅允许装饰性点阵/ASCII 数字进 canvas/纹理。

### 2.4 Layout system

- 内容栏：`max-width: 820px` 居中，左右 padding 24px（沿用）。
- 背景：全屏 fixed WebGL canvas，`z-index: 0`；UI `z-index: 2`。
- 垂直节奏：Hero 上 64 / 下 44；section 块 padding 24–32；卡片间距 16。
- 密度：单栏、少装饰、大量负空间留给粒子场。
- 移动：`<600px` 缩小粒子/网格密度、角标流萤 240px；禁用重 3D 按压。

### 2.5 Signature moments（两处记忆点）

1. **加载仪式**：点阵百分比从扫描网格中「点亮→离场」，网格粒子收束进主场景（不是简单 fade out）。
2. **可按压的 3D 玻璃卡片**：光标接近时 **壳** 真三维后仰/下沉 + 边缘萤光描边，**文字层始终屏幕轴对齐**；展开 README 时壳展开如抽屉，正文清晰可读。

（辅助：角落流萤呼吸辉光 + 轻微相机视差，贯穿全页。）

---

## 3. 技术架构

### 3.1 选型（推荐）

| 层 | 选择 | 理由 |
|----|------|------|
| 渲染 | **three.js r170+**（ES module，vendor 到 `vendor/three/`） | 任务指定；本地离线可跑 |
| 后期 | `EffectComposer` + `UnrealBloomPass`（低 strength，threshold 高） | 流萤/粒子辉光；关掉也能看 |
| 滚动 | 原生 scroll + 自写 progress（0–1） | 避免再引 GSAP/Lenis 也能做；若编排复杂再加 **GSAP ScrollTrigger**（可选，默认不加） |
| 长文 | **marked**（已有 `vendor/marked.min.js`） | README 展开 |
| 构建 | **无 bundler**：`index.html` + `importmap` + 原生 ES modules | 与现 GitHub Pages 一致，降低维护成本 |
| 字体 | JetBrains Mono CDN，带 fallback | 沿用 |

### 3.2 目标文件布局（实施后）

```text
blog2.0/
  index.html              # 入口：importmap + #webgl + #ui-root
  css/main.css            # 由 style.css 迁移/精简（DOM 层）
  js/
    main.js               # 启动、resize、visibility、reduced-motion
    ui.js                 # 打字机、项目 DOM、README 展开、触摸 pressed
    three/
      core.js             # renderer / scene / camera / composer / loop
      loading.js          # 点阵加载 → 收束进场
      gridField.js        # 背景点阵网格（替代 bgCanvas）
      fireflies.js        # 萤火虫 Points + shader
      cards.js            # 项目卡片 3D 壳 + 射线按压
      spotlight.js        # 光标聚光（光照/描边 uniform）
      scrollDirector.js   # 滚动进度驱动相机/透明度/入场
  projects-data.js        # 不变
  vendor/
    marked.min.js
    three/                # three.module.js + examples jsm 需要的最小集
  firefly.svg             # 保留（流萤精灵源）
  md/  scripts/           # 不动
  PLAN-*.md               # 计划文档
```

> 旧 `script.js` / `style.css` 在 Phase 1 切换入口后删除或改名为 `legacy/`（推荐直接删，git 可回溯）。

### 3.3 场景结构（ASCII）

```text
[WebGL 全屏]
  Scene
  ├── GridField (Points/Instanced 小方块，闪烁，径向渐隐)
  ├── Fireflies (Points, 上浮+漂移+辉光)
  ├── FireflySprite (角标流萤，视差)
  ├── CardGroup (每项目: Shell mesh + 交互 hitbox)
  ├── SpotLight / SpotQuad (跟随光标)
  └── Composer (Render + Bloom)

[DOM 叠层 #ui-root，pointer-events 按需]
  Loading overlay (可退场)
  .container
    Hero (h1 打字机 + social)
    About / Skills / GitHub stats (img)
    Projects (卡片「内容层」绝对同步到 Shell 投影位置，或 CSS 占位+测量同步)
    Footer
```

**卡片同步策略（关键决策）**：  
采用 **「3D 壳 + DOM 内容钉在同一滚动位置」**——壳在 WebGL 里做 3D 变换；标题/摘要/README 是 DOM，用每帧/滚动测量把 DOM 盒与壳的屏幕投影对齐，**DOM 不做 rotateX/Y**（只允许 ≤2px translateY）。  
这样既「整站 Three」观感，又根治文字发糊（见 `PLAN-3d-card-text-blur.md` 方案 A 的精神，直接在重写里做对）。

### 3.4 性能与降级

| 条件 | 行为 |
|------|------|
| `prefers-reduced-motion` | 粒子静帧/极少、无按压倾斜、无打字机逐字；仍显示完整内容 |
| `hover: none` | 禁用距离按压；保留 `.pressed` 缩放 |
| 标签页隐藏 | 停 rAF |
| DPR | `Math.min(devicePixelRatio, 2)` |
| WebGL 不可用 | 隐藏 canvas，DOM 内容 + 纯 CSS 背景保底（内容永不丢） |
| 移动端 | 降粒子数（约 40%）、关 Bloom 或减半、卡片仅轻微 lift |

### 3.5 依赖与外部服务

| 依赖 | 用途 | 备注 |
|------|------|------|
| three.js（vendor） | 渲染 | **不**走 CDN 也能开 |
| marked（已有） | README | 本地 |
| JetBrains Mono（Google Fonts） | 字体 | 可失败降级 |
| github-readme-stats.vercel.app | GitHub 统计图 | 保留外链 + onerror 兜底（已有） |

无需 API Key、无需后端、无需账号。

---

## 4. 功能清单（必须 1:1 迁移 + 升级）

### 必须保留（回归基线）

1. 加载百分比动画 → 结束后 reveal
2. 背景动态网格 + 萤火虫上浮辉光
3. Hero「FallenLeaves / —— 落叶 ——」+ 打字机 + 三个社交链接（Bilibili / GitHub / 抖音）
4. About 文案
5. Tech Stack：C# / Java / Python / JavaScript / Docker
6. GitHub Stats 两卡片（含 fallback）
7. Projects 列表：点击展开 marked README、再点收起；外链 GitHub
8. Footer © 2026
9. 角落流萤 + 鼠标轻微视差
10. 响应式（窄窗可用）
11. `prefers-reduced-motion` 尊重

### Three.js 升级点（本次重写的核心价值）

1. **单场景**替换三块 canvas（loading / bg / particle）
2. **真 3D 卡片壳**按压/悬浮（替代 CSS `perspective+rotate`）
3. **光标聚光**改为场景光/描边 shader（替代纯 CSS `--mx/--my` 叠层，或保留 CSS 聚光在 DOM 层做描边，场景做环境响应——实施时二选一，默认 **DOM 描边保留 + 场景轻响应**，成本低且稳）
4. **滚动编排**：进场、卡片错落浮现、背景参数随滚动微调
5. **加载收束**进主场景的连续过渡

### 明确不做（Non-goals）

- 不做多路由 / 博客文章 CMS / 评论系统
- 不做纯 WebGL 中文排版
- 不引入 React/Vue/Webpack/Vite（保持静态）
- 不改项目文案与 `projects-data.js` 内容
- 不改 `scripts/sync_portfolio.py` 工作流
- 不做账号/统计后端
- 不把 GitHub Stats 图强行 WebGL 化
- 不在本计划阶段写任何站点代码

---

## 5. 分阶段实施（每阶段可独立合并）

> 约束自检：每阶段结束后站点**可用**；不依赖下一阶段。

### Phase 1 — 场景骨架 + 背景/粒子迁移（可合并）

**改动**：`index.html` 入口改造、`js/three/core.js`、`gridField.js`、`fireflies.js`、`css/main.css` 初迁、删除旧双 canvas 绘制循环。  
**验收**：打开页面可见黑底点阵网格 + 萤火虫；DOM 内容完整可读；reduced-motion 下不晃；无 console error。  
**回滚**：git revert 单 commit；无数据迁移。

### Phase 2 — 3D 卡片壳 + 按压交互（可合并）

**改动**：`cards.js`、`ui.js` 项目渲染与 DOM 对齐、移除 CSS 3D press transform。  
**验收**：鼠标接近卡片有 3D 壳反应；**文字放大截图无倾斜重采样发糊**；展开 README 流畅；外链可点；移动端 `.pressed` 正常。  
**回滚**：revert；内容层仍是普通 DOM 列表。

### Phase 3 — 加载仪式 + 滚动编排 + 流萤/聚光抛光（可合并）

**改动**：`loading.js`、`scrollDirector.js`、`spotlight.js`、Bloom 调参、流萤精灵。  
**验收**：加载收束连贯；滚动进场节奏自然；Bloom 不糊正文；FPS 在 1080p 桌面 ≥ 55（DevTools Performance 粗测）。  
**回滚**：可关 Bloom/编排开关回到 Phase 2 观感。

### Phase 4 — 响应式/无障碍/回归 + 文档（可合并）

**改动**：移动端密度、键盘可聚焦链接、README 可复制、`README.md` 技术栈说明更新、删除 `PLAN-3d-card-text-blur.md` 或归档为「已在重写中解决」。  
**验收**：375px / 768px / 1440px 截图；键盘 Tab 可达社交与项目链接；`prefers-reduced-motion` 路径手测。

**依赖说明**：Phase 2 可在 Phase 1 后独立发布；Phase 3 强依赖 1；Phase 4 收尾任意时刻可并行，但建议最后。

---

## 6. 验证命令与手工清单

### 自动化 / 本地

```powershell
# 无构建；用任意静态服务打开（实施时选其一）
# 注意：ES modules 需要 http(s) 源，不能 file:// 直接双击
python -m http.server 5173
# 浏览器打开 http://localhost:5173
```

Playwright 截图回归（实施阶段执行，viewport 1280×800，`full_page=False`）：

1. 加载中 0% / 50% / 100%
2. 首屏 Hero
3. Projects 列表（未展开）
4. 卡片 hover/按压峰值帧
5. README 展开
6. 375×812 移动首屏
7. 滚动中段（About → Skills）

### 手工验收（黄金路径）

| # | 步骤 | 期望 |
|---|------|------|
| 1 | 打开站点 | 加载动画完整，结束后内容 reveal |
| 2 | 移动鼠标 | 粒子/流萤有生命感；无掉到明显卡顿 |
| 3 | 划过项目卡片 | 壳 3D 反应，**文字始终清晰** |
| 4 | 点击卡片 | README 展开；再点收起；链接可开新页 |
| 5 | 点社交三链接 | 新标签正确 |
| 6 | 窄窗口 375px | 无横向滚动、卡片可读、角标不挡正文 |
| 7 | 系统减少动态 | 无大幅粒子运动，内容仍全 |
| 8 | 切后台再回 | 动画恢复，无泄漏双 rAF |

### 视觉自审（3d-creation 标准）

Hero 预算 3–5 轮截图迭代；整页 8–15 轮正常。必须**看图说话**，不以「代码写完了」代替「看起来对」。

---

## 7. 风险与攻击面

| 角度 | 风险 | 化解 |
|------|------|------|
| 前提崩塌 | 「全站 Three」被理解为文字也必须进 WebGL | 计划已锁定 Hybrid；若你坚持纯 WebGL 文字，成本×3、中文长文可读性崩，需你书面确认才改 |
| 依赖失败 | three CDN 挂 / 字体挂 | three **vendor 本地**；字体 fallback 系统等宽 |
| 规模×10 | 项目从 4 个涨到 40 个 | 卡片壳用 Instanced/池化；README 仍虚拟滚动或分页（本期不做） |
| 回滚成本 | 中途合入 main | 分支 `threejs` 上分 Phase commit；任意 Phase 可 revert；无数据迁移 |
| 性能 | Bloom + 粒子在核显掉帧 | DPR cap、粒子预算表、可关 Bloom、`prefers-reduced-motion` |
| 文字糊 | 3D 重采样老问题 | 架构层禁止文字 rotate（本计划核心） |
| ES modules / file:// | 用户双击打开空白 | README 写明需静态服务器或 GitHub Pages |

**最脆弱假设**：Hybrid（DOM 文字 + WebGL 壳）符合你对「全部用 threejs 重写」的意图。  
**若该假设不成立**：改为纯 WebGL UI 的工期与体验代价需要重新评估，不在本计划内默认展开。

---

## 8. 推荐方案 vs 备选 vs 最小方案

| 方案 | 内容 | 工期感 | 结论 |
|------|------|--------|------|
| **A. Hybrid 叙事站（推荐）** | Three 场景 + DOM 内容 + 3D 壳 | 中 | **做这个** |
| B. CSS3D 卡片 + Three 背景 | 卡片 CSS3D，背景 Three | 中低 | 备选；真 3D 光照/拾取弱一档（约 40% 人可能更爱，故列出） |
| C. 最小：仅替换背景/粒子为 Three | 交互仍是 CSS | 低 | 不满足「全部重写」诉求，仅作保底 |

---

## 9. 关键决策（3–5 条）

1. **Hybrid 渲染**：WebGL 管世界与壳，DOM 管字与长文 —— 为了中文可读性与消灭发糊。  
2. **无 bundler 静态 ES modules + vendor three** —— 保持 GitHub Pages 零构建。  
3. **视觉 DNA 继承**（`#050505` / `#00ff88` / JetBrains Mono / 流萤）—— 重写技术栈，不重写品牌。  
4. **分 4 个可独立合并 Phase** —— 任何时刻 main 可回退到可用状态。  
5. **交互真 3D 只加在壳上** —— 距离按压、聚光、滚动入场服务壳；字层最多 2px 浮动。

---

## 10. 交付物（实施完成后）

- 可运行站点：`index.html` + `css/` + `js/` + `vendor/`
- 更新后的 `README.md`（技术栈改为 three.js）
- 本计划归档；`PLAN-3d-card-text-blur.md` 结论并入实现说明
- Git：分支 `threejs` 上按 Phase 提交（**仅在你明确要求 commit 时才提交**）

---

## 11. 批准后执行方式

批准本计划后，回复 **「implement this plan」**（或「可以干 / 直接改」）。  
实施时严格按 Phase 1→4，不重新争论设计；若仓库相对计划发生漂移会先停下说明。

实现完成后建议跑 `/check` 做合并前审查。
