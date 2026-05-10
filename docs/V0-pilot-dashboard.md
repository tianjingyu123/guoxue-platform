# V0 Pilot 任务：管理后台 Dashboard 单页设计

> **给 V0 的第一句话：** 这是一个国学传统文化平台的管理后台。技术栈 Vue3 + Element Plus。不要中国风，参考小红书/Notion 的现代简约风格——清新、留白多、圆角卡片、柔和阴影、交互细腻。**先只做 Dashboard 这一页定风格，确认后批量复制到其余 37 页。**

---

## 一、设计规范（严格遵循）

### 1.1 配色

| 用途 | 色值 | 说明 |
|------|------|------|
| 页面背景 | `#F5F5F5` | 浅灰底 |
| 卡片背景 | `#FFFFFF` | 纯白卡片 |
| 主色调 | `#FF6B6B` | 暖珊瑚红，用于关键数字/主按钮/激活态 |
| 辅助色 | `#4ECDC4` | 青绿，用于正向指标 |
| 强调色 | `#FFE66D` | 暖黄，用于提醒/高亮 |
| 侧边栏背景 | `#FFFFFF` | 白色侧边栏（不再是深色） |
| 侧边栏选中 | `#FFF0F0` 背景 + `#FF6B6B` 文字 | 浅红底+主色字 |
| 文字主色 | `#1A1A1A` | 不用纯黑 |
| 文字辅助 | `#999999` | 中灰 |
| 边框 | `#F0F0F0` | 极淡灰 |

### 1.2 布局

| 属性 | 值 |
|------|---|
| 侧边栏宽度 | 240px |
| 卡片间距 | 20px |
| 卡片圆角 | 16px |
| 卡片阴影 | `0 2px 12px rgba(0,0,0,0.04)` |
| 卡片内边距 | 24px |
| 内容区 padding | 24px |

### 1.3 字体

| 层级 | 规格 |
|------|------|
| 页面标题 | 20px / font-weight 600 / color #1A1A1A |
| 卡片标题 | 14px / font-weight 500 / color #999 |
| 统计数字 | 28px / font-weight 700 / font-feature-settings "tnum" / color #1A1A1A |
| 正文 | 14px / line-height 1.6 / color #666 |
| 小字 | 12px / line-height 1.5 / color #999 |

### 1.4 交互

- 卡片 hover：`transform: translateY(-2px)` + `box-shadow: 0 4px 20px rgba(0,0,0,0.08)`，过渡 `0.2s ease`
- 表格行 hover：背景 `#FAFAFA`
- 所有可点击元素 cursor:pointer
- 按钮圆角 8px

---

## 二、页面结构

Dashboard 是登录后的首页，由以下 5 个区域组成：

```
┌──────────────────────────────────────────────────┐
│  区域1：页面标题 "数据概览" + 日期选择器（可选）      │
├──────────┬──────────┬──────────┬─────────────────┤
│ 区域2：  │ 统计卡片1 │ 统计卡片2 │ 统计卡片3 │ 统计卡片4 │  ← 第一行 4 个
│ 统计卡片 ├──────────┼──────────┼──────────┼─────────┤
│ (4行x4列) │ 卡片5-16 ...                           │
├──────────────────────────┬───────────────────────┤
│ 区域3：                  │ 区域4：               │
│ 折线图 — 用户增长趋势(30天)│ 饼图 — 内容类型分布    │
│ (占 60% 宽度)            │ (占 40% 宽度)         │
├──────────────────────────┴───────────────────────┤
│ 区域5：TOP10 热门文章 表格                          │
│  排名 | 标题 | 作者 | 浏览量 | 点赞 | 评论          │
└──────────────────────────────────────────────────┘
```

---

## 三、详细规格

### 区域2：统计卡片（16 个，4行 x 4列）

每个卡片结构：图标 + 标签文字 + 数字。以下是 16 个卡片的数据字段名和中文标签，数字从 API 的 `stats` 对象取值：

