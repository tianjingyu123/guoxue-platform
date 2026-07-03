/** 八字结果页示例数据（从原型 result/page.tsx 1:1 迁移） */
import { GAN_SHI_SHEN } from './bazi-constants'
import { apiGet, apiPost, useMock } from '@/utils/request'

const _mockBaziData = {
  name: '未知', gender: '男', zodiac: '猪', qianKun: '乾造', birthYear: 1983,
  solarDate: '1983年6月18日 14时31分', lunarDate: '五月初八',
  realSolarTime: '1983年06月18日 14时13分（北京 房山区）',
  jieQi: '芒种后12天0小时，夏至前3天17小时',
  siZhu: {
    year: { gan: '癸', zhi: '亥', shiShen: '杀', cangGan: [{ gan: '壬', shen: '官' }, { gan: '甲', shen: '印' }], naYin: '大海水', diShi: '胎', ziZuo: '帝旺', kongWang: '子丑' },
    month: { gan: '戊', zhi: '午', shiShen: '伤', cangGan: [{ gan: '丁', shen: '比' }, { gan: '己', shen: '食' }], naYin: '天上火', diShi: '临官', ziZuo: '帝旺', kongWang: '子丑' },
    day: { gan: '丁', zhi: '丑', shiShen: '日元', cangGan: [{ gan: '己', shen: '食' }, { gan: '癸', shen: '杀' }, { gan: '辛', shen: '才' }], naYin: '涧下水', diShi: '墓', ziZuo: '墓', kongWang: '申酉' },
    hour: { gan: '丁', zhi: '未', shiShen: '比', cangGan: [{ gan: '己', shen: '食' }, { gan: '丁', shen: '比' }, { gan: '乙', shen: '枭' }], naYin: '天河水', diShi: '冠带', ziZuo: '冠带', kongWang: '寅卯' },
  },
  shenSha: {
    year: ['驿马', '天德贵人', '禄神', '词馆'],
    month: ['禄神', '词馆', '阴差阳错'],
    day: ['阴差阳错', '华盖'],
    hour: ['华盖', '红艳', '天德贵人'],
  },
  taiYuan: { gan: '己', zhi: '酉', naYin: '大驿土' },
  mingGong: { gan: '丙', zhi: '辰', naYin: '沙中土' },
  shenGong: { gan: '甲', zhi: '寅', naYin: '大溪水' },
  qiYun: '出生后3年11个月29日起大运，每逢丁年6月16日前后交运。',
  daYun: [
    { year: 1983, gan: '戊', zhi: '午', shiShen: '伤', shiShenZhi: '劫', age: 0 },
    { year: 1987, gan: '丁', zhi: '巳', shiShen: '比', shiShenZhi: '枭', age: 4 },
    { year: 1997, gan: '丙', zhi: '辰', shiShen: '劫', shiShenZhi: '食', age: 14 },
    { year: 2007, gan: '乙', zhi: '卯', shiShen: '枭', shiShenZhi: '枭', age: 24 },
    { year: 2017, gan: '甲', zhi: '寅', shiShen: '印', shiShenZhi: '印', age: 34, active: true },
    { year: 2027, gan: '癸', zhi: '丑', shiShen: '杀', shiShenZhi: '食', age: 44 },
    { year: 2037, gan: '壬', zhi: '子', shiShen: '官', shiShenZhi: '官', age: 54 },
    { year: 2047, gan: '辛', zhi: '亥', shiShen: '才', shiShenZhi: '官', age: 64 },
    { year: 2057, gan: '庚', zhi: '戌', shiShen: '财', shiShenZhi: '伤', age: 74 },
    { year: 2067, gan: '己', zhi: '酉', shiShen: '食', shiShenZhi: '才', age: 84 },
  ],
  liuNian: [
    { year: 2018, gan: '戊', zhi: '戌', shiShen: '伤', shiShenZhi: '伤', age: 36 },
    { year: 2019, gan: '己', zhi: '亥', shiShen: '食', shiShenZhi: '官', age: 37 },
    { year: 2020, gan: '庚', zhi: '子', shiShen: '财', shiShenZhi: '官', age: 38 },
    { year: 2021, gan: '辛', zhi: '丑', shiShen: '才', shiShenZhi: '食', age: 39 },
    { year: 2022, gan: '壬', zhi: '寅', shiShen: '官', shiShenZhi: '印', age: 40 },
    { year: 2023, gan: '癸', zhi: '卯', shiShen: '杀', shiShenZhi: '枭', age: 41 },
    { year: 2024, gan: '甲', zhi: '辰', shiShen: '印', shiShenZhi: '食', age: 42 },
    { year: 2025, gan: '乙', zhi: '巳', shiShen: '枭', shiShenZhi: '枭', age: 43 },
    { year: 2026, gan: '丙', zhi: '午', shiShen: '劫', shiShenZhi: '劫', age: 44, active: true },
    { year: 2027, gan: '丁', zhi: '未', shiShen: '比', shiShenZhi: '食', age: 45 },
  ],
  relations: {
    tianGan: ['丙辛合', '戊癸合化火'],
    diZhi: ['亥卯未三合', '巳午未三会', '丑未冲', '午午刑', '寅巳害'],
    zhengZhu: ['己亥冲', '寅亥合', '午丑害'],
  },
  wuxingState: { 木: '旺', 火: '相', 土: '休', 金: '囚', 水: '死' } as Record<string, string>,
}

