# 热卜国学平台 — 核心 API 接口文档

> OpenAPI 3.0 摘要，覆盖 13 个业务模块。完整 Swagger 文档见 `/api-docs`。

## 通用约定

- **Base URL:** `https://your-domain.com/api/v1`
- **响应格式:** `{ code: number, msg: string, data: any }`
- **认证:** `Authorization: Bearer <jwt_token>`（Swagger 中可在线获取）
- **分页:** `{ page, pageSize }` → `{ data, total, page, pageSize }`
- **错误码:** 400 参数错误 / 401 未登录 / 403 无权限 / 404 不存在 / 409 冲突 / 429 限流

---

## 1. 用户与认证 (auth + user)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|:---:|
| POST | `/auth/register/phone` | 手机号注册 | - |
| POST | `/auth/login/phone` | 密码登录 | - |
| POST | `/auth/login/sms` | 短信验证码登录 | - |
| POST | `/auth/sms/send` | 发送验证码 | - |
| POST | `/auth/login/wechat` | 微信授权登录 | - |
| POST | `/auth/login/mini-phone` | 小程序一键登录 | - |
| GET | `/auth/me` | 获取当前用户 | JWT |
| PUT | `/auth/profile` | 更新个人资料 | JWT |
| PUT | `/auth/password` | 修改密码 | JWT |
| GET | `/users` | 用户管理列表 | ADMIN |
| GET | `/users/:id` | 用户详情 | JWT |
| PUT | `/users/:id/status` | 封禁/激活用户 | ADMIN |
| POST | `/users/:id/roles` | 分配角色 | ADMIN |
| DELETE | `/users/:id/roles/:roleType` | 移除角色 | ADMIN |
| GET | `/users/:id/stats` | 用户统计 | JWT |
| POST | `/users/:id/follow` | 关注用户 | JWT |
| DELETE | `/users/:id/follow` | 取消关注 | JWT |

---

## 2. 首页信息流 (recommend + article + content)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/recommend/:scene` | 场景化推荐（home/feed/related） |
| GET | `/recommend/trending` | 热门内容 |
| GET | `/recommend/personalized` | 个性化推荐 |
| GET | `/articles/feed` | 文章动态流 |
| GET | `/articles` | 文章列表 |
| GET | `/articles/:id` | 文章详情 |
| GET | `/contents` | 通用内容列表 |
| GET | `/contents/featured` | 精选内容 |
| GET | `/mini/home` | 小程序首页聚合（30s 缓存） |

---

## 3. 圈子系统 (circle)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/circles` | 创建圈子 |
| GET | `/circles` | 圈子列表（搜索/筛选） |
| GET | `/circles/:id` | 圈子详情 |
| PUT | `/circles/:id` | 更新圈子 |
| POST | `/circles/:id/join` | 加入圈子 |
| POST | `/circles/:id/leave` | 退出圈子 |
| GET | `/circles/:id/members` | 成员列表 |
| PUT | `/circles/:id/members/:userId/role` | 更新成员角色 |
| DELETE | `/circles/:id/members/:userId` | 移除成员 |
| POST | `/circles/:id/posts` | 创建帖子 |
| GET | `/circles/:id/posts` | 帖子列表 |
| PUT | `/circles/:id/posts/:postId` | 更新帖子 |
| POST | `/circles/:id/posts/:postId/essence` | 设为精华 |
| POST | `/circles/:id/posts/:postId/top` | 置顶帖子 |
| GET | `/circles/:id/expert/:userId` | 达人配置（提问/连麦价格） |

---

## 4. 课程系统 (course)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/courses` | 创建课程 |
| GET | `/courses` | 课程列表 |
| GET | `/courses/:id` | 课程详情 |
| PUT | `/courses/:id` | 更新课程 |
| POST | `/courses/:id/purchase` | 购买课程 |
| GET | `/courses/:id/access` | 权限检查 |
| POST | `/courses/:id/chapters` | 添加章节 |
| GET | `/courses/chapters/:chapterId/content` | 获取章节内容（鉴权） |
| PUT | `/courses/chapters/:chapterId/progress` | 更新学习进度 |
| POST | `/courses/chapters/:chapterId/works` | 提交作业 |
| PUT | `/courses/works/:workId/score` | 批改作业 |
| POST | `/courses/:id/reviews` | 课程评价（1-5星） |
| GET | `/courses/:id/rating` | 评分统计 |
| GET | `/courses/dashboard` | 学习看板 |
| GET | `/courses/:id/stats` | 讲师统计 |

---

