/**
 * 小卜 AI · 八字文字报告（S07）
 *
 * 后端 POST /paipan/report/generate：盘面事实由排盘引擎确定性生成，依据来自真实古籍/知识检索，
 * 解读由热卜模型网关生成；失败时不会保存占位报告。
 */
import { apiDelete, apiGet, apiGetPaged, apiPost } from '@/utils/request'

export interface AiReportReference {
  evidenceId: string
  kind: 'classic_excerpt' | 'school_theory'
  refId: string
  school: string | null
  bookId?: string
  chapterId?: string
  source: string
  chapter: string
  content: string
  matchedOn: string[]
}

/** 报告生成权限（决策人 2026-09-21：单份 29 元含 30 分钟 AI 语音，或小卜AI会员免费不限次） */
export interface AiReportAccess {
  recordId: string
  reportType: string
  granted: boolean
  via: 'free' | 'member' | 'purchased' | null
  priceYuan?: number
  includedVoiceMinutes?: number
  memberPlans?: { key: string; label: string; months: number; priceYuan: number }[]
  memberMonthlyVoiceMinutes?: number
  memberExpireAt?: string | null
}

export interface AiReportSection {
  id: string
  title: string
  content: string
  type: 'fact' | 'analysis' | 'interpretation' | 'limitation'
  schools?: string[]
  keyPoints?: string[]
  questions?: string[]
  evidenceIds?: string[]
  references?: AiReportReference[]
}

export interface AiReportPillar {
  label: string
  gan: string
  zhi: string
  ganShiShen: string
  zhiShiShen: string
  ganWuXing?: string
  zhiWuXing?: string
}

export interface AiReportFacts {
  siZhu: string
  pillarItems?: AiReportPillar[]
  wuXingCount?: Record<string, number>
  geJu?: string
  yongShen?: string
  xiShen?: string
  jiShen?: string
  shenShaNames?: string[]
}

/** 报告页图形数据（服务端按引擎字段确定性生成，旧报告读取时现场补算） */
export interface AiChartPillar {
  label: string
  gan: string
  zhi: string
  ganWuXing: string
  zhiWuXing: string
  ganShiShen: string
  zhiShiShen: string
  cangGan: { gan: string; shiShen: string; type: string }[]
  nayin: string
  xingYun: string
  isDay: boolean
}

export interface AiReportChartView {
  pillars: AiChartPillar[]
  wuXingEnergy: { name: string; value: number }[]
  wuXingCount: Record<string, number>
  geJu?: { name: string; type?: string; yongShen?: string; xiShen?: string; jiShen?: string }
  daYun: { ganZhi: string; startAge: number; endAge: number; startYear: number; ganShiShen: string; zhiShiShen: string; current: boolean }[]
  relations: { label: string; items: string[] }[]
  shenSha: { name: string; pillar: string; type: string }[]
  provenance: { label: string; value: string }[]
}

/** 推演页：每一步都是真实发生的事，不是假进度条 */
export interface AiReportPreflight {
  steps: { key: string; title: string; detail: string }[]
  seals: { pan: boolean; pai: boolean; dian: boolean; evidenceCount: number; schools: string[] }
}

export interface AiGlossaryTerm {
  term: string
  brief: string
  detail?: string
  group: string
  alias?: string[]
}

/** 六爻卦面图（装卦图：六爻自上而下，含六神六亲纳甲世应动变伏神） */
export interface AiLiuyaoChartView {
  benName: string
  bianName: string
  palace: string
  palaceWuXing: string
  guashen: string
  isStatic: boolean
  lines: {
    position: number
    posName: string
    liushen: string
    liuqin: string
    najia: string
    yang: boolean
    shiying: string
    moving: boolean
    movingMark: string
    bianLiuqin: string
    bianNajia: string
    bianYang: boolean
    fushen: string
  }[]
  provenance: { label: string; value: string }[]
  keyNotes: { label: string; text: string }[]
  shensha: string[]
  guaci: { name: string; text: string[] }[]
}

/** 梅花卦象图：五卦并列 + 体用 */
export interface AiMeihuaChartView {
  hexes: { label: string; name: string; palace: string; lines: boolean[]; upperName: string; lowerName: string; highlight: boolean; movingYao: number }[]
  tiyong: { tiName: string; tiWx: string; yongName: string; yongWx: string; relation: string; relationHint: string; tiPosition: string }
  provenance: { label: string; value: string }[]
}

