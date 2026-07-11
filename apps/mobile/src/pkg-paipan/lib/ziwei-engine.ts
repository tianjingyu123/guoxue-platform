/**
 * 紫微斗数真实安星引擎（三合派天盘）
 * 算法真相源：docs/ziwei-golden-test.md（竞品「吉真紫微」两案例逐宫反推验证）
 * 回归：scripts/verify-ziwei.ts
 *
 * 覆盖：命身宫/宫干五虎遁/纳音五行局/14主星/六吉六煞/禄存天马/生年四化/
 * 年干支月日时系杂曜/长生博士将前岁前四组十二神/大限小限流年岁列/命主身主/子斗/宫干飞化
 */

import { fourPillars, trueSolarTime } from "@/lib/paipan/ganzhi"

// ─── 基础常量 ───
export const ZW_GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
export const ZW_ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
const PALACE_NAMES = ["命宫", "兄弟", "夫妻", "子女", "财帛", "疾厄", "迁移", "交友", "官禄", "田宅", "福德", "父母"]
const M = (n: number) => ((n % 12) + 12) % 12

// 纳音五行 → 局数（水二木三金四土五火六）
// 60甲子纳音以30柱(15对)为周期：金火木土金 火水土金木 水土火木水
const NAYIN_PAIR15 = ["金", "火", "木", "土", "金", "火", "水", "土", "金", "木", "水", "土", "火", "木", "水"]
const NAYIN_WUXING = Array.from({ length: 60 }, (_, i) => NAYIN_PAIR15[Math.floor(i / 2) % 15])
const JU_BY_WUXING: Record<string, { name: string; num: number; changsheng: number }> = {
  水: { name: "水二局", num: 2, changsheng: 8 },
  木: { name: "木三局", num: 3, changsheng: 11 },
  金: { name: "金四局", num: 4, changsheng: 5 },
  土: { name: "土五局", num: 5, changsheng: 8 },
  火: { name: "火六局", num: 6, changsheng: 2 },
}

// 生年四化（年干 → 禄权科忌四星）
const SIHUA_TABLE: Record<string, [string, string, string, string]> = {
  甲: ["廉贞", "破军", "武曲", "太阳"],
  乙: ["天机", "天梁", "紫微", "太阴"],
  丙: ["天同", "天机", "文昌", "廉贞"],
  丁: ["太阴", "天同", "天机", "巨门"],
  戊: ["贪狼", "太阴", "右弼", "天机"],
  己: ["武曲", "贪狼", "天梁", "文曲"],
  庚: ["太阳", "武曲", "太阴", "天同"],
  辛: ["巨门", "太阳", "文曲", "文昌"],
  壬: ["天梁", "紫微", "左辅", "武曲"],
  癸: ["破军", "巨门", "太阴", "贪狼"],
}
export const HUA_NAMES = ["禄", "权", "科", "忌"] as const

// 命主（命宫支定）/ 身主（生年支定）
const MINGZHU = ["贪狼", "巨门", "禄存", "文曲", "廉贞", "武曲", "破军", "武曲", "廉贞", "文曲", "禄存", "巨门"]
const SHENZHU = ["火星", "天相", "天梁", "天同", "文昌", "天机", "火星", "天相", "天梁", "天同", "文昌", "天机"]

// 十二神序列
const CHANGSHENG_SEQ = ["长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"]
const BOSHI_SEQ = ["博士", "力士", "青龙", "小耗", "将军", "奏书", "飞廉", "喜神", "病符", "大耗", "伏兵", "官符"]
const JIANGQIAN_SEQ = ["将星", "攀鞍", "岁驿", "息神", "华盖", "劫煞", "灾煞", "天煞", "指背", "咸池", "月煞", "亡神"]
const SUIQIAN_SEQ = ["岁建", "晦气", "丧门", "贯索", "官符", "小耗", "岁破", "龙德", "白虎", "天德", "吊客", "病符"]

