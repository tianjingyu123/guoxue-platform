# v0 移动端完整开发需求文档

## 项目概况

**项目名称：** 国学传统文化综合平台
**技术栈：** UniApp (Vue3 + TypeScript + Composition API + Pinia)
**API 基地址：** `/api/v1`（参考 `apps/mobile/src/api/index.ts`）
**设计令牌：**
- 主色：`#C41E3A`（中国红）
- 辅色：`#C9A96E`（金色）
- 背景：`#F5F0E8`（宣纸色）
- 导航栏背景：`#C41E3A`，文字白色
- TabBar 选中色：`#C41E3A`

## 全局组件

所有页面可直接使用以下公共组件（位于 `apps/mobile/src/components/`）：

| 组件名 | 路径 | 用途 |
|--------|------|------|
| ContentCard | `@/components/ContentCard.vue` | 内容卡片（文章/诗词/经典统一展示） |
| CircleCard | `@/components/CircleCard.vue` | 圈子信息卡片 |
| CourseCard | `@/components/CourseCard.vue` | 课程卡片 |
| LoadingSkeleton | `@/components/LoadingSkeleton.vue` | 骨架屏加载态 |
| EmptyState | `@/components/EmptyState.vue` | 空数据占位（支持插槽自定义） |
| TagList | `@/components/TagList.vue` | 标签横向滚动列表 |
| CommentList | `@/components/CommentList.vue` | 评论列表（含回复/点赞/删除） |
| SearchBar | `@/components/SearchBar.vue` | 顶部搜索栏（含搜索历史弹窗） |
| GlobalChat | `@/components/GlobalChat.vue` | 全局悬浮 AI 对话入口 |

## API 调用规范

所有 API 模块从 `@/api/index.ts` 导入，使用方式：
```typescript
import { courseApi, userApi } from "@/api";
// 调用：courseApi.list({ page: 1, pageSize: 20 }).then(res => { ... })
```

**关键原则：**
- 所有请求自动携带 Bearer Token（登录后存储于 `uni.storage`）
- 401 自动触发 token 刷新，刷新失败跳登录页
- 列表接口统一分页格式：`{ page, pageSize }` → `{ data: [], total: number }`
- 错误自动 toast 提示，不需重复处理

---

## 第2批：个人中心补全（7页）

### 1. 编辑资料 `pages/mine/edit-profile`

**功能描述：** 用户编辑个人资料页面，修改头像、昵称、简介、兴趣标签等信息。

**入口：** `pages/mine/mine` 点击"编辑资料"按钮
**出口：** 返回我的页面（自动保存或手动保存）

**API：**
- `authApi.getProfile()` → `{ id, nickname, avatar, phone, email, intro, tags[] }`
- `authApi.updateProfile(data)` → `{ id, nickname, avatar, intro, tags[] }`
- `uploadApi.image(filePath)` → `{ url }` — 头像上传
- `recommendApi.defaultInterests()` → `{ interests: [{ id, name, icon }] }` — 可选兴趣标签

**UI 状态：**
- 正常态：展示当前头像（圆形）、昵称、手机号（脱敏）、简介、兴趣标签
- 编辑态：头像可点击更换（底部弹出拍照/相册选择），昵称/简介使用 input/textarea
- 标签编辑：横向标签列表，已选中高亮，可多选
- 加载态：骨架屏
- 保存：顶部导航栏右侧"保存"按钮，保存成功 toast + 返回

**关键交互：**
- 点击头像 → 弹出 ActionSheet（拍照/从相册选择）
- 昵称：input 框，最多 20 字
- 简介：textarea，最多 200 字
- 兴趣标签：网格展示，点击切换选中/取消，最多选 5 个
- 导航栏右侧"保存"按钮，调用 `authApi.updateProfile`

---

### 2. 提现 `pages/wallet/withdraw`

**功能描述：** 用户从钱包余额提现到支付宝/银行卡。

**入口：** `pages/wallet/wallet` 点击"提现"按钮
**出口：** 提现申请成功 → 返回钱包页

**API：**
- `commissionApi.balance(stationId)` → `{ available, frozen, total }`（分站长用）
- `commissionApi.applyWithdrawal(data)` → `{ id, amount, status, createdAt }`
- `userApi.setPaymentPassword(data)` / `userApi.verifyPaymentPassword(password)` — 支付密码

**UI 状态：**
- 正常态：显示可提现余额，金额输入框，收款方式选择（支付宝/银行卡），收款账号输入
- 金额输入：实时计算手续费（若有），显示到账金额
- 支付密码弹窗：6 位数字密码输入（类似微信密码弹窗）
- 成功态：显示提现申请已提交，预计到账时间
- 空态：余额为 0 时提现按钮置灰

**关键交互：**
- 选择收款方式：支付宝（默认）/ 银行卡，切换时显示对应输入字段
- 金额输入：数字键盘，"全部提现"快捷按钮
- 提交按钮 → 弹出支付密码验证 → 验证通过 → 调用提现 API
- 提现成功 → 跳转回钱包页，刷新余额

---

### 3. 关注/粉丝列表 `pages/mine/follows`

**功能描述：** Tab 切换展示用户关注的人和粉丝列表。

**入口：** `pages/mine/mine` 点击"关注"/"粉丝"数字，或 `pages/user/user` 个人主页
**出口：** 点击用户 → 跳转用户主页 `pages/user/user`

**API：**
- `interactApi.getFollowing(userId, page, pageSize)` → `{ data: [{ id, nickname, avatar, intro, isMutual }], total }`
- `interactApi.getFollowers(userId, page, pageSize)` → `{ data: [{ id, nickname, avatar, intro, isMutual }], total }`
- `interactApi.toggleFollow(userId)` — 关注/取关

**UI 状态：**
- 顶部 Tab 切换：关注 | 粉丝，带数量角标
- 列表每项：头像 + 昵称 + 简介（一行省略）+ 操作按钮
- 操作按钮：互关显示"互相关注"，已关注显示"已关注"，未关注显示"+ 关注"
- 加载态：骨架屏列表
- 空态：EmptyState 组件，"还没有关注任何人" / "还没有粉丝"

**关键交互：**
- Tab 切换加载不同列表
- 点击关注按钮：即时切换状态，乐观更新
- 点击用户行：跳转用户主页
- 下拉刷新 + 上拉加载更多

---

### 4. 设置 `pages/mine/settings`

**功能描述：** 应用设置页面，包含账号安全、通知设置、隐私设置、缓存管理、关于等。

**入口：** `pages/mine/mine` 点击"设置"图标
**出口：** 返回我的页面

**API：**
- `authApi.changePassword(data)` — 修改密码
- `uni.getStorageInfoSync()` — 获取缓存大小

**UI 状态：**
分组列表（使用 `uni-list` / 自定义 cell 组件）：

**账号安全组：**
- 修改密码（跳转密码修改页或弹窗）
- 支付密码设置（跳转支付密码页）

**通知设置组（Switch 开关）：**
- 新消息通知
- 课程提醒
- 直播提醒
- 互动提醒
- 系统通知

**隐私设置组：**
- 黑名单管理（跳转黑名单列表）
- 谁可以看我的收藏（公开/仅自己/仅好友）

**通用组：**
- 清除缓存（显示当前缓存大小，弹窗确认）
- 字体大小（小/中/大）
- 深色模式（跟随系统/浅色/深色）

