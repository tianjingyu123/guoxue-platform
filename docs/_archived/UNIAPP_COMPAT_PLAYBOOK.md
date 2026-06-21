# uniapp 小程序兼容性映射手册

> 目标平台：uniapp 框架下的 **App + H5（主）/ 小程序（辅）**
> 原型技术栈：Next.js + React + Tailwind CSS v4（**全部会在迁移时重写为 uniapp Vue3**）
> 本手册用途：供迁移/联调阶段（Claude Code）逐项执行的兼容性对照表
> 核心原则：**App/H5 不牺牲效果；小程序按"能降级则降级、不能则条件编译"处理**

---

## 0. 为什么不在 React 原型里批量改

原型是 React + Tailwind 任意值类名（如 `bg-white/50 backdrop-blur-md p-[14px]`）。
迁移到 uniapp 后，标签会变成 `<view>/<text>`，样式会改写为 scoped CSS + rpx。
**原型 CSS 没有一行原样存活**，因此在原型里批量替换 2706 处 px、231 处 blur 属于
"改完即丢"的无效劳动，且会破坏原型当前用于验收的视觉效果。
→ 正确做法：保留原型作为"视觉黄金参照物"，兼容处理在迁移时一次做对，依据本手册。

---

## 1. 单位体系：px → rpx（规模最大，2706 处）

| 场景 | App/H5 | 小程序 | 迁移规则 |
|:--|:--|:--|:--|
| 布局尺寸 / 间距 / 字号 | px 可用 | px 不自适应 | 统一转 **rpx**（设计稿 750 宽：`1px ≈ 2rpx`） |
| 1px 边框（发丝线） | px 可用 | px 会被放大 | 用 `0.5px` 或 `transform: scale(0.5)` 方案 |
| 圆角 / 阴影模糊半径 | px 可用 | px 可用 | 保持 px，**不转 rpx**（避免大屏圆角失真） |

**执行建议**：迁移时配置 uni 的 `postcss-px-to-rpx` 或 `transformPx`，
按"布局尺寸转 rpx、边框/圆角保留 px"的白名单策略自动转换，避免手工改 2706 处。

---

## 2. 定位：fixed（299）/ sticky（450）

| 模式 | App/H5 | 小程序 | 处理方案 |
|:--|:--|:--|:--|
| `position: fixed` 底部导航/悬浮按钮 | 正常 | 基本支持，但软键盘弹起/滚动回弹时可能抖动 | 保留 fixed；小程序底部加 `env(safe-area-inset-bottom)` 兜底 |
| `position: fixed` 全屏遮罩/弹层 | 正常 | 正常 | 保留 |
| `position: sticky` 吸顶 tab/表头 | 正常 | **部分小程序（早期微信/支付宝）支持差** | 优先保留；对老版本小程序用 `page-scroll` 监听 + 切换 fixed 兜底（联调阶段处理） |

→ **结论**：fixed 全部保留。sticky 保留，老版本兼容问题**留给联调阶段**按真机表现处理。

---

## 3. 不支持的视觉效果（必须降级）

| 效果 | 出现规模 | App/H5 | 小程序 | 降级方案 |
|:--|:--|:--|:--|:--|
| `backdrop-blur`（毛玻璃） | 231 文件 | 支持 | **不支持** | 小程序用条件编译降级为 **半透明实色**（如 `rgba(255,255,255,.85)`）；App/H5 保留毛玻璃 |
| `mix-blend-mode` | 193 文件* | 支持 | **不支持** | 小程序改为预合成的实色/图片；非关键装饰可直接去除 |
| CSS `filter: blur/drop-shadow` | 同上 | 支持 | 支持有限 | 关键处用图片替代；阴影改 `box-shadow` |

\* 193 含 `blur-`/`drop-shadow-` 工具类，需迁移时逐一甄别是否关键。

**条件编译范式**（uniapp）：
```vue
<!-- #ifdef MP -->
背景用半透明实色
<!-- #endif -->
<!-- #ifndef MP -->
背景用 backdrop-filter 毛玻璃
<!-- #endif -->
```
→ **结论**：App/H5 上"不牺牲效果"，小程序上通过条件编译降级，两全。

---

## 4. DOM / BOM API（86 文件用 window/document）

| API | 小程序 | 替换方案 |
|:--|:--|:--|
| `window` / `document` | **无 DOM** | uni API：`uni.getSystemInfo`、`uni.createSelectorQuery` |
| `localStorage` / `sessionStorage`（9 文件） | 不可用 | `uni.setStorageSync` / `uni.getStorageSync` |
| `canvas` + `getContext`（证书绘制等） | API 不同 | uni `<canvas>` + `uni.createCanvasContext`（**联调阶段重点处理**） |
| `100vh/100vw`（9 文件） | 不可靠 | `100%` + flex，或 `uni.getSystemInfo` 取屏高换算 rpx |

→ **结论**：storage/系统信息类迁移时直接替换（机械、低风险）；canvas 类复杂，**留联调阶段**。

---

## 5. 内联 SVG

原型大量内联 `<svg>` 图标。小程序对内联 SVG 支持有限。
→ 迁移时统一替换为：uni 图标组件 / iconfont 字体图标 / 或 base64 图片。建议接入一个图标方案统一管理。

---

## 6. 分工建议（迁移阶段 vs 联调阶段）

### 迁移阶段直接做对（机械、规则明确）
- px → rpx 自动转换（配置化，白名单保留圆角/边框）
- backdrop-blur → 条件编译降级
- localStorage / window 系统信息 → uni API
- 内联 SVG → 统一图标方案

### 联调阶段按真机表现处理（需实测，影响发挥的）
- sticky 在老版本小程序的兜底
- canvas 证书/海报绘制的多端适配
- mix-blend 等装饰效果的逐一取舍
- fixed 在软键盘/滚动回弹下的微调

---

## 7. 决策原则速记

1. **App/H5 是主场**：不为小程序牺牲毛玻璃、阴影、动画等效果，用条件编译隔离。
2. **小程序是辅**：能降级则降级（实色代替毛玻璃），不能则条件编译，复杂的留联调。
3. **不在 React 原型里批量改**：原型只作视觉参照，兼容在迁移时依本手册一次做对。
4. **规模化问题配置化解决**：2706 处 px、231 处 blur 用构建期转换/条件编译，而非手工。

