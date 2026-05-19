# 国学传统文化综合平台 — API 对接文档

> 面向前端开发（Trae），覆盖所有 AI 相关接口及核心业务接口。
> 最后更新: 2026-05-15

---

## 一、通用规范

### 1.1 Base URL

```
开发环境:  http://localhost:3000
生产环境:  https://api.guoxue.com
```

### 1.2 鉴权方式

所有需鉴权的接口在 Header 中携带 JWT：

```
Authorization: Bearer <accessToken>
```

**Token 获取与刷新：**

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 手机注册 | POST | `/auth/register/phone` | `{ phone, password }` → `{ user, accessToken, refreshToken }` |
| 手机登录 | POST | `/auth/login/phone` | `{ phone, password }` → `{ user, accessToken, refreshToken }` |
| 短信登录 | POST | `/auth/login/sms` | `{ phone, code }` → `{ user, accessToken, refreshToken }` |
| 微信登录 | POST | `/auth/login/wechat` | `{ code, appType }` → `{ user, accessToken, refreshToken }` |
| 小程序手机 | POST | `/auth/login/mini-phone` | `{ code, encryptedData, iv }` → `{ user, accessToken, refreshToken }` |
| 刷新Token | POST | `/auth/refresh` | `{ refreshToken }` → `{ accessToken, refreshToken }` |
| 当前用户 | GET | `/auth/me` | 需鉴权 → 用户信息 |

`accessToken` 有效期 7 天，`refreshToken` 有效期 30 天。刷新时旧 refreshToken 立即失效（轮换防重放）。refreshToken 限流 5次/分钟/IP。

### 1.3 错误响应格式

```json
{
  "statusCode": 400,
  "message": "错误描述信息",
  "error": "Bad Request"
}
```

**常见 HTTP 状态码：**

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未登录或 Token 过期 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
| 503 | AI 服务不可用（未配置或超限） |

### 1.4 分页格式

**请求：**

```
GET /api?page=1&pageSize=20
```

**响应：**

```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "totalPages": 5
}
```

### 1.5 角色权限枚举

| 角色 | 常量 | 权限范围 |
|------|------|----------|
| 超级管理员 | `SUPER_ADMIN` | 全部权限 |
| 运营管理员 | `OPERATION_ADMIN` | 运营管理 |
| 内容审核员 | `CONTENT_AUDITOR` | 内容审核 |
| 圈主 | `CIRCLE_OWNER` | 自有圈子管理 |
| 普通用户 | (无角色) | 基础功能 |

---

## 二、SSE 流式协议（重要）

所有 AI 流式对话统一使用 **Server-Sent Events (SSE)** 格式。

### 2.1 请求方式

```
POST /path/stream
Content-Type: application/json
Authorization: Bearer <token>

{ "question": "...", "history": [...] }
```

### 2.2 响应格式

响应头 `Content-Type: text/event-stream`，每条消息以 `data: {json}\n\n` 格式推送。

### 2.3 事件类型

| type | 含义 | 数据结构 |
|------|------|----------|
| `chunk` | 文本增量片段 | `{ "type": "chunk", "content": "这是流式返回" }` |
| `source` | 参考来源（回答前先发） | `{ "type": "source", "index": 0, "title": "论语·学而", "excerpt": "子曰：学而时习之..." }` |
| `done` | 完成信号 | `{ "type": "done", "usage": { "promptTokens": 150, "completionTokens": 300 } }` |
| `error` | 错误 | `{ "type": "error", "message": "AI调用超时" }` |

### 2.4 前端消费示例

```typescript
async function sseChat(url: string, body: any, onChunk: (text: string) => void) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body),
  });

  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n\n');
    buffer = lines.pop()!;

    for (const line of lines) {
      if (!line.trim() || !line.startsWith('data: ')) continue;
      const json = JSON.parse(line.slice(6));
      if (json.type === 'chunk') onChunk(json.content);
      else if (json.type === 'error') throw new Error(json.message);
      else if (json.type === 'done') return; // 完成
    }
  }
}
```

### 2.5 所有 SSE 流式端点汇总