**其他组：**
- 帮助与反馈（跳转帮助中心）
- 关于我们（显示版本号、用户协议、隐私政策链接）
- 退出登录（红色按钮，弹窗确认）

---

### 5. 帮助中心 `pages/mine/help`

**功能描述：** 常见问题 FAQ + 联系客服入口。

**入口：** `pages/mine/settings` 点击"帮助与反馈"
**出口：** 返回设置页

**API：**
- `aiApi.knowledgeSearch({ keyword, category: 'help' })` → `{ data: [{ id, title, content }], total }`
- 联系客服：`aiApi.customerService(question, history)` 或跳转 `pages/customer-service/index`

**UI 状态：**
- FAQ 手风琴列表（el-collapse 风格），点击展开答案
- 搜索框：输入关键词实时过滤 FAQ
- 底部固定"联系客服"按钮
- 加载态：骨架屏
- 空态：未找到相关问题

**关键交互：**
- 手风琴展开/收起
- 搜索过滤
- 点击"联系客服" → 跳转智能客服页面

---

### 6. 实名认证 `pages/mine/identity-verify`

**功能描述：** 用户实名认证流程，姓名 + 身份证号 + 人脸识别。

**入口：** `pages/mine/mine` 实名认证入口（未认证显示红点）
**出口：** 认证完成 → 返回我的页面

**API：**
- `identityApi.ocr({ imageUrl, side: 'front'|'back' })` → `{ name, idCard, gender, birth, address }`
- `identityApi.verify({ name, idCard })` → `{ valid: boolean, message }`
- `identityApi.getFaceToken({ name, idCard, returnUrl })` → `{ token, faceUrl }` — 跳转人脸核身 H5
- `identityApi.faceResult(token)` → `{ status, score }`
- `identityApi.myStatus()` → `{ status: 'unverified'|'pending'|'verified'|'rejected', name?, idCard? }`

**UI 状态（流程步骤）：**

**步骤1 — 身份信息填写：**
- 真实姓名 input
- 身份证号 input（校验格式）
- 下一步按钮（校验通过后高亮）

**步骤2 — 身份证OCR（可选，快捷填入）：**
- 拍摄身份证正面 / 反面
- OCR 识别结果回填到步骤 1

**步骤3 — 人脸识别：**
- 调用 `getFaceToken` 获取人脸核身 URL
- WebView 加载人脸核身页面
- 核身完成后回调，查询结果

**完成态：**
- 显示认证结果：认证中/已认证/认证失败（含原因）
- 已认证显示：姓名（脱敏）、身份证号（脱敏）

---

### 7. 身份切换 `pages/mine/identity-switch`

**功能描述：** 多身份用户切换当前角色（普通用户/圈主/分站长/运营商/讲师）。

**入口：** `pages/mine/mine` 身份标签区域
**出口：** 切换后刷新"我的"页面，权限/菜单动态变化

**API：**
- `authApi.getProfile()` → `{ roles: [{ roleType, status, stationId?, circleId? }] }`
- `authApi.updateProfile({ activeRole })` — 切换当前活跃角色（若后端支持）

**UI 状态：**
- 当前身份：顶部高亮卡片显示当前角色（图标 + 名称）
- 可用身份列表：可切换的身份以列表展示
- 未激活身份：灰色显示，点击"申请开通"提示
- 加载态：骨架屏
- 空态：仅一个身份时隐去此页面入口

**关键交互：**
- 点击可用身份 → 弹出确认框 → 确认切换 → 刷新全局状态
- 切换后自动跳转对应工作台（分站长→分站管理，圈主→圈子管理）

---

## 第3批：消息社交（5页）

### 8. 会话列表 `pages/im/conversations`

**功能描述：** 最近聊天会话列表，显示最后一条消息、未读角标、时间。

**入口：** 首页底部"消息"Tab 或导航栏消息图标
**出口：** 点击会话 → 进入私聊 `pages/im/chat`

**API：**
- `imApi.getFriendList()` → `[{ userId, nickname, avatar, lastMsg, lastMsgTime, unreadCount, online }]`

**UI 状态：**
- 列表项：头像（含未读角标）+ 昵称 + 最后消息摘要（一行省略）+ 时间（刚刚/分钟前/日期）
- 未读消息：粗体 + 红点数字
- 下拉刷新
- 加载态：骨架屏
- 空态：EmptyState + "暂无消息"

**关键交互：**
- 点击会话 → 进入聊天页
- 左滑删除会话（弹窗确认）
- 顶部搜索好友入口

---

### 9. 私聊对话 `pages/im/chat`

**功能描述：** 一对一私聊，支持文字、图片、语音、商品卡片。

**入口：** 会话列表点击，或用户主页"发消息"
**出口：** 返回会话列表

**API：**
- `imApi.sendC2CMsg(toUserId, text)` → `{ msgKey, timestamp }`
- `imApi.getC2CHistory(toUserId, count)` → `[{ msgKey, fromUserId, text, type, timestamp }]`
- `imApi.withdrawMsg(toUserId, msgKey)` — 撤回消息
- `shopApi.productDetail(id)` — 商品卡片数据
- `uploadApi.image(filePath)` — 图片消息上传

**UI 状态：**
- 导航栏：对方头像 + 昵称 + 在线状态（绿点）
- 消息列表：气泡样式（己方右侧红色，对方左侧白色）
- 消息类型：文字/图片/语音/商品卡片
- 输入区域：底部固定，文字输入框 + 更多按钮（+）
- 展开更多：相册/拍照/语音/商品推荐
- 长按消息：复制/撤回（2分钟内）/删除
- 加载态：历史消息加载中指示器

**关键交互：**
- 发送文字：回车或点击发送按钮
- 发送图片：选择相册或拍照
- 发送语音：按住录音，松开发送，上滑取消
- 发送商品卡片：弹出商品搜索 → 选择商品 → 发送卡片
- 点击商品卡片 → 跳转商品详情
- 点击对方头像 → 跳转用户主页
- 消息时间：每 5 分钟显示一次时间标签

---

### 10. 通讯录 `pages/im/contacts`

**功能描述：** 好友通讯录，支持字母索引和搜索。

**入口：** 会话列表顶部"通讯录"
**出口：** 点击好友 → 进入私聊或用户主页

**API：**
- `imApi.getFriendList()` → `[{ userId, nickname, avatar, firstLetter, online }]`

**UI 状态：**
- 字母索引：右侧纵向 A-Z 字母条，点击快速跳转
- 列表按首字母分组：A 组、B 组...带分组标题
- 搜索框顶部：输入过滤好友
- 列表项：头像 + 昵称 + 在线状态
- 加载态：骨架屏
- 空态：EmptyState + "暂无好友"

**关键交互：**
- 点击好友 → 弹窗选择"发消息"或"查看主页"
- 字母索引滑动/点击快速定位
- 搜索实时过滤

---

### 11. 邀请好友 `pages/im/invite`

**功能描述：** 生成邀请链接/二维码/海报，引导新用户注册。

**入口：** 我的页面"邀请好友"入口
**出口：** 返回上一页

**API：**
- `commissionApi.createReferralLink({ targetType: 'app', targetId: 'invite' })` → `{ linkUrl, qrCodeUrl }`
- `shareApi.getConfig({ type: 'invite' })` → `{ title, desc, imageUrl }`

