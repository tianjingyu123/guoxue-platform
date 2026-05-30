# 前端对接指南

## 一、共享包使用

```bash
# 前端项目引入
pnpm add @guoxue/shared
```

### TypeScript 类型

```typescript
// 工具注册
import type { ToolEntry, ToolsDirectory, ToolCategoryGroup } from "@guoxue/shared/types/tools";

// 八字
import type { BaziInput, BaziResult, SiZhu, Pillar, ShenShaItem } from "@guoxue/shared/types/tools";

// 奇门
import type { QimenYangInput, QimenResult, QimenGong } from "@guoxue/shared/types/tools";

// 六爻
import type { LiuYaoInput, LiuYaoResult, Yao, Hexagram } from "@guoxue/shared/types/tools";

// 梅花易数
import type { MeiHuaInput, MeiHuaResult, TiYongRelation } from "@guoxue/shared/types/tools";
```

### Mock 数据

```typescript
// 开发阶段直接 import JSON，无需等后端
import baziMock from "@guoxue/shared/mock/bazi-mock.json";
import qimenMock from "@guoxue/shared/mock/qimen-yang-mock.json";
import liuyaoMock from "@guoxue/shared/mock/liuyao-mock.json";
import meihuaMock from "@guoxue/shared/mock/meihua-mock.json";

// baziMock.samples[0].result 就是完整的 BaziResult
```

---

## 二、API 端点 (Base: /api/v1)

### 工具注册中心

| 方法 | 路径 | 说明 | 缓存 |
|------|------|------|------|
| GET | `/tools/directory` | 首页工具目录（按分类分组） | CDN 1天 |
| GET | `/tools` | 全部工具列表 | - |
| GET | `/tools/:id` | 单个工具详情 | - |
| GET | `/tools/:id/input-schema` | 工具输入Schema（动态表单） | - |
| GET | `/tools/category/:category` | 按分类获取 | - |

### AI分析（统一管道）

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/tools/:id/analyze` | 对任意工具结果进行AI分析 | 需登录 |
| GET | `/tools/analysis/:analysisId` | 获取分析记录详情 | - |
| GET | `/tools/analysis/history/mine` | 我的AI分析历史 | 需登录 |

**请求示例：**
```typescript
POST /api/v1/tools/bazi/analyze
Body: {
  "input": { /* 工具输入参数 */ },
  "result": { /* 工具排盘结果 */ },
  "paipanRecordId": "可选，已保存的排盘记录ID"
}
Response: {
  "code": 0,
  "data": {
    "id": "analysis-uuid",
    "analysisContent": "AI分析全文...",
    "createdAt": "2026-05-18T...",
    "isCached": false
  }
}
```

### 排盘（已实现）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/paipan/bazi/preview` | 八字排盘预览 |
| GET | `/paipan/bazi/public` | 八字CDN公开接口 |
| POST | `/paipan/bazi` | 八字排盘+保存(需登录) |
| POST | `/paipan/bazi/analyze` | AI分析(需登录) |
| POST | `/paipan/ziwei/preview` | 紫微斗数预览 |

---

## 三、工具嵌入模式

所有工具页面支持四种展示模式：

```typescript
import type { EmbedMode, ToolEmbedParams, EmbedMessageType } from "@guoxue/shared/types/tools";

type EmbedMode = "full" | "card" | "minimal" | "live";

// URL模式
// /tools/bazi                          → full（完整工具页）
// /tools/bazi?mode=card&preset=xxx     → card（嵌入卡片，如圈子帖子）
// /tools/bazi?mode=minimal&chartId=xxx → minimal（微缩分享卡）
// /tools/bazi?mode=live&roomId=xxx     → live（直播间互动模式）
```

### 场景接入

| 场景 | 模式 | 集成方式 |
|------|------|---------|
| 首页工具入口 | `full` | 直接路由跳转 |
| 圈子发帖附命盘 | `card` | iframe/postMessage, 或直接 import ToolCard 组件 |
| 评论区分享 | `minimal` | 静态截图+链接 |
| 直播间老师讲课 | `live` | 直播间内嵌 iframe，postMessage 同步生辰 |
| 文章内嵌 | `card` | 组件化嵌入 |
| 私信/IM | `minimal` | 生成短链分享卡片 |

### postMessage 协议

跨上下文通信使用标准 postMessage 协议，类型定义见 `@guoxue/shared/types/tools/embed`。

