// 轻量黄历（主包版）——供排盘主页「今日时刻」Hero 使用。
// 完整黄历引擎（wannianli-engine + lunar-typescript ≈0.4MB）在 pkg-paipan 分包内；
// 主包受微信 2MB 上限约束，此处用纯干支/节气推算的传统民俗算法：
// 建除十二神宜忌、黄黑道十二神时辰吉凶、日支冲煞、日干财神/喜神方位。
// 口径均为通书正统定法，与完整引擎为"简/全"关系而非真假关系。

import { fourPillars, hourGanzhi, ZHIS, type FourPillars } from './ganzhi'
import { getJieqiRange } from './jieqi'

export type LuckLevel = 'good' | 'bad' | 'neutral'

// ── 建除十二神（月建当日为建，顺行十二辰） ──
const JIANCHU = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭'] as const
const JIANCHU_YI: Record<string, string[]> = {
  建: ['出行', '上书', '谒贵', '立券'],
  除: ['除服', '疗病', '扫舍', '祛灾'],
  满: ['祈福', '结亲', '开市', '纳财'],
  平: ['修路', '涂泥', '收拾', '平治'],
  定: ['订盟', '纳采', '宴会', '立契'],
  执: ['捕捉', '结网', '修造', '纳畜'],
  破: ['破屋', '坏垣', '疗病', '求医'],
  危: ['安床', '纳畜', '祭祀', '静养'],
  成: ['嫁娶', '开市', '入学', '上梁'],
  收: ['纳财', '进人口', '收养', '藏宝'],
  开: ['开市', '嫁娶', '入学', '求嗣'],
  闭: ['安葬', '筑堤', '塞穴', '合帐'],
}
const JIANCHU_JI: Record<string, string[]> = {
  建: ['动土', '开仓', '掘井', '乘船'],
  除: ['求官', '嫁娶', '出货', '置产'],
  满: ['安葬', '服药', '栽种', '下葬'],
  平: ['祈福', '求嗣', '开市', '动土'],
  定: ['诉讼', '出行', '交涉', '种植'],
  执: ['开市', '出行', '搬家', '开仓'],
  破: ['嫁娶', '签约', '开市', '交易'],
  危: ['登高', '行船', '出行', '冒险'],
  成: ['诉讼', '争执', '离散', '拆卸'],
  收: ['开市', '安葬', '出行', '放债'],
  开: ['安葬', '动土', '破土', '行丧'],
  闭: ['开市', '出行', '嫁娶', '手术'],
}

// ── 黄黑道十二神（日上起时：子午日青龙起申…） ──
const HUANGDAO = ['青龙', '明堂', '天刑', '朱雀', '金匮', '天德', '白虎', '玉堂', '天牢', '玄武', '司命', '勾陈'] as const
const HUANGDAO_LUCK: Record<string, LuckLevel> = {
  青龙: 'good', 明堂: 'good', 金匮: 'good', 天德: 'good', 玉堂: 'good', 司命: 'good',
  天刑: 'bad', 朱雀: 'bad', 白虎: 'bad', 天牢: 'bad', 玄武: 'bad', 勾陈: 'bad',
}
/** 青龙起始时支索引：按日支分组（子午→申、丑未→戌、寅申→子、卯酉→寅、辰戌→辰、巳亥→午） */
const QINGLONG_START: Record<string, number> = {
  子: 8, 午: 8, 丑: 10, 未: 10, 寅: 0, 申: 0, 卯: 2, 酉: 2, 辰: 4, 戌: 4, 巳: 6, 亥: 6,
}

// ── 冲煞（六冲 + 三合煞方） ──
const ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
const SHA_FANG: Record<string, string> = {
  申: '南', 子: '南', 辰: '南',
  寅: '北', 午: '北', 戌: '北',
  巳: '东', 酉: '东', 丑: '东',
  亥: '西', 卯: '西', 未: '西',
}

