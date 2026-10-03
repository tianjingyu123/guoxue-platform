/**
 * 报告种子 —— 排盘结果页 →（跳转）→ 工作台报告工坊 的数据桥（主包）
 *
 * 为什么在主包：写种子的是 pkg-paipan / pkg-paipan2 的结果页，读种子的是 pkg-workspace，
 * 分包之间不能互相 import，只有主包两边都够得着。
 *
 * 🔴 盘面（paipan.data）一律由排盘页那边**已算好的真结果**原样带过来。
 * 工作台不重算、AI 也不算——引擎是唯一真源，重算就会有第二个口径。
 */
import { REPORT_TYPE_CHAPTERS, type SeedReportType } from './report-chapters'

export interface ReportSeed {
  /** 来源工具，如 bazi / ziwei */
  toolKey: string
  reportType: SeedReportType
  typeLabel: string
  clientName: string
  clientBirth: string
  /** 盘面素材（结果页算好的结构化结果，原样存档） */
  paipan: { toolKey: string; toolLabel: string; data: Record<string, unknown>; summary?: string }
  /** 章节骨架（正文留空，进工坊后 AI 起草 / 老师手写） */
  chapters: { key: string; title: string; body: string }[]
  createdAt: number
}

const SEED_KEY = 'rebu:workspace-report-seed'

/**
 * 结果页调用：暂存盘面 → 跳工作台
 * @param toolLabel 工具名（如「八字排盘」）
 */
export function stashReportSeed(input: {
  toolKey: string
  toolLabel: string
  reportType: SeedReportType
  clientName: string
  clientBirth: string
  data: Record<string, unknown>
  summary?: string
}): void {
  const type = REPORT_TYPE_CHAPTERS[input.reportType]
  const seed: ReportSeed = {
    toolKey: input.toolKey,
    reportType: input.reportType,
    typeLabel: type.label,
    clientName: input.clientName || '未命名客户',
    clientBirth: input.clientBirth || '',
    paipan: {
      toolKey: input.toolKey,
      toolLabel: input.toolLabel,
      data: input.data,
      summary: input.summary,
    },
    chapters: type.chapters.map((c) => ({ key: c.key, title: c.title, body: '' })),
    createdAt: Date.now(),
  }
  try {
    uni.setStorageSync(SEED_KEY, JSON.stringify(seed))
  } catch {
    /* 存储异常忽略：跳过去后工作台会是空报告，老师能手建，不至于卡死 */
  }
}

/** 工作台调用：取出并清空（一次性消费，避免每次进工作台都重复建报告） */
export function takeReportSeed(): ReportSeed | null {
  let raw: unknown
  try {
    raw = uni.getStorageSync(SEED_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    uni.removeStorageSync(SEED_KEY)
  } catch {
    /* ignore */
  }
  try {
    const seed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return seed && typeof seed === 'object' ? (seed as ReportSeed) : null
  } catch {
    return null
  }
}

/** 跳工作台报告工坊（结果页「生成报告」按钮统一走这里） */
export function goWorkspaceReport(): void {
  uni.navigateTo({ url: '/pkg-workspace/index/index' })
}
