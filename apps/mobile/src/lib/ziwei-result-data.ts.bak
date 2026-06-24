/** 紫微斗数结果页数据层（参照 bazi-result-data.ts 模式） */
import { apiGet, apiPost, useMock } from '@/utils/request'

/** 紫微命盘单宫 */
export interface ZiweiPalace {
  name: string       // 宫名：命宫/兄弟/夫妻/子女/财帛/疾厄/迁移/交友/官禄/田宅/福德/父母
  gan: string        // 天干
  zhi: string        // 地支
  isShenGong: boolean // 是否身宫
  mainStars: string[] // 主星
  auxStars: string[]  // 辅星
  daXianAge: number   // 大限起运年龄
  daXianRange: string // 大限年龄范围，如 "3-12"
}

export const ziweiData = {
  name: '未知',
  gender: '男',
  birthYear: 1983,
  solarDate: '1983年6月18日 14时31分',
  lunarDate: '五月初八',
  // 紫微返回的四柱（与八字可能不同，因紫微有自己的四柱计算法）
  siZhu: {
    year: { gan: '癸', zhi: '亥', shiShen: '—', cangGan: [], naYin: '大海水' },
    month: { gan: '戊', zhi: '午', shiShen: '—', cangGan: [], naYin: '天上火' },
    day: { gan: '丁', zhi: '丑', shiShen: '—', cangGan: [], naYin: '涧下水' },
    hour: { gan: '丁', zhi: '未', shiShen: '—', cangGan: [], naYin: '天河水' },
  },
  // 五行局
  wuXingJu: '水二局',
  // 命主/身主
  mingZhu: '禄存',
  shenZhu: '文昌',
  // 四化
  siHua: {
    化禄: '天同',
    化权: '天机',
    化科: '文昌',
    化忌: '廉贞',
  },
  // 十二宫命盘
  mingPan: [
    { name: '命宫', gan: '癸', zhi: '亥', isShenGong: false, mainStars: ['天机', '天梁'], auxStars: ['禄存', '天马', '陀罗'], daXianAge: 3, daXianRange: '3-12' },
    { name: '兄弟', gan: '壬', zhi: '戌', isShenGong: false, mainStars: ['紫微', '天相'], auxStars: ['文昌', '文曲'], daXianAge: 13, daXianRange: '13-22' },
    { name: '夫妻', gan: '辛', zhi: '酉', isShenGong: false, mainStars: ['天同'], auxStars: ['左辅'], daXianAge: 23, daXianRange: '23-32' },
    { name: '子女', gan: '庚', zhi: '申', isShenGong: false, mainStars: ['武曲', '贪狼'], auxStars: ['火星', '铃星'], daXianAge: 33, daXianRange: '33-42' },
    { name: '财帛', gan: '己', zhi: '未', isShenGong: false, mainStars: ['太阳', '太阴'], auxStars: ['天魁'], daXianAge: 43, daXianRange: '43-52' },
    { name: '疾厄', gan: '戊', zhi: '午', isShenGong: false, mainStars: ['廉贞', '破军'], auxStars: ['擎羊', '地劫'], daXianAge: 53, daXianRange: '53-62' },
    { name: '迁移', gan: '丁', zhi: '巳', isShenGong: false, mainStars: ['天府'], auxStars: ['天钺', '右弼'], daXianAge: 63, daXianRange: '63-72' },
    { name: '交友', gan: '丙', zhi: '辰', isShenGong: false, mainStars: ['七杀'], auxStars: ['地空'], daXianAge: 73, daXianRange: '73-82' },
    { name: '官禄', gan: '丁', zhi: '卯', isShenGong: false, mainStars: ['天同'], auxStars: ['天梁'], daXianAge: 83, daXianRange: '83-92' },
    { name: '田宅', gan: '丙', zhi: '寅', isShenGong: true, mainStars: [], auxStars: [], daXianAge: 93, daXianRange: '93-102' },
    { name: '福德', gan: '乙', zhi: '丑', isShenGong: false, mainStars: ['巨门'], auxStars: ['天姚', '阴煞'], daXianAge: 103, daXianRange: '103-112' },
    { name: '父母', gan: '甲', zhi: '子', isShenGong: false, mainStars: ['天相'], auxStars: ['天喜', '天刑'], daXianAge: 113, daXianRange: '113-122' },
  ] as ZiweiPalace[],
  // 大运
  daYun: [
    { year: 1986, age: 3, gan: '癸', zhi: '亥', range: '3-12' },
    { year: 1996, age: 13, gan: '壬', zhi: '戌', range: '13-22' },
    { year: 2006, age: 23, gan: '辛', zhi: '酉', range: '23-32' },
    { year: 2016, age: 33, gan: '庚', zhi: '申', range: '33-42' },
    { year: 2026, age: 43, gan: '己', zhi: '未', range: '43-52', active: true },
    { year: 2036, age: 53, gan: '戊', zhi: '午', range: '53-62' },
    { year: 2046, age: 63, gan: '丁', zhi: '巳', range: '63-72' },
    { year: 2056, age: 73, gan: '丙', zhi: '辰', range: '73-82' },
  ],
  // 流年
  liuNian: [
    { year: 2022, age: 39, gan: '壬', zhi: '寅' },
    { year: 2023, age: 40, gan: '癸', zhi: '卯' },
    { year: 2024, age: 41, gan: '甲', zhi: '辰' },
    { year: 2025, age: 42, gan: '乙', zhi: '巳' },
    { year: 2026, age: 43, gan: '丙', zhi: '午', active: true },
    { year: 2027, age: 44, gan: '丁', zhi: '未' },
    { year: 2028, age: 45, gan: '戊', zhi: '申' },
  ],
}

// ── API ──

export const ziweiApi = {
  /** 紫微斗数排盘计算 POST /paipan/ziwei */
  async calculate(input: Record<string, unknown>): Promise<any> {
    if (useMock()) return ziweiData
    try { return await apiPost<any>('/paipan/ziwei', input) } catch { return ziweiData }
  },
  /** 紫微斗数排盘预览 POST /paipan/ziwei/preview */
  async preview(input: Record<string, unknown>): Promise<any> {
    if (useMock()) return ziweiData
    try { return await apiPost<any>('/paipan/ziwei/preview', input) } catch { return ziweiData }
  },
  /** 保存排盘记录 */
  async save(input: Record<string, unknown>): Promise<{ id: string }> {
    if (useMock()) return { id: 'mock-ziwei-id' }
    return await apiPost<{ id: string }>('/paipan/ziwei', input)
  },
  /** 获取单条记录 GET /paipan/ziwei/:id */
  async detail(id: string): Promise<any> {
    if (useMock()) return { ...ziweiData, id }
    try { return await apiGet<any>(`/paipan/ziwei/${id}`) } catch { return { ...ziweiData, id } }
  },
  /** 排盘历史 GET /paipan/ziwei */
  async history(page = 1, pageSize = 20): Promise<{ records: any[]; total: number }> {
    if (useMock()) return { records: [{ id: 'mock-1', createdAt: new Date().toISOString() }], total: 1 }
    try { return await apiGet<any>(`/paipan/ziwei?page=${page}&pageSize=${pageSize}`) } catch { return { records: [], total: 0 } }
  },
}
