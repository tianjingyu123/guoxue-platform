/**
 * AI 获客内容套件数据层（课-P1）— 对接后端 /ai/marketing 系列端点
 * 契约：
 *   GET  /ai/marketing/today-topics  今日选题（节气引擎+模板轮换·纯规则）→ { date, topics }
 *   POST /ai/marketing/video-script | moments | xiaohongshu  { topic, style? } → 生成结果（已过审·尾部含 ref 短链）
 * 无 mock 回退：请求失败错误向上抛，由调用方走三态降级。
 */
import { apiGet, apiPost } from '@/utils/request'

/** 营销内容类型（与后端 MarketingContentKind 枚举一致） */
export type MarketingKind = 'SHORT_VIDEO' | 'MOMENTS' | 'XIAOHONGSHU'

/** 内容类型 → 中文标签 */
export const MARKETING_KIND_LABEL: Record<MarketingKind, string> = {
  SHORT_VIDEO: '短视频脚本',
  MOMENTS: '朋友圈文案',
  XIAOHONGSHU: '小红书图文',
}

/** 一条今日选题 */
export interface MarketingTopic {
  id: string
  title: string
  desc: string
  /** JIEQI=节气选题（天文引擎） TEMPLATE=模板轮换选题 */
  source: 'JIEQI' | 'TEMPLATE'
}

/** 今日选题响应 */
export interface TodayTopicsResult {
  /** Asia/Shanghai 日期 YYYY-MM-DD */
  date: string
  topics: MarketingTopic[]
}

/** 生成结果（内容已过三层审核漏斗·尾部自动拼 ref 归因短链） */
export interface MarketingGenerated {
  id: string
  kind: MarketingKind
  topic: string
  content: string
  /** 当月已用次数 / 月限额 */
  monthlyUsed: number
  monthlyLimit: number
}

/** 内容类型 → 生成端点路径 */
const KIND_PATH: Record<MarketingKind, string> = {
  SHORT_VIDEO: '/ai/marketing/video-script',
  MOMENTS: '/ai/marketing/moments',
  XIAOHONGSHU: '/ai/marketing/xiaohongshu',
}

export const marketingContentApi = {
  /** 今日发什么：3-5 个今日选题（登录态） */
  todayTopics(): Promise<TodayTopicsResult> {
    return apiGet<TodayTopicsResult>('/ai/marketing/today-topics')
  },

  /** 按类型生成营销内容（AI 生成→审核漏斗→尾部拼 ref 短链；限额满/未过审会抛业务错误） */
  generate(kind: MarketingKind, topic: string, style?: string): Promise<MarketingGenerated> {
    return apiPost<MarketingGenerated>(KIND_PATH[kind], style ? { topic, style } : { topic })
  },
}