**UI 状态：**
- Tab 切换：推荐链接 / 二维码 / 分享海报
- 推荐链接：展示链接 + "复制链接"按钮
- 二维码：展示二维码图片 + 长按保存
- 分享海报：Canvas 生成海报（含用户头像 + 昵称 + 二维码 + 背景图），"保存到相册"按钮
- 底部：分享到微信/朋友圈/QQ 按钮（调用 `uni.share`）

**关键交互：**
- 切换 Tab 显示不同邀请方式
- 复制链接：调用 `uni.setClipboardData` + toast
- 海报生成：Canvas 绘制完成后显示，"保存相册"获取权限后保存

---

### 12. 举报页 `pages/report/index`

**功能描述：** 举报违规内容，选择举报类型、描述、上传截图。

**入口：** 内容详情/帖子详情/用户主页的"举报"按钮
**出口：** 举报提交成功 → 返回上一页

**API：**
- `reportApi.report({ targetType, targetId, reason, description })` → `{ id, status }`
- `uploadApi.images(filePaths)` — 上传截图

**UI 状态：**
- 举报类型选择：违规内容/色情低俗/垃圾广告/诱导分享/侵权/其他（单选列表）
- 详细描述：textarea，最多 500 字
- 截图上传：横向图片列表，最多 4 张，点击 + 添加，长按删除
- 提交按钮：底部固定
- 提交成功：toast + 自动返回

**关键交互：**
- 举报类型必选
- 截图上传：调用 `uni.chooseImage` → `uploadApi.images`
- 提交前校验：至少选择举报类型

---

## 第4批：支付+搜索（5页）

### 13. 支付中 `pages/shop/paying`

**功能描述：** 订单支付中过渡页，显示支付进度和倒计时。

**入口：** 确认订单页点击"立即支付"
**出口：** 支付成功 → `pages/shop/pay-success`，支付失败 → `pages/shop/pay-fail`

**API：**
- `shopApi.jsapiPay(orderId, { openid })` 或 `shopApi.payOrder(orderId)` — 发起支付
- `shopApi.queryPaymentStatus(orderId)` — 轮询支付状态

**UI 状态：**
- 支付动画：品牌 Logo 呼吸动画
- 状态文字："正在支付中..."
- 倒计时：30 秒超时提示
- 安全提示：底部固定"支付环境安全"标识
- 手动操作：取消支付 / 重新支付 按钮

**关键交互：**
- 调用支付 API → 拉起微信/支付宝支付
- 轮询支付结果（每 3 秒查询一次，最多 10 次）
- 支付成功 → 自动跳转成功页
- 支付失败 → 自动跳转失败页
- 用户取消 → 返回订单页

---

### 14. 支付成功 `pages/shop/pay-success`

**功能描述：** 支付成功结果页。

**入口：** 支付完成后自动跳转
**出口：** 查看订单 / 返回首页

**API：**
- `shopApi.orderDetail(orderId)` → `{ id, orderNo, totalAmount, status, items[] }`

**UI 状态：**
- 成功图标：绿色对勾动画
- 订单信息：订单号（可复制）、支付金额（大字突出）
- 操作按钮：
  - "查看订单" → 跳转订单详情
  - "返回首页" → 跳转首页

---

### 15. 支付失败 `pages/shop/pay-fail`

**功能描述：** 支付失败结果页，显示失败原因和重试选项。

**入口：** 支付失败后自动跳转
**出口：** 重试 / 换支付方式 / 查看订单

**API：**
- `shopApi.orderDetail(orderId)` → 订单信息

**UI 状态：**
- 失败图标：红色叉号
- 失败原因：余额不足/超时/取消/其他
- 操作按钮：
  - "重新支付" → 返回支付中页面
  - "换个方式" → 返回确认订单页（切换支付方式）
  - "查看订单" → 跳转订单详情

---

### 16. 搜索结果 `pages/search/result`

**功能描述：** 搜索结果综合展示，支持多 Tab 分类浏览 + AI 总结。

**入口：** `pages/search/search` 输入关键词搜索
**出口：** 点击结果项跳转对应详情页

**API：**
- `searchApi.search(q, type, extra)` → `{ data: [], total, tabs: { content, circle, course, product, user } }`
- `searchApi.aiSearch(query)` → `{ summary, sources[] }` — AI 搜索总结
- `searchApi.suggestSimilar(q)` → `[{ keyword }]` — 相关搜索推荐

**UI 状态：**
- 顶部搜索框：显示当前搜索词，可修改重新搜索
- AI 总结卡片（顶部）：AI 生成的一段总结文字 + 来源标注，可折叠
- Tab 栏：综合 | 内容 | 圈子 | 课程 | 商品 | 用户
- 结果列表：根据 Tab 类型展示不同卡片（ContentCard/CircleCard/CourseCard 等）
- 关键词高亮：搜索结果标题中搜索词用红色标记
- 加载态：搜索中 spinner
- 空态：EmptyState + "未找到相关内容" + 相关搜索推荐
- 底部：上拉加载更多

**关键交互：**
- Tab 切换重新加载对应类型结果
- 点击结果跳转详情
- 搜索词高亮显示
- AI 总结卡片点击展开/收起

---

### 17. 搜索中间页 `pages/search/history`

**功能描述：** 搜索历史 + 热门搜索展示页，作为搜索前的中间页。

**入口：** 点击首页搜索栏（搜索输入框获得焦点前）
**出口：** 点击搜索历史/热门搜索 → 跳转搜索结果页；输入搜索词 → 跳转搜索结果页

**API：**
- `searchApi.history()` → `[{ keyword, timestamp }]`
- `searchApi.hot()` → `[{ keyword, heat, tag }]`
- `searchApi.clearHistory()` — 清除搜索历史

**UI 状态：**
- 顶部搜索框：自动聚焦，placeholder "搜索国学经典、课程、圈子..."
- 搜索历史区域：标签流式布局，右侧"清除"按钮（弹窗确认）
- 热门搜索区域：编号列表（前 3 个红色编号，其余灰色），带热度图标
- 热搜标签：tag 如"本周热点"、"传统文化"

**关键交互：**
- 点击历史/热门搜索词 → 填入搜索框并跳转结果页
- 输入搜索词 → 实时联想（`searchApi.suggest`），下拉列表展示联想词
- 清除历史 → 弹窗确认

---

## 第5批：直播补全（6页）

### 18. 直播预告详情 `pages/live/preview`

**功能描述：** 展示直播预告的详细信息，支持预约和分享。

**入口：** 直播列表/课程详情中的直播预告入口
**出口：** 返回上一页

**API：**
- `liveApi.roomDetail(id)` → `{ id, title, coverUrl, startTime, endTime, lecturer, description, bookedCount, bookingStatus }`
- `liveRoomApi.book(roomId)` / `liveRoomApi.unbook(roomId)`

**UI 状态：**
- 封面图：顶部大图，半透明渐变遮罩
- 直播信息：标题（大字）、讲师头像+名称、开播时间（倒计时）、预计时长
- 直播简介：富文本区域
- 预约按钮：底部固定，未预约为"立即预约"（主色按钮），已预约显示"已预约"（带对勾）
- 分享按钮：右上角分享图标
- 预约人数：显示 "xxx 人已预约"

**关键交互：**
- 预约/取消预约按钮切换（乐观更新）
- 倒计时：距开播 < 1 小时显示"即将开始"
- 点击讲师 → 跳转讲师主页

---

### 19. 竖屏带货直播间 `pages/live/live-room-vertical`

**功能描述：** 竖屏直播带货，仿抖音/快手直播风格，商品卡片+购物车+评论弹幕。

