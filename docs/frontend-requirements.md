# 国学古籍阅读器 — 前端设计开发需求总结

> 版本: 2026-05-18 | 目标: 前端开发完成后直接联调上线，无需后端改动

---

## 1. 总体架构

```
┌─────────────────────────────────────────────────────┐
│ 前端 (React/Vue)                                    │
│  ├─ 古籍浏览器 (Mirador 3 + OpenSeadragon)          │
│  ├─ 竖排阅读器 (CSS writing-mode: vertical-rl)       │
│  ├─ 图文对照面板 (文字→图像同步定位)                  │
│  └─ 学术工具 (引用生成/注疏浏览/知识图谱)            │
├─────────────────────────────────────────────────────┤
│ 后端 API (已完整实现，零待办)                         │
│  ├─ NestJS REST API (171个经典模块测试全绿)           │
│  ├─ PostgreSQL (14,477部古籍, 293页OCR坐标)           │
│  ├─ IIIF Image Server (Cantaloupe + MinIO, Docker)   │
│  └─ RAG 知识引擎 (古籍问答 + 知识图谱)                │
└─────────────────────────────────────────────────────┘
```

---

## 2. API 接口清单

所有接口前缀: `/api/v1`

### 2.1 古籍浏览核心 (ClassicController)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `classic/books` | 书籍列表（支持分类/关键词/分页） | 否 |
| GET | `classic/books/:id` | 书籍详情（含章节目录） | 否 |
| GET | `classic/chapters/:id` | 章节内容（含正文/译文/注释） | 否 |
| GET | `classic/books/:bookId/chapters` | 某书所有章节 | JWT |
| POST | `classic/books` | 创建书籍 | JWT |
| PUT | `classic/books/:id` | 更新书籍 | JWT |
| DELETE | `classic/books/:id` | 删除书籍 | JWT |
| POST | `classic/books/:bookId/chapters` | 创建章节 | JWT |
| PUT | `classic/chapters/:id` | 更新章节 | JWT |
| DELETE | `classic/chapters/:id` | 删除章节 | JWT |

**响应格式**: `{ code: 200, data: {...}, message: "ok" }`

**查询参数示例**:
- `GET classic/books?category=经&keyword=论语&page=1&pageSize=20`
- 返回: `{ data: [{ id, title, author, dynasty, category, cover, intro, chapterCount, ... }] }`

**章节内容响应**:
```json
{
  "id": "uuid",
  "title": "学而篇",
  "content": "子曰：学而时习之...",
  "translation": "孔子说：学习知识...",
  "annotation": "学而：学习并且...",
  "sortOrder": 1
}
```

### 2.2 阅读进度与书签

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `classic/progress/:bookId` | 获取阅读进度 |
| PUT | `classic/progress/:bookId` | 更新阅读进度 `{ chapterId, progress: 0-100 }` |
| GET | `classic/bookmarks` | 我的书签列表 |
| POST | `classic/bookmarks/:bookId` | 创建书签 `{ chapterId, position, note? }` |
| DELETE | `classic/bookmarks/:id` | 删除书签 |
| GET | `classic/continue-reading` | 继续阅读列表（最近10部） |
| GET | `classic/reading-stats` | 阅读统计 |

### 2.3 图文对照 (ClassicImageController) — 核心功能

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `classic/books/:id/images` | 书籍所有页面图像列表 |
| GET | `classic/books/:id/images/:page` | 单页图像 + OCR 坐标数据 |
| GET | `classic/books/:id/manifest` | IIIF Manifest (标准 IIIF Presentation 3.0) |
| GET | `classic/books/:id/manifest?textOverlay=true` | 含 W3C 文字叠加层的 IIIF Manifest |
| GET | `classic/chapters/:id/image-locations` | **章节文字到图像页面精确映射** |

