# 废弃页隔离报告（旧套/死页清单）

> 生成于 2026-06-20，供 Claude Code 据此执行「清除 / 替换」。
> 权威判定依据（按可信度排序）：
> 1. **redirect 方向**：`app/X` 内 `redirect("/Y")` → X 是旧页、Y 是活页（最强信号）。
> 2. **`/profile` 主页菜单直链**：原型「我的」唯一权威入口，它链向的顶级路径才是活页。
> 3. **顶级页是否真实活页**：替代候选页必须是真实内容页（非 alias / 非 redirect）。
> 4. **可达性遍历**：`compare/audit-reachability.mjs`，仅作候选信号（动态路由/深层跳转有假阳性，**不可单独定罪**）。

---

## 背景：为什么会有旧套

原型 `app/**` 是多轮迭代累积，**最新完整产品的页面数远少于目录里的页面数**。大量历史页未删除，与新版**并存**，典型表现为「同功能两套路径」：
- 设置：旧 `/mine/settings*`(10页) ↔ 新 `/settings*`(10页，`/profile` 链接的活套)
- 钱包：旧 `/mine/wallet` ↔ 新 `/wallet`(`/profile` 链接的活套)
- 「我的」子页：旧 `/mine/{downloads,follows,...}` ↔ 新顶级 `/downloads`、`/follows`…

**唯一权威入口是 `/profile`（不是 `/mine`，`/mine` 主页在原型根本不存在）。** `/profile` 菜单几乎只链接顶级/异名路径，`/mine/*` 中仅 `/mine/applications` 被直链。

---

## A. 需要【替换】的已迁页（旧套，有活页替代）

这些 vue 页此前由 v0 迁移，但迁的是**旧套原型**。请用「活页替代」对应的原型重新迁移覆盖，然后删除旧 vue。

| 已迁 vue 文件（旧套，待废弃） | 迁自旧原型 | ✅ 应替换为活页原型 | 证据 |
|---|---|---|---|
| `vue3/src/pkg-mine/edit-profile/` | `/mine/edit-profile` | `/profile/edit`（golden，A 已锁定迁移） | profile「编辑资料」→ `/profile/edit` |
| `vue3/src/pkg-mine/downloads/` | `/mine/downloads` | `/downloads`（394行真实活页） | profile「我的电子书」→ `/downloads` |
| `vue3/src/pkg-mine/follows/` | `/mine/follows` | `/follows`（196行真实活页） | profile 关注/粉丝 → `/follows` |
| `vue3/src/pkg-mine/my-courses/` | `/mine/my-courses` | `/learning`（286行真实活页） | profile「我的课程」→ `/learning` |
| `vue3/src/pkg-mine/memberships/` | `/mine/memberships` | `/vip`（523行真实活页） | profile 会员卡 → `/vip` |
| `vue3/src/pkg-mine/invite-records/` | `/mine/invite-records` | `/invite` + `/invite/history`（354行真实活页） | `/invite` 是活的邀请系统，旧 invite-records 已被取代 |

> 注：`/profile/edit` 为 A 账号 golden 锁定页，替换迁移应由对应 owner 处理或获明确授权。

---

## B. 需要【清除】的已迁页（废弃功能，最新原型已无，无替代）

全局（含 components）无任何页面链接，可达性遍历不可达，且**无顶级活页对应** → 判定为最新产品已砍掉的功能。建议直接删除 vue，不需替换。

| 已迁 vue 文件（待删除） | 迁自原型 | 说明 |
|---|---|---|
| `vue3/src/pkg-mine/achievements/` | `/mine/achievements` | 成就墙，全局无人链接，最新原型无此功能 |
| `vue3/src/pkg-mine/learning-dashboard/` | `/mine/learning-dashboard` | 学习看板，同上 |
| `vue3/src/pkg-mine/bookings/` | `/mine/bookings` | 预约记录，同上 |

> 如产品确认仍需要其中某功能，再按对应活页路径重迁；当前证据下应隔离。

---

## C. 已正确迁移的活页（保留，勿动）

- `vue3/src/pkg-mine/applications/`（`/mine/applications` — profile 直链，活页）
- `vue3/src/pkg-mine/submissions/`（`/mine/submissions` — **活页**：顶级 `/submissions` 是 `redirect("/mine/submissions")`，旧投稿页已合并到此）
- `vue3/src/pkg-settings/*`（第①套 `/settings*` 10页 — profile 设置入口链接的活套）
- `vue3/src/pkg-wallet/*`（第①套 `/wallet*` 3页 — profile 国学币入口链接的活套）