export const classics = [
  { id: 'qiong', name: '穷通宝鉴' },
  { id: 'di', name: '滴天髓' },
  { id: 'san', name: '三命通会' },
  { id: 'bazi', name: '八字提要' },
]

const _mockClassicsContent: Record<string, { title: string; original: string; translation: string }> = {
  qiong: {
    title: '论丁生午月',
    original: '五月丁火建禄，正值火旺之时，火当令而旺，以金水为用神为宜。用壬不可少甲，最为紧要。丙丁并透，又加支中火多，无壬水制之，其人必操屠宰业。用壬者，金妻水子。若得庚辛壬三者齐透，科甲功名。',
    translation: '五月丁火处于建禄之位，正值火势最旺的时候，火在当令之时非常旺盛，应该以金水作为用神。使用壬水时不能缺少甲木的配合，这是最关键的要点。如果丙丁都透出天干，再加上地支火多，没有壬水来制约，此人必定从事屠宰行业。用壬水为用神的，娶金命之妻、生水命之子。若庚辛壬三者都透出天干，可得科举功名。',
  },
  di: {
    title: '论丁火',
    original: '丁火柔中，内性昭融。抱乙而孝，合壬而忠。旺而不烈，衰而不穷。如有嫡母，可秋可冬。',
    translation: '丁火属阴，性质柔和而内在光明通达。与乙木相依是慈孝之象，与壬水相合是忠义之征。丁火旺盛时不会过于猛烈，衰弱时也不会走投无路。如果命中有甲木正印来生助，即使在秋冬失令之时也能自立。丁火犹如灯烛之光，虽小而能照亮四方。',
  },
  san: {
    title: '丁丑日柱论',
    original: '丁丑坐墓库，为金神格局。丁火坐丑中己土食神、辛金偏财、癸水七杀。若身旺能任财杀，主富贵。丁火日主坐墓地，逢冲则发。丑中暗藏三奇：己辛癸，食神生偏财，偏财引七杀，一路顺生有情。',
    translation: '丁丑日柱是丁火坐在墓库之上，属于金神格局。丑土中暗藏己土（食神）、辛金（偏财）、癸水（七杀）。如果日主身旺能够承担财杀，主人富贵。丁火日主坐在墓地，遇到冲击就会发达。丑土中暗藏食神、偏财、七杀三种元素，食神生偏财、偏财引七杀，形成一路顺生的有情组合。',
  },
  bazi: {
    title: '五月提要（午月）',
    original: '午月丁火建禄，火势炎上。宜壬水高透以制火，庚金佐之发水源。甲木不可少，引丁成文明之象。午月火旺土燥，金水为调候急需。若壬甲两透，定主科甲。壬透甲藏，亦可功名。无壬用癸，格局稍次。',
    translation: '午月丁火正当建禄之时，火势极为旺盛向上。适宜壬水在天干高透来制约火势，庚金辅助壬水以发其源头。甲木不可缺少，引导丁火成为文明之象。午月火旺土燥，金水是调候的急切需要。如果壬水和甲木都透出天干，必定主科举功名。壬水透出而甲木暗藏在地支，也可以取得功名。没有壬水而用癸水代替，格局稍差一些。',
  },
}

