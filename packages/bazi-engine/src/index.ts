/**
 * @guoxue/bazi-engine — 八字排盘核心引擎
 *
 * 主入口：输入公历出生信息，输出完整八字排盘结果
 */
import type { BaziInput, BaziResult } from './types'
import { NA_YIN, getKongWang } from './constants'
import { calcSiZhu, calcShengXiao, calcZiZuo } from './sizhu'
import { calcQiYun, fillDaYunShiShen } from './dayun'
import { fillLiuNianLiuYue, getLiuShiList } from './liunian'
import { calcFenXiTiShi, calcTaiYuan, calcMingGong, calcShenGong, calcWangXiang } from './shensha'
import { calcAllShenSha } from './shensha-db'
import { calcGeJu, calcWuXingEnergy } from './geju'
import { calcTrueSolarTime } from './taiyangshi'
import { applyDaylightSaving } from './xialingshi'

/**
 * 完整八字排盘
 * @param input 出生信息
 * @returns 完整排盘结果 BaziResult
 */
/** 公历 → 农历（如「四月廿四」）；运行环境不支持农历历法时返回空串，由调用方决定是否展示 */
export function toLunarDate(year: number, month: number, day: number): string {
  try {
    const parts = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", { month: "long", day: "numeric" }).formatToParts(
      new Date(year, month - 1, day),
    )
    const lm = parts.find((p) => p.type === "month")?.value || ""
    const ld = Number(parts.find((p) => p.type === "day")?.value || "0")
    if (!lm || !ld) return ""
    const DAN = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]
    let dayCn = ""
    if (ld >= 1 && ld <= 10) dayCn = `初${DAN[ld]}`
    else if (ld < 20) dayCn = `十${DAN[ld - 10]}`
    else if (ld === 20) dayCn = "二十"
    else if (ld < 30) dayCn = `廿${DAN[ld - 20]}`
    else dayCn = "三十"
    return `${lm}${dayCn}`
  } catch {
    return ""
  }
}

