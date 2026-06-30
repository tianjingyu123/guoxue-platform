
---

## 阶段二前端接线·逐项清单（供新会话直接执行）

> 数据源依赖标注：🟢=不依赖腾讯账号（现在可做可验证） 🔴=依赖腾讯账号（数据在腾讯云，后端未配置会 error 三态）
> 所有改造遵循前端数据流铁律：去 `if(true)` mock、三态(loading/error/empty)、写操作 `submitting` 防重、错误不回退假 mock。

### A. id 体系 number→string（贯穿前置·🟢）
- `im-data.ts` 现状：`ConversationItem.targetId:number`、`CURRENT_USER_ID=0`、各 mock id 为 number。
- 腾讯 identifier = `user.id`(uuid string)。改造：所有对接后端/腾讯的 id 用 string；纯前端展示可保留。
- 影响面：12 页凡 `navigateTo` 传 targetId、`getChatTarget(id)`、`chat` 页 onLoad 接 id 处。
- 验证：`vue-tsc --noEmit` 0 错误。

### B. chat 单聊页（pkg-im/im/chat/index.vue·权限🟢 / 消息🔴）
- 🟢 **权限 UI 真连**：onLoad 调 `imApi.getRelationPolicy(targetId:string)` → `toChatPermission()` 驱动输入框禁用/提示。替换页面内对 `getChatPermission()` 的调用。
- 🔴 消息历史 `getChatHistory`、发送 `sendMessage`：腾讯托管，账号到位后接 TIM SDK。当前去 mock 后走 error 三态。
- 三态 + 发送 `submitting` 防重。

### C. imApi 13 方法去 mock 对照表
| 方法 | 后端真实路径 | 依赖 |
|---|---|---|
| getRelationPolicy | `GET /im/relation/:id` ✅已建 | 🟢 已真连 |
| getConversations | 腾讯会话（需聚合端点，后端待建） | 🔴 |
| getChatTarget | 可拆：基础资料走 user 接口 + 关系走 /im/relation | 🟡 部分🟢 |
| getChatHistory / sendMessage | 腾讯 c2c（TIM SDK） | 🔴 |
| getMessages（通知中心） | notification 模块（查证是否已有端点） | 🟢 可能 |
| getGroupList/Detail/Members/ChatHistory | 腾讯群（TIM） | 🔴 |
| getFriends / getFriendRequests / handleFriendRequest | `/im/friends*`（腾讯 SNS 托管，已有 controller） | 🔴 |
| getGroupSettings / getGroupPermissions | 本地+腾讯混合 | 🟡 |

### D. 优先级建议（新会话）
1. 🟢 先做 B 的权限真连 + getMessages 通知中心（若 notification 后端就绪）——可立即验证闭环。
2. 🟢 A 的 number→string 重构（为账号到位铺路）。
3. 🔴 其余等阶段四 TIM SDK 一起，避免空转。

### E. 阶段三付费引导（业务规则·先提案再做）
- 老师/达人个人主页：付费问答入口权重 > 私信入口；私信入口按 `/im/relation` 的 relation 动态降级（陌生人/单向关注时弱化或引导付费咨询）。
- 涉及"删/弱化功能入口"属业务规则，按 CLAUDE.md 须先提案确认。

---
## ✅ 阶段一彻底收口（2026-06-28）
付费判定补全四类（圈子/课程/付费问答/连麦咨询），真实字段见记忆 [[guoxue-im-progress]]。端到端连库验证 RUNTIME_OK，jest 61 过，tsc 0，已 build + pm2 restart 上线。两表+默认配置在库。
**真实字段速查**：Course.userId(讲师)、PaidQuestion.askerId/answererId、ConsultCall.callerId/expertId、Order{userId,type:COURSE,status:PAID,targetId}。不存在 CourseEnrollment/Question。
