# 国学平台管理后台 — 页面全量清单（供 V0 参考）

> 技术栈：Vue3 + Element Plus + ECharts + Pinia
> 路由模式：Vue Router (createWebHistory)
> 页面总数：**38 个视图**

---

## 一、全局壳

| # | 路由 | 文件 | 功能 | 改造优先级 |
|---|------|------|------|----------|
| 1 | `/login` | Login.vue | 登录页：手机号/邮箱 + 密码表单 | ⭐⭐⭐ 第一眼印象 |
| 2 | `/` | Layout.vue | 全局布局壳：左侧导航菜单 + 顶部栏 + `<router-view>` | ⭐⭐⭐ 定整体基调 |

---

## 二、数据大盘

| # | 路由 | 文件 | 功能 | 关键数据 |
|---|------|------|------|---------|
| 3 | `/dashboard` | Dashboard.vue | 16 个统计卡片 + 3 个 ECharts 图表 + TOP10 文章表格 | stats / trends / charts API |

---

## 三、内容与古籍

| # | 路由 | 文件 | 功能 | 关键数据 |
|---|------|------|------|---------|
| 4 | `/contents` | ContentList.vue | 内容列表页：分页表格 + 搜索 + 类型筛选 + 导出CSV | contentApi.list |
| 5 | `/contents/create` | ContentEdit.vue | 内容创建页：Quill 富文本编辑器 + 封面上传 + 标签 | contentApi.create |
| 6 | `/contents/:id/edit` | ContentEdit.vue | 内容编辑页：同上，回填已有数据 | contentApi.update |
| 7 | `/classics` | classics/ClassicList.vue | 古籍管理：书籍列表 + 章节管理 + 创建/编辑 | classicApi |

---

## 四、社区管理

| # | 路由 | 文件 | 功能 | 关键数据 |
|---|------|------|------|---------|
| 8 | `/circles` | circles/CircleList.vue | 圈子列表：审核状态 + 类型 + 成员数 | circleApi.list |
| 9 | `/videos` | videos/VideoList.vue | 视频列表：审核状态 + 播放量 + 点赞数 | videoApi.list |
| 10 | `/lives` | lives/LiveList.vue | 直播列表：直播状态 + 观看人数 + 回放管理 | liveApi.list |
| 11 | `/comments` | comments/CommentList.vue | 评论管理：按类型/状态筛选 + 隐藏/显示操作 | commentApi.list |
| 12 | `/reports` | reports/ReportList.vue | 举报管理：待处理/已处理 + 处理操作 | reportApi.list |

---

## 五、教学管理

| # | 路由 | 文件 | 功能 | 关键数据 |
|---|------|------|------|---------|
| 13 | `/courses` | courses/CourseList.vue | 课程列表：类型筛选 + 审核 + 销量 | courseApi.list |
| 14 | `/courses/create` | courses/CourseEdit.vue | 课程创建：基本信息 + 章节管理 | courseApi.create |
| 15 | `/courses/:id/edit` | courses/CourseEdit.vue | 课程编辑：同上，回填数据 | courseApi.update |
| 16 | `/institutes` | institutes/InstituteList.vue | 研究院成员管理 | instituteApi |

---

## 六、商城管理

| # | 路由 | 文件 | 功能 | 关键数据 |
|---|------|------|------|---------|
| 17 | `/products` | shop/ProductList.vue | 商品列表：状态筛选 + SKU + 上下架 | shopApi.listProducts |
| 18 | `/orders` | shop/OrderList.vue | 订单列表：状态筛选 + 发货 + 退款 + 导出CSV | shopApi.listOrders |
| 19 | `/coupons` | shop/CouponList.vue | 优惠券管理：创建/编辑 + 类型(满减/折扣/无门槛) | shopApi.listCoupons |

---

## 七、营销分佣

| # | 路由 | 文件 | 功能 | 关键数据 |
|---|------|------|------|---------|
| 20 | `/commission-config` | commission/CommissionConfig.vue | 佣金比例配置表格 + 编辑弹窗 | commissionApi.getConfigs |
| 21 | `/withdrawals` | commission/WithdrawalList.vue | 提现审核列表 + 通过/拒绝操作 | commissionApi.listWithdrawals |

---

## 八、财务管理

| # | 路由 | 文件 | 功能 | 关键数据 |
|---|------|------|------|---------|
| 22 | `/recharges` | coin/RechargeList.vue | 虚拟币充值记录 + 管理员充值 | coinApi.getRecharges |
| 23 | `/gifts` | coin/GiftList.vue | 直播礼物管理 + 创建/编辑 | coinApi.getGifts |

---

## 九、排盘工具

| # | 路由 | 文件 | 功能 | 关键数据 |
|---|------|------|------|---------|
| 24 | `/bazi` | bazi/BaziPan.vue | 八字排盘：输入生辰 + 排盘结果展示 | paipanApi.bazi |
| 25 | `/ziwei` | bazi/ZiweiPan.vue | 紫微斗数排盘：输入生辰 + 星盘展示 | paipanApi.ziwei |
| 26 | `/paipan-records` | PaipanRecords.vue | 排盘记录：历史查询 + AI 分析记录 | paipanApi.records |
| 27 | `/bots` | bots/BotList.vue | 智能体管理：创建/编辑 + 绑定圈子 + 知识库 | botApi |

---

## 十、线下管理

| # | 路由 | 文件 | 功能 | 关键数据 |
|---|------|------|------|---------|
| 28 | `/stations` | offline/StationList.vue | 分站列表：站长信息 + 收益 + 状态 | stationApi.list |
| 29 | `/offline-venues` | offline/OfflineVenueList.vue | 线下驿站：场地 + 课程 + 订单管理 | offlineApi |

---

## 十一、用户与系统

| # | 路由 | 文件 | 功能 | 关键数据 |
|---|------|------|------|---------|
| 30 | `/users` | users/UserList.vue | 用户列表：角色管理 + 会员等级 + 导出CSV | userApi.list |
| 31 | `/notifications` | notifications/NotificationCenter.vue | 通知管理：发送通知 + 批量推送 | notificationApi |
| 32 | `/search-analytics` | SearchAnalytics.vue | 搜索分析：热词 + 搜索趋势 | searchApi |
| 33 | `/banners` | system/BannerAdmin.vue | 首页Banner管理：添加/编辑 + 排序 + 上下架 | systemApi |
| 34 | `/system-settings` | system/SystemSettings.vue | 系统配置：键值对编辑 + 分类管理 | systemApi.listConfigs |
| 35 | `/audit-logs` | audit/AuditLog.vue | 审计日志：按操作/用户/时间筛选 | auditApi.list |

---

## 改造优先级建议

```
第1批（定基调）:  Login + Layout + Dashboard      ← V0 第一步
第2批（列表页）:  UserList + ContentList + ProductList + OrderList
第3批（表单页）:  ContentEdit + CourseEdit + CouponList
第4批（批量）:    其余 25 页统一应用第1批的设计语言
```

---

## 附：Design Token 速查卡

| Token | 值 |
|-------|---|
| 主色 | `#FF6B6B` |
| 辅助色 | `#4ECDC4` |
| 背景 | `#F5F5F5` |
| 卡片白 | `#FFFFFF` |
| 文字主色 | `#1A1A1A` |
| 文字辅助 | `#999` |
| 边框 | `#F0F0F0` |
| 圆角 | `16px` |
| 卡片间距 | `20px` |
| 卡片内边距 | `24px` |
| 过渡 | `0.2s ease` |
| 卡片阴影 | `0 2px 12px rgba(0,0,0,0.04)` |
| hover 上浮 | `translateY(-2px)` |
