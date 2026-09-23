/**
 * 七政四余 · 前端结果类型
 *
 * 排盘算法与天文库（astronomy-engine，572KB）已迁至服务端（apps/server/src/modules/paipan/engine/qizheng-engine.ts），
 * 前端只经 POST /paipan/engine/qizheng 拿结果。
 */
export type WX = "金" | "木" | "水" | "火" | "土"

export interface QizhengBody {
  key: string
  name: string
  shortName: string
  category: "七政" | "四余"
  wuxing: WX | "日" | "月"
  lon: number
  lonText: string // 宫内度分
  palaceIdx: number // 0=子 … 11=亥
  palaceZhi: string
  palaceDeg: number // 宫内度（十进制）
  mansion: string
  mansionDeg: number
  motion: "顺" | "逆" | "留" | "伏" | "速"
  speed: number
  huayao: string | null
  shishen: string | null // 化曜对应十神
  dignity: "庙" | "陷" | "平"
  role: "恩" | "用" | "仇" | "难" | null
}

export interface QizhengPalace {
  zhi: string
  ci: string
  westName: string
  house: string
  lord: string
  gua: string // 后天卦
  bodies: string[]
  lonStart: number
  suiQian: string // 岁前十二神
  changSheng: string // 长生十二神
  shensha: string[] // 落宫神煞（岁前 + 天乙/文昌/禄神/羊刃/咸池/驿马/华盖/将星/劫煞/亡神）
}

export interface DaxianStep {
  house: string
  palaceZhi: string
  startYear: number // 公历年
  endYear: number
  startAge: number // 虚岁
  years: number
}

export interface StarPattern {
  name: string
  kind: "喜" | "忌"
  desc: string
}

export interface QizhengResult {
  meta: {
    solarText: string
    lunarText: string
    ganzhi: string[]
    yearGan: string
    zodiac: string
    gender: "男" | "女"
    trueSolarNote: string | null
    jieqiPrev: string
    jieqiNext: string
    dayNight: "昼生" | "夜生"
    sunrise: string
    sunset: string
    moonrise: string
    moonset: string
    longitude: number
    latitude: number
  }
  bodies: QizhengBody[]
  palaces: QizhengPalace[]
  /** 立命（真上升点） */
  ming: { zhi: string; ci: string; lord: string; lon: number; palaceDeg: number; mansion: string; mansionDeg: number }
  /** 安身（昼随日/夜随月） */
  shen: { zhi: string; ci: string; lon: number; palaceDeg: number; mansion: string; mansionDeg: number }
  duZhu: { mansion: string; wuxing: WX; note: string }
  enYongChouNan: {
    en: WX; yong: WX; chou: WX; nan: WX; seasonYong: WX; note: string
    /** 宫主恩用仇难（以命宫宫主五行为我） */
    gongEn: WX; gongYong: WX; gongChou: WX; gongNan: WX
  }
  huayaoTable: { yao: string; star: string; shishen: string }[]
  tongxian: { years: number; months: number; days: number; endDate: string; note: string }
  daxian: DaxianStep[]
  /** 大限覆盖边界说明（相貌宫年数未收录，列表不静默断掉） */
  daxianNote: string
  patterns: StarPattern[]
  notes: string[]
  /** 二十八宿生时边界（回归今宿，供盘面宿度环） */
  mansionBoundaries: { name: string; start: number; wuxing: WX | "日" | "月"; animal: string }[]
  /** 星曜相位（会合/对照/三合/刑，按黄经角距） */
  aspects: { a: string; b: string; kind: string; angle: number; orb: number }[]
}