/** 奇门九宫盘 */
export interface AiQimenChartView {
  ju: string
  yuan: string
  grid: {
    palace: number
    dir: string
    gua: string
    shen: string
    star: string
    men: string
    tianPan: string
    diPan: string
    anGan: string
    csTian: string
    csDi: string
    isZhifu: boolean
    isZhishi: boolean
  }[]
  provenance: { label: string; value: string }[]
}

/** 大六壬：天地盘 + 四课三传 */
export interface AiDaliurenChartView {
  summary: string
  pan: { zhi: string; tianPan: string; tianJiang: string; dunGan: string; isKong: boolean }[]
  siKe: { label: string; xia: string; shang: string; desc: string }[]
  sanChuan: { label: string; zhi: string; dunGan: string; liuQin: string; tianJiang: string; isKong: boolean }[]
  keti: { name: string; summary: string }[]
  provenance: { label: string; value: string }[]
}

/** 紫微：十二宫盘（4×4 回字形，中间四格留白） */
export interface AiZiweiChartView {
  wuXingJu: string
  mingGongZhi: string
  shenGong: string
  grid: {
    zhi: string
    name: string
    gan: string
    main: string[]
    assist: string[]
    sisha: string[]
    daXian: string
    isMing: boolean
    isShen: boolean
    inSanFang: boolean
  }[]
  siHua: { label: string; star: string; gong: string }[]
  geShi: string[]
  provenance: { label: string; value: string }[]
}

export interface AiReportContent {
  title: string
  summary: string
  facts: AiReportFacts
  chartView?:
    | AiReportChartView
    | AiLiuyaoChartView
    | AiMeihuaChartView
    | AiQimenChartView
    | AiDaliurenChartView
    | AiZiweiChartView
  /** 正文里出现的术语及释义（随报告附带） */
  glossary?: AiGlossaryTerm[]
  sections: AiReportSection[]
  references: AiReportReference[]
  disclaimer: string
  metadata: {
    paipanType?: string
    reportType: string
    generatedAt: string
    version: string
    evidenceCount: number
    unverifiedBookMentions: string[]
  }
}

export interface AiReportResult {
  id: string
  content: AiReportContent
  version?: string
  createdAt: string
  reused?: boolean
}

export interface MyAiReport {
  id: string
  paipanRecordId: string | null
  clientName: string | null
  paipanType: string | null
  reportType: string
  outputSummary: string | null
  createdAt: string
}

export interface AiDialogueTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface AiDialogueAnswer {
  answer: string
  sectionId: string | null
  sectionTitle: string | null
  evidenceIds: string[]
  references: AiReportReference[]
  followUps: string[]
  mode: 'answer' | 'out_of_report' | 'crisis_referral'
}

export interface AiRelatedCard {
  type: 'classic' | 'article' | 'course' | 'circle' | 'content'
  id: string
  title: string
  subtitle?: string
  cover?: string
  target: string
  reason: string
}

export interface AiDialogueHistory {
  turns: { role: 'user' | 'assistant'; content: string; sectionId: string | null; evidenceIds: string[]; mode: string | null; createdAt: string }[]
  previousTurns?: { role: 'user' | 'assistant'; content: string; createdAt: string }[]
  lastSectionId: string | null
  lastSectionTitle: string | null
  discussedSectionIds: string[]
  nextSectionId: string | null
  nextSectionTitle: string | null
}

/** 我的语音时长：29 元一份报告附带 30 分钟，用户得看得见还剩多少 */
export interface MyVoiceQuota {
  availableSeconds: number
  availableMinutes: number
  reservedSeconds: number
  sessionMaxSeconds: number
  includedSecondsPerReport: number
  /** 续费单价（分）：2 元/分钟 */
  topUpPricePerMinuteCents: number
  /** 语音链路未接通前为 false，此时不显示续费入口 */
  charging: boolean
  freeSessionMaxSeconds: number
}