**图文映射响应 (image-locations)**:
```json
{
  "chapterId": "uuid",
  "chapterTitle": "学而篇",
  "totalChars": 1238,
  "mappingType": "ocr",
  "pages": [
    {
      "imageId": "uuid",
      "pageNumber": 1,
      "label": "学而篇·第1页",
      "iiifUrl": null,
      "width": 2400,
      "height": 3200,
      "textStart": 0,
      "textEnd": 116,
      "lines": [
        {
          "lineNumber": 1,
          "textStart": 0,
          "textEnd": 20,
          "chars": ["学", "而", "时", "习", "之", ...]
        }
      ]
    }
  ]
}
```

**Manifest 含文字叠加层响应**:
```json
{
  "@context": [
    "http://iiif.io/api/presentation/3/context.json",
    "http://www.w3.org/ns/anno.jsonld"
  ],
  "type": "Manifest",
  "label": { "none": ["书断列传"] },
  "items": [
    {
      "id": ".../canvas/1",
      "type": "Canvas",
      "label": { "none": ["前言·第1页"] },
      "width": 2400, "height": 3200,
      "items": [{
        "type": "AnnotationPage",
        "items": [
          {
            "type": "Annotation",
            "motivation": "painting",
            "body": { "id": "...image/1", "type": "Image" },
            "target": "...canvas/1"
          },
          {
            "type": "Annotation",
            "motivation": "supplementing",
            "body": { "type": "TextualBody", "value": "殆", "format": "text/plain", "language": "zh-Hant" },
            "target": {
              "source": "...canvas/1",
              "selector": {
                "type": "FragmentSelector",
                "conformsTo": "http://www.w3.org/TR/media-frags/",
                "value": "#xywh=2120,120,160,56"
              }
            }
          }
        ]
      }]
    }
  ]
}
```

> **关键**: `mappingType: "ocr"` 表示使用真实 OCR 坐标（数据库已有55,852条），无需 fallback 到启发式估算。

### 2.4 学术工具

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `classic/books/:id/versions` | 同书多版本 |
| GET | `classic/books/:id/cite?style=gbt7714&chapterId=&startPos=&endPos=` | 引用生成 |
| GET | `classic/books/:id/annotations?chapterId=&page=&pageSize=` | 注疏/批注列表 |
| POST | `classic/annotations` | 创建注疏标记 |
| DELETE | `classic/annotations/:id` | 删除注疏标记 |

**引用格式支持**: `gbt7714` (默认), `chicago`, `mla`, `apa`

**创建注疏**:
```json
{
  "bookId": "uuid",
  "chapterId?": "uuid",
  "type?": "注疏/夹注/眉批/校勘记",
  "startPos": 0, "endPos": 10,
  "content": "此处注疏内容...",
  "author?": "注者",
  "dynasty?": "朝代"
}
```

### 2.5 字典与翻译

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `classic/dictionary/lookup` | 字典查询 `{ word: "仁" }` |
| POST | `classic/translate` | 文言文翻译 `{ text, context? }` |

### 2.6 古籍问答 (RAG)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `classic/:classicId/qa` | 古籍问答 `{ question, history? }` |
| GET | `classic/:classicId/qa` | 问答历史 |
| POST | `classic/:classicId/qa/stream` | 流式问答 (SSE) |

**问答响应**:
```json
{
  "answer": "这句话的意思是...",
  "citations": [
    { "bookName": "论语", "chapterName": "学而篇", "excerpt": "学而时习之...", "similarity": 0.92 }
  ]
}
```

### 2.7 知识图谱

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `classic/knowledge/entities?type=&page=&pageSize=` | 实体列表 |
| GET | `classic/knowledge/entities/stats` | 实体类型统计 |
| GET | `classic/knowledge/entities/:name` | 实体详情+关联 |
| GET | `classic/knowledge/path?from=孔子&to=论语` | 实体间最短路径 |