## 5. 商城 (shop)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/shop/products` | 创建商品 |
| GET | `/shop/products` | 商品列表 |
| GET | `/shop/products/:id` | 商品详情 |
| POST | `/shop/orders` | 创建订单 |
| GET | `/shop/orders/my` | 我的订单 |
| POST | `/shop/orders/:id/pay/jsapi` | 微信 JSAPI 支付 |
| POST | `/shop/orders/:id/pay/native` | 微信 Native 支付 |
| POST | `/shop/pay/notify` | 微信支付回调 |
| POST | `/shop/alipay/notify` | 支付宝回调 |
| PUT | `/shop/orders/:id/ship` | 发货 |
| PUT | `/shop/orders/:id/refund` | 退款 |
| POST | `/shop/coupons` | 创建优惠券 |
| POST | `/shop/coupons/:id/claim` | 领取优惠券 |
| GET | `/shop/products/:id/reviews` | 商品评价 |

---

## 6. 直播 (live)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/live/rooms` | 创建直播间 |
| GET | `/live/rooms` | 直播列表 |
| GET | `/live/rooms/:id` | 直播间详情 |
| PUT | `/live/rooms/:id/start` | 开播 |
| GET | `/live/rooms/:id/stream-urls` | 推拉流地址 |
| PUT | `/live/rooms/:id/end` | 结束直播 |
| POST | `/live/rooms/:id/mics` | 上麦 |
| DELETE | `/live/rooms/:id/mics/:userId` | 下麦 |
| POST | `/live/rooms/:id/mute` | 禁言 |
| POST | `/live/rooms/:id/flash-sales` | 发起秒杀 |
| POST | `/live/rooms/:id/slides` | 上传课件 |
| POST | `/live/callback` | 直播事件回调（腾讯云） |

---

## 7. 短视频 (video)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/videos` | 发布视频 |
| GET | `/videos` | 视频列表 |
| GET | `/videos/:id` | 视频详情 |
| POST | `/videos/vod/upload-signature` | 获取上传签名 |
| GET | `/videos/vod/play-signature/:fileId` | 获取播放签名 |
| POST | `/videos/:id/like` | 点赞 |
| POST | `/videos/:id/collect` | 收藏 |
| POST | `/videos/:id/products/:productId` | 关联商品 |

---

## 8. 智能体 (bot)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/bots` | 智能体广场列表 |
| GET | `/bots/:id` | 智能体详情 |
| POST | `/bots/:id/chat` | 对话（非流式） |
| POST | `/bots/:id/chat/stream` | 对话（SSE 流式） |
| POST | `/bots/:id/knowledge` | 添加知识库条目 |
| DELETE | `/bots/knowledge/:knowledgeId` | 删除知识库条目 |

---

## 9. 排盘工具 (paipan)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/paipan/bazi/preview` | 八字预览（不保存） |
| POST | `/paipan/bazi` | 八字排盘并保存 |
| GET | `/paipan/bazi/:id` | 排盘记录详情 |
| GET | `/paipan/bazi` | 排盘历史 |
| POST | `/paipan/bazi/analyze` | AI 解盘分析（SSE 流式） |
| GET | `/paipan/bazi/:id/analysis` | 分析结果 |
| POST | `/paipan/ziwei/preview` | 紫微斗数预览 |
| POST | `/paipan/ziwei` | 紫微排盘并保存 |

---

## 10. 分站/运营商 (station + commission)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/station` | 创建分站 |
| GET | `/station` | 分站列表 |
| GET | `/station/brand/:code` | 品牌配置（千人千面） |
| POST | `/station/operator` | 创建运营商 |
| GET | `/station/:id/earnings` | 分站收益 |
| GET | `/station/:id/revenue-dashboard` | 收益看板 |
| POST | `/commission/referral-link` | 生成推广链接 |
| GET | `/commission/station-earnings/:stationId` | 佣金明细 |
| POST | `/commission/withdrawal` | 提现申请 |
| PUT | `/commission/admin/withdrawals/:id` | 审核提现 |
| GET | `/commission/configs` | 分佣配置 |

---

## 11. 虚拟币 (coin)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/coin/balance` | 我的余额 |
| GET | `/coin/transactions` | 流水记录 |
| GET | `/coin/tiers` | 充值档位 |
| POST | `/coin/spend` | 消费（提问/打赏/入圈） |
| POST | `/coin/gifts/send` | 赠送礼物 |
| GET | `/coin/gifts/rank/:liveRoomId` | 直播间礼物排行 |

---

## 12. 付费问答/连麦 (question + call)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/question/ask` | 付费提问 |
| POST | `/question/:id/answer` | 回答提问 |
| POST | `/question/:id/peek` | 围观答案（付费） |
| GET | `/question` | 问答列表 |
| POST | `/call/create` | 发起连麦 |
| POST | `/call/:id/accept` | 接听连麦 |
| POST | `/call/:id/hangup` | 挂断（按分钟扣费） |
| GET | `/call` | 通话记录 |

---

## 13. 电子书 (classic + ebook)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/classic/books` | 古籍列表 |
| GET | `/classic/books/:id` | 古籍详情 |
| GET | `/classic/chapters/:id` | 章节内容 |
| PUT | `/classic/progress/:bookId` | 更新阅读进度 |
| POST | `/classic/bookmarks/:bookId` | 添加书签 |

> 电子书（ebook）系列 API 待开发，模型已就绪。
