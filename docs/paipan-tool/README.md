# 排盘工具 — 设计标准体系

> 创新线排盘工具的完整设计标准。Claude 和 Pixso 的共同工作基础。

---

## 文件索引

| 文件 | 用途 | 谁用 |
|------|------|------|
| [COLOR_TOKENS.ts](COLOR_TOKENS.ts) | 全局颜色令牌（唯一来源） | Claude 写代码 + Pixso 取色值 |
| [DESIGN_CONSTRAINTS.md](DESIGN_CONSTRAINTS.md) | 视觉约束（否定清单） | Claude 提交代码前自查，Pixso 设计边界 |
| [TEMPLATE_MAP.md](TEMPLATE_MAP.md) | 页面→模板映射（5 种模板 × 32 个工具） | Claude 选布局 + Pixso 出设计稿 |
| [COMPONENT_CATALOG.md](COMPONENT_CATALOG.md) | 组件目录（原子→业务→模板） | Claude 出 Props + Pixso 出视觉稿 |
| [INTERACTION_RULES.md](INTERACTION_RULES.md) | 交互行为规则（竞品锚定） | Claude 写交互 + Pixso 验证 |
| [WORK_DIVISION.md](WORK_DIVISION.md) | Claude × Pixso 分工方案 | 双方对焦 |
| [PIXSO_HANDOFF_TEMPLATE.md](PIXSO_HANDOFF_TEMPLATE.md) | Pixso 设计需求单标准模板 | Claude 提需求时填写 |

---

## 使用流程

```
新工具/新页面开发：
  1. Claude 读 TEMPLATE_MAP.md → 确定模板
  2. Claude 读 COMPONENT_CATALOG.md → 确定组件、定义 Props
  3. Claude 填 PIXSO_HANDOFF_TEMPLATE.md → 提需求给 Pixso
  4. Pixso 出设计稿（在 DESIGN_CONSTRAINTS.md + COLOR_TOKENS.ts 约束内）
  5. Claude 拿到设计稿 → 用模板+业务组件+shadcn/ui 写代码
  6. Claude 按 INTERACTION_RULES.md 实现交互
  7. Claude 对照 DESIGN_CONSTRAINTS.md 自查
  8. Pixso 做视觉还原度验收（截图 vs 设计稿）
```

---

## 设计哲学

```
排盘 = 数学计算 → 结构化输出。不是 AI 对话。
工具 = 辅助老师，不替代老师。多流派、可溯源、可批注。
视觉 = 庄重、专业、信息密度高。不花哨、不卡通、不赛博。
交互 = 可预期、低延迟、少动画。对标问真/热卜的成熟模式。
定制 = 用户级沙箱，不影响主流体验。需求→投票→晋升。
分工 = Pixso 出视觉标准，Claude 写代码，互不越界。
```

---

## 更新日志

| 日期 | 变更 |
|------|------|
| 2026-05-30 | 初始版本，8 份文件全部就绪 |
| 2026-05-30 | 设计角色从 V0 切换到 Pixso，V0_HANDOFF_TEMPLATE → PIXSO_HANDOFF_TEMPLATE |
