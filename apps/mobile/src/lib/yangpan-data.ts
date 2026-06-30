/** 阳盘命理奇门排盘数据层 */
import { apiGet, apiPost } from '@/utils/request'
import type { QimenGong } from './qimen-data'

// ── 类型定义 ──

export interface YangpanMingliGong extends QimenGong {
  anGan: string
  dipanShen: string
  changsheng: { tian: string; di: string; an: string }
}

export interface YangpanLiuNian {
  year: number
  gan: string
  zhi: string
  ganShiShen?: string
  zhiShiShen?: string
  age: number
  active?: boolean
}

export interface YangpanDayun {
  gan: string
  zhi: string
  startAge: number
  endAge: number
  startYear?: number
  endYear?: number
  name: string
  ganShiShen?: string
  zhiShiShen?: string
  active?: boolean
  liuNian?: YangpanLiuNian[]
}

export interface YangpanPillar { gan: string; zhi: string }

export interface YangpanMingli {
  daYun: YangpanDayun[]
  shunPai: boolean
  siZhu?: { nian: YangpanPillar; yue: YangpanPillar; ri: YangpanPillar; shi: YangpanPillar }
  kongWang?: string
  maXingZhi?: string
  jieQi?: { name: string; start: string; nextName: string; end: string }
  trueSolar?: { hour: number; minute: number; offsetMin: number }
  qiYun?: { startAge: number; startYear: number; desc: string }
}

export interface YangpanResult {
  juNumber: number
  dunType: 'yang' | 'yin'
  jieQi: string
  yongShi: string
  zhiFu: string
  zhiShiMen: string
  gongs: YangpanMingliGong[]
  dipanBashen: string[]
  mingli?: YangpanMingli
  summary?: string
}

export interface YangpanInput {
  name?: string
  gender: 'male' | 'female'
  year: number
  month: number
  day: number
  hour: number
  minute?: number
  panMethod: 'zhuan' | 'fei'
  jigongMethod: 'kungong' | 'yanggenyin'
  startMethod: 'chaibu' | 'maoshan' | 'zhirun'
  anganMethod: 'zhishi' | 'dipan'
  place?: string
  trueSolar?: boolean
  earlyLateZi?: boolean
  daylightSaving?: boolean
}

// ── API ──

export const yangpanApi = {
  /** 阳盘命理奇门排盘 — POST /paipan/yangpan（真实算法 BFF，输出与 YangpanResult 对齐；失败抛错走页面 error 态） */
  async calculate(input: YangpanInput): Promise<YangpanResult> {
    return await apiPost<YangpanResult>('/paipan/yangpan', input)
  },

  /** 保存排盘记录 — POST /paipan/yangpan/save（需登录） */
  async save(input: YangpanInput): Promise<{ id: string; result: YangpanResult }> {
    return await apiPost<{ id: string; result: YangpanResult }>('/paipan/yangpan/save', input)
  },

  /** 获取单条记录 — GET /paipan/yangpan/:id（需登录） */
  async detail(id: string): Promise<{ id: string; inputParams: any; resultData: YangpanResult; clientName: string; clientBirth: string; createdAt: string }> {
    return await apiGet<any>(`/paipan/yangpan/${id}`)
  },

  /** 获取排盘历史 — GET /paipan/yangpan/history（空/失败返回空列表走空态） */
  async history(page = 1, pageSize = 20): Promise<{ records: any[]; total: number; page: number; pageSize: number }> {
    try {
      return await apiGet<{ records: any[]; total: number; page: number; pageSize: number }>(`/paipan/yangpan/history?page=${page}&pageSize=${pageSize}`)
    } catch { return { records: [], total: 0, page, pageSize } }
  },
}