export const aiReportApi = {
  /** 跨设备找回已生成的本人报告目录。 */
  mine(page = 1): Promise<{ items: MyAiReport[]; total: number; page: number; pageSize: number }> {
    return apiGetPaged<MyAiReport>(`/paipan/report/mine?page=${page}`)
  },
  /** 我的语音时长余额 */
  myVoiceQuota(): Promise<MyVoiceQuota> {
    return apiGet<MyVoiceQuota>('/voice/my-quota')
  },

  /** 生成或复用报告；模型生成较慢，给 120s 超时，避免前端先超时而后端仍在生成 */
  /**
   * 六爻：把本地起卦结果存到服务端，换取 recordId 以生成卦书。
   * 前端六爻本来只存本地历史；出报告需要服务端记录，故在点「生成卦书」时才落库。
   */
  saveLiuyaoRecord(params: {
    matter?: string
    year: number
    month: number
    day: number
    hour?: number
    method?: string
    coins?: string
    numberInput?: string
    guaPick?: { benUp: string; benDown: string; bianUp: string; bianDown: string }
  }): Promise<{ id: string }> {
    return apiPost<{ id: string }>('/paipan/liuyao/save', params)
  },
  /** 梅花：把本地起卦参数存到服务端，换取 recordId 以生成卦书 */
  saveMeihuaRecord(params: Record<string, unknown>): Promise<{ id: string }> {
    return apiPost<{ id: string }>('/paipan/meihua/save', params)
  },
  /** 大六壬：把起课参数（含流派选项）存到服务端，换取 recordId 以生成课书 */
  saveDaliurenRecord(params: Record<string, unknown>): Promise<{ id: string }> {
    return apiPost<{ id: string }>('/paipan/daliuren/save', params)
  },
  /** 这份报告能否生成：免费 / 会员 / 已购；否则返回单份价格与会员档位 */
  access(recordId: string, reportType = 'general'): Promise<AiReportAccess> {
    const q = new URLSearchParams({ recordId, reportType }).toString()
    return apiGet<AiReportAccess>(`/paipan/report/access?${q}`)
  },
  /** 推演页数据：生成前先拿到真实的校时、盘面、取格与依据命中（服务端确定性计算，不调模型） */
  preflight(recordId: string, school?: string): Promise<AiReportPreflight> {
    const q = new URLSearchParams({ recordId, ...(school ? { school } : {}) }).toString()
    return apiGet<AiReportPreflight>(`/paipan/report/preflight?${q}`)
  },
  generate(recordId: string, options?: { reportType?: string; regenerate?: boolean }): Promise<AiReportResult> {
    return apiPost<AiReportResult>(
      '/paipan/report/generate',
      { recordId, reportType: options?.reportType || 'general', includeReferences: true, regenerate: !!options?.regenerate },
      undefined,
      120000,
    )
  },
  /** 报告“继续学习”：平台公开内容卡片（导航目标为真实页面） */
  related(reportId: string): Promise<{ keywords: string[]; cards: AiRelatedCard[] }> {
    return apiGet<{ keywords: string[]; cards: AiRelatedCard[] }>(`/paipan/report/${encodeURIComponent(reportId)}/related`)
  },
  /** 本人该报告的问答记录与进度 */
  dialogue(reportId: string): Promise<AiDialogueHistory> {
    return apiGet<AiDialogueHistory>(`/paipan/report/${encodeURIComponent(reportId)}/dialogue`)
  },
  /** 清空本人该报告的问答记录 */
  clearDialogue(reportId: string): Promise<{ deleted: number }> {
    return apiDelete<{ deleted: number }>(`/paipan/report/${encodeURIComponent(reportId)}/dialogue`)
  },
  /** 围绕报告向小卜提问（文字版） */
  ask(reportId: string, input: { question: string; sectionId?: string }): Promise<AiDialogueAnswer> {
    return apiPost<AiDialogueAnswer>(`/paipan/report/${encodeURIComponent(reportId)}/ask`, input, undefined, 60000)
  },
  get(reportId: string): Promise<AiReportResult> {
    return apiGet<AiReportResult>(`/paipan/report/${encodeURIComponent(reportId)}`)
  },
}

/** “读原书”跳转：仅古籍原文且知识条目关联了古籍库书籍/章节时可打开 */
export function referenceReaderUrl(ref: AiReportReference): string | null {
  if (ref.kind !== 'classic_excerpt' || !ref.bookId) return null
  const chapter = ref.chapterId ? `&chapterId=${encodeURIComponent(ref.chapterId)}` : ''
  return `/pkg-classics/reader/index?id=${encodeURIComponent(ref.bookId)}${chapter}`
}
