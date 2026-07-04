/**
 * 创-P3 AI 实时创作三能力 data 层 —— 对接后端 ai/creation（创-P2 已上线）
 * 端点：POST /ai/creation/classic-quotes | paipan-card | similar-cases
 * 返回结构严格对齐 apps/server/src/modules/ai/creation-assist.service.ts，不臆想字段。
 *
 * 插入格式说明（诚实降级）：帖子正文渲染走 parseMarkdown（lib/post-detail-data.ts），
 * 仅支持 h2/quote/li/hr/em/p 等纯文本块，无链接与自定义块能力 →
 * 三类卡均文本化为 Markdown 引用块（buildXxxInsertText），跳转链接降级为出处/标题文字。
 */
import { apiGet, apiPost } from '@/utils/request'

// ═════════════ 类型（对齐后端 service 导出结构） ═════════════

/** 古籍引用卡（classic-quotes items 元素） */
export interface ClassicQuoteItem {
  quote: string
  bookTitle: string
  chapterTitle: string
  chapterId: string
  bookId: string
}

export interface ClassicQuotesResult {
  keywords: string[]
  items: ClassicQuoteItem[]
}

/** 命盘卡单柱（含纳音/十神·不含姓名生辰——R3 后端构造保证） */
export interface PaipanCardPillar {
  gan: string
  zhi: string
  ganZhi: string
  nayin: string
  ganShiShen: string
  zhiShiShen: string
}

export interface PaipanCard {
  source: 'ganzhi' | 'record'
  recordId?: string
  paipanType?: string
  siZhu: { nian: PaipanCardPillar; yue: PaipanCardPillar; ri: PaipanCardPillar; shi: PaipanCardPillar }
  riZhu: string
  /** 干支纯文本（跳排盘工具带参用） */
  ganZhiText: string
  wuXing: { 木: number; 火: number; 土: number; 金: number; 水: number; desc: string }
}

/** 相似案例卡（similar-cases items 元素） */
export interface SimilarCaseItem {
  postId: string
  title: string
  excerpt: string
  qualityScore: number
  isOwn: boolean
}

export interface SimilarCasesResult {
  keywords: string[]
  items: SimilarCaseItem[]
}

/** 我的八字排盘记录（GET /paipan/bazi 列表项·仅本人可见） */
export interface BaziRecordItem {
  id: string
  clientName: string | null
  clientBirth: string | null
  createdAt: string
}

// ═════════════ 干支校验常量（六十甲子固定域·非 mock 数据） ═════════════

export const GAN_LIST = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
export const ZHI_LIST = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const

/** 前端轻校验一柱干支（阴阳配对等严校验在后端 NA_YIN 表兜底） */
export function isValidGanZhi(gz: string): boolean {
  const t = (gz ?? '').trim()
  return (
    t.length === 2 &&
    (GAN_LIST as readonly string[]).includes(t[0]) &&
    (ZHI_LIST as readonly string[]).includes(t[1])
  )
}

// ═════════════ API ═════════════

export const creationAssistApi = {
  /** 古籍引用推荐：文段→46万章检索+AI复排→引用卡（≤2000字） */
  classicQuotes: (text: string) =>
    apiPost<ClassicQuotesResult>('/ai/creation/classic-quotes', { text: text.slice(0, 2000) }),

  /** 命盘卡渲染（手动四柱干支） */
  paipanCardFromGanZhi: (siZhu: { nian: string; yue: string; ri: string; shi: string }) =>
    apiPost<PaipanCard>('/ai/creation/paipan-card', siZhu),

  /** 命盘卡渲染（本人排盘记录·后端强校验归属 R3） */
  paipanCardFromRecord: (paipanRecordId: string) =>
    apiPost<PaipanCard>('/ai/creation/paipan-card', { paipanRecordId }),

  /** 相似案例检索：本人历史帖+全站公开帖（≤1000字·R3 隔离在后端） */
  similarCases: (text: string, tags?: string[]) => {
    const cleanTags = (tags ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 5)
    return apiPost<SimilarCasesResult>(
      '/ai/creation/similar-cases',
      cleanTags.length ? { text: text.slice(0, 1000), tags: cleanTags } : { text: text.slice(0, 1000) },
    )
  },

  /** 我的八字排盘记录列表（供命盘 tab「从记录选」·响应 { records, total } 直传） */
  myBaziRecords: (page = 1, pageSize = 20) =>
    apiGet<{ records: BaziRecordItem[]; total: number }>(`/paipan/bazi?page=${page}&pageSize=${pageSize}`),
}

// ═════════════ 插入文本构造（纯格式化工具·帖子渲染端仅纯文本 Markdown → 诚实降级） ═════════════

/** 引用卡 → 「」引文 + 出处行（渲染端无链接能力，古籍跳转在抽屉内「查看原文」提供） */
export function buildQuoteInsertText(item: ClassicQuoteItem): string {
  return `> 「${item.quote}」\n> ——《${item.bookTitle}·${item.chapterTitle}》`
}

/** 命盘卡 → 文本化四柱+十神+五行（不含姓名生辰·R3 由后端卡结构保证） */
export function buildPaipanInsertText(card: PaipanCard): string {
  const { nian, yue, ri, shi } = card.siZhu
  const shiShenLine = [
    `年 ${nian.ganShiShen}/${nian.zhiShiShen}`,
    `月 ${yue.ganShiShen}/${yue.zhiShiShen}`,
    `日 ${ri.ganShiShen}/${ri.zhiShiShen}`,
    `时 ${shi.ganShiShen}/${shi.zhiShiShen}`,
  ].join(' · ')
  return [
    `> 【命盘】四柱：${card.ganZhiText}`,
    `> 日主 ${card.riZhu}（纳音：${ri.nayin}）`,
    `> 十神：${shiShenLine}`,
    `> 五行：${card.wuXing.desc}`,
  ].join('\n')
}

/** 案例卡 → 标题+摘录（渲染端无链接能力，站内跳转降级为标题文字） */
export function buildCaseInsertText(item: SimilarCaseItem): string {
  const lines = [`> 【相关案例】《${item.title}》`]
  if (item.excerpt) lines.push(`> ${item.excerpt}`)
  return lines.join('\n')
}
