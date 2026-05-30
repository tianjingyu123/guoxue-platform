/**
 * @guoxue/bazi-engine — 八字排盘核心引擎
 *
 * 主入口：输入公历出生信息，输出完整八字排盘结果
 */
import type { BaziInput, BaziResult } from './types'
import { NA_YIN, getKongWang } from './constants'
import { calcSiZhu, calcShengXiao, calcZiZuo } from './sizhu'
import { calcQiYun, fillDaYunShiShen } from './dayun'
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
export function calcBazi(input: BaziInput): BaziResult {
  // 0. 真太阳时校正（可选，默认关闭）
  const useSolar = input.useTrueSolarTime === true
  let solar: ReturnType<typeof calcTrueSolarTime> | undefined
  let effectiveInput = input

  // 0a. 夏令时校正（可选，默认关闭，1986-1991年出生建议开启）
  let daylightSaving: ReturnType<typeof applyDaylightSaving> | undefined
  if (input.useDaylightSaving) {
    daylightSaving = applyDaylightSaving(input.hour, input.year, input.month, input.day)
    if (daylightSaving.inPeriod) {
      effectiveInput = {
        ...effectiveInput,
        hour: daylightSaving.adjustedHour,
      }
    }
  }

  if (useSolar) {
    solar = calcTrueSolarTime(
      effectiveInput.hour, effectiveInput.minute,
      effectiveInput.month, effectiveInput.day,
      effectiveInput.city, effectiveInput.longitude,
    )
    effectiveInput = {
      ...effectiveInput,
      hour: Math.floor(solar.adjustedHour),
      minute: Math.round((solar.adjustedHour - Math.floor(solar.adjustedHour)) * 60),
    }
  }

  // 1. 四柱（含立春分界、早晚子时）
  const siZhu = calcSiZhu(effectiveInput)

  // 2. 生肖（按立春分界）
  const shengXiao = calcShengXiao(input.year, input.month, input.day, input.hour)

  // 3. 空亡（日柱旬空）
  const kongWang = getKongWang(siZhu.ri.gan + siZhu.ri.zhi)

  // 4. 起运 + 大运
  const yueGanZhi = siZhu.yue.gan + siZhu.yue.zhi
  const qiYun = calcQiYun(
    input.year, input.month, input.day, input.hour,
    input.gender,
    siZhu.nian.gan,
    yueGanZhi
  )
  // 填充大运十神和流年
  qiYun.daYun = fillDaYunShiShen(qiYun.daYun, siZhu.ri.gan)

  // 5. 胎元
  const taiYuan = calcTaiYuan(siZhu.yue.gan, siZhu.yue.zhi, siZhu.ri.gan)
  taiYuan.nayin = NA_YIN[taiYuan.gan + taiYuan.zhi] || ''

  // 6. 命宫
  const mingGong = calcMingGong(siZhu.yue.zhi, siZhu.shi.zhi, siZhu.ri.gan)
  mingGong.nayin = NA_YIN[mingGong.gan + mingGong.zhi] || ''

  // 7. 身宫
  const shenGong = calcShenGong(siZhu.yue.zhi, siZhu.shi.zhi, siZhu.ri.gan)
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

  // 13. 农历日期（简化处理，后续可接入农历库）
  const lunarDate = `${input.year}年${input.month}月${input.day}日`

  // 14. 自坐
  const ziZuo = calcZiZuo(siZhu.ri.gan, siZhu.ri.zhi)

  return {
    input,
    siZhu,
    qiYun,
    kongWang,
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
  ZHI_AN_HE, ZHI_XIANG_PO,
  CHANG_SHENG, DI_SHI,
} from './constants'
export { applyDaylightSaving, getDaylightSavingOffset } from './xialingshi'
export { calcTrueSolarTime } from './taiyangshi'

// 仅导出外部实际使用的类型
export type {
  BaziInput, BaziResult, SiZhu, Pillar, DaYunStep, Gan, Zhi, ShiShen,
  ZiShiMode, ZiZuo, DaylightSaving as DaylightSavingInfo,
  FenXiTiShi, GeJu, ShenShaItem, TaiYangShi, WuXingEnergy,
} from './types'