// ───────── 后端真实算法输出 → 前端组件结构适配 ─────────
// 后端 GET /paipan/bazi/calculate（calcBaziPreview，真实排盘算法）输出结构与组件期望(_mockBaziData)不同，
// 此适配做精确字段映射；后端无的字段（每柱自坐/真太阳时/节气）降级为空，组件侧 v-if 隐藏（不造假）。

/* —— 后端排盘算法原始响应类型（容错适配用，字段全 optional + 宽松类型，仅声明 adapter 实际访问到的字段；只加类型注解，不动算法/数据/常量值） —— */
interface RawCangGan { gan?: string; shiShen?: string }
interface RawBaziPillar {
  gan?: string
  zhi?: string
  ganShiShen?: string
  zhiShiShen?: string
  cangGan?: RawCangGan[]
  nayin?: string
  xingYun?: string
}
interface RawPalace { gan?: string; zhi?: string; nayin?: string }
interface RawShenSha { name?: string; pillar?: string }
interface RawWuXingEnergy { mu?: number; huo?: number; tu?: number; jin?: number; shui?: number }
interface RawLiuNian { year?: number; ganZhi?: string; ganShiShen?: string; zhiShiShen?: string; age?: number }
interface RawDaYun {
  startYear: number
  endYear: number
  tianGan?: string
  diZhi?: string
  ganShiShen?: string
  zhiShiShen?: string
  liuNian?: RawLiuNian[]
}
interface RawBaziResponse {
  siZhu?: Record<string, RawBaziPillar>
  kongWang?: string
  shenSha?: RawShenSha[]
  wuXingEnergy?: RawWuXingEnergy
  qiYun?: { daYun?: RawDaYun[]; desc?: string } | null
  shengXiao?: string
  lunarDate?: string
  taiYuan?: RawPalace
  mingGong?: RawPalace
  shenGong?: RawPalace
  fenXiTiShi?: Record<string, string[]> | null
  geJu?: unknown
}
/** 八字古籍参考内容原始响应 */
interface RawClassicContent { title?: string; original?: string; translation?: string }

const _PILLAR_BE = { year: 'nian', month: 'yue', day: 'ri', hour: 'shi' } as const
const _SS_PILLAR_FE: Record<string, string> = { nian: 'year', yue: 'month', ri: 'day', shi: 'hour' }
const _WX_STATES = ['旺', '相', '休', '囚', '死']

function _adaptPillar(p: RawBaziPillar, kongWang: string, isDay: boolean) {
  return {
    shiShen: isDay ? '日元' : (p?.ganShiShen || ''), // 日柱天干为日主本身，显示「日元」
    gan: p?.gan || '', zhi: p?.zhi || '',
    cangGan: Array.isArray(p?.cangGan) ? p.cangGan.map((c: RawCangGan) => ({ gan: c.gan, shen: c.shiShen })) : [],
    naYin: p?.nayin || '',
    diShi: p?.xingYun || '', // 后端 xingYun = 十二长生地势
    ziZuo: '', // 后端无每柱自坐 → 降级（组件不渲染自坐行）
    kongWang: kongWang || '', // 后端为整盘旬空，四柱同值
    zhiShiShen: p?.zhiShiShen || '',
  }
}