**入口：** 直播列表点击竖屏带货直播间
**出口：** 关闭直播 → 返回上一页

**API：**
- `liveRoomApi.getPlayUrl(roomId)` → `{ playUrl }`
- `liveRoomApi.sendComment(roomId, { content })` — 发送评论
- `liveRoomApi.toggleLike(roomId)` — 点赞
- `liveRoomApi.getGifts()` / `liveRoomApi.sendGift(roomId, { giftId, quantity })`
- `liveRoomApi.getFlashSales(roomId)` → `[{ id, productId, price, stock }]`
- `shopApi.productDetail(id)` — 商品详情

**UI 状态：**
- 全屏竖屏视频播放器（`video` 组件，object-fit: cover）
- 顶部：主播头像 + 昵称 + 观看人数 + 关闭按钮
- 左下角：评论弹幕滚动区域（半透明背景，最新评论从下往上滚动）
- 右下角：点赞按钮（心形动画） + 评论按钮 + 分享按钮
- 商品卡片：左下角悬浮商品卡片（商品图+价格+购买按钮），定时轮播商品
- 购物车弹窗：底部上滑弹出，商品列表 + 合计金额 + "去购物车"按钮
- 礼物面板：底部弹出礼物网格（礼物图标+价格），点击发送
- 秒杀弹窗：定时弹出秒杀商品，倒计时 + "立即抢购"

**关键交互：**
- 双击视频区 → 点赞动画
- 点击商品卡片 → 弹出商品详情浮层
- 点击购物车 → 弹出购物车半屏
- 发送评论：底部输入框 + 发送按钮
- 礼物：选择礼物 + 数量 → 发送（飘屏动画）

---

### 20. 横屏授课直播间 `pages/live/live-room-horizontal`

**功能描述：** 横屏教学直播，PPT+板书+问答区+连麦。

**入口：** 课程详情点击课程直播间
**出口：** 关闭直播 → 返回上一页

**API：**
- `liveRoomApi.getPlayUrl(roomId)` → `{ playUrl }`
- `liveRoomApi.getSlides(roomId)` → `[{ id, imageUrl, title, page }]` — 课件列表
- `liveRoomApi.applyMic(roomId, { position })` — 申请连麦
- `liveRoomApi.cancelMic(roomId, userId)` — 取消连麦
- `courseApi.askQuestion(courseId, { question, chapterId })` — 提问
- `liveRoomApi.sendComment(roomId, { content })`

**UI 状态：**
- 横屏视频播放器（顶部 60% 区域，强制横屏或提示旋转）
- PPT/课件区：与视频同区域，通过切换按钮在"视频画面"和"课件"间切换
- 问答面板：右侧或底部，已解答/未解答 Tab
- 板书/笔记：讲师实时板书同步显示
- 连麦按钮：底部工具栏
- 课件列表：缩略图列表，点击切换

**关键交互：**
- 全屏切换：点击全屏按钮进入横屏全屏模式
- PPT 翻页：跟随讲师翻页，或手动滑动
- 申请连麦 → 讲师同意 → 画面中显示连麦者小窗
- 提问：输入问题，选择"公开提问"或"定向提问"

---

### 21. 直播回放列表 `pages/live/replays`

**功能描述：** 已结束直播的回放视频列表，支持筛选和搜索。

**入口：** 直播列表页"回放"Tab
**出口：** 点击回放 → `pages/live/replay-player`

**API：**
- `liveApi.rooms({ status: 'ended', page, pageSize })` → `{ data: [], total }`

**UI 状态：**
- 搜索框：按讲师/标题搜索
- 筛选：按时间排序（最新/最热），按分类筛选
- 列表项：封面缩略图 + 标题 + 讲师 + 时长 + 播放量 + 回放标识
- 加载态：骨架屏
- 空态：暂无回放

**关键交互：**
- 点击列表项进入回放播放
- 上拉加载更多

---

### 22. 回放播放 `pages/live/replay-player`

**功能描述：** 直播回放播放器，支持章节标记跳转。

**入口：** 回放列表点击
**出口：** 返回回放列表

**API：**
- `liveApi.roomDetail(id)` → `{ replayUrl, chapters: [{ time, title }], slides: [] }`

**UI 状态：**
- 视频播放器（横屏，支持全屏）
- 章节标记：进度条上黄色标记点，点击跳转
- 章节列表：视频下方，点击跳转到对应时间点
- 课件同步：若有关联课件，视频播放时同步显示

**关键交互：**
- 点击章节标记 → 跳转播放
- 倍速播放：0.75x / 1x / 1.25x / 1.5x / 2x

---

### 23. 主播数据中心 `pages/live/host-data`

**功能描述：** 主播/讲师查看直播数据，包括观看、互动、收益等指标。

**入口：** 我的页面"直播数据"入口（讲师/主播角色可见）
**出口：** 返回我的页面

**API：**
- `liveApi.rooms({ hostId: 'me' })` — 我的直播间列表
- 具体数据接口（参考后台直播数据看板 `LiveData.vue`）

**UI 状态：**
- 概览卡片：总观看人次、总收益、场均时长、粉丝增长（数字卡片）
- 直播场次列表：每场封面 + 标题 + 日期 + 观看量 + 收益
- 趋势图：近 30 天观看/收益折线图（使用 echarts 或 uCharts）
- 加载态：骨架屏
- 空态：暂无直播数据

---

## 第6批：古籍馆补全（5页）

### 24. 古籍详情 `pages/classics/classic-detail`

**功能描述：** 古籍图书详情页，展示简介、目录、版本信息，提供开始阅读入口。

**入口：** 古籍列表 `pages/classics/classics` 点击书籍
**出口：** 开始阅读 → `pages/reader/reader` 或 `pages/ebook/ebook-reader`

**API：**
- `classicApi.bookDetail(id)` → `{ id, title, author, dynasty, coverUrl, description, category, versions: [], chapters: [{ id, title, pageCount }], totalChapters, wordCount }`
- `classicApi.getReadingStats()` → `{ totalTime, booksCount, todayTime }` — 当前用户的阅读统计
- `classicApi.getProgress(bookId)` → `{ chapterId, progress, lastReadAt }` — 继续阅读位置
- `classicApi.getVersions(bookId)` → `[{ id, name, year, publisher }]`
- `classicApi.generateDownloadUrl(bookId)` → `{ downloadUrl, format, fileSize }`

**UI 状态：**
- 顶部：封面图 + 书名 + 作者（附朝代）+ 类别标签
- 简介区：书籍简介文字（可展开/收起）
- 阅读统计：我的阅读时长、进度条
- 操作按钮组：
  - "继续阅读"（有进度时显示，主按钮） / "开始阅读"（无进度时，主按钮）
  - "下载"按钮（若有下载权限）
- 版本信息：可切换版本（若多版本），显示版本名称+年代+出版方
- 目录区：章节列表，每项显示章节标题，已读章节灰色标记
- 底部固定：开始阅读按钮（悬浮）

**关键交互：**
- 版本切换 → 刷新目录
- 点击章节 → 从该章节开始阅读
- 下载 → 调用下载 API，显示下载进度
- 收藏：右上角收藏按钮

---

### 25. 书签管理 `pages/classics/bookmarks`

**功能描述：** 管理用户在所有古籍中的书签，支持跳转和删除。

**入口：** 古籍阅读器内"书签"按钮，或我的页面"我的书签"
**出口：** 点击书签 → 跳转阅读器对应位置

