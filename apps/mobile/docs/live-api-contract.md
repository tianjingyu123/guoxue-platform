# 直播板块（live）前后端联调接口对接文档

> 本文档面向 Claude Code 做前后端联调使用。
>
> - **uni-app 工程目录**：`vue3/`
> - **页面目录**：`vue3/src/pkg-live/`
> - **当前数据来源**：所有页面从 `vue3/src/lib/live-data.ts` 导入 mock 数据渲染（用于像素级验收）。
> - **原型真源**：仓库根 `app/live/`（Next.js 原型，唯一设计真源）。
> - **路由映射**：`vue3/compare/route-map.json`。

## 协作分工约束（重要）

联调时请遵守既定分工，**不要改动 `<template>` 结构与 `<style scoped>` 视觉**，以免破坏已通过的像素验收：

- **v0 负责**：`<template>` 像素还原 + `<style scoped>` 视觉品质。
- **联调负责（@/lib 层）**：API 调用（`uni.request`）、TS 类型定义、业务逻辑函数、后端路由路径。
- 替换策略：将 `live-data.ts` 中各 `export const` mock 数据，替换为从接口请求并赋值给同名 `ref`。页面 `<script setup>` 内的空 `ref` 与数据导入点保持接口形状一致即可，模板无需改动。

## 通用约定

- **基础类型**（已在 `live-data.ts` 顶部定义）：
  - `LiveStatus = 'live' | 'upcoming' | 'replay'`
  - `LiveType = 'knowledge' | 'commerce'`
  - `LiveOrientation = 'vertical' | 'horizontal'`
  - `LivePriceType = 'free' | 'paid'`
- **图片字段**：`cover` / `hostAvatar` 当前为 `/marketing/*` 占位路径，接口应返回真实 CDN URL。
- **金额单位**：`price` / `revenue` 单位为元；`duration` 视字段而定（见各接口备注：秒 or 分钟 or `HH:mm:ss` 字符串）。
- **数字格式化**：前端已有 `formatLiveViews`、`formatLiveDuration`、`formatHostNumber`、`formatHostDuration` 工具函数，接口只需返回原始数值。

---

## 接口清单（按页面）

### 1. 直播广场列表 `live/plaza`
- **建议路由**：`GET /api/live/list`
- **入参**：`tab`（`全部` | `知识授课` | `电商带货` | `关注的`）
- **返回**：`LiveItem[]`

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 直播间 ID |
| title | string | 标题 |
| cover | string | 封面图 URL |
| hostName | string | 主播昵称 |
| hostAvatar | string | 主播头像 URL（可空，空时显示占位） |
| viewerCount | number | 观看人数 |
| type | LiveType | 知识授课 / 电商带货 |
| status | LiveStatus | 直播状态 |
| orientation | LiveOrientation | 竖屏 / 横屏 |
| priceType | LivePriceType | 免费 / 付费 |
| scheduledTime | string? | 预告时间（status=upcoming 时） |
| duration | string? | 时长（回放时） |
| price | number? | 价格（priceType=paid 时） |
| circleFree | boolean? | 圈子会员免费 |
| productCount | number? | 商品数（电商带货时） |

---

### 2. 主播列表 `live/hosts`
- **建议路由**：`GET /api/live/hosts`
- **入参**：`filter`（`all` | `live` | `followed`）、`search`（关键词）
- **返回**：`LiveHost[]`

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 主播 ID |
| name | string | 昵称 |
| avatar | string | 头像 URL |
| cover | string | 背景封面 URL |
| specialty | string | 擅长领域描述 |
| followers | number | 粉丝数 |
| likes | number | 获赞数 |
| liveCount | number | 直播场次 |
| rating | number | 评分（如 4.9） |
| isLive | boolean | 是否正在直播 |
| viewerCount | number? | 当前观看数（isLive 时） |
| tags | string[] | 标签 |
| verified | boolean | 是否认证 |

---

### 3. 直播回放列表 `live/replays`
- **建议路由**：`GET /api/live/replays`
- **入参**：`sortBy`（`latest` | `popular` | `duration`）、`search`
- **返回**：`LiveReplay[]`

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 回放 ID |
| title | string | 标题 |
| cover | string | 封面 URL |
| hostName | string | 主播昵称 |
| hostAvatar | string | 主播头像 URL |
| category | string | 分类名 |
| viewers | number | 播放量 |
| duration | number | 时长（**秒**） |
| dateText | string | 发布时间文案（今天/昨天/3天前） |

---

### 4. 回放首页 `live/replay-home`
- **建议路由**：`GET /api/live/replay-home`
- **返回**：包含三部分

`categories: ReplayCategory[]`
| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 分类 ID（all/yijing/...） |
| name | string | 分类名 |
| icon | string | emoji 图标 |
| count | number | 该分类回放数 |

`hotItems` / `list`：`ReplayHomeItem[]`（入参 `category` 过滤 list）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 回放 ID |
| title | string | 标题 |
| cover | string | 封面 URL |
| hostName | string | 主播昵称 |
| hostAvatar | string | 主播头像 URL |
| duration | number | 时长（**秒**） |
| views | number | 播放量 |
| category | string | 分类名 |
| isHot | boolean? | 是否热门 |

