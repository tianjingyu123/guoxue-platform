# 原型唯一真源（SOURCE OF TRUTH）

> 确立于 2026-06-25。V0→Vue3 还原 / 优化时，**只准参考下面这一份原型**。
> 背景：历史上并存多份原型与多份 Vue 副本，导致部分页面对接了过时原型（详见下方"混乱来源"）。本文件终结歧义。

## ✅ 唯一权威原型
```
C:\Users\Administrator\Desktop\V0-6.24\guoxue\v0-reference\
```
V0 最新一版（2026-06-24 导出）。Next.js App Router，路由 = `app/<路径>/page.tsx`。

## ✅ 唯一正式 Vue 工程
```
C:\Users\Administrator\Desktop\guoxue-platform\apps\mobile\
```
uni-app + Vue3。路由见 `src/pages.json`。其余 Vue 目录均非正式工程。

## ⛔ 混乱来源——禁止再参考，待隔离归档
| 来源 | 性质 |
|---|---|
| `guoxue-platform/v0-reference/`（项目内） | 旧拷贝原型 + `vue3/` 迁移中间产物 + `proto-ref-app/` |
| `桌面/V0还原VUE3代码6.23版/` | 6.23 旧版 Vue 还原 |
| `桌面/V0-6.24` 内同功能的历史页 | 见下方"同功能多套版本" |

> 物理隔离注意：`apps/mobile/compare/` 体系引用了 `v0-reference/vue3/compare/gen-manifest.mjs`，归档前需先解依赖或确认 compare 已废弃（其 `DEPRECATED.md` 已标弃用）。

## ⚠️ 核心认知（用户 2026-06-25 指示，最高优先级）
**原型本身也是多轮迭代的不成熟产物，不是圣经。** 还原目标是"最合理的成品"，不是"不成熟模型的复刻品"。
- 发现原型设计不合理处 → 按通用产品/UX 标准**直接优化**（信息架构/交互/视觉/文案/三态/性能/可用性）。
- 业务规则（付费/权益/数据语义/删功能/品牌大改）→ **先提案再改**。
- 每处优化说明：原来怎样 → 改成怎样 → 为什么更合理。
- 关联授权见 memory `guoxue-frontend-optimization-mandate`、`guoxue-circle-join-cash-only`。

## 同功能多套版本（每个都需先判定"活页"再还原/优化）
6.24 原型内同功能并存多套历史页（V0 迭代不删旧页）：
`circle / circles / my-circles`、`video / videos`、`shop / mall`、`course / courses / courses-list / learn / learning`、`agent / agents`、`expert / experts` …

**活页判定法**（按可信度）：① 底部 tab / `/profile` 主菜单直链 → 链向的才是活页；② `redirect()` 方向 → 被 redirect 的是旧页；③ 功能完整度。
前人已对个人中心(mine)模块判定，见 `apps/mobile/compare/DEPRECATED.md`。

## 工作流（每个模块逐一走完四闸）
```
第0闸 来源治理 → 锁定本文件的唯一真源
第1闸 版本厘清 → 这功能哪套是活页？
第2闸 保真校验 → 当前 Vue 还原对了吗？(compare 截图 diff)
第3闸 合理性优化 → 设计本身最优吗？直接改 + 说明理由
```