export function calcBazi(input: BaziInput): BaziResult {
  // 0. 真太阳时校正（可选，默认关闭）
  const useSolar = input.useTrueSolarTime === true
  let solar: ReturnType<typeof calcTrueSolarTime> | undefined
  let effectiveInput = input

  /**
   * 时间校正统一走「加减分钟数到日期上」。
   *
   * 🔴 2026-09-19 重写，来源见接续文档 §2.80。
   *
   * 原先夏令时与真太阳时各自**只改 hour/minute，从不动 year/month/day**，
   * 于是校正一旦跨过零点，日期就停在原地，日柱整整错一天：
   *
   * - 夏令时：1986-07-15 00:30 回拨一小时应为 **07-14 23:30**，
   *   原实现把 hour 变成 23 却仍算 07-15，再经「晚子时归次日」推到 07-16 → 日柱辛酉；
   *   正确应为庚申。
   * - 真太阳时：乌鲁木齐 2000-06-15 00:30（偏移 −129.6 分）应为 **06-14 22:20**，
   *   原实现给 06-15 22:20 → 日柱甲辰；正确应为癸卯。
   *
   * 两者同源，所以不各打各的补丁，改成**把总偏移量加到一个 Date 上**，
   * 让跨日、跨月、跨年翻转由 Date 自己处理——手写取模最容易漏掉月末年末。
   */
  let shiftMinutes = 0

  // 0a. 夏令时校正（可选，默认关闭；1986-1991 年出生建议开启）
  let daylightSaving: ReturnType<typeof applyDaylightSaving> | undefined
  if (input.useDaylightSaving) {
    daylightSaving = applyDaylightSaving(input.hour, input.year, input.month, input.day)
    if (daylightSaving.inPeriod) shiftMinutes += daylightSaving.offset * 60 // offset 为 -1 小时
  }

  // 0b. 真太阳时校正（可选，默认关闭）
  // 均时差按校正前的日期算即可——它是随季节缓变的量，跨一天的差异可忽略
  if (useSolar) {
    const baseHour = input.hour + Math.floor(shiftMinutes / 60)
    solar = calcTrueSolarTime(
      ((baseHour % 24) + 24) % 24, input.minute,
      input.month, input.day,
      input.city, input.longitude,
    )
    shiftMinutes += solar.totalOffset
  }

  if (shiftMinutes !== 0) {
    const d = new Date(input.year, input.month - 1, input.day, input.hour, input.minute ?? 0)
    d.setMinutes(d.getMinutes() + Math.round(shiftMinutes))
    effectiveInput = {
      ...effectiveInput,
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes(),
    }
  }

  // 1. 四柱（含立春分界、早晚子时）
  const siZhu = calcSiZhu(effectiveInput)

  // 2. 生肖（按立春分界）
  const shengXiao = calcShengXiao(input.year, input.month, input.day, input.hour, input.minute ?? 0)

  // 3. 空亡
  // 日柱旬空（原有字段，向后兼容）
  const kongWang = getKongWang(siZhu.ri.gan + siZhu.ri.zhi)
  // 四柱各自旬空：getKongWang 本就接受任意干支，原先只喂了日柱，
  // 前端四柱位置便都显示同一个值——旧版是各柱各算的，这里补齐
  const kongWangByPillar = {
    nian: getKongWang(siZhu.nian.gan + siZhu.nian.zhi),
    yue: getKongWang(siZhu.yue.gan + siZhu.yue.zhi),
    ri: kongWang,
    shi: getKongWang(siZhu.shi.gan + siZhu.shi.zhi),
  }

  // 4. 起运 + 大运
  const yueGanZhi = siZhu.yue.gan + siZhu.yue.zhi
  const qiYun = calcQiYun(
    input.year, input.month, input.day, input.hour,
    input.gender,
    siZhu.nian.gan,
    yueGanZhi,
    input.minute
  )
  // 填充大运十神和流年
  qiYun.daYun = fillDaYunShiShen(qiYun.daYun, siZhu.ri.gan)
  // 填充每个流年的流月
  for (const step of qiYun.daYun) {
    step.liuNian = step.liuNian.map(ln => fillLiuNianLiuYue(ln, siZhu.ri.gan))
  }

  // 5. 胎元
  const taiYuan = calcTaiYuan(siZhu.yue.gan, siZhu.yue.zhi, siZhu.ri.gan)
  taiYuan.nayin = NA_YIN[taiYuan.gan + taiYuan.zhi] || ''

  // 6. 命宫
  const mingGong = calcMingGong(siZhu.yue.zhi, siZhu.shi.zhi, siZhu.nian.gan, siZhu.ri.gan)
  mingGong.nayin = NA_YIN[mingGong.gan + mingGong.zhi] || ''

  // 7. 身宫
  const shenGong = calcShenGong(siZhu.yue.zhi, siZhu.shi.zhi, siZhu.nian.gan, siZhu.ri.gan)
  shenGong.nayin = NA_YIN[shenGong.gan + shenGong.zhi] || ''

  // 8. 旺相休囚死
  const wangXiang = calcWangXiang(siZhu.ri.gan, siZhu.yue.zhi)

  // 9. 分析提示
  const fenXiTiShi = calcFenXiTiShi(siZhu)

  // 10. 神煞
  const shenSha = calcAllShenSha(siZhu)

  // 11. 格局
  const geJu = calcGeJu(siZhu)

  // 12. 五行能量
  const wuXingEnergy = calcWuXingEnergy(siZhu)

  // 13. 农历日期（用运行时内置的中国农历历法，与大六壬引擎同一套做法，不引入新依赖）
  //     此前是把公历年月日原样拼成字符串标为“农历”，属显示错误：报告是专业交付物，错的农历一眼会被看穿。
  const lunarDate = toLunarDate(input.year, input.month, input.day)

  // 14. 自坐
  const ziZuo = calcZiZuo(siZhu.ri.gan, siZhu.ri.zhi)

  // 15. 流时列表（十二时辰）
  const liuShiList = getLiuShiList(siZhu.ri.gan)

  return {
    input,
    siZhu,
    qiYun,
    kongWang,
    kongWangByPillar,
    shengXiao,
    lunarDate,
    taiYuan,
    mingGong,
    shenGong,
    wangXiang,
    fenXiTiShi,
    shenSha,
    geJu,
    wuXingEnergy,
    ziZuo,
    liuShiList,
    ...(solar ? {
      taiYangShi: {
        adjustedHour: solar.adjustedHour,
        adjustedMinute: solar.adjustedMinute,
        offset: solar.totalOffset,
        desc: solar.desc,
      },
    } : {}),
    ...(daylightSaving?.inPeriod ? {
      daylightSaving: {
        adjusted: true,
        originalHour: input.hour,
        adjustedHour: daylightSaving.adjustedHour,
        offset: daylightSaving.offset,
        desc: daylightSaving.desc,
      },
    } : {}),
  }
}

// 导出公共基础函数，供其他计算器复用
export { calcRiZhu, calcNianZhu, calcShiShen, calcShiZhu, calcZiZuo, calcSiZhu } from './sizhu'
export { calcAllJieQi, getJieQiDate, daysToNearestJie, getNianZhuYear } from './jieqi'
export {
  GAN, ZHI, NA_YIN, SHENG_XIAO,
  GAN_HE_PAIRS, ZHI_HE_PAIRS, ZHI_CHONG_PAIRS, ZHI_HAI_PAIRS,
  ZHI_SAN_HE, ZHI_SAN_HUI, ZHI_SAN_XING, ZHI_ZI_XING,
  ZHI_AN_HE, ZHI_XIANG_PO, ZHI_AN_JUE,
  CHANG_SHENG, DI_SHI,
} from './constants'
export { applyDaylightSaving, getDaylightSavingOffset } from './xialingshi'
export { calcTrueSolarTime } from './taiyangshi'
export { getLiuYueGanZhi, getLiuShiGanZhi, getLiuShiList, getLiuNianShiShen, getLiuYueShiShen, getLiuRiGanZhi, fillLiuNianLiuYue } from './liunian'

/** 柱位中文名：凡是出文给人读的地方都经它转，不许直出 nian/yue/ri/shi */
export { PILLAR_LABEL } from './types'

// 仅导出外部实际使用的类型
export type {
  BaziInput, BaziResult, SiZhu, Pillar, DaYunStep, Gan, Zhi, ShiShen,
  ZiShiMode, ZiZuo, DaylightSaving as DaylightSavingInfo,
  FenXiTiShi, GeJu, ShenShaItem, TaiYangShi, WuXingEnergy,
  LiuNian, LiuYue, LiuShi,
} from './types'