### 2.8 注解库

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `classic/commentaries/stats` | 注解统计 |
| GET | `classic/commentaries/search?keyword=&school=&type=` | 搜索注解 |
| GET | `classic/commentaries/book/:bookId` | 某书所有注解 |
| GET | `classic/commentaries/chapter/:chapterId` | 某章注解 |
| GET | `classic/commentaries/:id` | 注解详情 |

### 2.9 八字古籍联动

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `classic/bazi/query` | 按标签/概念查询 `{ tags, dayMaster?, monthBranch?, keyword? }` |
| GET | `classic/bazi/search?keyword=` | 全文搜索命理古籍 |
| GET | `classic/bazi/books` | 命理古籍列表 |
| GET | `classic/bazi/tags` | 可用标签列表 |

### 2.10 字体与排版

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `classic/fonts/config` | 4层字体回退链配置 |
| GET | `classic/fonts/font-face.css` | @font-face CSS（含 unicode-range） |
| GET | `classic/fonts/vertical.css` | 竖排排版 CSS |

**字体回退链**: 霞鹜文楷(27K字) → 思源宋体(44K+字) → 天珩全字库(90K+字) → 系统宋体

---

## 3. 前端核心功能模块

### 3.1 古籍阅读器（竖排 + 图文对照）⭐ 最核心

**布局方案**: 三栏
```
┌────────────┬──────────────────┬────────────┐
│ 章节目录    │ 正文区域          │ 原图面板    │
│ (可收起)   │ (竖排/横排切换)   │ (Mirador 3) │
│            │                  │            │
│  学而篇    │ 不 学 子           │ [古籍原图]  │
│  为政篇    │ 亦 而 曰           │ ← 同步滚动  │
│  八佾篇    │ 乐 时  ：          │            │
│  ...       │ 乎 习            │            │
│            │    之            │            │
└────────────┴──────────────────┴────────────┘
```

**正文区域功能**:
- 竖排/横排切换 (CSS `writing-mode: vertical-rl`)
- 字号调节 (14px-24px)
- 4层字体回退链自动生效
- 点击段落 → 高亮对应原图区域 (基于 `image-locations` API)
- 选中文字 → 弹出"字典" / "翻译" / "引用" / "书签" 操作
- 注疏标记显示（正文中高亮 → 侧边浮层显示注疏内容）

**原图面板功能**:
- 使用 Mirador 3 + OpenSeadragon 加载 IIIF 图像
- 支持缩放、平移、全屏
- 滚动同步：正文滚动 → 原图跳到对应页面
- 点击原图位置 → 正文跳到对应文字
- 文字叠加层显示（基于 Manifest 中的 W3C Annotation）
- 可通过 `mirador-textoverlay` 插件实现

**Mirador 3 集成要点**:
```js
// 加载含文字叠加层的 Manifest
const manifestUrl = `/api/v1/classic/books/${bookId}/manifest?textOverlay=true`;

// 配置 Mirador
{
  id: 'classic-viewer',
  windows: [{
    manifestId: manifestUrl,
    // mirador-textoverlay 插件会自动解析 Annotations
    // 并允许用户在图像上看到 OCR 文字
  }],
  // OpenSeadragon 配置
  osdBounds: { x: 2400, y: 3200 },
}
```

### 3.2 首页/发现页

**数据源**: `GET classic/books?category=&keyword=&page=&pageSize=`

- 分类筛选栏: 经/史/子/集/释/道/命
- 搜索框（标题/作者/简介模糊搜索）
- 书籍卡片: 封面图 + 标题 + 作者/朝代 + 简介摘要
- 分页或无限滚动
- "继续阅读"快捷入口（最近10部）

### 3.3 书籍详情页

**数据源**: `GET classic/books/:id`

- 书籍元信息: 封面、标题、作者、朝代、分类、版本来源
- 章节目录（树形，支持折叠）
- "开始阅读" / "继续阅读" 按钮
- 同书多版本切换（`GET classic/books/:id/versions`）
- 引用生成入口（`GET classic/books/:id/cite`）
- 注疏列表入口（`GET classic/books/:id/annotations`）
- 知识图谱入口

