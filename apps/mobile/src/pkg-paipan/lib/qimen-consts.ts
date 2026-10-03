/**
 * 奇门 · 前端展示常量与结果类型
 *
 * 奇门排盘算法已迁至服务端（POST /paipan/engine/qimen、/yinpan），前端不再引入 shared 的奇门引擎模块。
 * 下面几个是九宫展示用的公开对照（宫名、宫位地支、显示顺序），**复制**自 shared qimen-engine：
 * 若从 shared 模块 import 这些值，整个奇门引擎会随之打进前端包。
 * 与 shared 原件的一致性由 apps/server/test/paipan-engine-copies.spec.ts 守着。
 */
export type { QimenResult } from '@guoxue/shared/paipan/qimen-engine'

/** 外圈八宫顺时针（自坎起） */
export const RING_PALACES = [1, 8, 3, 4, 9, 2, 7, 6]
/** 3×3 显示顺序：巽4 离9 坤2 / 震3 中5 兑7 / 艮8 坎1 乾6 */
export const GRID_PALACES = [4, 9, 2, 3, 5, 7, 8, 1, 6]
export const PALACE_NAMES = ['', '坎1宫', '坤2宫', '震3宫', '巽4宫', '中5宫', '乾6宫', '兑7宫', '艮8宫', '离9宫']

export const PALACE_DIZHI: Record<number, string[]> = {
  1: ['子'], 2: ['未', '申'], 3: ['卯'], 4: ['辰', '巳'], 5: [],
  6: ['戌', '亥'], 7: ['酉'], 8: ['丑', '寅'], 9: ['午'],
}