**API：**
- `classicApi.bookmarks(bookId?)` → `[{ id, bookId, bookTitle, chapterId, chapterTitle, position, note, createdAt }]`
- `classicApi.updateBookmark(id, { note })` — 编辑书签笔记
- `classicApi.deleteBookmark(id)` — 删除书签

**UI 状态：**
- 按书籍分组：同一本书的书签归为一组，显示书名标题
- 列表项：章节名称 + 书签位置 + 笔记摘要 + 时间
- 编辑模式：长按进入编辑，可修改笔记或删除
- 加载态：骨架屏
- 空态：EmptyState + "还没有书签，阅读时添加吧"

**关键交互：**
- 点击跳转 → 打开阅读器并定位到书签位置
- 左滑删除
- 长按编辑笔记

---

### 26. 笔记管理 `pages/classics/notes`

**功能描述：** 管理用户的读书笔记，支持编辑、导出、搜索。

**入口：** 古籍阅读器内"笔记"按钮，或我的页面"我的笔记"
**出口：** 点击笔记 → 跳转阅读器对应位置

**API：**
- `classicApi.listNotes({ bookId, chapterId })` → `[{ id, bookId, bookTitle, chapterId, chapterTitle, content, position, createdAt }]`
- `classicApi.updateNote(id, content)` — 编辑笔记
- `classicApi.deleteNote(id)` — 删除笔记

**UI 状态：**
- 搜索框：按笔记内容搜索
- 按书籍筛选：顶部下拉选择书籍
- 列表项：书籍名 + 章节名 + 笔记内容（3 行省略）+ 时间
- 编辑模式：点击进入编辑页，完整笔记内容可编辑
- 导出功能：选择笔记 → 导出为 TXT/Markdown
- 加载态：骨架屏
- 空态：EmptyState + "还没有笔记"

**关键交互：**
- 点击笔记 → 跳转阅读器原文位置
- 左滑删除/编辑
- 全选导出 → 调用分享 API

---

### 27. AI 研究助手 `pages/classics/ai-assistant`

**功能描述：** 针对特定古籍的 AI 研究助手，支持经典问答、字词查询、文言翻译。

**入口：** 古籍详情页"AI 助手"按钮，或阅读器内悬浮按钮
**出口：** 返回上一页

**API：**
- `aiApi.classicQA(classicId, question)` → `{ answer, citations: [{ chapterTitle, text }] }`
- `aiApi.classicQAHistory(classicId)` → `[{ question, answer, createdAt }]`
- `classicApi.dictionaryLookup(word)` → `{ word, pinyin, explanation, examples }`
- `classicApi.translateClassical(text, context)` → `{ original, translation }`

**UI 状态：**
- 顶部：当前古籍名称（上下文标识）
- 推荐问题：3-5 个预设问题标签（点击直接提问）
- 对话区：ChatUI 风格（用户问题右侧气泡，AI 回答左侧气泡）
- AI 回答：包含引用标注 `[1]`，点击展开引用原文
- 底部输入框 + 发送按钮 + 功能切换（问答/查词/翻译）
- 加载态：AI 回答流式输出（打字机效果）
- 空态：显示推荐问题列表

**关键交互：**
- 输入问题 → 流式显示 AI 回答
- 引用标注点击 → 弹窗显示原文
- 功能切换：查词模式（输入单字，返回释义）/ 翻译模式（输入文言，返回白话）
- 历史记录：左侧抽屉或下拉查看历史问答

---

### 28. 古籍搜索 `pages/classics/search`

**功能描述：** 古籍全文检索，支持关键词高亮、按朝代/类型筛选。

**入口：** 古籍列表页搜索图标
**出口：** 点击搜索结果 → 跳转阅读器对应位置

**API：**
- `searchApi.search(q, 'classic', { dynasty, category })` → `{ data: [{ bookId, bookTitle, chapterTitle, snippet, highlights }], total }`

**UI 状态：**
- 顶部搜索框：自动聚焦
- 筛选栏：朝代（全部/先秦/两汉/魏晋/唐宋/元明清/近代）、类型（经/史/子/集）
- 结果列表：书籍名 + 章节名 + 匹配片段（关键词红色高亮）+ ...省略
- 加载态：搜索 spinner
- 空态：未找到匹配内容 + 搜索建议

**关键交互：**
- 筛选条件变化 → 重新搜索
- 点击结果 → 跳转阅读器并定位到匹配位置
- 搜索防抖 300ms

---

## 第7批：分站运营移动端（6页）

### 29. 分站首页 `pages/station/index`

**功能描述：** 分站独立品牌首页，展示分站定制内容、推荐、特色入口。

**入口：** 通过推广链接/二维码进入（携带分站 code）
**出口：** 点击内容 → 各模块详情页

**API：**
- `stationApi.getBrand(code)` → `{ id, name, logo, themeColor, description, banners[] }`
- `stationApi.detail(id)` → `{ id, name, logo, description, memberCount, courseCount }`
- `recommendApi.getScene('station', { stationId, page, pageSize })` → 分站推荐内容

**UI 状态：**
- 导航栏：分站 Logo + 名称（定制主题色）
- Banner 轮播：分站自定义 banner
- 站长推荐区：横向滑动课程/内容卡片
- 特色入口：3-5 个图标入口（课程、圈子、直播、商城、运势）
- 内容流：下拉加载更多分站内容
- 加载态：骨架屏

**关键交互：**
- Banner 点击 → 跳转对应落地页
- 特色入口点击 → 跳转各模块（带分站参数）
- 分享按钮 → 生成分站推广海报

---

### 30. 推广素材库 `pages/station/materials`

**功能描述：** 分站推广素材库，提供海报、文案、二维码，一键复制分享。

**入口：** 分站管理页面"推广素材"
**出口：** 返回上一页

**API：**
- `stationApi.promotionMaterials()` → `[{ id, type: 'poster'|'copy'|'qrcode', title, content, imageUrl, usageCount }]`
- `stationApi.promotionMaterialDetail(id)` → 素材详情
- `stationApi.usePromotionMaterial(id)` — 记录使用

**UI 状态：**
- 分类 Tab：全部 / 海报 / 文案 / 二维码
- 海报素材：网格展示缩略图，点击查看大图 → "保存到相册" / "立即分享"
- 文案素材：文字卡片（可展开），"一键复制"按钮，复制成功 toast
- 二维码素材：二维码图片 + 推广链接，长按保存
- 使用统计：每个素材显示使用次数

**关键交互：**
- 海报：查看大图 → 保存相册 / 分享到微信
- 文案：一键复制 → toast "已复制"
- 二维码：长按保存到相册

---

### 31. 团队管理 `pages/station/team`

**功能描述：** 分站团队管理，查看下级成员、业绩、提成明细。

**入口：** 分站管理页面"团队管理"
**出口：** 返回上一页

**API：**
- `stationApi.teamMembers({ page, pageSize })` → `{ data: [{ id, nickname, avatar, level, joinDate, totalCommission, inviteCount }], total }`
- `stationApi.teamLeaderboard({ type: 'month' })` → `[{ rank, nickname, avatar, amount }]`
- `stationApi.teamActivity({ page, pageSize })` → 团队动态

**UI 状态：**
- 概览卡片：团队总人数、本月新增、总佣金、我的提成比例
- Tab：成员列表 / 排行榜 / 动态
- 成员列表：头像 + 昵称 + 等级 + 累计佣金 + 邀请人数 + 加入时间
- 排行榜：前三名特殊样式（金银铜），其余列表
- 动态：谁加入了团队、谁产生了佣金等
- "邀请下级"按钮：生成专属邀请链接 → 分享
- 加载态：骨架屏
- 空态：暂无团队成员，邀请好友加入