**第一行 — 核心指标**
| 卡片 | 字段名 | 中文标签 | 建议图标 |
|------|--------|----------|---------|
| 1 | userCount | 总用户数 | 👤 people |
| 2 | articleCount | 总文章数 | 📄 document |
| 3 | circleCount | 总圈子数 | 💬 chat |
| 4 | courseCount | 课程总数 | 📚 book |

**第二行 — 内容指标**
| 卡片 | 字段名 | 中文标签 |
|------|--------|----------|
| 5 | classicBookCount | 古籍总数 |
| 6 | videoCount | 视频总数 |
| 7 | liveRoomCount | 直播房间 |
| 8 | productCount | 商品总数 |

**第三行 — 流量指标**
| 卡片 | 字段名 | 中文标签 |
|------|--------|----------|
| 9 | totalViews | 总浏览量 |
| 10 | totalLikes | 总点赞数 |
| 11 | totalComments | 总评论数 |
| 12 | totalCollects | 总收藏数 |

**第四行 — 运营指标**
| 卡片 | 字段名 | 中文标签 |
|------|--------|----------|
| 13 | todayNewUsers | 今日新增用户 |
| 14 | monthNewUsers | 本月新增用户 |
| 15 | orderCount | 总订单数 |
| 16 | pendingReports | 待处理举报 |

**卡片设计要点：**
- 纯白背景 + 16px 圆角 + 轻阴影
- 图标在左上角或左侧，用主色 #FF6B6B 的浅色版本做背景（`rgba(255,107,107,0.1)`）
- 标签文字 13px #999，在数字上方
- 数字 28px #1A1A1A font-weight 700
- 大数字自动格式化：>=10000 显示 "1.2w"，>=1000 显示 "1.2k"
- 第 4 行最后一张"待处理举报"如果数值 >0 用红色强调

### 区域3：用户增长趋势图（左 60%）

- 类型：平滑折线图 (smooth line)
- 数据来源：`charts.userGrowth` 数组，每项 `{ date: "2026-05-01", count: 12 }`
- X 轴：日期（取 MM-DD），标签颜色 #999
- Y 轴：用户数
- 折线颜色：`#FF6B6B`
- 面积填充：从 `rgba(255,107,107,0.15)` 渐变到 `rgba(255,107,107,0)`
- 网格线：`#F0F0F0`
- 卡片内标题：14px font-weight 500 color #999，如"用户增长趋势 · 近30天"

### 区域4：内容类型分布图（右 40%）

- 类型：环形图 (doughnut chart)
- 数据来源：`charts.contentDistribution` 数组，每项 `{ name: "文章", count: 291 }`
- 颜色组：`["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181"]`
- 内半径 40%，外半径 70%
- 标签显示在饼图外侧：名称 + 百分比
- 卡片内标题："内容类型分布"

### 区域5：TOP10 热门文章表格

- 6 列：排名 | 标题 | 作者 | 浏览量 | 点赞 | 评论
- 排名列宽度 60px，数字 1-3 用彩色徽章（金银铜），4-10 用灰色数字
- 标题列 min-width 200px，超出省略号
- 浏览量列 sortable
- 表格无外侧边框，行之间有 `1px solid #F0F0F0` 分割线
- 数据来源：`charts.topArticles` 数组

---

## 四、API 数据结构（供 V0 组件使用）

V0 不需要接真实 API，请使用以下 mock 数据结构。后续我会替换为真实 API 调用。

### GET /api/v1/dashboard/stats 返回：

```json
{
  "articleCount": 291,
  "userCount": 3,
  "courseCount": 80,
  "circleCount": 62,
  "classicBookCount": 90,
  "productCount": 5,
  "todayNewUsers": 0,
  "pendingReports": 0,
  "totalViews": 867630,
  "totalLikes": 0,
  "totalComments": 110,
  "totalCollects": 0,
  "orderCount": 11,
  "paidOrderCount": 8,
  "liveRoomCount": 5,
  "videoCount": 54,
  "monthNewUsers": 3,
  "monthNewArticles": 291
}
```

