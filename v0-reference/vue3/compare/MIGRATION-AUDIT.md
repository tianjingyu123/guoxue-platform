# 迁移进度审计报告（2026-06-19）

> 起因：怀疑"已迁的 vue 页面可能是旧版"，担心白做工。本报告做了一次原型全量 vs route-map 的交叉核对。

## 一、核心结论：没有白做工 ✅

**最担心的"迁了旧版而漏了新版"——完全排除。**

原型 `app/` 里存在大量**单数/复数成对目录**，它们是同一功能的新旧两代。逐对验证规律 100% 一致：**已迁的永远是新版（更全的那一版），旧版一个都没碰过。**

| 旧版（死代码，从未迁） | 新版（已迁的就是它） | 证据 |
|---|---|---|
| `/circle` 9页 | ✅ `/circles` 37页全迁 | 旧版本地 mock，新版 `circleApi` |
| `/course` 2页 / `/courses-list` 1页 | ✅ `/courses` 12页全迁 | |
| `/store` 1页 | ✅ `/shop` 已迁 | |
| `/article` `/notice` `/ranking` `/topic` `/expert` `/video`(单数) | 新版为对应复数目录 | 部分新版尚未迁，见下 |

→ 这些已确认废弃的旧版（circle/course/courses-list/store，共13页）已在 route-map 标 `status=skipped`，注明新版替代，杜绝以后再误算。

## 二、口径更正

之前口播的"未迁 327 页"是**统计 bug**：归一化正则没把原型的 `[id]` 占位符转换为与 route-map 的具体数字（`/circles/1`）对齐，导致已迁页大量误判为未迁。修正后真实口径：

| 口径 | 页数 |
|---|---|
| 原型 page.tsx 文件总数 | 534 |
| 剔除 re-export 别名页 | -14 |
| 剔除旧版重复目录（circle/course/store/video…） | -约20 |
| 剔除 demo/common/error 等非产品页 | -约19 |
| **有效产品页（分母）** | **约 481** |
| ✅ **已迁（route-map 登记）** | **196** |
| ⬜ **真正待迁** | **285** |
| **完成度** | **约 40%** |

route-map 状态分布：golden 48 / reviewed 58 / migrate 94（含排盘12+诗词4）/ skipped 14。

## 三、"做过的板块"真相：做了大部分，但没做完

mine/settings/search/classics 等板块的**核心常用子页确实已迁**（如 mine 的 settings/wallet/security/points/change-password 等 22 页），印证了"做过"的印象。但每个板块**仍有外围子页未迁**，例如 `/mine` 还剩：achievements、follows、edit-profile、memberships、my-courses、role-panels/*、applications、bookings、invite-records、learning-dashboard、heritage-verify、identity-switch、teen-mode 等十余页。

## 四、真正待迁 285 页（完整清单见 `PENDING-PAGES.txt`）

- 🛠 **管理端/后台：80 页** —— merchant商家21 / institute机构14 / station分站11 / operator运营7 / manage管理6 / earnings收益4 / creator创作者3 / admin·bots·content·publish各2 / design·drafts·editor·teacher等各1
- 🧑 **用户端：205 页** —— mine我的19 / offline线下19 / competition赛事13 / videos视频11 / settings设置10 / im即时通讯7 / classics典籍6 / legal法务6 / bounty悬赏5 / search搜索5 / help·points·qa各4 / 及其余约90页（auth/chat/fortune/learning/notices/wallet/coupons/seckill/vip 等）

## 五、给后续（含 Claude Code）的提醒

1. **唯一真源仍是 `route-map.json`**。新版复数目录里若有未登记页，按 `PENDING-PAGES.txt` 补迁后登记。
2. **尚未处理的旧/新成对**：video/videos、notice/notices、ranking/rankings、topic/topics、expert/experts —— 这些**新版（复数）自己也还没迁**，迁新版时一并把旧版（单数）标 skipped。
3. 旧版判定方法：单数目录 + 本地硬编码 mock + 内部导航少 = 旧版；复数目录 + 数据更全 = 新版。