### 3.4 字典/翻译弹窗

**数据源**: `POST classic/dictionary/lookup`, `POST classic/translate`

- 选中文字 → 弹出字典解释（含字源、读音、释义、例句）
- 选中段落 → "翻译"按钮 → 弹出文言文→白话文翻译
- 翻译结果含 AI 免责声明

### 3.5 古籍问答 (AI)

**数据源**: `POST classic/:classicId/qa`, `POST classic/:classicId/qa/stream` (SSE流式)

- 侧边栏或底部对话面板
- 预设问题建议
- 流式显示 AI 回答（打字机效果）
- 引用来源高亮可点击（跳转到原文章节）
- 对话历史保存

---

## 4. 关键技术集成点

### 4.1 IIIF + Mirador 3

**依赖**: `mirador`, `react-mirador` (或直接用 Mirador 3 CDN)

**自定义配置**:
1. Manifest URL = `/api/v1/classic/books/{bookId}/manifest?textOverlay=true`
2. 图像服务 URL（Cantaloupe）: Docker 中配置，前端通过 manifest 中 `body.id` 字段获取
3. 文字叠加层插件: 需加载 `mirador-textoverlay` 插件，或自行解析 Annotation `#xywh=` fragment

### 4.2 字体加载

**加载策略**:
1. 页面 `<head>` 中加载 `GET /api/v1/classic/fonts/font-face.css`
2. 使用 `unicode-range` 自动分层加载（现代浏览器原生支持）
3. 仅加载当前页面使用的 unicode-range 子集
4. `font-display: swap` 保证首屏不白屏

```html
<link rel="stylesheet" href="/api/v1/classic/fonts/font-face.css">
<link rel="stylesheet" href="/api/v1/classic/fonts/vertical.css">
```

### 4.3 图文同步滚动

**核心逻辑**:
1. 加载章节时调用 `GET /api/v1/classic/chapters/{id}/image-locations`
2. 获取 `pages[].textStart` / `pages[].textEnd` 映射
3. 正文 `scrollTop` / 总高度 → 当前字符位置
4. 二分查找对应的 `image.pageNumber`
5. Mirador 跳转到对应 Canvas

```js
// 伪代码
function syncImageToText(charIndex) {
  for (const page of mapping.pages) {
    if (charIndex >= page.textStart && charIndex < page.textEnd) {
      miradorViewer.setCanvas(page.pageNumber - 1); // 0-indexed
      return;
    }
  }
}
```

### 4.4 知识图谱可视化

**数据源**: `GET classic/knowledge/entities/:name`, `GET classic/knowledge/path`

- 使用 D3.js / vis-network 渲染力导向图
- 节点: 人物(红) / 书籍(蓝) / 概念(绿) / 事件(橙) / 地点(紫)
- 边: mentions(灰) / cites(蓝) / explains(绿)
- 点击节点展开 1-hop 邻居
- 双击跳转到相关书籍

---

## 5. 路由设计

```
/                           → 首页/发现
/books/:id                  → 书籍详情页
/books/:id/read             → 阅读器（竖排 + 图文对照）
/books/:id/read/:chapterId  → 阅读器（指定章节）
/books/:id/annotations      → 注疏浏览
/books/:id/versions         → 版本对比
/books/:id/knowledge        → 知识图谱浏览
/search                     → 搜索结果
/dictionary                 → 字典查询
/classics/bazi              → 八字古籍专区
/profile/bookmarks          → 我的书签
/profile/reading-history    → 阅读历史
```

---

## 6. 状态管理建议

### 阅读器状态（每个阅读器实例）
```ts
interface ReaderState {
  bookId: string;
  chapterId: string;
  verticalLayout: boolean;   // 竖排/横排
  fontSize: number;           // 14-24
  scrollPosition: number;     // 正文滚动位置
  currentPage: number;        // 当前原图页码
  mapping: ImageMapping | null; // 图文映射数据
  bookmarks: Bookmark[];
  showTranslation: boolean;   // 显示/隐藏译文
  showAnnotation: boolean;    // 显示/隐藏注疏
}
```

