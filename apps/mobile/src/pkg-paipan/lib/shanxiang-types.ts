/**
 * 山向奇门 · 前端类型与二十四山序
 *
 * 排盘算法已迁至服务端（apps/server/src/modules/paipan/engine/shanxiang-engine.ts），
 * 前端只经 POST /paipan/engine/shanxiang 拿结果。
 */
import type { QimenHourChart } from '@guoxue/shared/paipan/qimen-engine'

/** 二十四山（向）从 0° 起每 15° 一山：0~14=癸 …… 195~209=未（经黄金基准验证） */
export const FACING_SEQ = [
  "癸", "丑", "艮", "寅", "甲", "卯", "乙", "辰", "巽", "巳", "丙", "午",
  "丁", "未", "坤", "申", "庚", "酉", "辛", "戌", "乾", "亥", "壬", "子",
] as const

export interface ShanxiangResult {
  /** 输入向角度（0-359） */
  degree: number
  /** 5度带展示区间，如 "195~199" */
  degreeBand: string
  /** 坐山 / 向山 */
  sitting: string
  facing: string
  /** 山向标签，如 "丑山未向" */
  label: string
  /** 坐山所配节气与三元 */
  jieqi: string
  yuan: string
  /** 局 */
  ju: { isYang: boolean; num: number; label: string }
  /** 年干支 / 用事干支（五鼠遁） */
  yearGZ: string
  useGZ: string
  /** 黄泉：八煞支 + 劫曜干及其地盘落宫 */
  huangquan: { zhi: string; yaoGan: string; yaoPalace: number; label: string }
  /** 奇门盘 */
  chart: QimenHourChart
  /** 白话总断 */
  plainVerdicts: { title: string; text: string }[]
}
