/**
 * 工具生态嵌入 — 统一嵌入接口
 *
 * 所有工具页面支持四种展示模式：full / card / minimal / live
 * 嵌入方式：iframe+postMessage / 直接组件引入 / 静态截图+链接
 */

import type { EmbedMode } from "./tool-registry";

// ── 工具卡片标准化数据 ──

/** 所有工具排盘/计算结果统一包装格式 */
export interface ToolCardData {
  /** 工具ID */
  toolId: string;
  /** 工具名称 */
  toolName: string;
  /** 排盘输入 */
  input: Record<string, unknown>;
  /** 排盘结果 */
  result: Record<string, unknown>;
  /** 唯一标识（排盘记录ID） */
  chartId: string;
  /** 分享短链 */
  shareUrl: string;
  /** 创建时间 */
  createdAt: string;
  /** 排盘人姓名 */
  clientName?: string;
}

// ── 嵌入场景 ──

/** 嵌入来源场景 */
export type EmbedSourceScene =
  | "home"           // 首页工具入口
  | "circle_post"    // 圈子帖子附命盘
  | "livestream"     // 直播间老师讲课
  | "article"        // 文章内嵌
  | "im"             // 私信/IM
  | "course"         // 课程内容
  | "qa"             // 问答
  | "comment";       // 评论区分享

// ── postMessage 协议 ──

/** postMessage 事件类型 */
export enum EmbedMessageType {
  // 父页面 → iframe
  SET_PRESET      = "TOOL_SET_PRESET",       // 设置预设参数（如直播间同步生辰）
  SET_MODE        = "TOOL_SET_MODE",         // 切换展示模式
  RESIZE          = "TOOL_RESIZE",           // 调整iframe尺寸
  REQUEST_DATA    = "TOOL_REQUEST_DATA",     // 请求当前排盘数据
  SYNC_TIME       = "TOOL_SYNC_TIME",        // 同步时间（如直播间实时排盘）

  // iframe → 父页面
  READY           = "TOOL_READY",            // 工具加载完成
  CHART_CREATED   = "TOOL_CHART_CREATED",    // 排盘完成
  DATA_RESPONSE   = "TOOL_DATA_RESPONSE",    // 返回排盘数据
  HEIGHT_CHANGED  = "TOOL_HEIGHT_CHANGED",   // 内容高度变化
  SHARE_CLICKED   = "TOOL_SHARE_CLICKED",    // 用户点击分享
  SAVE_CLICKED    = "TOOL_SAVE_CLICKED",     // 用户点击保存（需登录）
  ERROR           = "TOOL_ERROR",            // 工具内部错误
}

/** postMessage 消息格式 */
export interface EmbedMessage<T = unknown> {
  type: EmbedMessageType;
  source: string;        // 工具ID
  target: "parent" | "iframe";
  payload: T;
  timestamp: number;
  messageId: string;     // 用于请求-响应配对
}

/** SET_PRESET 消息载荷 */
export interface SetPresetPayload {
  input: Record<string, unknown>;
  /** 是否自动开始排盘 */
  autoCalculate?: boolean;
}

/** CHART_CREATED 消息载荷 */
export interface ChartCreatedPayload {
  chartId: string;
  toolId: string;
  shareUrl: string;
  /** 缩略图URL（minimal模式用） */
  thumbnail?: string;
}

/** DATA_RESPONSE 消息载荷 */
export interface DataResponsePayload {
  data: ToolCardData;
}

/** HEIGHT_CHANGED 消息载荷 */
export interface HeightChangedPayload {
  height: number;
}

// ── ToolCard 组件接口 ──

/** ToolCard React 组件 Props */
export interface ToolCardProps {
  /** 工具ID */
  toolId: string;
  /** 展示模式 */
  mode: EmbedMode;
  /** 排盘数据（直接传入时跳过加载） */
  data?: ToolCardData;
  /** 排盘记录ID（从服务端加载时传入） */
  chartId?: string;
  /** 预设输入参数 */
  preset?: Record<string, unknown>;
  /** 是否可交互（minimal模式不可交互） */
  interactive?: boolean;
  /** 主题 */
  theme?: "light" | "dark" | "auto";
  /** 尺寸 */
  width?: number | string;
  height?: number | string;
  /** 点击回调 */
  onClick?: (data: ToolCardData) => void;
  /** 分享回调 */
  onShare?: (data: ToolCardData) => void;
  /** 保存回调 */
  onSave?: (data: ToolCardData) => void;
  /** 排盘完成回调（full模式） */
  onChartCreated?: (payload: ChartCreatedPayload) => void;
}

/** 工具子渲染器接口（每个工具实现此接口以适配ToolCard） */
export interface ToolRenderer {
  /** 工具ID */
  toolId: string;
  /** 渲染模式 */
  modes: EmbedMode[];
}

// ── 场景接入指南 ──

/**
 * 场景1：首页工具入口 (full)
 *   直接路由跳转 → /tools/bazi
 *
 * 场景2：圈子发帖附命盘 (card)
 *   <ToolCard toolId="bazi" mode="card" chartId="xxx" />
 *   或 iframe: <iframe src="/tools/bazi?mode=card&chartId=xxx" />
 *
 * 场景3：评论区分享 (minimal)
 *   静态截图+链接，点击跳转full模式
 *   <ToolCard toolId="bazi" mode="minimal" chartId="xxx" interactive={false} />
 *
 * 场景4：直播间老师讲课 (live)
 *   <iframe src="/tools/bazi?mode=live&roomId=xxx" />
 *   postMessage SYNC_TIME 同步老师端生辰
 *   postMessage SET_PRESET 切换不同案例
 *
 * 场景5：文章内嵌 (card)
 *   组件化嵌入：<ToolCard toolId="bazi" mode="card" chartId="xxx" />
 *
 * 场景6：私信/IM (minimal)
 *   生成短链分享卡片，点击跳转
 *   GET /tools/bazi?mode=minimal&chartId=xxx → 静态渲染
 */