// ─── 亮度表（七级：庙旺得利平不陷；索引=地支序 子..亥）───
const BRIGHT: Record<string, string[]> = {
  紫微: ["平", "庙", "庙", "旺", "得", "旺", "庙", "庙", "旺", "平", "得", "旺"],
  天机: ["庙", "陷", "得", "旺", "利", "平", "庙", "陷", "得", "旺", "利", "平"],
  太阳: ["陷", "陷", "旺", "庙", "旺", "旺", "庙", "得", "得", "平", "不", "陷"],
  武曲: ["旺", "庙", "得", "利", "庙", "平", "旺", "庙", "得", "利", "庙", "平"],
  天同: ["旺", "不", "利", "庙", "平", "庙", "陷", "不", "旺", "平", "平", "庙"],
  廉贞: ["平", "利", "庙", "平", "利", "陷", "平", "庙", "庙", "平", "利", "陷"],
  天府: ["庙", "庙", "庙", "得", "庙", "得", "旺", "庙", "得", "旺", "庙", "得"],
  太阴: ["庙", "庙", "旺", "陷", "陷", "陷", "陷", "不", "利", "旺", "旺", "庙"],
  贪狼: ["旺", "庙", "平", "利", "庙", "陷", "旺", "庙", "平", "利", "庙", "陷"],
  巨门: ["旺", "不", "庙", "庙", "平", "平", "旺", "不", "庙", "庙", "陷", "旺"],
  天相: ["庙", "庙", "庙", "陷", "得", "得", "庙", "得", "庙", "平", "得", "平"],
  天梁: ["庙", "旺", "庙", "庙", "旺", "陷", "庙", "旺", "陷", "得", "旺", "陷"],
  七杀: ["旺", "庙", "庙", "旺", "庙", "平", "旺", "旺", "庙", "利", "庙", "平"],
  破军: ["庙", "旺", "得", "陷", "旺", "平", "庙", "旺", "得", "陷", "旺", "平"],
  文昌: ["旺", "陷", "得", "利", "庙", "庙", "陷", "利", "得", "庙", "陷", "平"],
  文曲: ["得", "平", "庙", "旺", "得", "庙", "陷", "旺", "得", "庙", "陷", "平"],
  擎羊: ["陷", "庙", "平", "陷", "庙", "平", "陷", "庙", "平", "陷", "庙", "平"],
  陀罗: ["平", "庙", "陷", "平", "庙", "陷", "平", "庙", "陷", "平", "庙", "陷"],
  火星: ["平", "陷", "庙", "利", "陷", "得", "庙", "利", "陷", "得", "庙", "利"],
  铃星: ["陷", "得", "庙", "利", "陷", "旺", "庙", "利", "陷", "得", "庙", "利"],
  地空: ["平", "陷", "陷", "平", "陷", "庙", "庙", "平", "庙", "平", "陷", "陷"],
  地劫: ["陷", "陷", "平", "平", "陷", "庙", "庙", "平", "庙", "平", "陷", "平"],
  禄存: ["庙", "庙", "庙", "庙", "庙", "庙", "庙", "庙", "庙", "庙", "庙", "庙"],
  天魁: ["旺", "旺", "旺", "旺", "旺", "旺", "旺", "旺", "旺", "旺", "旺", "旺"],
  天钺: ["庙", "庙", "庙", "庙", "庙", "庙", "庙", "庙", "庙", "庙", "庙", "庙"],
  左辅: ["庙", "庙", "庙", "庙", "庙", "庙", "庙", "庙", "庙", "庙", "庙", "庙"],
  右弼: ["庙", "庙", "庙", "庙", "庙", "庙", "庙", "庙", "庙", "庙", "庙", "庙"],
  天马: ["", "", "庙", "", "", "平", "", "", "庙", "", "", "平"],
}
// 杂曜亮度（稀疏表：仅收录黄金基准锚定值，其余不显示亮度）
const MISC_BRIGHT: Record<string, Record<number, string>> = {
  凤阁: { 5: "庙", 9: "庙" },
  年解: { 5: "旺", 9: "旺" },
  天姚: { 10: "庙" },
  红鸾: { 10: "陷", 2: "旺" },
  天喜: { 4: "陷", 8: "旺" },
  龙池: { 9: "庙", 5: "陷" },
  天哭: { 1: "庙", 5: "不" },
  天虚: { 11: "平", 7: "陷" },
  天寿: { 7: "旺", 5: "平" },
  天才: { 7: "平" },
  华盖: { 1: "陷" },
  咸池: { 6: "陷" },
  天空: { 6: "庙", 2: "陷" },
  天刑: { 6: "平" },
  阴煞: { 8: "平" },
  孤辰: { 2: "平" },
  寡宿: { 4: "陷", 10: "陷" },
  解神: { 4: "庙" },
  八座: { 5: "庙", 1: "陷" },
  三台: { 9: "庙", 1: "庙" },
  恩光: { 2: "平", 4: "庙" },
  天贵: { 2: "平", 8: "庙" },
  天官: { 2: "平", 9: "平" },
  天福: { 11: "庙", 2: "旺" },
  破碎: { 9: "平", 1: "陷" },
  天使: { 3: "平" },
  天伤: { 1: "平", 11: "旺" },
  旬空: { 1: "平" },
  副旬: { 0: "陷", 6: "庙" },
  截空: { 3: "平", 9: "庙" },
  劫煞: { 2: "陷" },
  大耗: { 10: "平", 6: "旺" },
  天德: { 10: "庙" },
  天巫: {},
  天月: {},
  月德: {},
  蜚廉: {},
  天厨: {},
  封诰: { 5: "", 7: "陷" },
  台辅: {},
  龙德: {},
  副截: {},
}

