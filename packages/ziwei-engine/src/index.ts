/**
 * @guoxue/ziwei-engine — 紫微斗数排盘核心引擎
 *
 * 主入口：输入农历出生信息，输出完整紫微斗数命盘
 */
import type { ZiweiInput, ZiweiResult } from './types'
import { calcMingPan } from './mingpan'
import { calcSiHua } from './sihua'
import { checkGeShi } from './geshi'
import { calcShenSha } from './shensha'
import {
  calcMingGongZhi, calcShenGongZhi, calcShiErGong,
  calcWuXingJu, calcZiweiPosition, anShiSiZhuXing, anLiuFuXing,
} from './mingpan'
import {
  getSanFang, getDuiGong, getGongQi, getShiErGongZhi, getGongGan, calcDaXian,
} from './shiergong'

/**
 * 完整紫微斗数排盘
 * @param input 农历出生输入
 * @returns 完整紫微斗数命盘 ZiweiResult
 */
export function calcZiwei(input: ZiweiInput): ZiweiResult {
  return calcMingPan(input)
}

// 导出所有类型
export type { ZiweiInput, ZiweiResult, GongWei, Star, SiHua } from './types'
export type { Gender, Gan, Zhi, GongName, WuXing, XingLiangJi, XingType, StarName } from './types'

// 导出所有计算函数（便于外部单独使用）
export { calcMingPan, calcMingGongZhi, calcShenGongZhi, calcShiErGong, calcWuXingJu, calcZiweiPosition, anShiSiZhuXing, anLiuFuXing } from './mingpan'
export { calcSiHua } from './sihua'
export { getSanFang, getDuiGong, getGongQi, getShiErGongZhi, getGongGan, calcDaXian } from './shiergong'
export { calcShenSha } from './shensha'
export { checkGeShi } from './geshi'

// 导出所有常量
export {
  GAN, ZHI, ZHI_SHICHEN, SHI_ER_GONG_NAMES,
  WU_XING_JU_TABLE, WU_XING_JU_VALUES,
  ZIWEI_XI_STARS, TIANFU_XI_STARS, SI_HUA_TABLE,
  NA_YIN,
} from './constants'
