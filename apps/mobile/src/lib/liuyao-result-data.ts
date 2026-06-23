/** 六爻排盘结果页数据层（参照 bazi-result-data.ts 结构） */
import { apiGet, apiPost, useMock } from '@/utils/request'

/** 六爻卦象单爻 */
export interface LiuyaoLine {
  index: number        // 爻位 1-6（初爻=1，上爻=6）
  yao: '—' | '- -'    // 阳爻/阴爻
  dong: boolean        // 是否动爻
  naJia: string        // 纳甲天干地支 如"甲子"
  liuQin: string       // 六亲 如"父母"/"官鬼"/"妻财"/"兄弟"/"子孙"
  shiYing: '世' | '应' | ''  // 世应标记
  diZhi: string        // 地支 如"子"
  wuXing: string       // 五行 如"水"
}

/** 六爻卦象完整信息 */
export interface LiuyaoHexagram {
  name: string         // 卦名 如"乾为天"
  symbol: string       // 卦符 如"☰☰"
  lines: LiuyaoLine[]  // 六爻
  upperTrigram: string // 上卦
  lowerTrigram: string // 下卦
  gong: string         // 八宫归属
  yaoCi: string        // 爻辞
  tuanCi: string       // 彖辞
  xiangCi: string      // 象辞
}

/** 六爻完整排盘结果 */
export interface LiuyaoResult {
  // 基本信息
  question: string     // 占问事项
  method: 'manual' | 'time'  // 起卦方式
  time: string         // 起卦时间
  lunarTime: string    // 农历时间

  // 卦象
  benGua: LiuyaoHexagram    // 本卦
  huGua: LiuyaoHexagram      // 互卦
  bianGua?: LiuyaoHexagram  // 变卦（有动爻时存在）

  // 动爻信息
  dongYao: number[]    // 动爻位置列表 如 [2, 5]

  // 纳甲/六亲/世应 整体信息
  naJiaList: string[]  // 纳甲列表 ["甲子", "甲寅", ...]
  liuQinList: string[] // 六亲列表 ["父母", "官鬼", ...]
  shiYing: string      // 世应说明 如"世在二爻，应在五爻"

  // 卦宫/五行
  gongWei: string      // 卦宫位置
  benGuaWuXing: string // 本卦五行
  bianGuaWuXing?: string // 变卦五行

  // 断辞
  duanCi: {
    summary: string    // 总体断辞
    yaoCi: string[]    // 各爻断辞
    advice: string     // 建议
    jiXiong: string    // 吉凶判断
  }

  // 六兽（六神）
  liuShou?: Array<{ name: string; line: number; meaning: string }>

  // 用神/元神/忌神/仇神分析
  yongShen?: string
  yuanShen?: string
  jiShen?: string
  chouShen?: string
}

// ── Mock 数据 ──

const _mockLiuyaoLineTemplate: LiuyaoLine[] = [
  { index: 1, yao: '—', dong: false, naJia: '甲子', liuQin: '父母', shiYing: '', diZhi: '子', wuXing: '水' },
  { index: 2, yao: '—', dong: true, naJia: '甲寅', liuQin: '官鬼', shiYing: '世', diZhi: '寅', wuXing: '木' },
  { index: 3, yao: '—', dong: false, naJia: '甲辰', liuQin: '妻财', shiYing: '', diZhi: '辰', wuXing: '土' },
  { index: 4, yao: '—', dong: false, naJia: '壬午', liuQin: '官鬼', shiYing: '应', diZhi: '午', wuXing: '火' },
  { index: 5, yao: '—', dong: false, naJia: '壬申', liuQin: '父母', shiYing: '', diZhi: '申', wuXing: '金' },
  { index: 6, yao: '—', dong: false, naJia: '壬戌', liuQin: '兄弟', shiYing: '', diZhi: '戌', wuXing: '土' },
]

const _mockBenGua: LiuyaoHexagram = {
  name: '乾为天',
  symbol: '☰☰',
  lines: [..._mockLiuyaoLineTemplate.map(l => ({ ...l }))],
  upperTrigram: '乾',
  lowerTrigram: '乾',
  gong: '乾宫',
  yaoCi: '初九：潜龙勿用。九二：见龙在田，利见大人。九三：君子终日乾乾，夕惕若厉，无咎。九四：或跃在渊，无咎。九五：飞龙在天，利见大人。上九：亢龙有悔。',
  tuanCi: '大哉乾元，万物资始，乃统天。云行雨施，品物流形。大明终始，六位时成，时乘六龙以御天。乾道变化，各正性命，保合太和，乃利贞。首出庶物，万国咸宁。',
  xiangCi: '天行健，君子以自强不息。',
}

const _mockHuGua: LiuyaoHexagram = {
  name: '乾为天',
  symbol: '☰☰',
  lines: _mockLiuyaoLineTemplate.map((l, i) => {
    const line = { ...l }
    line.dong = false
    return line
  }),
  upperTrigram: '乾',
  lowerTrigram: '乾',
  gong: '乾宫',
  yaoCi: '',
  tuanCi: '',
  xiangCi: '',
}