### GET /api/v1/dashboard/charts 返回：

```json
{
  "topArticles": [
    { "title": "《楚辞·离骚》节选", "author": "王清音", "viewCount": 2978, "likeCount": 235, "commentCount": 42 },
    { "title": "《诗经·秦风·蒹葭》", "author": "王清音", "viewCount": 3012, "likeCount": 142, "commentCount": 28 },
    { "title": "八字入门：十天干精解", "author": "李玄明", "viewCount": 2456, "likeCount": 198, "commentCount": 35 },
    { "title": "《易经》乾卦解读", "author": "李玄明", "viewCount": 2103, "likeCount": 167, "commentCount": 31 },
    { "title": "紫微斗数十二宫详解", "author": "赵命理", "viewCount": 1890, "likeCount": 145, "commentCount": 22 },
    { "title": "《道德经》第一章解读", "author": "王清音", "viewCount": 1654, "likeCount": 123, "commentCount": 19 },
    { "title": "风水基础：峦头与理气", "author": "赵命理", "viewCount": 1432, "likeCount": 98, "commentCount": 15 },
    { "title": "《论语》为政篇", "author": "王清音", "viewCount": 1287, "likeCount": 87, "commentCount": 12 },
    { "title": "梅花易数入门", "author": "李玄明", "viewCount": 1156, "likeCount": 76, "commentCount": 9 },
    { "title": "《心经》全文解读", "author": "释明心", "viewCount": 1023, "likeCount": 65, "commentCount": 8 }
  ],
  "userGrowth": [
    { "date": "2026-04-08", "count": 0 }, { "date": "2026-04-15", "count": 1 },
    { "date": "2026-04-22", "count": 1 }, { "date": "2026-04-29", "count": 2 },
    { "date": "2026-05-01", "count": 3 }, { "date": "2026-05-05", "count": 3 },
    { "date": "2026-05-08", "count": 3 }
  ],
  "contentDistribution": [
    { "name": "文章", "count": 291 }, { "name": "课程", "count": 80 },
    { "name": "视频", "count": 54 }, { "name": "古籍", "count": 90 }
  ]
}
```

---

## 五、技术要求

1. **框架：** Vue3 Composition API (`<script setup lang="ts">`)
2. **组件库：** Element Plus（el-card, el-row, el-col, el-table 等）
3. **图表：** ECharts 5.x（折线图和饼图）
4. **响应式：** el-row/el-col 栅格，移动端 1 列、平板 2 列、桌面 4 列
5. **数字格式化：** 写一个 `formatNumber` 函数，>=10000 显示 "1.2w"，>=1000 显示 "1.2k"
6. **图标：** 使用 Element Plus Icons（@element-plus/icons-vue）
7. **图表容器：** 宽度 100%，高度 320px
8. **所有文字用中文**

---

## 六、交付标准

- [ ] 一个完整的 `Dashboard.vue` 单文件组件（template + script + style）
- [ ] 16 张统计卡片，4行 x 4列
- [ ] 1 张折线图 + 1 张环形图
- [ ] 1 张 TOP10 表格
- [ ] 使用 mock 数据，不依赖后端 API
- [ ] 小红书风格：白色卡片、16px 圆角、浅阴影、hover 上浮
- [ ] 响应式布局
- [ ] 代码干净、注释简洁

---

## 七、参考风格描述（帮助 V0 理解"小红书风格"）

不要传统管理后台的深色侧边栏 + 直角卡片风格。想象你在设计一个现代化 SaaS 产品的 Dashboard：

- 大面积浅灰背景 (#F5F5F5) 上漂浮着纯白卡片
- 卡片之间留白充足（20px 间距）
- 圆角柔和（16px），不是 Element Plus 默认的 4px
- 阴影非常轻，若有若无
- 数字大而清晰，一眼能扫读
- 图表色彩干净，不要高饱和度
- 整体感觉：**轻盈、透气、精致**

---

**V0 只需交付 1 个文件：`Dashboard.vue`。风格确认后我会提供其余 37 页的规格。**
