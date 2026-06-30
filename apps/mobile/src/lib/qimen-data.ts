/** 奇门遁甲排盘数据层 */
import { apiGet, apiPost } from '@/utils/request'

// ── 类型定义 ──

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

// ── API ──

export const qimenApi = {
  /** 奇门遁甲排盘 — POST /paipan/qimen（真实算法 BFF，失败抛错走页面 error 态） */
  async calculate(input: QimenInput): Promise<QimenResult> {
    return await apiPost<QimenResult>('/paipan/qimen', input)
  },

  /** 保存排盘记录 — POST /paipan/qimen/save（需登录） */
  async save(input: QimenInput): Promise<{ id: string; result: QimenResult }> {
    return await apiPost<{ id: string; result: QimenResult }>('/paipan/qimen/save', input)
  },

  /** 获取单条记录 — GET /paipan/qimen/:id（需登录） */
  async detail(id: string): Promise<{ id: string; inputParams: any; resultData: QimenResult; clientName: string; clientBirth: string; createdAt: string }> {
    return await apiGet<any>(`/paipan/qimen/${id}`)
  },

  /** 获取排盘历史 — GET /paipan/qimen/history（空/失败返回空列表走空态） */
  async history(page = 1, pageSize = 20): Promise<{ records: any[]; total: number; page: number; pageSize: number }> {
    try {
      return await apiGet<{ records: any[]; total: number; page: number; pageSize: number }>(`/paipan/qimen/history?page=${page}&pageSize=${pageSize}`)
    } catch { return { records: [], total: 0, page, pageSize } }
  },
}