**关键交互：**
- Tab 切换
- 点击成员 → 查看成员详情/业绩明细
- 邀请按钮 → 调用邀请 API → 分享

---

### 32. 分站电商直播 `pages/station/live`

**功能描述：** 分站独立直播间入口，展示分站专属带货直播。

**入口：** 分站首页"直播"入口
**出口：** 进入直播间

**API：**
- `liveApi.rooms({ stationId })` → `[{ id, title, coverUrl, status, startTime, productCount }]`

**UI 状态：**
- 直播列表：封面 + 标题 + 状态标签（直播中/预告/回放）+ 商品数 + 观看数
- 直播中高亮：红色边框 + "LIVE"角标
- 预告：显示开播时间倒计时
- 加载态：骨架屏
- 空态：EmptyState + "暂无直播"

**关键交互：**
- 点击进入直播间（复用直播模块页面）
- 下拉刷新

---

### 33. 站长助理 `pages/station/assistant`

**功能描述：** AI 站长助理对话页面，提供运营建议、数据问答。

**入口：** 分站管理页面"站长助理"
**出口：** 返回上一页

**API：**
- `aiApi.chat({ scene: 'station_assistant', messages })` — AI 对话
- `aiApi.chatStream({ scene: 'station_assistant', messages })` — 流式对话

**UI 状态：**
- ChatUI 对话界面
- 推荐问题：预设运营相关问题（"如何提升分站活跃度？""本周运营数据总结""推荐推广策略"）
- AI 回答：Markdown 渲染，支持数据表格、图表卡片
- 底部输入框 + 语音输入按钮
- 加载态：打字机效果

**关键交互：**
- 点击推荐问题 → 自动发送
- 语音输入 → 调用 ASR → 填入文字 → 发送
- AI 回答中的链接可点击跳转

---

### 34. 分站配置 `pages/station/config`

**功能描述：** 分站长配置分站基本信息：名称、Logo、主题色、小程序码。

**入口：** 分站管理页面"分站设置"
**出口：** 返回上一页

**API：**
- `stationApi.detail(id)` → 分站当前配置
- `stationApi.brand(id)` → 品牌配置
- `stationApi.miniConfig(id)` → 小程序配置
- `uploadApi.image(filePath)` — Logo 上传

**UI 状态：**
- 表单式配置页：
  - 分站名称：input
  - 分站 Logo：点击上传（圆形预览）
  - 主题色：预设色板选择（8 种颜色）+ 自定义色值
  - 分站简介：textarea
  - 小程序码：上传二维码图片
  - 站长头像/昵称：显示当前用户信息
- 保存按钮：底部固定

**关键交互：**
- Logo 上传：选择图片 → 裁剪（可选）→ 上传
- 主题色选择：点击色块预览效果
- 保存 → 调用 API 更新配置

---

## 第8批：课程+圈子+商城补全（9页）

### 35. 章节管理 `pages/courses/chapters`

**功能描述：** 用户侧，课程章节列表，显示学习进度和锁定状态。

**入口：** 课程详情页"开始学习"或"继续学习"
**出口：** 点击可学章节 → `pages/courses/course-player`

**API：**
- `courseApi.chapters(courseId)` → `[{ id, title, duration, status: 'locked'|'available'|'completed', progress }]`
- `courseApi.myProgress(courseId)` → `{ overallProgress, completedChapters, totalChapters }`

**UI 状态：**
- 顶部：课程标题 + 总进度条（百分比数字）
- 章节列表：编号 + 章节标题 + 时长 + 状态图标
  - 已完成：绿色对勾
  - 学习中：橙色进度圈
  - 可用：播放图标
  - 锁定：灰色锁图标（需按顺序解锁或购买后解锁）
- 加载态：骨架屏
- 空态：暂无章节

**关键交互：**
- 点击可用/学习中章节 → 进入播放器
- 锁定章节：点击提示"请先完成上一章节"或"请购买课程"
- 下拉刷新进度

---

### 36. 作业批改结果 `pages/courses/work-result`

**功能描述：** 查看作业的教师批改结果、评语、分数。

**入口：** 课程播放器"查看作业批改"
**出口：** 返回课程学习页

**API：**
- `courseApi.getWorks(courseId, chapterId)` → `[{ id, content, images[], score, comment, status, reviewedAt, reviewer }]`

**UI 状态：**
- 作业内容区：学生提交的文字 + 图片
- 批改结果卡片（有批改时显示）：
  - 分数：大号数字（100 分制或等级制）
  - 教师评语：富文本区
  - 修改建议：红色标注
- 未批改态：显示"批改中..."等待状态
- 操作按钮：重新提交（若老师允许）

**关键交互：**
- 点击图片 → 图片浏览器
- 重新提交 → 跳转作业提交页

---

### 37. 课程购买确认 `pages/courses/purchase-confirm`

**功能描述：** 课程购买确认页，展示课程信息、选择优惠券、确认支付。

**入口：** 课程详情页点击"购买课程"
**出口：** 确认支付 → 跳转支付页

**API：**
- `courseApi.detail(id)` → 课程基本信息
- `courseApi.checkAccess(id)` → 是否已有权限
- `shopApi.myCoupons()` → 可用优惠券列表
- `pricingApi.calcPrice({ productId, userId })` → 计算后价格

**UI 状态：**
- 课程信息卡片：封面 + 标题 + 原价/优惠价
- 优惠券选择：可用优惠券列表（单选），点击展开选择
- 价格明细：原价 - 优惠券抵扣 = 实付金额（大字突出）
- 支付方式：微信支付 / 支付宝 / 虚拟币（余额不足提示）
- 底部固定：实付金额 + "确认支付"按钮
- 用户协议勾选（如需要）

**关键交互：**
- 选择优惠券 → 实时更新实付金额
- 切换支付方式
- 确认支付 → 调用下单 API → 跳转支付页

---

### 38. 知识库 `pages/circles/knowledge`

**功能描述：** 移动端圈子知识库，浏览已入库和待确认的知识内容。

**入口：** 圈子详情页"知识库"Tab
**出口：** 返回圈子详情

**API：**
- `circleApi` 相关知识库接口（参考 `circle-knowledge.controller.ts`）
- `aiApi.knowledgeSearch({ keyword, category })` — 搜索知识库

**UI 状态：**
- 搜索框：搜索知识库内容
- Tab：已入库 / 待确认（圈主可见）
- 知识卡片列表：标题 + 摘要（3 行）+ 来源标签 + 时间
- 待确认列表：额外显示"确认"和"忽略"按钮
- 加载态：骨架屏
- 空态：EmptyState

**关键交互：**
- 点击知识卡片 → 展开详情
- 圈主在待确认 Tab 中点击确认/忽略
- 搜索过滤

---

### 39. 连麦预约 `pages/circles/booking`

**功能描述：** 圈子内连麦咨询预约，选择时间段和主题。

**入口：** 圈子详情页"连麦咨询"入口
**出口：** 预约成功 → 返回圈子详情

**API：**
- `circleApi.getExperts(circleId)` → `[{ userId, nickname, avatar, price, availableSlots[] }]`
- 预约接口（参考 `call.controller.ts`）

