# 排盘工具 — 视觉约束

> Claude 每次写排盘前端代码前必须通读此文件。
> 本文件是"否定清单"——不是告诉你该做什么，是告诉你绝对不能做什么。

---

## 间距

所有间距值必须来自以下集合（4 的倍数）：

```
允许值：4, 8, 12, 16, 24, 32, 48, 64
禁止使用：5, 6, 7, 10, 14, 15, 18, 20, 25, 30 等非标值
```

Tailwind 映射：
- `gap-1` = 4px ✅
- `gap-2` = 8px ✅
- `gap-3` = 12px ✅
- `gap-4` = 16px ✅
- `gap-6` = 24px ✅
- `gap-8` = 32px ✅
- `gap-5` = 20px ❌ 禁止
- `gap-7` = 28px ❌ 禁止

内边距规则：
- 卡片内部：`p-4`（16px）或 `p-6`（24px）
- 按钮内边距：`px-4 py-2`（16px 12px）
- 输入框内边距：`px-3 py-2`（12px 8px）

---

## 圆角

| 元素 | 允许值 | Tailwind |
|------|--------|----------|
| 卡片/面板 | 8px | `rounded-lg` |
| 按钮 | 6px | `rounded-md` |
| 输入框 | 6px | `rounded-md` |
| 标签/徽章 | 4px | `rounded` |
| 弹窗/抽屉 | 8px | `rounded-lg` |

禁止自定义圆角：`rounded-[10px]` / `rounded-xl` / `rounded-2xl`。

---

## 颜色使用

### 排盘数据标注
- 五行属性（木火土金水）→ 必须用 `WUXING.*`
- 吉凶判定（吉/凶/平）→ 必须用 `JIXIONG.*`
- 天干地支 → 必须用 `TIANGAN` / `DIZHI`
- **禁止用五行色或吉凶色做界面装饰**

### 界面装饰
- 背景 → `UI.bg` / `UI.cardBg` / `UI.headerBg`
- 文字 → `UI.textPrimary` / `UI.textSecondary` / `UI.textHint`
- 边框 → `UI.border` / `UI.borderLight`
- 品牌强调 → `UI.brand` / `UI.brandLight`
- 链接 → `UI.link`（仅限 a 标签或可点击跳转文字）

### 绝对禁止
- 渐变色背景（`bg-gradient-*`）
- 半透明叠加卡片（`bg-opacity-50`）
- 自定义色值（`bg-[#xxx]` / `text-[#xxx]`）

---

## 字体

| 场景 | 字体 | Tailwind | 字号 |
|------|------|----------|------|
| 排盘数据（四柱/卦爻/九宫） | 等宽 | `font-mono` | 14px / 16px |
| 正文/说明 | 无衬线 | `font-sans` | 14px |
| 古籍引用/原文 | 衬线 | `font-serif` | 13px |
| 数字/统计 | 等宽数字 | `font-mono` + `tabular-nums` | 按场景 |

字号只能使用：`text-xs`(12px) / `text-sm`(14px) / `text-base`(16px) / `text-lg`(18px) / `text-xl`(20px) / `text-2xl`(24px)

禁止自定义字号：`text-[15px]` / `text-[22px]`

---

## 阴影

| 场景 | 允许 |
|------|------|
| 弹出层/下拉菜单 | `shadow-md` |
| 抽屉/弹窗 | `shadow-lg` |
| 卡片 | 无阴影（用 `border` 代替） |
| 按钮 | 无阴影 |

禁止：
- 卡片装饰性阴影（`shadow-sm` / `shadow` 不用在卡片上）
- 自定义阴影（`shadow-[...]`）
- 文字阴影（`text-shadow`）

---

## 动画

- 过渡时长上限：200ms（`duration-200`）
- 允许的过渡属性：`opacity`、`transform`
- 允许的缓动：`ease-in-out`

禁止：
- `transition-all`（必须指定具体属性）
- 时长超过 200ms 的过渡
- 弹跳/弹性动画（`bounce` / `elastic`）
- 旋转加载动画（用骨架屏或 spinner 代替）
- 自定义关键帧（`@keyframes`）

---

## 图标

- 功能图标：使用 Element Plus Icons 或 Lucide Icons
- 五行/八卦符号：使用项目内 SVG 组件
- 禁止 emoji 作为功能图标（📋🔗⚖️ 等不允许）
- 禁止自定义纯 CSS 图标

---

## 排盘数据展示铁律

1. **四柱/卦爻/九宫 等核心数据必须使用等宽字体（`font-mono`）**，保证上下对齐
2. **干支组合不要拆分行**（"甲子"不能换行变成"甲\n子"）
3. **神煞/格局标签单行排列**，超过容器宽度时折叠为"+"号
4. **空数据用 "—" 占位**，不用 "无" 或留空
5. **数字用小写阿拉伯数字**，不用中文数字（写 "3" 不写 "三"）

---

## 自查清单（Claude 提交前端代码前逐项核对）

- [ ] 所有间距值在 [4, 8, 12, 16, 24, 32, 48, 64] 内
- [ ] 所有颜色来自 COLOR_TOKENS.ts，无硬编码色值
- [ ] 圆角使用 rounded-lg / rounded-md / rounded（无自定义）
- [ ] 无渐变背景
- [ ] 无卡片阴影（弹出层除外）
- [ ] 无动画时长超过 200ms
- [ ] 排盘数据区使用 font-mono
- [ ] 无 emoji 功能图标
- [ ] 页面使用指定模板组件（非裸 div 布局）
- [ ] 组件嵌套不超过 3 层（模板 → 业务 → 原子）
