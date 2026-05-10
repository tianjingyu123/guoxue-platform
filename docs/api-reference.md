# 热卜国学平台 — API 接口参考

> 自动生成于 2026-05-10 | 覆盖 48 个控制器 / 440+ 端点

## 通用规范

| 项目 | 说明 |
|------|------|
| 基础路径 | `/api/v1` |
| 响应格式 | `{ code: number, msg: string, data: T }` |
| 认证方式 | Bearer Token (JWT), 通过 `@ApiBearerAuth()` 装饰 |
| 分页参数 | `page` (默认1), `pageSize` (默认10-20) |
| 分页响应 | `{ items: T[], total, page, pageSize, totalPages }` |

---

## 1. 小程序首页 (mini)
`@Controller("mini")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /mini/home | 小程序首页聚合（轮播图/热门/最新/圈子） | 可选 |
| GET | /mini/contents | 精简内容流（分页+类型筛选） | 否 |
| GET | /mini/content/:id | 精简内容详情（含缓存） | 否 |
| GET | /mini/share-config | 微信分享卡片配置 | 否 |

## 2. 内容管理 (content)
`@Controller("contents")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /contents | 获取内容列表 | 否 |
| GET | /contents/:id | 内容详情 | 否 |
| POST | /contents | 创建内容 | 是 |
| PUT | /contents/:id | 更新内容 | 是 |
| DELETE | /contents/:id | 删除内容（管理员） | 是 |
| PUT | /contents/batch/status | 批量更新状态 | 是 |
| GET | /contents/stats/overview | 内容统计概览 | 是 |
| GET | /contents/featured | 精选内容（按浏览量） | 否 |

## 3. 古籍/经典 (classic)
`@Controller("classic")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /classic/books | 书籍列表 | 否 |
| GET | /classic/books/:id | 书籍详情 | 否 |
| GET | /classic/chapters/:id | 章节内容 | 否 |
| POST | /classic/books | 创建书籍 | 是 |
| POST | /classic/books/:bookId/chapters | 创建章节 | 是 |
| GET | /classic/progress/:bookId | 获取阅读进度 | 是 |
| PUT | /classic/progress/:bookId | 更新阅读进度 | 是 |
| GET | /classic/bookmarks | 书签列表 | 是 |

## 4. 课程 (course)
`@Controller("courses")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /courses | 课程列表 | 否 |
| GET | /courses/:id | 课程详情 | 否 |
| POST | /courses | 创建课程 | 是 |
| PUT | /courses/:id | 更新课程 | 是 |
| POST | /courses/:id/purchase | 购买课程 | 是 |
| GET | /courses/chapters/:chapterId/content | 章节完整内容 | 是 |
| PUT | /courses/chapters/:chapterId/progress | 更新学习进度 | 是 |
| POST | /courses/chapters/:chapterId/works | 提交作业 | 是 |
| GET | /courses/user/valid | 有效期内课程列表 | 是 |
| GET | /courses/:id/expiry-check | 检查课程是否过期 | 是 |

## 5. 圈子 (circle)
`@Controller("circles")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /circles | 圈子列表 | 否 |
| GET | /circles/:id | 圈子详情 | 否 |
| POST | /circles | 创建圈子 | 是 |
| POST | /circles/:id/join | 加入圈子 | 是 |
| GET | /circles/:id/posts | 帖子列表 | 否 |
| POST | /circles/:id/posts | 创建帖子 | 是 |
| GET | /circles/ranking | 圈子活跃度排行 | 否 |
| GET | /circles/:id/leaderboard | 成员贡献榜 | 否 |
| GET | /circles/:id/hot-content | 内容热度榜 | 否 |

## 6. 商城 (shop)
`@Controller("shop")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /shop/products | 商品列表 | 否 |
| GET | /shop/products/:id | 商品详情 | 否 |
| POST | /shop/products | 创建商品 | 是 |
| POST | /shop/orders | 创建订单 | 是 |
| GET | /shop/orders/my | 我的订单 | 是 |
| POST | /shop/orders/:id/pay/jsapi | JSAPI 支付（小程序） | 是 |
| POST | /shop/orders/:id/pay/native | Native 扫码支付（PC） | 是 |
| GET | /shop/coupons | 优惠券列表 | 否 |
| POST | /shop/freight-templates | 创建运费模板 | 是 |
| GET | /shop/freight-templates | 运费模板列表 | 否 |
| POST | /shop/reviews/:id/reply | 回复评价（管理员） | 是 |