> 另有 `replayHotSearches: string[]` 热门搜索词，可由接口返回或前端固定。

---

### 5. 主播数据中心 `live/host-data`
- **建议路由**：`GET /api/live/host-data`
- **返回**：包含统计、记录、趋势三部分

`stats: HostLiveStats`
| 字段 | 类型 | 说明 |
|---|---|---|
| totalViews | number | 总观看 |
| totalRevenue | number | 总收益（元） |
| avgDuration | number | 平均时长（**分钟**） |
| fansGrowth | number | 涨粉数 |
| totalRooms | number | 直播总场次 |
| totalGifts | number | 礼物总数 |
| viewsGrowthRate | number | 观看增长率（%） |
| revenueGrowthRate | number | 收益增长率（%） |

`rooms: HostLiveRoom[]`
| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 场次 ID |
| title | string | 标题 |
| cover | string | 封面 URL |
| status | `'ended' \| 'preview'` | 已结束 / 预告 |
| dateText | string | 时间文案（1/15 19:00） |
| duration | number | 时长（**分钟**） |
| views | number | 观看 |
| gifts | number | 礼物数 |
| revenue | number | 收益（元） |

`trend: HostLiveTrend[]`（30 天趋势，用于折线图）
| 字段 | 类型 | 说明 |
|---|---|---|
| dateLabel | string | 日期标签（如 1-05） |
| views | number | 当日观看 |
| revenue | number | 当日收益（元） |

---

### 6. 推流配置 `live/stream-config`
- **建议路由**：`GET /api/live/stream-config?roomId={id}`
- **返回**：`StreamConfig`

| 字段 | 类型 | 说明 |
|---|---|---|
| roomId | string | 直播间 ID |
| roomTitle | string | 直播间标题 |
| streamUrl | string | 推流地址（rtmp://...） |
| streamKey | string | 推流密钥（敏感，需鉴权） |
| playUrl | string | 播放地址 |
| recommendedSettings | object | `{ resolution, bitrate, fps, encoder }` 推荐编码参数（字符串） |

> `obsConfigSteps`、`streamConfigFaq` 为静态文案，可前端固定或接口返回。

---

### 7. OBS 推流教程 `live/obs-guide`
- **纯静态文案页**，无需接口。
- 数据：`obsGuideSteps`、`obsGuideRequirements`、`obsGuideFaq`（前端固定）。

---

### 8. 创建直播 `live/create`
- **分类下拉**：`GET /api/live/categories` → `LiveCategory[]`（`{ id, name }`）
- **提交创建**：`POST /api/live/create`
  - **入参**（来自页面表单）：`title`、`coverUrl`、`orientation`（vertical/horizontal）、`type`（knowledge/commerce）、`categoryId`、`tags: string[]`、`isPublic: boolean`、`scheduledTime?`（预约开播时间）
  - **返回**：`{ roomId }`，成功后跳转 `stream-config` 或 `preview`。

---

### 9. 竖屏直播间 `live/vertical`
- **建议路由**：`GET /api/live/room/{id}/vertical`
- **返回**：`verticalLiveRoom` + `verticalLiveComments` + `verticalLiveProducts`

`room`
| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 直播间 ID |
| title | string | 标题 |
| hostName | string | 主播昵称 |
| hostAvatar | string | 主播头像 URL |
| hostLevel | number | 主播等级 |
| followers | number | 粉丝数 |
| viewerCount | number | 观看人数 |
| likeCount | number | 点赞数 |
| onlineAvatars | string[] | 在线观众头像 URL 列表 |

`comments: VerticalLiveComment[]`（弹幕，建议 WebSocket 实时推送）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 弹幕 ID |
| userName | string | 用户名（系统消息为「系统」） |
| content | string | 内容 |
| type | `'text'\|'gift'\|'system'\|'enter'` | 弹幕类型 |
| isHost | boolean? | 是否主播发送 |

`products: VerticalLiveProduct[]`（带货商品）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 商品 ID |
| name | string | 商品名 |
| cover | string | 商品图 URL |
| price | number | 现价（元） |
| originalPrice | number | 原价（元） |
| stock | number | 库存 |
| sold | number | 已售 |
| isExplaining | boolean? | 是否讲解中 |

---

### 10. 直播间观看页 `live/[id]`（知识竖屏）→ `pkg-live/watch`
- **建议路由**：`GET /api/live/room/{id}`
- **返回**：`liveWatchRoom` + `liveWatchComments`

`room`
| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 直播间 ID |
| type | LiveType | 直播类型 |
| title | string | 标题 |
| hostName | string | 主播昵称 |
| hostAvatar | string | 主播头像 URL |
| followers | number | 粉丝数 |
| viewerCount | number | 观看数 |
| likeCount | number | 点赞数 |
| isFollowing | boolean | 当前用户是否已关注 |
| onlineAvatars | string[] | 在线观众头像 URL |