### 全局状态
```ts
interface AppState {
  user: User | null;
  continueReading: Book[];
  fontLoaded: boolean;
  theme: 'light' | 'sepia' | 'dark';
}
```

---

## 7. UI/UX 设计要点

### 7.1 竖排阅读器样式
- **背景**: 米色/仿古纸质感（`#f5f0e8` 或 `#faf3e0`）
- **文字颜色**: `#3d3226`
- **竖排行距**: `line-height: 2`, 字符间距 `letter-spacing: 0.15em`
- **注疏显示**: 正文下方双行小字（夹注）或侧边浮层（眉批）
- **标点**: 竖排居中显示

### 7.2 响应式
- **桌面**: 三栏（章节目录 250px + 正文 flex-grow + 原图 40%）
- **平板**: 两栏（正文 + 原图，目录抽屉式）
- **手机**: 单栏（正文为主，原图浮层触发）

### 7.3 主题
- **浅色**: 米白背景 + 深棕文字
- **深色**: `#1a1a2e` 背景 + `#e0d5c1` 文字
- **仿古**: 宣纸纹理 + 朱砂红点缀

---

## 8. 性能注意事项

### 8.1 大文本处理
- 长篇古籍章节可能数十万字，需虚拟滚动（react-window / vue-virtual-scroller）
- 图文映射数据按需分页加载（已实现 `pages` 数组精确映射）

### 8.2 IIIF 图像
- OpenSeadragon 使用 Deep Zoom 瓦片（IIIF Image API），自动按需加载
- 不需要全尺寸图像加载，视口内瓦片优先

### 8.3 字体
- `unicode-range` 自动子集加载，首次可能下载 500KB-2MB
- 后续页面访问命中浏览器缓存
- 使用 `font-display: swap` 防止 FOIT

### 8.4 API 缓存
- 字典查询结果客户端缓存（localStorage, TTL=1天）
- 章节列表、书籍详情使用 SWR/stale-while-revalidate
- Manifest JSON 可能很大（数百页 6MB+），浏览器 HTTP 缓存足够

---

## 9. 开发顺序建议

| 阶段 | 内容 | 依赖 |
|------|------|------|
| **P0 基础** | 首页、书籍列表、书籍详情、章节阅读（横排） | `classic/books`, `classic/chapters` API |
| **P1 阅读器** | 竖排切换、字号、主题、进度、书签 | `classic/progress`, `classic/bookmarks` |
| **P2 图文对照** | IIIF Mirador 集成、文字叠加层、同步滚动 | `classic/books/:id/manifest`, `classic/chapters/:id/image-locations` |
| **P3 学术工具** | 字典、翻译、注疏、引用生成 | `classic/dictionary`, `classic/translate`, `classic/cite` |
| **P4 AI** | 古籍问答（流式）、知识图谱可视化 | `classic/qa`, `classic/knowledge` |
| **P5 字体** | 竖排 CSS 调优、字体加载体验、仿古主题 | `classic/fonts` |

---

## 10. 后端已就绪确认

- ✅ **16 个 API 端点** 全部可调用
- ✅ **171 个经典模块测试** 全部通过
- ✅ **2,799 个全量测试** 零失败
- ✅ **14,477 部古籍** 数据库中
- ✅ **293 页 OCR 坐标** (55,852 条) 入库
- ✅ **IIIF Manifest** 含 W3C TextOverlay Annotation 生成
- ✅ **4 层字体回退链** CSS 端点
- ✅ **4 种引用格式** (GB/T 7714, Chicago, MLA, APA)
- ✅ **知识图谱** 实体提取、路径搜索、扩展查询
- ✅ **古籍问答** RAG + 流式 SSE

**联调就绪**: 前后端对接仅需确认 API base URL，无需后端改动。
