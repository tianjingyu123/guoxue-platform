/** 阳盘命理奇门排盘数据层 */
import { apiGet, apiPost, useMock } from '@/utils/request'
import type { QimenGong } from './qimen-data'

// ── 类型定义 ──

export interface YangpanMingliGong extends QimenGong {
  anGan: string
  dipanShen: string
  changsheng: { tian: string; an: string }
}

export interface YangpanDayun {
  gan: string
  zhi: string
  startAge: number
  endAge: number
  name: string
  ganShiShen?: string
  zhiShiShen?: string
}

export interface YangpanMingli {
  daYun: YangpanDayun[]
  shunPai: boolean
}

export interface YangpanResult {
  juNumber: number
  dunType: 'yang' | 'yin'
  jieQi: string
  yongShi: string
  zhiFu: string
  zhiShiMen: string
  gongs: QimenGong[]
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

// ── Mock 数据 ──

const _mockYangpanResult: YangpanResult = {
  juNumber: 5,
  dunType: 'yang',
  jieQi: '芒种',
  yongShi: '丙辰',
  zhiFu: '天蓬',
  zhiShiMen: '休门',
  dipanBashen: ['值符', '螣蛇', '太阴', '六合', '勾陈', '白虎', '玄武', '九地', '九天'],
  gongs: [
    { index: 4, name: '巽', bagua: '巽', diPan: '辛', tianPan: '戊', star: '天蓬', men: '休门', shen: '值符', isRuMu: false, isJiXing: false, isMenPo: false, kongWang: true, maXing: false },
    { index: 9, name: '离', bagua: '离', diPan: '乙', tianPan: '己', star: '天芮', men: '生门', shen: '螣蛇', isRuMu: false, isJiXing: false, isMenPo: false, kongWang: false, maXing: true },
    { index: 2, name: '坤', bagua: '坤', diPan: '己', tianPan: '庚', star: '天冲', men: '伤门', shen: '太阴', isRuMu: false, isJiXing: false, isMenPo: false, kongWang: false, maXing: false },
    { index: 3, name: '震', bagua: '震', diPan: '庚', tianPan: '辛', star: '天辅', men: '杜门', shen: '六合', isRuMu: false, isJiXing: false, isMenPo: false, kongWang: true, maXing: false },
    { index: 5, name: '中', bagua: '中', diPan: '壬', tianPan: '壬', star: '天禽', men: '中宫', shen: '勾陈', isRuMu: false, isJiXing: false, isMenPo: false, kongWang: false, maXing: false },
    { index: 7, name: '兑', bagua: '兑', diPan: '丁', tianPan: '癸', star: '天心', men: '惊门', shen: '白虎', isRuMu: false, isJiXing: false, isMenPo: false, kongWang: false, maXing: false },
    { index: 8, name: '艮', bagua: '艮', diPan: '丙', tianPan: '甲', star: '天柱', men: '死门', shen: '玄武', isRuMu: false, isJiXing: false, isMenPo: false, kongWang: false, maXing: false },
    { index: 1, name: '坎', bagua: '坎', diPan: '戊', tianPan: '乙', star: '天任', men: '景门', shen: '九地', isRuMu: false, isJiXing: false, isMenPo: false, kongWang: false, maXing: true },
    { index: 6, name: '乾', bagua: '乾', diPan: '癸', tianPan: '丙', star: '天英', men: '开门', shen: '九天', isRuMu: false, isJiXing: false, isMenPo: false, kongWang: false, maXing: false },
  ],
  mingli: {
    shunPai: true,
    daYun: [
      { gan: '己', zhi: '巳', startAge: 1, endAge: 10, name: '己巳' },
      { gan: '庚', zhi: '午', startAge: 11, endAge: 20, name: '庚午' },
      { gan: '辛', zhi: '未', startAge: 21, endAge: 30, name: '辛未' },
      { gan: '壬', zhi: '申', startAge: 31, endAge: 40, name: '壬申' },
      { gan: '癸', zhi: '酉', startAge: 41, endAge: 50, name: '癸酉' },
      { gan: '甲', zhi: '戌', startAge: 51, endAge: 60, name: '甲戌' },
      { gan: '乙', zhi: '亥', startAge: 61, endAge: 70, name: '乙亥' },
      { gan: '丙', zhi: '子', startAge: 71, endAge: 80, name: '丙子' },
    ],
  },
}

// ── API ──

export const yangpanApi = {
  /** 阳盘命理奇门排盘 */
  async calculate(input: YangpanInput): Promise<YangpanResult> {
    if (true) return _mockYangpanResult
    return await apiPost<YangpanResult>('/paipan/yangpan', input)
  },

  /** 保存排盘记录 POST /paipan/yangpan/save */
  async save(input: YangpanInput): Promise<{ id: string; result: YangpanResult }> {
    if (true) return { id: 'mock-id', result: _mockYangpanResult }
    return await apiPost<{ id: string; result: YangpanResult }>('/paipan/yangpan/save', input)
  },

  /** 获取单条记录 GET /paipan/yangpan/:id */
  async detail(id: string): Promise<{ id: string; inputParams: any; resultData: YangpanResult; clientName: string; clientBirth: string; createdAt: string }> {
    if (true) return { id, clientName: '测试', clientBirth: '1990-1-1 12:00', inputParams: {}, resultData: _mockYangpanResult, createdAt: new Date().toISOString() }
    return await apiGet<any>(`/paipan/yangpan/${id}`)
  },

  /** 获取排盘历史 GET /paipan/yangpan/history */
  async history(page = 1, pageSize = 20): Promise<{ records: any[]; total: number; page: number; pageSize: number }> {
    if (true) return { records: [{ id: 'mock-1', clientName: '测试', clientBirth: '1990-1-1 12:00', createdAt: new Date().toISOString() }], total: 1, page: 1, pageSize: 20 }
    try {
      return await apiGet<{ records: any[]; total: number; page: number; pageSize: number }>(`/paipan/yangpan/history?page=${page}&pageSize=${pageSize}`)
    } catch { return { records: [], total: 0, page, pageSize } }
  },
}