| 端点 | 说明 |
|------|------|
| `POST /ai/chat/stream` | AI网关通用流式对话 |
| `POST /ai/customer-service/stream` | 智能客服流式 |
| `POST /bots/:id/chat/stream` | 智能体流式对话 |
| `POST /circles/:circleId/assistant/stream` | 圈主助理流式问答 |
| `POST /classic/:classicId/qa/stream` | 古籍流式问答 |
| `POST /search/ai/summary/stream` | AI搜索总结流式 |

---

## 三、AI 对话核心

### 3.1 AI 网关 — 通用对话

**非流式：**

```
POST /ai/chat
Authorization: Bearer <token>

{
  "scene": "general_chat",           // 场景标识（见下方场景列表）
  "messages": [
    { "role": "system", "content": "你是国学助手..." },
    { "role": "user", "content": "孔子是哪个朝代的？" }
  ],
  "temperature": 0.7,                 // 可选，默认0.3
  "maxTokens": 2048,                  // 可选
  "topP": 0.9                         // 可选
}
```

响应：
```json
{
  "content": "孔子是春秋时期鲁国人...",
  "usage": { "promptTokens": 30, "completionTokens": 50 },
  "model": "deepseek-chat",
  "scene": "general_chat"
}
```

**流式：**

```
POST /ai/chat/stream
Authorization: Bearer <token>
Body: 同上
→ SSE 流式响应
```

### 3.2 可用场景 (scene)

| scene | 用途 | temperature | maxTokens |
|-------|------|-------------|-----------|
| `general_chat` | 通用国学对话 | 0.7 | 2048 |
| `smart_search` | 智能搜索 | 0.3 | 768 |
| `customer_service` | 智能客服 | 0.5 | 1024 |
| `circle_assistant` | 圈主助理 | 0.3 | 2048 |
| `classic_qa` | 古籍问答 | 0.3 | 2048 |
| `content_generation` | AI内容生成 | 0.8 | 4096 |
| `polish` | 文字润色 | 0.5 | 2048 |
| `suggest_tags` | 标签推荐 | 0.3 | 512 |
| `quality_score` | 质量评分 | 0.2 | 512 |
| `knowledge_graph` | 知识图谱提取 | 0.2 | 2048 |
| `multi-agent` | 多智能体协作 | 0.5 | 4096 |

### 3.3 智能客服

```
POST /ai/customer-service
Authorization: Bearer <token>

{
  "question": "如何学习国学？",
  "history": [                                          // 可选
    { "role": "user", "content": "之前问过的问题" },
    { "role": "assistant", "content": "之前的回答" }
  ]
}
```

响应同通用对话格式。

**流式：** `POST /ai/customer-service/stream` — 同样格式，SSE 响应。

### 3.4 智能体对话

**非流式：**

```
POST /bots/:id/chat
Authorization: Bearer <token>

{
  "query": "帮我写一首诗",
  "conversationId": "conv_xxx"       // 可选，为空则创建新会话
}
```

**流式（SSE）：**

```
POST /bots/:id/chat/stream
Authorization: Bearer <token>
Body: 同上
→ SSE 流式
```

**对话历史：**

```
GET /bots/:id/chat-history/:conversationId
Authorization: Bearer <token>
```

### 3.5 智能体列表与详情

```
GET /bots                          → 智能体列表（可 ?type=xxx 筛选）
GET /bots/ranking?limit=20         → 热度排行
GET /bots/feed-cards?limit=6       → 信息流卡片（含动态背景色）
GET /bots/:id                      → 智能体详情
GET /bots/circle/:circleId         → 某个圈子绑定的智能体
```

**智能体绑定到圈子：**

```
POST /bots/:id/bind-circle
Authorization: Bearer <token>
{ "circleId": "...", "knowledgeBaseId": "..." }
```

### 3.6 智能体知识库管理

```
POST /bots/:id/knowledge            → 添加知识条目 { title, content, sourceType?, sourceId? }
DELETE /bots/knowledge/:knowledgeId → 删除知识条目
```

---

## 四、圈主助理 (RAG 知识检索增强)

圈主助理是绑定到圈子的 AI 问答系统，基于圈子知识库提供精准回答。

### 4.1 提问

**简化路径（仅需 question）：**