## 7. 八字排盘 (paipan)
`@Controller("paipan")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /paipan/bazi/preview | 八字排盘预览（缓存10分钟） | 否 |
| POST | /paipan/bazi | 八字排盘并保存 | 是 |
| GET | /paipan/bazi | 八字排盘历史 | 是 |
| GET | /paipan/bazi/:id | 排盘记录详情 | 是 |
| POST | /paipan/bazi/analyze | AI 分析八字 | 是 |
| POST | /paipan/ziwei/preview | 紫微斗数预览 | 否 |
| POST | /paipan/ziwei | 紫微斗数排盘并保存 | 是 |

## 8. AI 能力 (ai)
`@Controller("ai")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /ai/asr/sentence | 一句话语音识别（60秒） | 是 |
| POST | /ai/ocr/general | 通用印刷体识别 | 是 |
| POST | /ai/ocr/handwriting | 手写体识别 | 是 |
| POST | /ai/ocr/ancient | 古籍文字识别（高精度） | 是 |
| POST | /ai/nlp/sentiment | 情感分析 | 是 |
| POST | /ai/nlp/keywords | 关键词提取 | 是 |
| POST | /ai/translate | 文本翻译 | 否（限流） |
| GET | /ai/usage-stats | AI 使用统计（管理员） | 是 |

## 9. 搜索 (search)
`@Controller("search")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /search | 全局搜索 | 否（限流） |
| GET | /search/hot | 热门搜索 | 否 |
| GET | /search/suggest | 搜索建议 | 否 |
| GET | /search/history | 我的搜索历史 | 是 |
| DELETE | /search/history | 清除搜索历史 | 是 |
| GET | /search/stats | 搜索统计 | 否 |

## 10. 智能推荐 (recommend)
`@Controller("recommend")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /recommend/:scene | 全页面智能推荐 | 否 |
| GET | /recommend/trending | 热门推荐 | 否 |
| GET | /recommend/related/:contentId | 相关内容 | 否 |
| GET | /recommend/personalized | 个性化推荐 | 是 |
| GET | /recommend/interests/defaults | 默认兴趣标签（冷启动） | 否 |
| POST | /recommend/interests | 保存用户兴趣标签 | 是 |
| POST | /recommend/log | 上报推荐曝光/点击 | 否（限流） |
| PUT | /recommend/insert | 设置分区强插（管理员） | 是 |
| DELETE | /recommend/insert/:position | 移除分区强插 | 是 |

## 11. 文章 (article)
`@Controller("articles")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /articles | 文章列表 | 否 |
| GET | /articles/:id | 文章详情 | 否 |
| GET | /articles/feed | 首页动态 | 否 |
| POST | /articles/circles/:circleId | 创建文章 | 是 |
| PUT | /articles/:id | 更新文章 | 是 |
| PUT | /articles/:id/audit | 审核文章（管理员） | 是 |

## 12. 电子书 (ebook)
`@Controller("ebook")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /ebook/books | 电子书列表 | 否 |
| GET | /ebook/books/:id | 电子书详情 | 否 |
| GET | /ebook/chapters/:id | 章节内容 | 否 |
| POST | /ebook/purchase/:ebookId | 购买电子书 | 是 |
| PUT | /ebook/progress/:ebookId | 更新阅读进度 | 是 |
| POST | /ebook/translate | AI 翻译 | 是 |
| POST | /ebook/lookup | 古文查词 | 是 |