---

## D. 此前已隔离的两套（已在 route-map 标 deprecated）

| 旧套 vue | 旧原型 | 活页替代 |
|---|---|---|
| `pkg-mine/settings`,`security`,`change-password`,`change-phone`,`payment-password`,`bind-accounts`,`privacy-authorization`,`blacklist`,`delete-account`,`delete-account-result` | `/mine/settings*` | `/settings*`（第①套） |
| `pkg-mine/wallet` | `/mine/wallet` | `/wallet`（第①套） |

---

## E. B 账号已上线的旧套（owner=B，reviewed，代码勿擅动；建议 CC 评估）

这些是 B 账号已部署的 `/mine/*` 页，与顶级真实活页同功能重复。**未由 v0 改动**，列出供 CC 评估是否下线：

| B 已上线 vue | 旧原型 | 顶级活页 | 活页迁移状态 |
|---|---|---|---|
| `pkg-mine/points` | `/mine/points` | `/points`（336行真实活页） | ✅ **断链已修复**(2026-06-22)。⚠️更正：`pkg-mine/points/index` 实为 `/points` **活页**的落盘位置(前轮 owner V 已用 API 版原型重做覆盖，见 route-map 1092)，**并非孤岛**。本轮补 `/points` 系列 4 条 router 映射修复 profile/wallet 入口断链。真正的孤岛是已不存在的旧 `/mine/points` 设计 |
| `pkg-mine/history` | `/mine/history` | `/history`（239行真实活页） | ✅ **v0 已迁**(2026-06-22)→ `pkg-mine/browse-history`，并补 `/history` 映射修复 profile 断链。`pkg-mine/history` 现确认为孤岛旧版 |
| `pkg-mine/my-likes` | `/mine/my-likes` | `/likes`（244行真实活页） | ✅ **v0 已迁**(2026-06-22)→ `pkg-mine/likes`，并补 `/likes` 映射(profile 顶部「获赞」指向)。`pkg-mine/my-likes` 现确认为孤岛旧版 |
| `pkg-mine/my-comments` / `received-comments` | `/mine/my-comments` / `/mine/received-comments` | **无顶级活页**(已核实) | ✅ **已核实(2026-06-22)，无需处理**。三角验证：①原型只有 `/mine/my-comments`+`/mine/received-comments`，无顶级 `/comments` 重复页 ②vue 页均已迁好 ③router 映射已存在(router.ts:176/177)。⚠️但原型和 vue 中**均无任何入口链接到这俩**(grep 全空)——是原型作者建页未接入口的「完整孤岛对」，非断链。映射齐全可经直接 URL 访问，保留即可，**之前列入"B 重复页"为误判**(它们不与任何顶级活页重复) |

> 📌 **v0 补充(2026-06-22)**：profile 菜单/统计指向的三个活页(`/history`、`/likes`、`/points`)断链**已全部修复**。其中 `/history`、`/likes` 为本轮新迁页；`/points` 是前轮已迁好(`pkg-mine/points/index`)仅补 router 映射。`/points` 页 capture diff 已从 20.30% 优化至 10.01%(修复 hero 渐变色不匹配 + 间距对齐原型 Tailwind 值，详见 `HANDOFF_TO_CLAUDE_CODE.md` 第 E-4 节)，剩余为亚像素漂移+字形噪声。`/mine/my-comments`+`/mine/received-comments` 已核实(见上表)：无顶级活页、映射齐全、是无入口的孤岛对，无需处理。**至此本批次 `/mine/*` 重复页/孤岛核查全部完成。**

---

## F. 后续工作铁律（所有账号/窗口遵循）

1. **判定活页只认 `/profile` 菜单 + redirect 方向**，不要照 `app/mine/` 目录顺序盲迁。
2. **迁移前先查可达性**：`node vue3/compare/audit-reachability.mjs`（输出 `_audit-orphans.json`），不可达页先存疑、查 redirect/profile 链接，再决定迁或弃。
3. `/mine/*` 默认存疑（多为旧套），**例外**：`/mine/applications`、`/mine/submissions` 是活页。
4. 标 deprecated 的页代码暂保留（尤其 B 的 reviewed 页），仅在 route-map + 本文件登记隔离，不擅自删除已上线页。
