/** 奇门遁甲排盘数据层 */
import { apiGet, apiPost, useMock } from '@/utils/request'

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

// ── Mock 数据 ──

const _mockQimenResult: QimenResult = {
  juNumber: 5,
  dunType: 'yang',
  jieQi: '芒种',
  yongShi: '丙辰',
  zhiFu: '天蓬',
  zhiShiMen: '休门',
  dipanBashen: ['值符', '螣蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'],
  gongs: [
    { index: 1, name: '坎', bagua: '坎', diPan: '戊', tianPan: '癸', star: '天蓬', men: '休门', shen: '值符', isRuMu: false, isJiXing: false, isMenPo: false, kongWang: false, maXing: true },
    { index: 2, name: '坤', bagua: '坤', diPan: '己', tianPan: '壬', star: '天芮', men: '死门', shen: '螣蛇', isRuMu: false, isJiXing: false, isMenPo: false, kongWang: false, maXing: false },
    { index: 3, name: '震', bagua: '震', diPan: '庚', tianPan: '丁', star: '天冲', men: '伤门', shen: '太阴', isRuMu: false, isJiXing: false, isMenPo: false, kongWang: true, maXing: false },
    { index: 4, name: '巽', bagua: '巽', diPan: '辛', tianPan: '丙', star: '天辅', men: '杜门', shen: '六合', isRuMu: false, isJiXing: false, isMenPo: false, kongWang: false, maXing: false },
    { index: 5, name: '中', bagua: '中', diPan: '壬', tianPan: '乙', star: '天禽', men: '死门', shen: '白虎', isRuMu: false, isJiXing: false, isMenPo: false, kongWang: false, maXing: false },
    { index: 6, name: '乾', bagua: '乾', diPan: '癸', tianPan: '戊', star: '天心', men: '开门', shen: '玄武', isRuMu: false, isJiXing: false, isMenPo: false, kongWang: false, maXing: false },
    { index: 7, name: '兑', bagua: '兑', diPan: '丁', tianPan: '庚', star: '天柱', men: '惊门', shen: '九地', isRuMu: false, isJiXing: false, isMenPo: false, kongWang: false, maXing: false },
    { index: 8, name: '艮', bagua: '艮', diPan: '丙', tianPan: '辛', star: '天任', men: '生门', shen: '九天', isRuMu: false, isJiXing: false, isMenPo: false, kongWang: false, maXing: false },
    { index: 9, name: '离', bagua: '离', diPan: '乙', tianPan: '己', star: '天英', men: '景门', shen: '螣蛇', isRuMu: false, isJiXing: false, isMenPo: false, kongWang: false, maXing: false },
  ],
}

// ── API ──

export const qimenApi = {
  /** 奇门遁甲排盘 */
  async calculate(input: QimenInput): Promise<QimenResult> {
    if (useMock()) return _mockQimenResult
    try {
      return await apiPost<QimenResult>('/paipan/qimen', input)
    } catch (_err) {
      return _mockQimenResult
    }
  },

  /** 保存排盘记录 POST /paipan/qimen/save */
  async save(input: QimenInput): Promise<{ id: string; result: QimenResult }> {
    if (useMock()) return { id: 'mock-id', result: _mockQimenResult }
    return await apiPost<{ id: string; result: QimenResult }>('/paipan/qimen/save', input)
  },

  /** 获取单条记录 GET /paipan/qimen/:id */
  async detail(id: string): Promise<{ id: string; inputParams: any; resultData: QimenResult; clientName: string; clientBirth: string; createdAt: string }> {
    if (useMock()) return { id, clientName: '测试', clientBirth: '2026-5-17 13:38', inputParams: {}, resultData: _mockQimenResult, createdAt: new Date().toISOString() }
    return await apiGet<any>(`/paipan/qimen/${id}`)
  },

  /** 获取排盘历史 GET /paipan/qimen/history */
  async history(page = 1, pageSize = 20): Promise<{ records: any[]; total: number; page: number; pageSize: number }> {
    if (useMock()) return { records: [{ id: 'mock-1', clientName: '测试', clientBirth: '2026-5-17 13:38', createdAt: new Date().toISOString() }], total: 1, page: 1, pageSize: 20 }
    try {
      return await apiGet<{ records: any[]; total: number; page: number; pageSize: number }>(`/paipan/qimen/history?page=${page}&pageSize=${pageSize}`)
    } catch { return { records: [], total: 0, page, pageSize } }
  },
}