```
POST /circles/:circleId/assistant
Authorization: Bearer <token>

{ "question": "这个圈子有哪些学习资源？" }
```

响应：
```json
{
  "answer": "该圈子有以下学习资源...",
  "sources": [
    { "title": "入门指南", "excerpt": "本圈子提供...", "id": "xxx" }
  ]
}
```

**非流式（含历史）：**

```
POST /circles/:circleId/assistant/ask
Authorization: Bearer <token>

{
  "question": "...",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**流式（SSE）：**

```
POST /circles/:circleId/assistant/stream
Authorization: Bearer <token>
Body: 同上
→ SSE 流式（事件类型含 source/chunk/done/error）
```

### 4.2 知识库 CRUD

```
GET    /circles/:circleId/knowledge?page=1&pageSize=20&sourceType=post  → 列表
POST   /circles/:circleId/knowledge                                     → 添加条目
        { "sourceType": "post|article|free_text", "sourceId": "...", "content": "..." }
PUT    /circles/:circleId/knowledge/:id                                 → 更新条目 { "content": "..." }
DELETE /circles/:circleId/knowledge/:id                                 → 删除条目
```

### 4.3 候选内容审核（圈主审核）

```
GET  /circles/:circleId/knowledge/candidates?page=1&pageSize=20        → 候选列表
POST /circles/:circleId/knowledge/candidates/:candidateId/confirm      → 确认入库
POST /circles/:circleId/knowledge/candidates/:candidateId/reject       → 拒绝
```

### 4.4 知识库同步（管理端）

```
POST /circle-knowledge/sync/:circleId          → 同步指定圈子知识库
POST /circle-knowledge/sync-all                → 全量同步所有圈子
POST /circle-knowledge/add                     → 手动添加知识
        { circleId, userId, targetType: "post|article", targetId }
POST /circle-knowledge/remove/:knowledgeId     → 移除 { circleId, userId }
GET  /circle-knowledge/candidates/:circleId?status=pending → 候选列表
POST /circle-knowledge/candidates/:candidateId/confirm     → 确认
POST /circle-knowledge/candidates/:candidateId/reject      → 拒绝
```

---

## 五、古籍问答

基于30+部古典典籍（论语、道德经、易经等）的智能问答。知识库在服务启动时自动播种并向量化。

### 5.1 提问

```
POST /classic/:classicId/qa
Authorization: Bearer <token>

{
  "question": "如何理解'学而时习之'？",
  "history": [...]                      // 可选
}
```

参数 `classicId` 指定限制在某一部典籍中检索，为空则跨全部典籍。

**流式：**

```
POST /classic/:classicId/qa/stream
Authorization: Bearer <token>
Body: 同上
→ SSE 流式
```

### 5.2 问答历史

```
GET /classic/:classicId/qa
Authorization: Bearer <token>
```

---

## 六、AI 搜索

### 6.1 智能搜索（简化入口）

```
POST /search/ai
Authorization: Bearer <token>

{ "query": "孔子的教育思想" }
```

响应：
```json
{
  "answer": "孔子主张有教无类...（300字以内）",
  "query": "孔子的教育思想"
}
```

### 6.2 AI 搜索总结

对已有搜索结果生成智能总结。

```
POST /search/ai/summary
Authorization: Bearer <token>

{
  "query": "国学经典",
  "results": [
    { "title": "论语", "content": "儒家经典著作..." },
    { "title": "道德经", "content": "道家核心经典..." }
  ]
}
```

响应：
```json
{
  "summary": "搜索结果中最相关的是...（200字以内）",
  "query": "国学经典"
}
```

**流式：** `POST /search/ai/summary/stream` — SSE 格式，事件格式略有不同：
```
data: {"delta":"文本增量"}
data: [DONE]
data: {"error":"错误信息"}
```

> 注意：此端点使用 `{ delta }` 而非 `{ type: "chunk", content }`，是较早的实现。

---

## 七、AI 发布辅助

帮助创作者提升内容质量。

```
所有接口需鉴权: Authorization: Bearer <token>
```

| 接口 | 方法 | 路径 | 入参 | 出参 |
|------|------|------|------|------|
| 文字润色 | POST | `/ai/publish/polish` | `{ text }` | `{ polishedText }` |
| 标题优化 | POST | `/ai/publish/optimize-title` | `{ content }` | `{ titles: [...] }` |
| 标签推荐 | POST | `/ai/publish/suggest-tags` | `{ content }` | `{ tags: [...] }` |
| 封面生成 | POST | `/ai/publish/generate-cover` | `{ prompt }` | `{ imageUrl }` |

---

## 八、AI 媒体处理

### 8.1 图像内容审核

```
POST /ai/media/image-audit
Authorization: Bearer <token>