`comments`：结构同 `VerticalLiveComment[]`（建议 WebSocket）。

> **互动接口**（联调补充）：关注 `POST /api/live/follow`、点赞 `POST /api/live/like`、发弹幕 `POST /api/live/comment`。

---

### 11. 直播预告 `live/preview`
- **建议路由**：`GET /api/live/preview?roomId={id}`
- **返回**：`LivePreviewRoom`

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 预告 ID |
| title | string | 标题 |
| cover | string | 封面 URL |
| hostId | string | 主播 ID |
| hostName | string | 主播昵称 |
| hostAvatar | string | 主播头像 URL |
| hostFollowers | number | 主播粉丝数 |
| bookedCount | number | 已预约人数 |
| estimatedDuration | number | 预计时长（**分钟**） |
| startDateText | string | 开播日期（12/20） |
| startTimeText | string | 开播时间（20:00） |
| tags | string[] | 标签 |
| descriptionLines | string[] | 富文本简介（**Markdown 行数组**，前端逐行解析渲染 ###标题/有序无序列表/**加粗**） |
| isBooked | boolean | 当前用户是否已预约 |
| countdown | object | `{ days, hours, minutes, seconds }` 倒计时（建议接口返回开播时间戳，由前端实时计算） |

> **预约接口**：`POST /api/live/preview/book`，入参 `roomId`。

---

### 12. 直播结束 `live/end`
- **建议路由**：`GET /api/live/end?roomId={id}`
- **返回**：`liveEndRoom` + `liveEndRecommendLives` + `liveEndRecommendCourses`

`room: LiveEndRoom`
| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 直播间 ID |
| title | string | 标题 |
| cover | string | 封面 URL |
| hostId / hostName / hostAvatar | string | 主播信息 |
| hostFollowers | number | 主播粉丝数 |
| tags | string[] | 标签 |
| stats | object | `{ totalViewers, peakViewers, totalLikes, totalGifts, duration }`，duration 单位**秒** |
| hasReplay | boolean | 是否有回放 |

`recommendLives: LiveEndRecommendLive[]`：`{ id, title, cover, status('live'\|'preview'), viewers, bookedCount }`
`recommendCourses`：`{ id, title, cover, price, lessons }`

---

### 13. 回放详情 `live/replay/[id]` → `pkg-live/replay-detail`
- **建议路由**：`GET /api/live/replay/{id}`
- **返回**：`ReplayDetail`

| 字段 | 类型 | 说明 |
|---|---|---|
| id | number | 回放 ID |
| title | string | 标题 |
| hostName / hostAvatar / hostTitle | string | 主播信息（hostTitle 如「资深命理师」） |
| hostFollowers | number | 主播粉丝数 |
| isVerified | boolean | 主播认证 |
| viewerCount | number | 观看数 |
| likeCount | number | 点赞数 |
| duration | string | 总时长（**HH:mm:ss** 字符串） |
| startTime | string | 直播开始时间 |
| circleName | string | 所属圈子名（底部「加入xx」按钮） |
| chapters | ReplayChapter[] | 章节：`{ id, title, startTime(秒), timeDisplay, description }` |
| discussions | ReplayDiscussion[] | 讨论：`{ id, timeDisplay, userName, content, isHost }` |
| qaList | ReplayQA[] | 问答：`{ id, timeDisplay, question, questionerName, answer, answererName }` |
| products | ReplayProduct[] | 商品：`{ id, name, price, originalPrice, sales, mentionTimeDisplay }` |

> `playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2]` 倍速选项（前端固定）。
> 视频流地址需接口补充字段（如 `videoUrl`），当前原型为占位。

---

### 14. 回放评价 `live/replay/[id]/comments` → `pkg-live/replay-comment`
- **提交评价**：`POST /api/live/replay/{id}/comment`
  - **入参**：`rating`（1-5 整体评分）、`aspectRatings`（细项评分 `{ content, interaction, audio, value }`）、`tags: string[]`、`content`（文字评价，≤300字）
  - **返回**：`{ success: true }`，提交后切换成功态。
- **静态配置**（前端固定，无需接口）：
  - `replayCommentAspects`：细项维度 `[{ key, label }]`
  - `replayCommentTagsByRating`：按评分动态展示的标签 `Record<1-5, string[]>`
  - `replayCommentLabels`：评分文案 `['', '很差', '较差', '一般', '不错', '非常好']`

---

## 联调建议步骤

1. 在 `vue3/src/lib/` 下新建 `api/live.ts`，按上表实现各 `uni.request` 封装与 TS 类型。
2. 将各页面 `<script setup>` 中对 `live-data.ts` 的 mock 导入，替换为 `onLoad/onShow` 中调用接口并赋值给同名 `ref`。
3. 保留 mock 作为 fallback / 骨架占位，接口失败时展示错误态（页面已含三态结构）。
4. 实时类弹幕（vertical/watch）接 WebSocket；互动动作（关注/点赞/预约/下单）接对应 POST。
5. 改完后用 `vue3/compare/` 比对脚本回归，确保像素验收不回退。