## 13. 直播 (live)
`@Controller("live")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /live/rooms | 直播间列表 | 否 |
| GET | /live/rooms/:id | 直播间详情 | 否 |
| POST | /live/rooms | 创建直播间 | 是 |
| PUT | /live/rooms/:id/start | 开始直播 | 是 |
| PUT | /live/rooms/:id/end | 结束直播 | 是 |
| POST | /live/rooms/:id/book | 预约直播 | 是 |
| POST | /live/callback | 腾讯云直播回调 | 否 |

## 14. 视频 (video)
`@Controller("videos")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /videos | 视频列表 | 否 |
| GET | /videos/:id | 视频详情 | 否 |
| POST | /videos | 创建视频 | 是 |
| POST | /videos/vod/upload-signature | 获取VOD上传签名 | 是 |
| POST | /videos/vod/pull-upload | URL拉取上传 | 是 |
| POST | /videos/vod/clip | 视频剪辑 | 是 |
| POST | /videos/vod/callback | VOD事件回调 | 否 |

## 15. 互动 (interaction)
`@Controller("interaction")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /interaction/like | 点赞/取消点赞 | 是 |
| GET | /interaction/like/count | 点赞数量 | 否 |
| POST | /interaction/comment | 创建评论 | 是 |
| GET | /interaction/comment | 评论列表 | 否 |
| POST | /interaction/collect | 收藏/取消收藏 | 是 |
| POST | /interaction/follow | 关注/取消关注 | 是 |
| POST | /interaction/report | 提交举报 | 是 |

## 16. 用户 (user)
`@Controller("users")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /users/:id | 用户详情 | 否 |
| GET | /users/:id/stats | 用户统计 | 否 |
| GET | /users | 用户列表（管理员） | 是 |
| POST | /users/:id/roles | 分配角色 | 是 |
| PUT | /users/:id/status | 封禁/激活用户 | 是 |
| POST | /users/:id/follow | 关注用户 | 是 |
| GET | /users/:id/followers | 粉丝列表 | 否 |

## 17. 认证 (auth)
`@Controller("auth")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /auth/register/phone | 手机号注册 | 否（限流） |
| POST | /auth/login/phone | 手机号密码登录 | 否（限流） |
| POST | /auth/login/sms | 短信验证码登录 | 否（限流） |
| POST | /auth/sms/send | 发送短信验证码 | 否（限流） |
| POST | /auth/login/wechat | 微信登录（H5/小程序） | 否（限流） |
| POST | /auth/login/mini-phone | 小程序一键登录 | 否（限流） |
| GET | /auth/me | 获取当前用户信息 | 是 |
| PUT | /auth/profile | 更新个人资料 | 是 |

## 18. 仪表盘 (dashboard)
`@Controller("dashboard")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /dashboard/stats | 统计数据 | 是 |
| GET | /dashboard/trends | 趋势数据 | 是 |
| GET | /dashboard/revenue | 营收概览 | 是 |
| GET | /dashboard/realtime | 实时数据 | 是 |
| GET | /dashboard/bigscreen | 实时大屏 | 是 |
| GET | /dashboard/funnel | 转化漏斗 | 是 |
| GET | /dashboard/circles/:id | 圈子专项看板 | 是 |
| GET | /dashboard/today-overview | 今日概览 | 是 |