{ "imageUrl": "https://...", "context": "用户头像" }  // context 可选
```

响应：
```json
{
  "safe": true,
  "score": 0.95,
  "labels": ["normal"],
  "suggestion": "Pass"
}
```

### 8.2 文字转语音 (TTS)

```
POST /ai/media/tts
Authorization: Bearer <token>

{
  "text": "学而时习之，不亦说乎",
  "voice": "zh-CN-Standard-A",    // 可选，音色选择
  "speed": 1.0                     // 可选，0.5-2.0
}
```

响应：
```json
{
  "audioUrl": "https://cos.../tts/xxx.mp3",
  "ssml": "<speak>...</speak>",
  "duration": 3.5
}
```

### 8.3 语音转文字 (ASR)

```
POST /ai/media/transcribe
Authorization: Bearer <token>

{
  "audioUrl": "https://...",
  "language": "zh"                // 可选
}
```

响应：
```json
{
  "text": "识别出的文字内容",
  "confidence": 0.97
}
```

### 8.4 媒体任务列表（管理员）

```
GET /ai/media/tasks?page=1&pageSize=20&type=tts
Authorization: Bearer <token>
// type: image_audit | tts | transcribe
```

---

## 九、AI 能力（腾讯云集成）

### 9.1 语音识别

```
POST /ai/asr/sentence      → 一句话识别（60秒内）
        { audio: "base64...", format: "wav" }

POST /ai/asr/task           → 创建长语音识别任务
        { audioUrl: "...", callbackUrl: "..." }

GET  /ai/asr/task?taskId=123 → 查询识别结果
```

### 9.2 OCR

```
POST /ai/ocr/general      → 通用印刷体识别 { image: "base64..." }
POST /ai/ocr/handwriting   → 手写体识别     { image: "base64..." }
POST /ai/ocr/ancient       → 古籍文字识别   { image: "base64..." }
```

### 9.3 NLP

```
POST /ai/nlp/sentiment    → 情感分析   { text: "..." }
POST /ai/nlp/keywords     → 关键词提取 { text: "...", count: 10 }
```

### 9.4 翻译

```
POST /ai/translate        → 文本翻译 { text, sourceLang, targetLang }
POST /ai/detect-language  → 语种识别 { text }
```

### 9.5 AI 监控（管理员）

```
GET /ai/usage-stats?period=day|week|month    → 使用统计
GET /ai/call-logs?page=1&pageSize=20&service=deepseek → 调用日志
GET /ai/abnormal-alerts                      → 异常告警
```

---

## 十、智能体广场

公开接口，无需鉴权。

```
GET /ai/marketplace/agents?keyword=国学&category=education&page=1&pageSize=12
```

响应：
```json
{
  "items": [
    {
      "id": "bot_xxx",
      "name": "论语大师",
      "avatar": "https://...",
      "intro": "精通论语解读",
      "type": "education",
      "category": "经典解读",
      "isFree": true,
      "price": 0,
      "usageCount": 1234,
      "rating": 4.8,
      "tags": ["经典", "教育"]
    }
  ],
  "total": 50,
  "page": 1,
  "pageSize": 12
}
```

**详情：**

```
GET /ai/marketplace/agents/:id
```

---

## 十一、发现页

公开接口，可选鉴权。

### 11.1 发现页聚合

```
GET /discover?page=1&pageSize=10&type=post&categoryLevel1=经典&categoryLevel2=儒学
```

响应：
```json
{
  "items": [
    {
      "type": "post",
      "id": "...",
      "title": "...",
      "cover": "...",
      "categoryLevel1": "经典",
      "categoryLevel2": "儒学",
      "author": { "nickname": "...", "avatar": "..." },
      "stats": { "views": 100, "likes": 20 },
      "createdAt": "2026-05-15T00:00:00Z"
    }
  ],
  "total": 200,
  ...
}
```

### 11.2 其他端点

```
GET /discover/categories                    → 品类导航树
GET /discover/hot?page=1&pageSize=10        → 热门内容（运营热榜池）
GET /discover/recommendations?page=1&pageSize=10   → 个性化推荐（可选登录）
        // 已登录：基于用户画像推荐
        // 未登录：返回热门内容