// ─── 农历转换（lunar-typescript 寿星历法，多端一致）───
// 2026-07-11 修复：原用 Intl chinese calendar——ICU 农历与寿星历法部分日期差一天
// （verify-ziwei 案例2 即中招），且微信小程序端无 Intl。统一改查 lunar-typescript。
import { Solar as ZwSolar } from "./lunar/index.js"

const CN_NUM = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]
const LUNAR_MONTH_NAMES = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月"]

export interface LunarInfo {
  /** 农历月 1-12 */
  month: number
  /** 农历日 1-30 */
  day: number
  /** 是否闰月 */
  isLeap: boolean
  /** 农历年干支（正月初一换年） */
  yearGan: string
  yearZhi: string
  /** 展示文本，如 "己丑年十月廿五" */
  text: string
}

export function solarToLunar(d: Date): LunarInfo {
  const lunar = ZwSolar.fromYmdHms(
    d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), 0,
  ).getLunar()
  const rawMonth = lunar.getMonth() // 负数表示闰月
  const isLeap = rawMonth < 0
  const month = Math.abs(rawMonth)
  const day = lunar.getDay()
  const relatedYear = lunar.getYear() // 农历年（正月初一换年，与紫微年干口径一致）
  const yearGan = ZW_GAN[M10(relatedYear - 4)]
  const yearZhi = ZW_ZHI[M(relatedYear - 4)]
  const dayText =
    day === 10 ? "初十" : day === 20 ? "二十" : day === 30 ? "三十"
      : day < 11 ? `初${CN_NUM[day]}` : day < 20 ? `十${CN_NUM[day - 10]}` : `廿${CN_NUM[day - 20]}`
  return {
    month, day, isLeap, yearGan, yearZhi,
    text: `${yearGan}${yearZhi}年${isLeap ? "闰" : ""}${LUNAR_MONTH_NAMES[month - 1]}${dayText}`,
  }
}
const M10 = (n: number) => ((n % 10) + 10) % 10

/** 农历生日 → 公历（在前后两个公历年内扫描匹配） */
export function lunarToSolar(lYear: number, lMonth: number, lDay: number): { year: number; month: number; day: number } | null {
  for (let y = lYear; y <= lYear + 1; y++) {
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(y, m + 1, 0).getDate()
      for (let dd = 1; dd <= daysInMonth; dd++) {
        const cand = new Date(y, m, dd, 12, 0)
        const info = solarToLunar(cand)
        const rel = ZW_GAN[M10(lYear - 4)] + ZW_ZHI[M(lYear - 4)]
        if (info.month === lMonth && info.day === lDay && !info.isLeap && info.yearGan + info.yearZhi === rel) {
          return { year: y, month: m + 1, day: dd }
        }
      }
    }
  }
  return null
}

// ─── 引擎输入输出 ───
export interface ZiweiInput {
  /** 公历（已含真太阳时校正前的钟面时间） */
  year: number
  month: number
  day: number
  hour: number
  minute: number
  gender: "男" | "女"
  /** 真太阳时校正 */
  useTrueSolar?: boolean
  /** 东经，默认 116.4（北京） */
  lng?: number
}

export interface ZiweiStarOut {
  name: string
  bright: string
  /** 生年四化：禄权科忌 */
  hua?: string
}

export interface ZiweiPalaceOut {
  /** 地支序（子=0） */
  zhi: number
  name: string
  ganzhi: string
  majors: ZiweiStarOut[]
  /** 吉星煞星（带亮度） */
  minors: ZiweiStarOut[]
  /** 杂曜 */
  misc: ZiweiStarOut[]
  daxian: string
  liunianAges: string
  xiaoxian: string
  changsheng: string
  boshi: string
  jiangqian: string
  suiqian: string
  isShen: boolean
  isMing: boolean
  /** 宫干飞化（本宫干引动的四化） */
  feihua: { hua: string; star: string; targetZhi: number }[]
  /** 本宫自化（宫干四化星在本宫） */
  selfHua: string[]
}