**UI 状态：**
- 专家选择：横向滑动专家卡片（头像+名称+价格/分钟）
- 选择专家后：
  - 日期选择：日历组件，可选日期高亮
  - 时间段选择：网格展示可用时间段（09:00-09:30, 09:30-10:00...）
  - 咨询主题：input/textarea
- 费用预览：时长 × 单价 = 预计费用
- 预约按钮：底部固定
- 预约成功：显示预约详情 + "添加到日历"按钮
- 预约记录 Tab：我的预约列表

**关键交互：**
- 选择专家 → 刷新可用时间段
- 选择时间段 → 更新费用
- 提交预约 → 调用支付（若付费）
- 添加到日历 → 调用系统日历 API

---

### 40. 圈主数据看板 `pages/circles/owner-dashboard`

**功能描述：** 圈主查看圈子数据：活跃、增长、内容、互动图表。

**入口：** 圈子管理页"数据看板"
**出口：** 返回圈子管理

**API：**
- `circleDashboardApi.overview(circleId)` → `{ memberCount, postCount, todayActive, revenue }`
- `circleDashboardApi.trends(circleId)` → `[{ date, members, posts, active }]`
- `circleDashboardApi.topContributors(circleId)` → `[{ userId, nickname, avatar, postCount, likeCount }]`
- `circleDashboardApi.hotContent(circleId)` → `[{ postId, title, viewCount, commentCount }]`
- `circleDashboardApi.churnWarning(circleId)` → `[{ userId, nickname, lastActive, risk }]`
- `circleDashboardApi.revenueBreakdown(circleId)` → `{ total, subscriptions, tips, consultations }`

**UI 状态：**
- 概览卡片行：成员数、今日活跃、帖子数、收益（4 格数字卡片）
- 趋势图：近 30 天成员/帖子/活跃折线图
- 热门内容：Top 5 帖子列表
- 活跃贡献者：头像列表 + 排名
- 流失预警：高风险成员列表
- 收益构成：饼图
- 日期选择器：切换时间范围

**关键交互：**
- 数字卡片点击 → 查看明细列表
- 流失预警 → 点击成员查看详情
- 下拉刷新

---

### 41. 圈子预览页 `pages/circles/circle-preview`

**功能描述：** 非成员视角的圈子预览，展示简介、精华帖、加入入口。

**入口：** 通过分享链接进入，或搜索结果点击未加入的圈子
**出口：** 加入圈子 / 返回上一页

**API：**
- `circleApi.detail(id)` → `{ id, name, avatar, coverUrl, description, memberCount, postCount, isJoined, joinPrice, isFree }`
- `circleApi.posts(id, { essence: true, limit: 5 })` → 精华帖列表
- `circleApi.getJoinStatus(id)` → `{ isJoined, isPending, price }`

**UI 状态：**
- 顶部：圈子封面大图 + 渐变遮罩
- 圈子信息：头像 + 名称 + 简介 + 成员数/帖子数
- 精华帖预览：3-5 条精华帖卡片（仅标题+摘要，点击提示"加入后查看详情"）
- 底部固定：加入按钮（显示价格或"免费加入"）
- 付费入圈：显示价格 + 会员期限（月付/年付）

**关键交互：**
- 点击精华帖 → 若未加入，弹窗提示加入后查看
- 加入按钮 → 付费入圈流程或直接加入
- 分享按钮 → 右上角

---

### 42. 商品分类独立页 `pages/shop/categories`

**功能描述：** 独立商品分类页，左侧一级分类 + 右侧二级分类及商品卡片。

**入口：** 商城首页"全部分类"
**出口：** 点击商品 → 商品详情

**API：**
- `shopApi.categoryTree()` → `[{ id, name, icon, children: [{ id, name, icon, productCount }] }]`
- `shopApi.categoryProducts(categoryId, { page, pageSize })` → `{ data: [], total }`

**UI 状态：**
- 左右双栏布局：左侧一级分类（垂直列表，选中高亮），右侧二级分类 + 商品网格
- 一级分类：高度可滚动，选中项红色左侧边框
- 二级分类：横向标签列表，可点击筛选
- 商品网格：2 列商品卡片（图片+名称+价格+销量）
- 加载态：骨架屏
- 空态：该分类暂无商品

**关键交互：**
- 点击一级分类 → 右侧滚动到对应区域
- 右侧滑动 → 左侧自动切换高亮分类
- 点击商品 → 跳转商品详情
- 上拉加载更多商品

---

### 43. 评价详情页 `pages/shop/reviews`

**功能描述：** 商品评价列表独立页，支持按评价类型筛选、查看晒图、追评。

**入口：** 商品详情页"全部评价"
**出口：** 返回商品详情

**API：**
- `shopApi.listReviews(productId, { page, pageSize, filter })` → `{ data: [{ id, userId, nickname, avatar, rating, content, images[], createTime, replyContent, appendContent }], total, ratingStats: { avg, counts: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } } }`

**UI 状态：**
- 顶部：评分概览（平均分大数字 + 五星图 + 各星级数量进度条）
- 筛选 Tab：全部 / 好评(5星) / 中评(3-4星) / 差评(1-2星) / 有图
- 评价列表：
  - 用户头像 + 昵称（脱敏）
  - 星级评分（星星图标）
  - 评价文字
  - 晒图（横向滑动缩略图，点击查看大图）
  - 商家回复（灰色背景卡片）
  - 追评（带"追评"标签）
  - 时间
- 加载态：骨架屏
- 空态：暂无评价

**关键交互：**
- 筛选 Tab 切换 → 重新加载
- 点击晒图 → 图片浏览器
- 上拉加载更多

---

## 第9批：其他通用页面（8页）

### 44. 启动页 `pages/index/splash`

**功能描述：** App 启动时的开屏页，展示品牌 Logo + 动画 + 广告/跳过按钮。

**入口：** App 冷启动
**出口：** 自动跳转首页，或点击跳过

**API：**
- `systemApi.getBanners()` — 获取开屏广告（如有）
- `searchApi.hot()` — 可预加载热门搜索

**UI 状态：**
- 全屏背景（品牌色渐变或图片）
- 中心 Logo 动画（缩放+淡入）
- 底部：品牌 Slogan 文字
- 右上角：倒计时"跳过 3s"按钮
- 若有开屏广告：展示广告图片 + 倒计时（5s）+ 点击跳转
- 预加载：后台请求首页数据、用户信息

**关键交互：**
- 倒计时结束 → 自动跳转首页
- 点击"跳过" → 立即跳转首页
- 点击广告图 → 跳转广告落地页

---

### 45. 智能客服 `pages/customer-service/index`

**功能描述：** AI 智能客服对话页，支持自动回答、转人工、推荐问题。

**入口：** 设置页"联系客服"、帮助中心底部按钮、商品详情"客服"按钮
**出口：** 返回上一页

**API：**
- `aiApi.customerService(question, history)` → `{ answer, suggestions[], needHuman }`
- `aiApi.customerServiceStream(question, history)` — 流式回答
- `aiApi.knowledgeSearch({ keyword })` — 知识库检索

**UI 状态：**
- ChatUI 风格对话界面
- 顶部：客服头像 + "智能客服"标题 + "转人工"按钮
- 推荐问题（首次进入）：3-5 个常见问题标签
- 对话气泡：用户问题右侧，AI 回答左侧（Markdown 渲染）
- 回答中包含的知识引用可点击
- AI 无法回答时：提示"为您转接人工客服" + 输入联系方式
- 底部输入框 + 发送按钮 + 图片上传按钮
- 加载态：打字机流式输出

