/**
 * @guoxue/bazi-engine — 八字排盘核心引擎
 *
 * 主入口：输入公历出生信息，输出完整八字排盘结果
 */
import type { BaziInput, BaziResult } from './types'
import { NA_YIN, getKongWang } from './constants'
import { calcSiZhu, calcNianZhu, calcShengXiao, calcShiShen } from './sizhu'
import { calcQiYun, fillDaYunShiShen } from './dayun'
import { calcFenXiTiShi, calcTaiYuan, calcMingGong, calcShenGong, calcWangXiang } from './shensha'
import { calcAllShenSha, getShenShaByPillar } from './shensha-db'
import { calcGeJu, calcWuXingEnergy } from './geju'

/**
 * 完整八字排盘
 * @param input 出生信息
 * @returns 完整排盘结果 BaziResult
 */
export function calcBazi(input: BaziInput): BaziResult {
  // 1. 四柱
  const siZhu = calcSiZhu(input)

  // 2. 生肖
  const shengXiao = calcShengXiao(input.year)

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
  // 补纳音
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
  }
}

// 导出所有类型和底层函数，便于外部单独使用
export type { BaziInput, BaziResult, SiZhu, Pillar, DaYunStep, LiuNian, QiYun, FenXiTiShi } from './types'
export type { Gan, Zhi, ShiShen, Gender } from './types'
export { calcSiZhu, calcNianZhu, calcRiZhu, calcShiZhu, calcYueZhu, calcShengXiao, calcShiShen } from './sizhu'
export { calcQiYun, fillDaYunShiShen, calcLiuNian, calcLiuYue } from './dayun'
export { calcFenXiTiShi, calcTaiYuan, calcMingGong, calcShenGong, calcDiShi, calcWangXiang } from './shensha'
export { calcAllShenSha, getShenShaByPillar } from './shensha-db'
export { calcGeJu, calcWuXingEnergy } from './geju'
export type { ShenShaItem, GeJu, WuXingEnergy } from './types'
export { getLiuNianGanZhi, getLiuYueGanZhi, getLiuRiGanZhi, getLiuShiGanZhi, getLiuNianShiShen, getLiuYueShiShen } from './liunian'
export { getYueZhiIndex, getJieQiDate, daysBetween, daysToNearestJie } from './jieqi'
export {
  GAN, ZHI, ZHI_CANG, WU_HU_DUN, WU_SHU_DUN, YUE_JIAN,
  SHENG_XIAO, SHI_SHENG_YANG, SHI_SHENG_YIN, NA_YIN,
  GAN_COLOR, ZHI_COLOR, CHANG_SHENG, DI_SHI,
  GAN_HE_PAIRS, ZHI_HE_PAIRS, ZHI_CHONG_PAIRS, ZHI_HAI_PAIRS,
  ZHI_SAN_HE, ZHI_SAN_HUI, ZHI_SAN_XING, ZHI_ZI_XING,
  getKongWang,
} from './constants'