## 19. 营销管理 (marketing)
`@Controller("marketing")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /marketing/flash-sales | 创建秒杀活动 | 是 |
| GET | /marketing/flash-sales | 秒杀活动列表 | 是 |
| POST | /marketing/group-buys | 创建拼团活动 | 是 |
| POST | /marketing/coupons | 创建优惠券模板 | 是 |
| POST | /marketing/coupons/:id/grant | 发放优惠券 | 是 |
| POST | /marketing/pages | 创建微页面 | 是 |
| POST | /marketing/full-reductions | 创建满减送活动 | 是 |
| GET | /marketing/full-reductions/active | 进行中的满减活动 | 否 |

## 20. 风控中心 (risk-control)
`@Controller("risk-control")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /risk-control/rules | 创建预警规则 | 是 |
| GET | /risk-control/alerts | 预警列表 | 是 |
| PUT | /risk-control/alerts/:id/handle | 处理预警 | 是 |
| GET | /risk-control/fraud-detections | 刷单检测列表 | 是 |
| POST | /risk-control/fraud-detections/scan | 手动触发刷单扫描 | 是 |
| GET | /risk-control/user-timeline/:userId | 用户行为时间线 | 是 |
| GET | /risk-control/device-fingerprints | 设备指纹列表 | 是 |

## 21. 财务管理 (finance)
`@Controller("finance")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /finance/reconciliation | 触发对账 | 是 |
| GET | /finance/reconciliation | 对账记录列表 | 是 |
| POST | /finance/invoices | 创建发票申请 | 是 |
| GET | /finance/settlements | 结算单列表 | 是 |
| POST | /finance/settlements/generate | 按周期生成结算单 | 是 |
| GET | /finance/withdrawals | 提现申请列表 | 是 |
| GET | /finance/reports/monthly | 月报数据 | 是 |
| POST | /finance/freeze | 冻结资金 | 是 |
| POST | /finance/unfreeze | 解冻资金 | 是 |

## 22. 系统配置 (system)
`@Controller("system")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /system/configs | 获取所有系统配置 | 是 |
| PUT | /system/configs/:key | 更新系统配置 | 是 |
| GET | /system/health | 系统健康检查 | 否 |
| GET | /system/audit-logs | 审计日志 | 是 |
| GET | /system/public/banners | 首页Banner（公开） | 否 |
| POST | /system/site-notices | 创建全站公告 | 是 |
| POST | /system/member-configs | 创建/更新会员等级配置 | 是 |
| POST | /system/export/excel | Excel导出 | 是 |
| POST | /system/import/products | 批量导入商品 | 是 |

## 23. 实名认证 (identity)
`@Controller("identity")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /identity/ocr | 身份证OCR识别 | 是 |
| POST | /identity/verify | 姓名+身份证号核验 | 是 |
| POST | /identity/face/token | 获取人脸核身URL | 是 |
| GET | /identity/face/result/:token | 查询人脸核身结果 | 是 |
| GET | /identity/admin/audit-list | 审核列表（管理员） | 是 |
| POST | /identity/admin/approve/:id | 通过实名认证 | 是 |
| POST | /identity/admin/reject/:id | 拒绝实名认证 | 是 |

## 24. 虚拟币 (coin)
`@Controller("coin")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /coin/balance | 我的余额 | 是 |
| GET | /coin/transactions | 交易流水 | 是 |
| GET | /coin/tiers | 充值档位列表 | 否 |
| POST | /coin/spend | 消费虚拟币 | 是 |
| POST | /coin/admin/recharge | 管理员充值 | 是 |
| GET | /coin/gifts | 礼物列表 | 否 |
| POST | /coin/gifts/send | 赠送礼物 | 是 |
| GET | /coin/gifts/rank/:liveRoomId | 礼物排行榜 | 否 |

## 25. 通知 (notification)
`@Controller("notifications")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /notifications | 我的通知列表 | 是 |
| GET | /notifications/unread-count | 未读通知数量 | 是 |
| PUT | /notifications/:id/read | 标记已读 | 是 |
| PUT | /notifications/read-all | 全部已读 | 是 |
| POST | /notifications | 发送通知（管理员） | 是 |
| GET | /notifications/preferences | 通知偏好设置 | 是 |
| PUT | /notifications/preferences | 更新通知偏好 | 是 |

## 26. 智能体 (bot)
`@Controller("bots")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /bots | 智能体列表 | 否 |
| GET | /bots/:id | 智能体详情 | 否 |
| POST | /bots/:id/chat | 对话（非流式） | 是 |
| POST | /bots/:id/chat/stream | 对话（流式SSE） | 是 |
| POST | /bots/:id/bind-circle | 绑定到圈子 | 是 |
| POST | /bots/:id/knowledge | 添加知识库条目 | 是 |