**关键交互：**
- 点击推荐问题 → 自动发送
- 点击"转人工" → 进入人工客服排队（如有）
- 上传图片 → 描述问题
- 评价：对话结束后弹出满意度评价（👍/👎）

---

### 46. 全局图片浏览器 `pages/common/image-viewer`

**功能描述：** 全屏图片浏览，支持手势缩放、滑动切换、保存、分享。

**入口：** 任意页面点击图片时打开
**出口：** 关闭浏览器 → 返回来源页

**API：** 无（纯前端组件）

**UI 状态：**
- 全屏黑色背景
- 当前图片：可双指捏合缩放、双击放大
- 底部指示器：第 N 张 / 共 M 张（圆点）
- 底部操作栏：保存 / 分享
- 顶部：关闭按钮 + 页码
- 滑动切换：左右滑动切换图片

**关键交互：**
- 双击 → 放大/还原
- 双指缩放
- 左右滑动 → 切换上一张/下一张
- 保存 → 获取相册权限 → 保存图片
- 分享 → 调用 `uni.share`
- 点击空白区域或关闭按钮 → 关闭

---

### 47. 分享海报生成 `pages/common/share-poster`

**功能描述：** Canvas 绘制分享海报，含二维码、用户信息、内容摘要等。

**入口：** 各页面的"生成海报"按钮
**出口：** 保存海报 → 返回来源页

**API：**
- `shareApi.getConfig({ type, path })` → `{ template, title, desc, bgUrl }`
- `commissionApi.createReferralLink({ targetType, targetId })` → `{ qrCodeUrl }` — 生成带参数的二维码

**UI 状态：**
- 海报预览区（Canvas 渲染结果）
- 海报内容（根据来源不同）：
  - 邀请海报：用户头像 + 昵称 + 平台 Logo + 二维码 + 邀请文案
  - 内容海报：内容标题 + 摘要 + 封面图 + 二维码
  - 商品海报：商品图 + 价格 + 二维码
- 底部按钮：保存到相册 / 分享给好友
- 加载态：Canvas 绘制中 loading

**关键交互：**
- Canvas 绘制完成后显示
- 保存 → 获取权限 → 保存到系统相册
- 分享 → 调用分享 API（图片 + 文字 + 链接）

---

### 48. 活动落地页 `pages/activity/landing`

**功能描述：** 营销活动落地页，支持秒杀/拼团/促销展示、倒计时、商品列表。

**入口：** Banner/Bot 卡片/推送消息/分享链接
**出口：** 点击商品 → 商品详情

**API：**
- `marketingApi.pageByRoute(route)` → `{ id, title, type, bannerUrl, description, startTime, endTime, products: [], rules }`
- `marketingApi.flashSaleDetail(id)` 或 `marketingApi.groupBuyDetail(id)`

**UI 状态：**
- 顶部 Banner：活动主题图
- 倒计时模块（距离活动开始/结束）：天+时+分+秒
- 活动商品区：
  - 秒杀：商品卡片（原价划线+秒杀价+进度条+已抢百分比）
  - 拼团：商品卡片（原价+团购价+已拼人数+去拼团按钮）
  - 促销：商品卡片（折扣标签+价格）
- 活动规则：可展开的规则说明区
- 底部：分享按钮

**关键交互：**
- 倒计时归零 → 刷新活动状态（未开始→进行中→已结束）
- 点击商品 → 跳转商品详情
- 秒杀商品：点击"立即抢购"
- 拼团商品：点击"去拼团"

---

### 49. 品类发现页 `pages/discover/index`

**功能描述：** 内容发现页，按 10 大品类导航，展示专栏卡片和推荐内容流。

**入口：** 首页"发现"Tab 或导航栏
**出口：** 点击内容 → 对应详情页

**API：**
- `discoverApi.getCategories()` → `[{ level1, name, icon, subCategories[] }]`
- `discoverApi.getDiscover({ page, pageSize, categoryLevel1 })` → `{ data: [], total }`

**UI 状态：**
- 顶部品类导航：横向滑动图标+名称（10 大类目：经典/诗词/命理/风水/养生/武术/茶道/书法/国画/音乐）
- 当前选中品类的专栏卡片：2 列网格，每列包含封面+标题+摘要
- 下方推荐内容流：ContentCard 列表
- 加载态：骨架屏
- 空态：该品类暂无内容

**关键交互：**
- 品类导航左右滑动，点击切换品类 → 刷新内容
- 下拉刷新 + 上拉加载更多
- 点击内容卡片 → 跳转详情

---

### 50. 每日运势详情 `pages/fortune/daily`

**功能描述：** 展开查看单日的完整运势详情，配合 `pages/fortune/index` 使用。

**入口：** `pages/fortune/index` 点击"查看详情"
**出口：** 返回运势首页

**API：**
- 获取当日详情（参考 fortune 模块 fortune.controller.ts）
- `api.get('/fortune/daily', { date })` → `{ date, bazi, yiJi, overallScore, career, love, wealth, health, luckyColor, luckyNumber, luckyDirection, avoid, suggestion }`

**UI 状态：**
- 日期选择器：顶部显示日期，左右箭头切换前一天/后一天
- 综合运势评分：大圆环进度条 + 等级文字（大吉/吉/平/凶/大凶）
- 分类运势卡片（4 格）：
  - 事业运势：评分 + 文字
  - 爱情运势：评分 + 文字
  - 财运运势：评分 + 文字
  - 健康运势：评分 + 文字
- 幸运信息：幸运色（色块）、幸运数字、幸运方位
- 宜忌：绿色"宜"列表 + 红色"忌"列表
- 开运建议：文字段落

**关键交互：**
- 左右箭头切换日期
- 点击分享 → 生成运势海报

---

### 51. 我的悬赏 `pages/bounty/my-bounties`

**功能描述：** 查看我发布的悬赏和我回答的悬赏，管理悬赏状态。

**入口：** 我的页面"我的悬赏"
**出口：** 返回我的页面；点击悬赏 → 悬赏详情

**API：**
- `bountyApi.list({ page, pageSize, status })` — 我发布的悬赏
- 后端 bounty 模块接口

**UI 状态：**
- Tab 切换：我发布的 / 我回答的
- 我发布的列表：
  - 悬赏问题标题 + 状态标签（进行中/已解决/已过期）
  - 悬赏金额 + 回答数 + 时间
  - 操作：查看详情 / 结算（进行中时）/ 重新发布（已过期）
- 我回答的列表：
  - 悬赏问题标题 + 我的回答状态（已采纳/待审核）
  - 悬赏金额 + 时间
- 加载态：骨架屏
- 空态：EmptyState

---

## 排盘工具模块（另行沟通）

排盘板块（35 个易学工具）由用户与 v0 单独沟通设计，不在此文档中。工具目录参考：
`packages/shared/src/constants/tools-catalog.ts`

---

## 验证标准

每个页面完成开发后应满足：
1. `.vue` 文件存在且非空，使用 Composition API
2. `pages.json` 中已注册路由
3. 页面引用的 API 模块存在于 `api/index.ts`
4. 页面引用的公共组件存在于 `components/`
5. 覆盖正常态、加载态、空态、错误态四种状态
6. 列表页均支持下拉刷新 + 上拉加载更多
7. 遵循项目设计令牌（主色 #C41E3A，辅色 #C9A96E）
