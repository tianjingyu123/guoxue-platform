// 八字合盘类型与场景常量（V0 排盘工具 7月10日版还原）
// 定位：从业者工具——不只婚恋合婚，支持事业合伙/亲子/朋友等多场景合盘
// 判分规则全在 hepan-engine.ts，本文件只承载类型与场景元数据

/** 合盘场景 */
export interface HepanScene {
  key: string
  label: string
  /** 场景下两人的称谓 */
  roleA: string
  roleB: string
  desc: string
}

export const HEPAN_SCENES: HepanScene[] = [
  { key: 'marriage', label: '婚恋合婚', roleA: '男方', roleB: '女方', desc: '婚姻缘分 · 性情相处 · 子嗣家运' },
  { key: 'business', label: '事业合伙', roleA: '甲方', roleB: '乙方', desc: '合作互补 · 财运共振 · 决策分工' },
  { key: 'parent', label: '亲子关系', roleA: '家长', roleB: '子女', desc: '教养方式 · 性格理解 · 助运扶持' },
  { key: 'friend', label: '朋友知交', roleA: '本人', roleB: '对方', desc: '情谊深浅 · 相处之道 · 贵人互助' },
]

/** 单人盘（四柱信息） */
export interface HepanPerson {
  name: string
  gender: '男' | '女'
  birthSolar: string
  birthLunar: string
  /** 四柱：年/月/日/时 [天干, 地支] */
  pillars: { gan: string; zhi: string }[]
  /** 生肖 */
  zodiac: string
  /** 日主五行，如 "壬水" */
  dayMaster: string
  /** 五行占比（金木水火土，合计100） */
  wuxing: number[]
  /** 命宫/身宫等简述 */
  summary: string
}

/** 分项合参（可点开弹层看断语+古籍） */
export interface HepanAspect {
  key: string
  label: string
  /** 0-100 */
  score: number
  /** 一句话结论 */
  brief: string
  /** 详细断语 */
  judgment: string
  /** 古籍参考 */
  gudian: { source: string; text: string }
}

/** 两造干支之间的合冲害关系（盘面核心看点，可视化标签用） */
export interface PillarLink {
  /** 对应柱位 0年 1月 2日 3时；-1 表示跨柱 */
  pillarIndex: number
  /** 如 "日干 甲己合土" */
  label: string
  /** 吉凶：good 合/生，bad 冲/害/刑，neutral 平 */
  luck: 'good' | 'bad' | 'neutral'
}

/** 带出处的断语条目（亮点/提醒用，有理有据有出处） */
export interface SourcedItem {
  /** 白话断语 */
  text: string
  /** 古籍出处（书名），可选 */
  source?: string
  /** 古籍原文摘句，可选 */
  quote?: string
}

/** 古籍论合条目（引用原文 + 白话应用于本盘） */
export interface GudianRef {
  source: string
  /** 古籍原文 */
  quote: string
  /** 白话解读：这段话如何应用到本盘 */
  note: string
}

/** 合盘结果 */
export interface HepanResult {
  scene: string
  personA: HepanPerson
  personB: HepanPerson
  /** 总契合分 0-100 */
  totalScore: number
  /** 总评一句话 */
  totalBrief: string
  /** 综合判词（文言式总断，仿古籍判词体例） */
  totalJudgment: string
  /** 两造干支合冲害关系标签 */
  pillarLinks: PillarLink[]
  /** 分项合参 */
  aspects: HepanAspect[]
  /** 亮点（相合之处，带古籍出处） */
  highlights: SourcedItem[]
  /** 风险提醒（相冲之处，带古籍出处） */
  risks: SourcedItem[]
  /** 经营建议 */
  advice: string[]
  /** 古籍论合（原文引用专区） */
  gudianRefs: GudianRef[]
}