## 27. 研究院 (institute)
`@Controller("institute")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /institute/members | 加入研究院 | 是 |
| GET | /institute/my | 我的研究院信息 | 是 |
| GET | /institute/members | 成员列表 | 否 |
| GET | /institute/events | 活动列表 | 否 |
| POST | /institute/events | 创建活动（管理员） | 是 |
| POST | /institute/members/:id/tasks | 添加年度任务 | 是 |

## 28. 收益分账 (revenue)
`@Controller("revenue")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /revenue/summary | 我的收益汇总 | 是 |
| GET | /revenue/earnings | 我的收益明细 | 是 |
| GET | /revenue/platform/overview | 平台营收总览（管理员） | 是 |
| GET | /revenue/platform/trends | 平台营收趋势（管理员） | 是 |
| GET | /revenue/stats | 用户收入统计（管理员） | 是 |

## 29. 分佣 (commission)
`@Controller("commission")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /commission/configs | 分佣配置（管理员） | 是 |
| GET | /commission/station-earnings/:stationId | 分站收益 | 是 |
| POST | /commission/withdrawal | 申请提现 | 是 |
| GET | /commission/withdrawals | 我的提现记录 | 是 |
| PUT | /commission/admin/withdrawals/:id | 审核提现（管理员） | 是 |
| POST | /commission/referral-link | 创建推荐链接 | 是 |
| GET | /commission/track/:code | 跟踪推荐链接点击 | 否 |

## 30. IM 即时通讯 (im)
`@Controller("im")`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /im/user-sig | 生成 UserSig | 是 |
| POST | /im/account/import | 导入 IM 账号 | 是 |
| POST | /im/groups | 创建群组 | 是 |
| POST | /im/groups/:groupId/msg | 发送群消息 | 是 |
| GET | /im/groups/:groupId/history | 群组历史消息 | 是 |
| POST | /im/c2c/send | 发送单聊消息 | 是 |
| POST | /im/friends | 添加好友 | 是 |
| GET | /im/friends | 好友列表 | 是 |

## 附录：其他模块速览

| 模块 | 控制器路径前缀 | 核心端点 |
|------|---------------|----------|
| 评论 (comment) | /comment | CRUD 评论、审核 |
| 审核 (audit) | /audit | 内容审核、审核规则、敏感词 |
| 上传 (upload) | /upload | 文件上传（图片/视频/通用） |
| 离线活动 (offline) | /offline | 驿站管理、线下预约 |
| 音视频通话 (call) | /call | 通话、连麦 |
| 短信 (sms) | /sms | 短信发送、模板管理 |
| 邮件 (email) | /email | 邮件发送、模板配置 |
| 语音合成 (tts) | /tts | 文本转语音 |
| 分站 (station) | /station | 分站管理、分站配置 |
| 地图 (map) | /map | 地图服务、POI查询 |
| 健康检查 (health) | /health | 系统健康检查 |
| 指标 (metrics) | /metrics | Prometheus 指标导出 |
| 功能开关 (feature-flag) | /admin/feature-flags | 功能开关管理 |
| A/B 测试 (ab-test) | /recommend/ab-tests | A/B 测试配置与结果 |
| 推荐规则 (recommend-rule) | /admin/recommend/rules | 推荐规则管理 |
| Webhook (webhooks) | /webhooks | Webhook 管理、事件推送 |
| 商品导入 (import) | /system | 批量导入商品 |
| 问答 (question) | /question | 提问/回答 |

---

*本文档由 `apps/server/src/modules/` 下 48 个 `*.controller.ts` 文件提取生成。*