```

---

## 十二、AI 智能信息流

```
GET /recommend/smart-feed?page=1&pageSize=20
Authorization: Bearer <token>

POST /recommend/smart-feed/refresh
Authorization: Bearer <token>
```

智能信息流基于用户行为（浏览/点赞/收藏）、知识水平（难度自适应）、兴趣画像生成个性化推荐排序。

---

## 十三、运营引擎（管理员）

全部需 `OPERATION_ADMIN` 或以上角色。

```
GET  /operation-engine/overview                                          → 运营概览
GET  /operation-engine/recommendations/related?categoryLevel1=经典        → 关联推荐
GET  /operation-engine/recommendations/personalized?userId=xxx            → 个性化推荐
POST /operation-engine/brief                                              → 手动生成运营周报
POST /operation-engine/detect-empty                                       → 空板块检测
POST /operation-engine/rotate                                             → 首页内容轮换
POST /operation-engine/mark-hot                                           → 热门内容标记
POST /operation-engine/fill-empty                                         → 空品类AI填充
```

---

## 十四、AI 内容生成（管理员）

```
POST /content-generation/generate
Authorization: Bearer <token>

{
  "categoryLevel1": "经典",
  "categoryLevel2": "儒学",
  "types": ["knowledge", "classics", "tutorial"]     // 可选
}

GET  /content-generation/stats        → 品类内容统计
GET  /content-generation/categories   → 品类标签树
POST /content-generation/auto-fill    → 自动填充空品类
```

---

## 十五、虚拟运营机器人（管理员）

管理 4 个自动化运营机器人：内容巡检机器人、异常检测机器人、质量评分机器人、运营机器人。

```
GET  /operation-robots                       → 所有机器人状态
POST /operation-robots/:role/toggle          → 切换开关 { enabled: true/false }
POST /operation-robots/init                  → 初始化机器人系统
```

---

## 十六、AI 质量评分

### 16.1 四维评分体系

| 维度 | 权重 | 说明 |
|------|------|------|
| 内容长度与丰富度 | 0.25 | 信息量、结构完整性 |
| 来源权威性 | 0.30 | 经典=1.0, 课程=0.85, 文章=0.75, 帖子=0.50 |
| 可读性 | 0.25 | 段落组织、语言流畅度 |
| 引用准确性 | 0.20 | 引用完整性、外部来源 |

### 16.2 接口

```
POST /api/v1/ai/quality/score
Authorization: Bearer <token>
{ "content": "...", "context": "...", "scene": "...", "referenceAnswer": "..." }

POST /api/v1/ai/quality/score-batch
Authorization: Bearer <token>
{ "items": [{ "content": "..." }, { "content": "..." }] }