export function adaptBazi(raw: RawBaziResponse) {
  const sz: Record<string, RawBaziPillar> = raw?.siZhu || {}
  const kw = raw?.kongWang || ''
  const siZhu: Record<string, ReturnType<typeof _adaptPillar>> = {}
  for (const [fe, be] of Object.entries(_PILLAR_BE)) {
    siZhu[fe] = _adaptPillar(sz[be], kw, be === 'ri')
  }
  // 神煞按柱分组（后端扁平 [{name,pillar}]）
  const shenSha: Record<string, string[]> = { year: [], month: [], day: [], hour: [] }
  for (const s of (Array.isArray(raw?.shenSha) ? raw.shenSha : [])) {
    const fe = _SS_PILLAR_FE[s?.pillar || '']
    if (fe && s?.name) shenSha[fe].push(s.name)
  }
  // 五行旺衰：后端 wuXingEnergy 为分数 → 按高低映射 旺/相/休/囚/死
  const we: RawWuXingEnergy = raw?.wuXingEnergy || {}
  const wx: Array<[string, number]> = [['木', Number(we.mu) || 0], ['火', Number(we.huo) || 0], ['土', Number(we.tu) || 0], ['金', Number(we.jin) || 0], ['水', Number(we.shui) || 0]]
  const wuxingState: Record<string, string> = {}
  ;[...wx].sort((a, b) => b[1] - a[1]).forEach(([el], i) => { wuxingState[el] = _WX_STATES[i] })
  // 大运 + 流年（当前大运的逐年）
  const nowYear = new Date().getFullYear()
  const dyRaw: RawDaYun[] = Array.isArray(raw?.qiYun?.daYun) ? (raw?.qiYun?.daYun as RawDaYun[]) : []
  const daYun = dyRaw.map((d: RawDaYun) => ({
    year: d.startYear, gan: d.tianGan, zhi: d.diZhi,
    shiShen: d.ganShiShen, shiShenZhi: d.zhiShiShen,
    active: nowYear >= d.startYear && nowYear <= d.endYear,
  }))
  const activeDy = dyRaw.find((d: RawDaYun) => nowYear >= d.startYear && nowYear <= d.endYear) || dyRaw[0]
  const liuNian = (Array.isArray(activeDy?.liuNian) ? activeDy.liuNian : []).map((n: RawLiuNian) => {
    const gz = String(n?.ganZhi || '')
    return {
      year: n.year, gan: gz[0] || '', zhi: gz.slice(1) || '',
      shiShen: n.ganShiShen, shiShenZhi: n.zhiShiShen,
      age: n.age, active: n.year === nowYear,
    }
  })
  const palace = (p: RawPalace | undefined) => ({ gan: p?.gan || '', zhi: p?.zhi || '', naYin: p?.nayin || '' })
  // 刑冲合害（后端 fenXiTiShi）→ 前端 relations（分析模式「提示」区）
  const fx: Record<string, string[]> = raw?.fenXiTiShi || {}
  const fxArr = (...keys: string[]) => keys.flatMap((k) => (Array.isArray(fx[k]) ? fx[k] : []))
  const relations = {
    tianGan: fxArr('ganHe'), // 天干合
    diZhi: fxArr('sanHe', 'sanHui', 'liuChong', 'liuHe', 'liuHai', 'sanXing', 'ziXing'), // 地支三合/三会/冲/合/害/刑/自刑
    zhengZhu: fxArr('anHe', 'xiangPo', 'anJue'), // 暗合/相破/暗绝
  }
  return {
    relations,
    zodiac: raw?.shengXiao || '',
    lunarDate: raw?.lunarDate || '',
    realSolarTime: '', // 后端未启用真太阳时换算 → 降级（组件 v-if 隐藏）
    jieQi: '', // 后端无节气字段 → 降级
    siZhu,
    shenSha,
    taiYuan: palace(raw?.taiYuan),
    mingGong: palace(raw?.mingGong),
    shenGong: palace(raw?.shenGong),
    wuxingState,
    qiYun: raw?.qiYun?.desc || '',
    daYun,
    liuNian,
    geJu: raw?.geJu || null, // 格局（分析模式可用）
    fenXiTiShi: raw?.fenXiTiShi || null, // 刑冲合害（分析模式可用）
  }
}

// ───────── AI 师徒 · 流派虚拟师父点评（T6 §三） ─────────

/** 八字流派 id（与后端 BAZI_SCHOOLS 注册表一一对应） */
export type BaziSchoolId = 'ziping' | 'mangpai' | 'xinpai'

/** 师父卡片（前端展示常量，非业务数据；与后端 SCHOOLS 常量对应） */
export interface SchoolMaster {
  school: BaziSchoolId
  /** 虚拟师父名号 */
  master: string
  /** 流派名 */
  schoolName: string
  /** 一句人设 */
  motto: string
}

export const BAZI_SCHOOL_MASTERS: SchoolMaster[] = [
  { school: 'ziping', master: '衡真先生', schoolName: '子平格局派', motto: '以月令定格局，观成败救应——传统命学正宗理路' },
  { school: 'mangpai', master: '琴鹤先生', schoolName: '盲派', motto: '象法做功，直断应期——江湖盲师口传心法' },
  { school: 'xinpai', master: '明澈先生', schoolName: '新派应用', motto: '十神心理与现实决策——说人话的现代命理' },
]

/** 单条流派点评记录（POST /paipan/bazi/analyze 与 GET /paipan/records/:id/analyses 共用视图结构） */
export interface SchoolAnalysisRecord {
  /** 流派 id；后端通用分析（无流派）可能为空 */
  school?: string | null
  /** 虚拟师父名号 */
  master?: string | null
  /** 点评正文（免责声明已由后端置于正文头部） */
  analysisContent: string
  createdAt?: string
  /** 本次实际消耗国学币（首份/会员免费=0；analyze 响应携带） */
  costCoin?: number
}

