# FallenLeaves 的博客

个人博客站点。

## 技术栈

- 原生 HTML + CSS + JavaScript（ES Modules，无打包）
- [three.js](https://threejs.org/) — WebGL 场景（点阵网格、萤火虫、3D 卡片壳、Bloom）
- [marked.js](https://marked.js.org/) — Markdown 渲染
- DOM 叠层承载正文（中文长文保持像素级清晰）

## 特性

- 加载界面：点阵百分比动画
- Three.js 背景：动态点阵网格 + 萤火虫粒子系统
- 3D 玻璃卡片壳：距离感应按压 / 悬浮（文字层不倾斜，避免重采样发糊）
- 光标聚光描边
- 响应式布局：桌面 / 移动端自适应
- 项目卡片：点击展开内联 README
- `prefers-reduced-motion` 与无 WebGL 降级

## 本地预览

ES Modules 需要 HTTP 源，不要用 `file://` 直接打开：

```powershell
python -m http.server 5173
# 浏览器打开 http://localhost:5173
```

## 许可

MIT