**父→iframe：**
| 事件 | 载荷 | 说明 |
|------|------|------|
| `TOOL_SET_PRESET` | `{ input, autoCalculate }` | 设置预设参数（直播间同步生辰） |
| `TOOL_SET_MODE` | `{ mode }` | 切换展示模式 |
| `TOOL_RESIZE` | `{ width, height }` | 调整尺寸 |
| `TOOL_REQUEST_DATA` | `{}` | 请求当前排盘数据 |
| `TOOL_SYNC_TIME` | `{ datetime }` | 同步时间（实时排盘） |

**iframe→父：**
| 事件 | 载荷 | 说明 |
|------|------|------|
| `TOOL_READY` | `{ toolId }` | 工具加载完成 |
| `TOOL_CHART_CREATED` | `{ chartId, shareUrl }` | 排盘完成 |
| `TOOL_DATA_RESPONSE` | `{ data: ToolCardData }` | 返回排盘数据 |
| `TOOL_HEIGHT_CHANGED` | `{ height }` | 内容高度变化，父页面自适应 |
| `TOOL_SHARE_CLICKED` | `{ data: ToolCardData }` | 用户点击分享 |
| `TOOL_SAVE_CLICKED` | `{ data: ToolCardData }` | 用户点击保存 |
| `TOOL_ERROR` | `{ message, code }` | 工具内部错误 |

```typescript
// 父页面示例：向工具iframe发送预设参数
iframe.contentWindow?.postMessage({
  type: EmbedMessageType.SET_PRESET,
  source: "parent",
  target: "iframe",
  payload: { input: { gender: "男", year: 1990, month: 5, day: 18, hour: 12 }, autoCalculate: true },
  timestamp: Date.now(),
  messageId: crypto.randomUUID(),
}, "*");

// 监听工具iframe的消息
window.addEventListener("message", (e) => {
  if (e.data.type === EmbedMessageType.CHART_CREATED) {
    console.log("排盘完成:", e.data.payload.chartId);
  }
});
```

---

## 四、工具卡片组件接口

每个工具的返回数据都包含标准化的格式：

```typescript
import type { ToolCardData, ToolCardProps, ToolRenderer } from "@guoxue/shared/types/tools";

interface ToolCardData {
  toolId: string;            // 工具ID
  toolName: string;          // 工具名称
  input: Record<string, unknown>;   // 排盘输入
  result: Record<string, unknown>;  // 排盘结果
  chartId: string;           // 唯一标识
  shareUrl: string;          // 分享短链
  createdAt: string;         // 创建时间
  clientName?: string;       // 排盘人姓名
}
```

前端统一使用 `ToolCard` 组件渲染，组件根据 `toolId` 动态选择子渲染器。

```typescript
// ToolCard 组件 Props
interface ToolCardProps {
  toolId: string;
  mode: EmbedMode;
  data?: ToolCardData;
  chartId?: string;
  preset?: Record<string, unknown>;
  interactive?: boolean;
  theme?: "light" | "dark" | "auto";
  width?: number | string;
  height?: number | string;
  onClick?: (data: ToolCardData) => void;
  onShare?: (data: ToolCardData) => void;
  onSave?: (data: ToolCardData) => void;
  onChartCreated?: (payload: ChartCreatedPayload) => void;
}

// 工具渲染器（每个工具实现此接口）
interface ToolRenderer {
  toolId: string;
  modes: EmbedMode[];
  render: (props: ToolCardProps) => React.ReactNode;
}
```

### 使用示例

```tsx
import { ToolCard } from "@/components/tools/ToolCard";

// 展示已保存的排盘
<ToolCard toolId="bazi" mode="card" chartId="xxx" />

// 从输入参数开始排盘
<ToolCard toolId="liuyao" mode="full" preset={{ method: "shake" }} />

// 直播间实时互动
<iframe src="/tools/bazi?mode=live&roomId=xxx" />
```

---

## 五、开发流程

### v0 UI设计阶段
1. 用 `packages/shared/src/mock/*.json` 的 mock 数据设计UI
2. 类型从 `@guoxue/shared` 导入，保持类型安全
3. 无需启动后端，纯前端开发

### Trae 前端实现阶段
1. 调真实 API 替换 mock 数据
2. 先用 preview 接口（无需登录），后用 save 接口（需登录）
3. 输入表单用 `/tools/:id/input-schema` 动态生成

### 联调上线阶段
- 后端 API 路径固定，前端替换 base URL 即可
- 所有排盘引擎 API 响应格式统一：`{ code, message, data }`