// ── 日干定财神/喜神方位 ──
const CAISHEN: Record<string, string> = {
  甲: '东北', 乙: '东北', 丙: '西南', 丁: '西南', 戊: '正北', 己: '正北',
  庚: '正东', 辛: '正东', 壬: '正南', 癸: '正南',
}
const XISHEN: Record<string, string> = {
  甲: '东北', 己: '东北', 乙: '西北', 庚: '西北', 丙: '西南', 辛: '西南',
  丁: '正南', 壬: '正南', 戊: '东南', 癸: '东南',
}

export interface LiteHour {
  name: string // 子时
  range: string // 23:00-01:00
  ganzhi: string
  god: string // 黄黑道神名
  luck: LuckLevel
  current: boolean
}

export interface LiteAlmanac {
  fp: FourPillars
  ganZhiLine: string // 岁次 丙午年 甲午月 戊子日
  jianChu: string // 建除十二神
  yi: string[]
  ji: string[]
  chongSha: string // 冲马 煞南
  caiShen: string
  xiShen: string
  hours: LiteHour[]
  currentHour: LiteHour
  jieqiLine: string // 小暑第3日 · 距大暑12日
}

/** 构建轻量黄历（date 按本地钟面即北京时间解释） */
export function buildLiteAlmanac(date: Date): LiteAlmanac {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const hour = date.getHours()
  const fp = fourPillars(y, m, d, hour)

  const ganZhiLine = `岁次 ${fp.year.gan}${fp.year.zhi}年 ${fp.month.gan}${fp.month.zhi}月 ${fp.day.gan}${fp.day.zhi}日`

  // 建除：日支索引 - 月建支索引（月建=月支）
  const monthZhiIdx = ZHIS.indexOf(fp.month.zhi)
  const dayZhiIdx = ZHIS.indexOf(fp.day.zhi)
  const jianChu = JIANCHU[((dayZhiIdx - monthZhiIdx) % 12 + 12) % 12]

  // 冲煞
  const chongZhi = ZHIS[(dayZhiIdx + 6) % 12]
  const chongSha = `冲${ZODIAC[ZHIS.indexOf(chongZhi)]} 煞${SHA_FANG[fp.day.zhi]}`

  // 十二时辰黄黑道
  const qlStart = QINGLONG_START[fp.day.zhi]
  const curZhiIdx = Math.floor(((hour + 1) % 24) / 2)
  const hours: LiteHour[] = []
  for (let i = 0; i < 12; i++) {
    const god = HUANGDAO[((i - qlStart) % 12 + 12) % 12]
    const hg = hourGanzhi(fp.day.gan, i === 0 ? 23 : i * 2 - 1)
    const startH = i === 0 ? 23 : i * 2 - 1
    const endH = (startH + 2) % 24
    hours.push({
      name: `${ZHIS[i]}时`,
      range: `${String(startH).padStart(2, '0')}:00-${String(endH).padStart(2, '0')}:00`,
      ganzhi: `${hg.gan}${hg.zhi}`,
      god,
      luck: HUANGDAO_LUCK[god],
      current: i === curZhiIdx,
    })
  }
  const currentHour = hours[curZhiIdx]

  // 节气行
  const { prev, next } = getJieqiRange(date)
  const dayMs = 86400000
  const nowT = Date.UTC(y, m - 1, d, hour, date.getMinutes()) - 8 * 3600000
  const sincePrev = Math.floor((nowT - prev.date.getTime()) / dayMs) + 1
  const toNext = Math.ceil((next.date.getTime() - nowT) / dayMs)
  const jieqiLine = `${prev.name}第${sincePrev}日 · 距${next.name}${toNext}日`

  return {
    fp,
    ganZhiLine,
    jianChu: `${jianChu}日`,
    yi: JIANCHU_YI[jianChu],
    ji: JIANCHU_JI[jianChu],
    chongSha,
    caiShen: CAISHEN[fp.day.gan],
    xiShen: XISHEN[fp.day.gan],
    hours,
    currentHour,
    jieqiLine,
  }
}
