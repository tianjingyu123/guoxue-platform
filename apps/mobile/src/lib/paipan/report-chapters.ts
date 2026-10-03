/**
 * 报告章节骨架（主包）
 *
 * 这是**内容模板**不是数据：AI 按章节标题逐章起草，老师再改。
 * 放主包是因为两边都要用——排盘结果页（pkg-paipan）造种子时要填骨架，
 * 工作台（pkg-workspace）新建报告时也要选类型。
 */

export type SeedReportType = 'bazi' | 'liunian' | 'hepan' | 'qiming' | 'zeji'

export interface ReportTypeSpec {
  key: SeedReportType
  label: string
  titleSuffix: string
  chapters: { key: string; title: string }[]
}

export const REPORT_TYPE_LIST: ReportTypeSpec[] = [
  {
    key: 'bazi',
    label: '八字精批',
    titleSuffix: '八字精批报告',
    chapters: [
      { key: 'geju', title: '格局总述' },
      { key: 'wuxing', title: '五行喜忌' },
      { key: 'shishen', title: '十神与性情' },
      { key: 'career', title: '事业财运' },
      { key: 'marriage', title: '婚姻感情' },
      { key: 'health', title: '身体调养' },
      { key: 'advice', title: '开运建议' },
    ],
  },
  {
    key: 'liunian',
    label: '流年运势',
    titleSuffix: '流年运势报告',
    chapters: [
      { key: 'dayun', title: '当前大运' },
      { key: 'liunian', title: '流年总论' },
      { key: 'month', title: '逐月吉凶' },
      { key: 'career', title: '事业机会' },
      { key: 'wealth', title: '财运把握' },
      { key: 'caution', title: '需留意处' },
      { key: 'advice', title: '趋吉避凶' },
    ],
  },
  {
    key: 'hepan',
    label: '八字合婚',
    titleSuffix: '合婚报告',
    chapters: [
      { key: 'overview', title: '合婚总论' },
      { key: 'wuxing', title: '五行互补' },
      { key: 'rizhu', title: '日柱相配' },
      { key: 'shensha', title: '神煞参断' },
      { key: 'conflict', title: '易起争执处' },
      { key: 'advice', title: '相处之道' },
    ],
  },
  {
    key: 'qiming',
    label: '周易起名',
    titleSuffix: '起名报告',
    chapters: [
      { key: 'bazi', title: '生辰八字分析' },
      { key: 'xiyong', title: '喜用神取向' },
      { key: 'sancai', title: '三才五格' },
      { key: 'candidates', title: '候选名字详解' },
      { key: 'advice', title: '取名建议' },
    ],
  },
  {
    key: 'zeji',
    label: '择日择吉',
    titleSuffix: '择日报告',
    chapters: [
      { key: 'demand', title: '事项与用事人' },
      { key: 'dates', title: '吉日甄选' },
      { key: 'hours', title: '吉时与方位' },
      { key: 'taboo', title: '需避冲煞' },
      { key: 'advice', title: '行事要点' },
    ],
  },
]

export const REPORT_TYPE_CHAPTERS: Record<SeedReportType, ReportTypeSpec> = REPORT_TYPE_LIST.reduce(
  (acc, t) => {
    acc[t.key] = t
    return acc
  },
  {} as Record<SeedReportType, ReportTypeSpec>,
)

/** 排盘工具 → 默认报告类型（结果页「生成报告」时用哪套章节） */
export const TOOL_REPORT_TYPE: Record<string, SeedReportType> = {
  bazi: 'bazi',
  ziwei: 'bazi',
  qizheng: 'bazi',
  yangpan: 'bazi',
  'yinpan-mingli': 'bazi',
  hepan: 'hepan',
  qiming: 'qiming',
  xingming: 'qiming',
  lijichi: 'zeji',
}

export function reportTypeOf(key: SeedReportType): ReportTypeSpec {
  return REPORT_TYPE_CHAPTERS[key] ?? REPORT_TYPE_LIST[0]
}