GET  /api/v1/ai/quality/scores?scene=xxx&minOverall=0.7&skip=0&take=20
GET  /api/v1/ai/quality/stats?scene=xxx
```

评分响应：
```json
{
  "overall": 0.85,
  "dimensions": {
    "length": 0.8,
    "sourceAuthority": 1.0,
    "readability": 0.85,
    "citation": 0.75
  },
  "scoreId": "qs_xxx",
  "createdAt": "..."
}
```

---

## 十七、管理后台 — AI 配置（管理员）

### 17.1 模型路由配置

```
GET  /admin/ai/routing/config              → 完整路由配置（含所有场景）
PUT  /admin/ai/routing/config              → 更新完整配置
PUT  /admin/ai/routing/scenes/:scene       → 更新单场景配置
POST /admin/ai/routing/config/validate     → 验证配置有效性
GET  /admin/ai/routing/config/history      → 配置变更历史
GET  /admin/ai/routing/budgets             → 各场景预算使用
```

场景路由配置结构：
```typescript
{
  default: {
    model: "deepseek-chat",
    fallbackModel: "deepseek-lite",
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    grayRelease?: { newModel: "...", percentage: 30 },
    budgetControl?: { monthlyTokenLimit: 1000000, lightModel: "deepseek-lite" }
  },
  scenes: {
    "customer_service": { model: "...", temperature: 0.5, ... },
    "circle_assistant": { model: "...", temperature: 0.3, ... },
    ...
  }
}
```

### 17.2 知识库去重审核

```
GET  /admin/knowledge/dedup/candidates?page=1&pageSize=20&status=pending&circleId=xxx&minSimilarity=0.8
GET  /admin/knowledge/dedup/candidates/:id         → 候选详情
POST /admin/knowledge/dedup/candidates/:id/decide   → 决策 { decision: "override|keepBoth|keepExisting", reason: "..." }
POST /admin/knowledge/dedup/batch                   → 批量审核 { items: [...] }
GET  /admin/knowledge/dedup/stats                   → 去重统计
```

### 17.3 RAG Prompt 模板管理

```
GET    /admin/rag/templates?scene=circle_assistant    → 模板列表
GET    /admin/rag/templates/:id                       → 模板详情
POST   /admin/rag/templates                           → 创建模板
        { scene, templateName, systemPrompt, userPromptTemplate?, variables? }
PUT    /admin/rag/templates/:id                        → 更新模板
DELETE /admin/rag/templates/:id                        → 删除模板（仅SUPER_ADMIN）
POST   /admin/rag/templates/preview                   → 预览渲染
        { systemPrompt, userPromptTemplate?, variables?, testQuestion? }
```

### 17.4 圈主助理管理（管理员）

```
GET  /bots/manage/approvals?page=1&pageSize=20              → 待审批开通申请
POST /bots/manage/approvals/:circleId/approve               → 批准
GET  /bots/manage/knowledge/:circleId?page=1&pageSize=20    → 知识库列表
POST /bots/manage/knowledge/:circleId                       → 添加知识条目
        { question: "...", answer: "..." }
PUT  /bots/manage/knowledge/:knowledgeId                    → 更新条目
DELETE /bots/manage/knowledge/:knowledgeId                   → 删除条目
GET  /bots/manage/usage/:circleId                           → 使用数据
```

### 17.5 圈子助理管理（/ai 路径）

```
GET  /ai/circle-assistants                         → 圈主助理列表
POST /ai/circle-assistants/:circleId/approve       → 审批通过
POST /ai/circle-assistants/:circleId/reject        → 驳回 { reason: "..." }
GET  /ai/knowledge/:circleId                       → 获取知识库
POST /ai/knowledge/:circleId                       → 添加 { title, content }
PUT  /ai/knowledge/:id                             → 更新 { title?, content? }
DELETE /ai/knowledge/:id                           → 删除
GET  /ai/usage/:circleId                           → 圈子AI使用数据
```

---

## 十八、智能体同步与管理（管理员）

### 18.1 Coze 集成

```
POST /bots/sync/coze                                → 从 Coze 同步智能体列表
GET  /bots/:id/coze-info                            → Coze 侧智能体详情
POST /bots/workflow/run                             → 执行 Coze 工作流
        { workflowId: "...", botConfigId: "...", parameters: {...} }