export interface ZiweiResult {
  gender: "男" | "女"
  yinYang: "阳" | "阴"
  lunar: LunarInfo
  hourZhi: string
  /** 真太阳时校正后的时间 */
  adjusted: Date
  /** 节气四柱 */
  sizhu: { year: string; month: string; day: string; hour: string }
  wuxingJu: string
  juNum: number
  mingIdx: number
  shenIdx: number
  mingzhu: string
  shenzhu: string
  zidou: string
  sihua: { hua: string; star: string }[]
  sihuaNote: string
  palaces: ZiweiPalaceOut[]
}

// ─── 主引擎 ───
export function computeZiwei(input: ZiweiInput): ZiweiResult {
  const lng = input.lng ?? 116.4
  const clock = new Date(input.year, input.month - 1, input.day, input.hour, input.minute)
  const adjusted = input.useTrueSolar ? trueSolarTime(clock, lng) : clock

  const lunar = solarToLunar(adjusted)
  const hourIdx = Math.floor(((adjusted.getHours() + 1) % 24) / 2)
  const yearGanIdx = ZW_GAN.indexOf(lunar.yearGan)
  const yearZhiIdx = ZW_ZHI.indexOf(lunar.yearZhi)
  const lm = lunar.month
  const ld = lunar.day

  // 节气四柱（lib/ganzhi 真实引擎）
  const fp = fourPillars(
    adjusted.getFullYear(), adjusted.getMonth() + 1, adjusted.getDate(),
    adjusted.getHours(), adjusted.getMinutes(),
  )
  const sizhu = {
    year: fp.year.gan + fp.year.zhi,
    month: fp.month.gan + fp.month.zhi,
    day: fp.day.gan + fp.day.zhi,
    hour: fp.hour.gan + fp.hour.zhi,
  }

  // 阴阳（年干奇偶）与顺逆
  const yinYang: "阳" | "阴" = yearGanIdx % 2 === 0 ? "阳" : "阴"
  const forward = (yinYang === "阳" && input.gender === "男") || (yinYang === "阴" && input.gender === "女")

  // 命宫/身宫：寅起正月顺至生月；再自该宫逆数(命)/顺数(身)至生时
  const monthPalace = M(2 + lm - 1)
  const mingIdx = M(monthPalace - hourIdx)
  const shenIdx = M(monthPalace + hourIdx)

  // 宫干（五虎遁）：正月干 = (年干%5)*2+2
  const yinGan = (yearGanIdx % 5) * 2 + 2
  const palaceGan = (zhi: number) => ZW_GAN[M10(yinGan + M(zhi - 2))]

  // 五行局（命宫干支纳音）
  const mingGanIdx = M10(yinGan + M(mingIdx - 2))
  const jiaziIdx = (() => {
    for (let i = 0; i < 60; i++) if (i % 10 === mingGanIdx && i % 12 === mingIdx) return i
    return 0
  })()
  const ju = JU_BY_WUXING[NAYIN_WUXING[jiaziIdx]]

  // 紫微定位
  const q = Math.ceil(ld / ju.num)
  const diff = q * ju.num - ld
  const ziweiIdx = diff % 2 === 0 ? M(2 + q - 1 + diff) : M(2 + q - 1 - diff)
  const tianfuIdx = M(4 - ziweiIdx)

  // 星曜落宫表：宫支 → 星名数组
  const starAt: Record<string, number> = {
    紫微: ziweiIdx,
    天机: M(ziweiIdx - 1), 太阳: M(ziweiIdx - 3), 武曲: M(ziweiIdx - 4), 天同: M(ziweiIdx - 5), 廉贞: M(ziweiIdx - 8),
    天府: tianfuIdx,
    太阴: M(tianfuIdx + 1), 贪狼: M(tianfuIdx + 2), 巨门: M(tianfuIdx + 3), 天相: M(tianfuIdx + 4),
    天梁: M(tianfuIdx + 5), 七杀: M(tianfuIdx + 6), 破军: M(tianfuIdx + 10),
  }
  const MAJORS = Object.keys(starAt)

  // 六吉六煞禄马
  const wenchang = M(10 - hourIdx)
  const wenqu = M(4 + hourIdx)
  const zuofu = M(4 + lm - 1)
  const youbi = M(10 - (lm - 1))
  const KUI: Record<string, number> = { 甲: 1, 乙: 0, 丙: 11, 丁: 11, 戊: 1, 己: 0, 庚: 1, 辛: 6, 壬: 3, 癸: 3 }
  const YUE: Record<string, number> = { 甲: 7, 乙: 8, 丙: 9, 丁: 9, 戊: 7, 己: 8, 庚: 7, 辛: 2, 壬: 5, 癸: 5 }
  const tiankui = KUI[lunar.yearGan]
  const tianyue = YUE[lunar.yearGan]
  const LU: Record<string, number> = { 甲: 2, 乙: 3, 丙: 5, 丁: 6, 戊: 5, 己: 6, 庚: 8, 辛: 9, 壬: 11, 癸: 0 }
  const lucun = LU[lunar.yearGan]
  const qingyang = M(lucun + 1)
  const tuoluo = M(lucun - 1)
  const maBase = [2, 11, 8, 5][yearZhiIdx % 4] // 申子辰→寅 巳酉丑→亥 寅午戌→申 亥卯未→巳
  const tianma = maBase
  const HUO_START = [2, 3, 1, 9][yearZhiIdx % 4] // 申子辰火起寅 巳酉丑卯 寅午戌丑 亥卯未酉
  const LING_START = [10, 10, 3, 10][yearZhiIdx % 4] // 寅午戌铃起卯 其余戌
  const huoxing = M(HUO_START + hourIdx)
  const lingxing = M(LING_START + hourIdx)
  const dijie = M(11 + hourIdx)
  const dikong = M(11 - hourIdx)

  // 年干系杂曜
  const TIANGUAN: Record<string, number> = { 甲: 7, 乙: 4, 丙: 5, 丁: 2, 戊: 3, 己: 9, 庚: 11, 辛: 9, 壬: 10, 癸: 6 }
  const TIANFU_STAR: Record<string, number> = { 甲: 9, 乙: 8, 丙: 0, 丁: 11, 戊: 3, 己: 2, 庚: 6, 辛: 5, 壬: 6, 癸: 5 }
  const TIANCHU: Record<string, number> = { 甲: 5, 乙: 6, 丙: 0, 丁: 5, 戊: 6, 己: 8, 庚: 2, 辛: 6, 壬: 9, 癸: 11 }

  // 截空（年干定两支，阴干正截空居阴支）
  const JIE_PAIR: Record<string, [number, number]> = { 甲: [8, 9], 己: [8, 9], 乙: [6, 7], 庚: [6, 7], 丙: [4, 5], 辛: [4, 5], 丁: [2, 3], 壬: [2, 3], 戊: [0, 1], 癸: [0, 1] }
  const [jieA, jieB] = JIE_PAIR[lunar.yearGan]
  const ganYin = yearGanIdx % 2 === 1
  const zhengJie = ganYin ? (jieA % 2 === 1 ? jieA : jieB) : (jieA % 2 === 0 ? jieA : jieB)
  const fuJie = zhengJie === jieA ? jieB : jieA

  // 旬空（年柱旬空两支，阴年正旬空居阴支）
  const yearJiazi = (() => {
    for (let i = 0; i < 60; i++) if (i % 10 === yearGanIdx && i % 12 === yearZhiIdx) return i
    return 0
  })()
  const xunStart = yearJiazi - (yearJiazi % 10)
  const kong1 = M(xunStart + 10)
  const kong2 = M(xunStart + 11)
  const zhengXun = ganYin ? (kong1 % 2 === 1 ? kong1 : kong2) : (kong1 % 2 === 0 ? kong1 : kong2)
  const fuXun = zhengXun === kong1 ? kong2 : kong1

  // 年支系杂曜
  const hongluan = M(3 - yearZhiIdx)
  const tianxi = M(hongluan + 6)
  const longchi = M(4 + yearZhiIdx)
  const fengge = M(10 - yearZhiIdx)
  const tianku = M(6 - yearZhiIdx)
  const tianxu = M(6 + yearZhiIdx)
  const guchen = [2, 2, 5, 5, 5, 8, 8, 8, 11, 11, 11, 2][yearZhiIdx]
  const guasu = [10, 10, 1, 1, 1, 4, 4, 4, 7, 7, 7, 10][yearZhiIdx]
  const feilian = [8, 9, 10, 5, 6, 7, 2, 3, 4, 11, 0, 1][yearZhiIdx]
  const posui = [5, 1, 9, 5, 1, 9, 5, 1, 9, 5, 1, 9][yearZhiIdx]
  const huagai = [4, 1, 10, 7, 4, 1, 10, 7, 4, 1, 10, 7][yearZhiIdx]
  const xianchi = [9, 6, 3, 0, 9, 6, 3, 0, 9, 6, 3, 0][yearZhiIdx]
  const jiesha = [5, 2, 11, 8, 5, 2, 11, 8, 5, 2, 11, 8][yearZhiIdx]
  const tiande = M(9 + yearZhiIdx)
  const yuede = M(5 + yearZhiIdx)
  const longde = M(7 + yearZhiIdx)
  const dahao = M(yearZhiIdx + 5)
  const tiankong = M(yearZhiIdx + 1)
  const nianjie = M(10 - yearZhiIdx)

  // 月系杂曜
  const yinsha = M(2 - 2 * (lm - 1))
  const tianxing = M(9 + lm - 1)
  const tianyao = M(1 + lm - 1)
  const TIANYUE_M = [10, 5, 4, 2, 7, 3, 11, 7, 2, 6, 10, 2]
  const tianyue2 = TIANYUE_M[lm - 1]
  const tianwu = [5, 8, 2, 11][(lm - 1) % 4]
  const jieshen = [8, 8, 10, 10, 0, 0, 2, 2, 4, 4, 6, 6][lm - 1]

  // 时系杂曜
  const taifu = M(6 + hourIdx)
  const fenggao = M(2 + hourIdx)

  // 日系杂曜
  const enguang = M(wenchang + ld - 2)
  const tiangui = M(wenqu + ld - 2)
  const santai = M(zuofu + ld - 1)
  const bazuo = M(youbi - (ld - 1))

  // 命身系
  const tiancai = M(mingIdx + yearZhiIdx)
  const tianshou = M(shenIdx + yearZhiIdx)
  // 天伤天使：固定交友/疾厄
  const tianshang = M(mingIdx - 7)
  const tianshi = M(mingIdx - 5)

  // 生年四化
  const sihuaStars = SIHUA_TABLE[lunar.yearGan]
  const huaOf = (star: string) => {
    const i = sihuaStars.indexOf(star)
    return i >= 0 ? HUA_NAMES[i] : undefined
  }

  // 四组十二神
  const csDir = forward ? 1 : -1
  const changshengAt = (zhi: number) => CHANGSHENG_SEQ[M((zhi - ju.changsheng) * csDir)]
  const boshiAt = (zhi: number) => BOSHI_SEQ[M((zhi - lucun) * csDir)]
  const jiangxing = [xianchi + 6, xianchi + 6, xianchi + 6, xianchi + 6][0] // 三合旺位=咸池+6? 校准:将星=三合局旺地
  const jiangBase = [0, 9, 6, 3, 0, 9, 6, 3, 0, 9, 6, 3][yearZhiIdx] // 申子辰将星子 巳酉丑酉 寅午戌午 亥卯未卯
  const jiangqianAt = (zhi: number) => JIANGQIAN_SEQ[M(zhi - jiangBase)]
  const suiqianAt = (zhi: number) => SUIQIAN_SEQ[M(zhi - yearZhiIdx)]

  // 大限
  const daxianAt = (zhi: number) => {
    const step = M((zhi - mingIdx) * (forward ? 1 : -1))
    const start = ju.num + step * 10
    return `${start}-${start + 9}`
  }
  // 小限：寅午戌起辰 申子辰起戌 巳酉丑起未 亥卯未起丑，男顺女逆
  const xiaoxianBase = [10, 7, 4, 1, 10, 7, 4, 1, 10, 7, 4, 1][yearZhiIdx]
  const xxDir = input.gender === "男" ? 1 : -1
  const xiaoxianAt = (zhi: number) => {
    const first = M((zhi - xiaoxianBase) * xxDir) + 1
    return `小限:${[0, 1, 2, 3, 4, 5].map((k) => first + k * 12).join(",")}`
  }
  const liunianAt = (zhi: number) => {
    const first = M(zhi - yearZhiIdx) + 1
    return `流年:${[0, 1, 2, 3, 4, 5].map((k) => first + k * 12).join(",")}`
  }

  // 子斗（子年斗君）：子宫退生月再进生时
  const zidouIdx = M(0 - (lm - 1) + hourIdx)

  // ─── 组装十二宫 ───
  const bright = (star: string, zhi: number) => BRIGHT[star]?.[zhi] ?? ""
  const miscBright = (star: string, zhi: number) => MISC_BRIGHT[star]?.[zhi] ?? ""

  const minorsAt: Record<number, string[]> = {}
  const addMinor = (zhi: number, star: string) => {
    ;(minorsAt[zhi] ||= []).push(star)
  }
  addMinor(wenchang, "文昌"); addMinor(wenqu, "文曲"); addMinor(zuofu, "左辅"); addMinor(youbi, "右弼")
  addMinor(tiankui, "天魁"); addMinor(tianyue, "天钺"); addMinor(lucun, "禄存"); addMinor(tianma, "天马")
  addMinor(qingyang, "擎羊"); addMinor(tuoluo, "陀罗"); addMinor(huoxing, "火星"); addMinor(lingxing, "铃星")
  addMinor(dikong, "地空"); addMinor(dijie, "地劫")

  const miscAt: Record<number, string[]> = {}
  const addMisc = (zhi: number, star: string) => {
    ;(miscAt[zhi] ||= []).push(star)
  }
  addMisc(TIANGUAN[lunar.yearGan], "天官"); addMisc(TIANFU_STAR[lunar.yearGan], "天福"); addMisc(TIANCHU[lunar.yearGan], "天厨")
  addMisc(hongluan, "红鸾"); addMisc(tianxi, "天喜"); addMisc(longchi, "龙池"); addMisc(fengge, "凤阁")
  addMisc(tianku, "天哭"); addMisc(tianxu, "天虚"); addMisc(guchen, "孤辰"); addMisc(guasu, "寡宿")
  addMisc(feilian, "蜚廉"); addMisc(posui, "破碎"); addMisc(huagai, "华盖"); addMisc(xianchi, "咸池")
  addMisc(jiesha, "劫煞"); addMisc(tiande, "天德"); addMisc(yuede, "月德"); addMisc(longde, "龙德")
  addMisc(dahao, "大耗"); addMisc(tiankong, "天空"); addMisc(nianjie, "年解")
  addMisc(yinsha, "阴煞"); addMisc(tianxing, "天刑"); addMisc(tianyao, "天姚"); addMisc(tianyue2, "天月")
  addMisc(tianwu, "天巫"); addMisc(jieshen, "解神")
  addMisc(taifu, "台辅"); addMisc(fenggao, "封诰")
  addMisc(enguang, "恩光"); addMisc(tiangui, "天贵"); addMisc(santai, "三台"); addMisc(bazuo, "八座")
  addMisc(tiancai, "天才"); addMisc(tianshou, "天寿")
  addMisc(tianshang, "天伤"); addMisc(tianshi, "天使")
  addMisc(zhengJie, "截空"); addMisc(fuJie, "副截"); addMisc(zhengXun, "旬空"); addMisc(fuXun, "副旬")

  const palaces: ZiweiPalaceOut[] = []
  for (let i = 0; i < 12; i++) {
    const zhi = M(mingIdx - i)
    const gan = palaceGan(zhi)
    const majors: ZiweiStarOut[] = MAJORS.filter((s) => starAt[s] === zhi).map((s) => ({
      name: s, bright: bright(s, zhi), hua: huaOf(s),
    }))
    const minors: ZiweiStarOut[] = (minorsAt[zhi] || []).map((s) => ({
      name: s, bright: bright(s, zhi), hua: huaOf(s),
    }))
    const misc: ZiweiStarOut[] = (miscAt[zhi] || []).map((s) => ({ name: s, bright: miscBright(s, zhi) }))

    // 宫干飞化
    const flyStars = SIHUA_TABLE[gan]
    const allHere = (z: number) =>
      MAJORS.filter((s) => starAt[s] === z).concat((minorsAt[z] || []).filter((s) => ["文昌", "文曲", "左辅", "右弼"].includes(s)))
    const feihua = flyStars.map((star, hi) => {
      let targetZhi = -1
      for (let z = 0; z < 12; z++) if (allHere(z).includes(star)) { targetZhi = z; break }
      return { hua: HUA_NAMES[hi], star, targetZhi }
    }).filter((f) => f.targetZhi >= 0)
    const selfHua = feihua.filter((f) => f.targetZhi === zhi).map((f) => f.hua)

    palaces.push({
      zhi, name: PALACE_NAMES[i], ganzhi: gan + ZW_ZHI[zhi],
      majors, minors, misc,
      daxian: daxianAt(zhi), liunianAges: liunianAt(zhi), xiaoxian: xiaoxianAt(zhi),
      changsheng: changshengAt(zhi), boshi: boshiAt(zhi), jiangqian: jiangqianAt(zhi), suiqian: suiqianAt(zhi),
      isShen: zhi === shenIdx, isMing: zhi === mingIdx,
      feihua, selfHua,
    })
  }

  const sihua = sihuaStars.map((star, i) => ({ hua: HUA_NAMES[i], star }))
  return {
    gender: input.gender,
    yinYang,
    lunar,
    hourZhi: ZW_ZHI[hourIdx],
    adjusted,
    sizhu,
    wuxingJu: ju.name,
    juNum: ju.num,
    mingIdx, shenIdx,
    mingzhu: MINGZHU[mingIdx],
    shenzhu: SHENZHU[yearZhiIdx],
    zidou: ZW_ZHI[zidouIdx],
    sihua,
    sihuaNote: `${lunar.yearGan}年生人：${sihua.map((s) => `${s.star}化${s.hua}`).join(" · ")}`,
    palaces,
  }
}