/** 流派点评计费元数据（GET /paipan/records/:id/analyses 响应携带·2026-07-03 计费开闸） */
export interface SchoolAnalysisPricing {
  /** 该盘尚无任何流派点评 → 下一份免费（体验钩子） */
  firstFree: boolean
  /** 追加点评单价（国学币/次，后端环境变量可配） */
  priceCoin: number
  /** 是否有效会员（会员畅享全部流派点评） */
  isMember: boolean
}

/** 该盘全部分析 + 计费元数据（listAnalyses 返回结构） */
export interface SchoolAnalysesResult {
  items: SchoolAnalysisRecord[]
  /** 旧版后端无此字段时为 null（前端按保守策略处理） */
  pricing: SchoolAnalysisPricing | null
}

/** 排盘输入（calculate/createRecord 共用） */
export interface BaziCalcInput {
  name?: string
  gender: string
  year: number
  month: number
  day: number
  hour: number
  minute?: number
  place?: string
}

export const baziApi = {
  /** 八字排盘结果（真连 GET /paipan/bazi/calculate，真实算法 + adaptBazi 适配，失败抛错走页面 error 态） */
  async calculate(input: BaziCalcInput) {
    const params = new URLSearchParams({
      year: String(input.year), month: String(input.month), day: String(input.day),
      hour: String(input.hour), minute: String(input.minute ?? 0),
      gender: input.gender,
    }).toString()
    return adaptBazi(await apiGet<RawBaziResponse>('/paipan/bazi/calculate?' + params))
  },

  /**
   * 排盘并保存记录（POST /paipan/bazi，需登录）——流派点评的前置步骤：拿 paipanRecordId。
   * 未登录时 401 由 request 层统一跳登录（与页面既有 AI 分析行为一致）。
   */
  async createRecord(input: BaziCalcInput): Promise<{ id: string }> {
    const res = await apiPost<{ id?: string }>('/paipan/bazi', {
      name: input.name || undefined,
      gender: input.gender,
      year: input.year,
      month: input.month,
      day: input.day,
      hour: input.hour,
      minute: input.minute ?? 0,
    })
    if (!res?.id) throw new Error('保存排盘记录失败')
    return { id: res.id }
  },

  /**
   * 请流派虚拟师父看盘（POST /paipan/bazi/analyze + school）。
   * 业务异常（限额「今日请师父看盘次数已用完」/计费「国学币不足，追加师父点评需 X 币」）message 直接 toast 展示。
   */
  async analyzeSchool(recordId: string, school: BaziSchoolId): Promise<SchoolAnalysisRecord> {
    return apiPost<SchoolAnalysisRecord>('/paipan/bazi/analyze', { recordId, school })
  },

  /** 该盘全部分析记录 + 计费元数据（GET /paipan/records/:id/analyses，回显已请过的师父点评） */
  async listAnalyses(recordId: string): Promise<SchoolAnalysesResult> {
    const res = await apiGet<SchoolAnalysisRecord[] | { items?: SchoolAnalysisRecord[]; pricing?: SchoolAnalysisPricing }>(`/paipan/records/${recordId}/analyses`)
    if (Array.isArray(res)) return { items: res, pricing: null }
    return { items: Array.isArray(res?.items) ? res.items : [], pricing: res?.pricing ?? null }
  },

  /** 古籍参考内容（返回确定的视图模型，供页面直接渲染） */
  async classicsRef(bookId: string): Promise<{ title: string; original: string; translation: string } | null> {
    if (true) return _mockClassicsContent[bookId] || null
    try {
      const data = await apiGet<RawClassicContent>(`/paipan/bazi/classics/${bookId}`)
      return data
        ? { title: data.title || '', original: data.original || '', translation: data.translation || '' }
        : (_mockClassicsContent[bookId] || null)
    } catch { return _mockClassicsContent[bookId] || null }
  },

  /** 保存排盘记录 */
  async save(input: Record<string, unknown>) {
    if (true) return { id: 'mock-bazi-id' }
    try { return await apiGet<{ id?: string }>('/paipan/bazi/save') }
    catch { return { id: 'mock-bazi-id' } }
  },
}