```

### 18.2 智能体管理

```
POST   /bots                     → 创建智能体
PUT    /bots/:id                 → 更新智能体
DELETE /bots/:id                 → 删除智能体
POST   /bots/:id/voice-room      → 创建语音通话房间（Coze RTC）
POST   /bots/:id/upload-file     → 上传文件 { file: "base64...", filename: "..." }
```

创建智能体 DTO：
```typescript
{
  name: string;           // 智能体名称
  type: string;           // 类型
  avatar?: string;        // 头像URL
  intro?: string;         // 简介
  botId: string;          // Coze Bot ID
  apiKey: string;         // Coze API Key
  isFree?: boolean;       // 是否免费
  dailyLimit?: number;    // 日限制
  price?: number;         // 单次价格
  monthlyPrice?: number;  // 月度价格
  sortOrder?: number;     // 排序
  voiceEnabled?: boolean; // 支持语音
}
```

---

## 十九、健康检查

用于部署监控和负载均衡探针，无需鉴权。

```
GET /api/v1/health           → { status: "ok", uptime: 123456, db: "ok", redis: "ok" }
GET /api/v1/health/ready     → 就绪探针（含 DB/Redis 连接检测）
GET /api/v1/health/live      → 存活探针（仅确认进程存活）
```

---

## 二十、管理后台路由总表

管理后台 `apps/admin` 通过 `/api/` 前缀代理到 NestJS 后端。前端路由对应的后端接口前缀：

| 管理后台功能 | 后端 Controller | 路由前缀 | 主要方法 |
|-------------|----------------|----------|----------|
| AI模型路由 | AdminModelRoutingController | `/admin/ai/routing` | GET/PUT/POST |
| 知识去重审核 | AdminDedupController | `/admin/knowledge/dedup` | GET/POST |
| RAG模板管理 | AdminRagController | `/admin/rag/templates` | CRUD + preview |
| AI网关总览 | AiGatewayController | `/ai` | routing-config/budgets |
| 智能体管理 | BotController | `/bots` | CRUD + sync/approval |
| 运营引擎 | OperationEngineController | `/operation-engine` | GET overview/recommendations |
| 运营机器人 | OperationRobotController | `/operation-robots` | GET/toggle/init |
| 内容生成 | ContentGenerationController | `/content-generation` | generate/stats/categories |
| 质量评分 | QualityScorerController | `/api/v1/ai/quality` | score/stats |
| 媒体处理 | MediaAiController | `/ai/media` | audit/tts/transcribe |
| 知识同步 | KnowledgeSyncController | `/circle-knowledge` | sync/candidates |
| AI能力监控 | AiController | `/ai` | usage-stats/call-logs/alerts |
| 用户管理 | UserController | `/users` | CRUD |
| 系统配置 | SystemController | `/system` | config/maintenance |
| 财务对账 | FinanceController | `/finance` | reconciliation |

---

## 附录 A：前端集成优先级建议

### P0（ChatUI 核心功能）

1. **AI 通用对话** — `POST /ai/chat` + `POST /ai/chat/stream`
2. **鉴权系统** — `/auth/login|register|refresh|me`
3. **智能体广场** — `GET /bots` + `GET /ai/marketplace/agents`
4. **智能体对话** — `POST /bots/:id/chat/stream` + `GET /bots/:id/chat-history`

### P1（圈子功能）

5. **圈主助理** — `POST /circles/:circleId/assistant/stream` + 知识库管理
6. **古籍问答** — `POST /classic/:classicId/qa/stream`
7. **AI 搜索** — `POST /search/ai`
8. **发现页** — `GET /discover` + `/discover/recommendations`

### P2（内容创作 & 运营）

9. **AI 发布辅助** — `/ai/publish/*`
10. **智能信息流** — `GET /recommend/smart-feed`
11. **AI 媒体处理** — TTS/ASR/图片审核

## 附录 B：SSE 事件处理完整示例

```typescript
interface SSEMessage {
  type: 'chunk' | 'source' | 'done' | 'error';
  content?: string;
  index?: number;
  title?: string;
  excerpt?: string;
  message?: string;
  usage?: { promptTokens?: number; completionTokens?: number };
}

// 完整的 SSE 消费 hook
function useAIStream() {
  const [text, setText] = useState('');
  const [sources, setSources] = useState<Array<{title:string,excerpt:string}>>([]);
  const [streaming, setStreaming] = useState(false);

  async function ask(url: string, body: any) {
    setText(''); setSources([]); setStreaming(true);

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop()!;

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const msg: SSEMessage = JSON.parse(line.slice(6));

        switch (msg.type) {
          case 'source':
            setSources(prev => [...prev, { title: msg.title!, excerpt: msg.excerpt! }]);
            break;
          case 'chunk':
            setText(prev => prev + (msg.content || ''));
            break;
          case 'error':
            throw new Error(msg.message);
          case 'done':
            setStreaming(false);
            return;
        }
      }
    }
    setStreaming(false);
  }

  return { text, sources, streaming, ask };
}
```
