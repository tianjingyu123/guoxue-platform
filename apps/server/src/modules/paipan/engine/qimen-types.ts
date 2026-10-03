/**
 * 奇门遁甲 · 结果类型（与前端 apps/mobile/src/lib/qimen-data.ts 同名类型一致，供迁入的 qimen-adapter 使用）
 */
export interface QimenGong {
  index: number
  name: string
  bagua: string
  diPan: string
  tianPan: string
  star: string
  men: string
  shen: string
  isRuMu: boolean
  isJiXing: boolean
  isMenPo: boolean
  kongWang: boolean
  maXing: boolean
  yinGan?: string
  changSheng?: string
  shenSha?: string[]
  /** 安干/暗干（人元，转盘有；飞盘暂无） */
  anGan?: string
  /** 地盘神（转盘有；飞盘暂无） */
  dipanShen?: string
  /** 天盘干、地盘干、安干在本宫地支的十二长生（转盘有；飞盘暂无） */
  changsheng?: { tian: string; di: string; an: string }
}

export interface QimenPillar { gan: string; zhi: string }

export interface JieQiRange { name: string; start: string; nextName: string; end: string }

export interface QimenMeta {
  siZhu: { nian: QimenPillar; yue: QimenPillar; ri: QimenPillar; shi: QimenPillar }
  kongWang: { nian: string; yue: string; ri: string; shi: string }
  maXingZhi: string
  jieQi?: JieQiRange
  trueSolar?: { hour: number; minute: number; offsetMin: number }
}

export interface QimenResult {
  juNumber: number
  dunType: 'yang' | 'yin'
  jieQi: string
  yongShi: string
  zhiFu: string
  zhiShiMen: string
  gongs: QimenGong[]
  dipanBashen: string[]
  meta?: QimenMeta
  prevJu?: { number: number; type: 'yang' | 'yin' }
  nextJu?: { number: number; type: 'yang' | 'yin' }
  summary?: string
}

export interface QimenInput {
  matter?: string
  year: number
  month: number
  day: number
  hour: number
  minute?: number
  panMethod: 'zhuan' | 'fei'
  flyMethod?: 'yangshun' | 'yinyang'
  startMethod: 'chaibu' | 'maoshan' | 'zhirun' | 'custom'
  customJu?: string
  anganMethod: 'zhishi' | 'dipan'
  useTrueSolar?: boolean
  lat?: number
  lng?: number
}