const _mockBianGua: LiuyaoHexagram = {
  name: '天风姤',
  symbol: '☰☴',
  lines: _mockLiuyaoLineTemplate.map((l, i) => {
    const line = { ...l }
    // 变爻位置：二爻阳变阴
    if (i === 1) {
      line.yao = '- -'
      line.dong = true
      line.liuQin = '子孙'
      line.naJia = '辛丑'
      line.diZhi = '丑'
      line.wuXing = '土'
      line.shiYing = ''
    }
    return line
  }),
  upperTrigram: '乾',
  lowerTrigram: '巽',
  gong: '乾宫',
  yaoCi: '',
  tuanCi: '姤，遇也，柔遇刚也。勿用取女，不可与长也。天地相遇，品物咸章也。刚遇中正，天下大行也。姤之时义大矣哉。',
  xiangCi: '天下有风，姤。后以施命诰四方。',
}

const _mockLiuyaoResult: LiuyaoResult = {
  question: '问事业前程如何？',
  method: 'manual',
  time: '2026年6月22日 15时30分',
  lunarTime: '丙午年五月廿七日 申时',
  benGua: _mockBenGua,
  huGua: _mockHuGua,
  bianGua: _mockBianGua,
  dongYao: [2],
  naJiaList: ['甲子', '甲寅', '甲辰', '壬午', '壬申', '壬戌'],
  liuQinList: ['父母', '官鬼', '妻财', '官鬼', '父母', '兄弟'],
  shiYing: '世在二爻，应在五爻',
  gongWei: '乾宫',
  benGuaWuXing: '金',
  bianGuaWuXing: '金',
  duanCi: {
    summary: '本卦乾为天，六爻皆阳，刚健中正，占事大吉。二爻动化阴，官鬼持世，主事业有变动机遇，需谨慎把握。变卦天风姤，有偶遇之意，宜广结善缘。',
    yaoCi: [
      '初爻父母：基础稳固，家庭支持有力。',
      '二爻官鬼持世动化子孙：职位有变动之象，宜积极进取。子孙回头克官鬼，注意与下属关系。',
      '三爻妻财：财运平稳，守旧为主。',
      '四爻官鬼应爻：外部竞争激烈，需提升自身能力。',
      '五爻父母：长辈贵人之助，宜虚心请教。',
      '六爻兄弟：同辈合作需谨慎，防口舌之争。',
    ],
    advice: '宜在近期主动争取机会，东南方向有利，逢寅卯日更佳。忌过于张扬，应内敛务实。',
    jiXiong: '中吉',
  },
  liuShou: [
    { name: '青龙', line: 1, meaning: '喜事临门，多有喜庆之事' },
    { name: '朱雀', line: 2, meaning: '口舌是非，宜谨言慎行' },
    { name: '勾陈', line: 3, meaning: '田土之事，主稳定守成' },
    { name: '螣蛇', line: 4, meaning: '虚惊怪异，防小人暗算' },
    { name: '白虎', line: 5, meaning: '血光之灾，宜多加小心' },
    { name: '玄武', line: 6, meaning: '盗贼暗昧，注意财物安全' },
  ],
  yongShen: '官鬼爻（占事业以官鬼为用神）',
  yuanShen: '妻财爻（财生官，妻财为元神）',
  jiShen: '子孙爻（子孙克官鬼，为忌神）',
  chouShen: '兄弟爻（兄弟克妻财，间接不利元神）',
}

// ── API ──

export const liuyaoApi = {
  /** 六爻排盘计算 POST /paipan/liuyao */
  async calculate(input: Record<string, unknown>): Promise<LiuyaoResult> {
    if (useMock()) return _mockLiuyaoResult
    try { return await apiPost<LiuyaoResult>('/paipan/liuyao', input) } catch { return _mockLiuyaoResult }
  },

  /** 六爻排盘预览 POST /paipan/liuyao/preview */
  async preview(input: Record<string, unknown>): Promise<LiuyaoResult> {
    if (useMock()) return { ..._mockLiuyaoResult, question: input.question as string || _mockLiuyaoResult.question }
    try { return await apiPost<LiuyaoResult>('/paipan/liuyao/preview', input) } catch {
      return { ..._mockLiuyaoResult, question: input.question as string || _mockLiuyaoResult.question }
    }
  },

  /** 保存排盘记录 */
  async save(input: Record<string, unknown>): Promise<{ id: string }> {
    if (useMock()) return { id: 'mock-liuyao-id' }
    return await apiPost<{ id: string }>('/paipan/liuyao', input)
  },

  /** 获取单条记录 GET /paipan/liuyao/:id */
  async detail(id: string): Promise<LiuyaoResult> {
    if (useMock()) return { ..._mockLiuyaoResult, question: '已保存排盘' }
    try { return await apiGet<LiuyaoResult>(`/paipan/liuyao/${id}`) } catch { return { ..._mockLiuyaoResult, question: '已保存排盘' } }
  },

  /** 排盘历史 GET /paipan/liuyao */
  async history(page = 1, pageSize = 20): Promise<{ records: any[]; total: number }> {
    if (useMock()) return { records: [{ id: 'mock-1', createdAt: new Date().toISOString(), question: '问事业前程如何？' }], total: 1 }
    try { return await apiGet<any>(`/paipan/liuyao?page=${page}&pageSize=${pageSize}`) } catch { return { records: [], total: 0 } }
  },
}