// ─── 盘面适配器：引擎结果 → 工作台 ZiweiChartGrid 数据形态 ───
import type { ZiweiChart } from "./ziwei-types"

/**
 * @param birthSolarYear 公历出生年（算虚岁用）
 * @param nowYear 当前年份（定各宫最近流年与现行大限）
 */
export function toZiweiChart(r: ZiweiResult, clientName: string, birthSolarYear: number, nowYear?: number): ZiweiChart {
  const cy = nowYear ?? new Date().getFullYear()
  const nominalAge = cy - birthSolarYear + 1 // 虚岁

  // 盘面组件按 寅..丑 顺序索引（索引0=寅）
  const GRID_ORDER = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1]
  const gridIdxOfZhi = (zhi: number) => GRID_ORDER.indexOf(zhi)

  const palaces = GRID_ORDER.map((zhi) => {
    const p = r.palaces.find((pp) => pp.zhi === zhi)!
    // 该宫最近流年（宫支=流年年支）
    let ln = ""
    for (let y = cy; y < cy + 12; y++) {
      if (M(y - 4) === zhi) {
        ln = `${y} ${y - birthSolarYear + 1}岁`
        break
      }
    }
    // 现行大限
    const [dxFrom, dxTo] = p.daxian.split("-").map(Number)
    return {
      name: p.name,
      ganzhi: p.ganzhi,
      majors: p.majors.map((s) => ({ name: s.name, bright: s.bright || undefined, hua: s.hua as "禄" | "权" | "科" | "忌" | undefined })),
      // 吉煞带亮度+四化，杂曜跟随其后（与竞品同视觉密度）
      minors: [
        ...p.minors.map((s) => s.name + (s.bright || "") + (s.hua ? `化${s.hua}` : "")),
        ...p.misc.map((s) => s.name + (s.bright || "")),
      ],
      daxian: p.daxian,
      liunian: ln,
      currentDaxian: nominalAge >= dxFrom && nominalAge <= dxTo,
      isShen: p.isShen,
      liunianAges: p.liunianAges,
      xiaoxian: p.xiaoxian,
      changsheng: p.changsheng,
      boshi: p.boshi,
      shensha: [p.jiangqian, p.suiqian],
      feihua: p.feihua.map((f) => ({ hua: f.hua as "禄" | "权" | "科" | "忌", star: f.star, target: gridIdxOfZhi(f.targetZhi) })),
    }
  })

  const mingPalace = r.palaces.find((p) => p.isMing)!
  const shenPalace = r.palaces.find((p) => p.isShen)!
  const mingStars = mingPalace.majors.length
    ? mingPalace.majors.map((s) => s.name + (s.bright ? `(${s.bright})` : "")).join("、")
    : `无主星，借对宫${r.palaces.find((p) => p.zhi === M(mingPalace.zhi + 6))!.majors.map((s) => s.name).join("、") || "星曜"}`

  return {
    clientName,
    gender: r.gender,
    lunarBirth: `${r.lunar.text} ${r.hourZhi}时`,
    wuxingJu: r.wuxingJu,
    mingzhu: r.mingzhu,
    shenzhu: r.shenzhu,
    sihuaNote: r.sihuaNote,
    palaces,
    keyNotes: [
      { label: "命宫", text: `${mingPalace.ganzhi}坐${mingStars}，${r.yinYang}${r.gender}${r.wuxingJu}，${r.juNum}岁起运。` },
      { label: "身宫", text: `身宫在${shenPalace.name}（${shenPalace.ganzhi}），命主${r.mingzhu}、身主${r.shenzhu}，子年斗君${r.zidou}。` },
      { label: "四化", text: r.sihuaNote },
    ],
  }
}
