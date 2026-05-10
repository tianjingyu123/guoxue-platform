/**
 * @guoxue/ziwei-engine — 紫微斗数排盘核心引擎
 *
 * 主入口：输入农历出生信息，输出完整紫微斗数命盘
 */
import type { ZiweiInput, ZiweiResult } from './types'
import { calcMingPan } from './mingpan'

/**
 * 完整紫微斗数排盘
 * @param input 农历出生输入
 * @returns 完整紫微斗数命盘 ZiweiResult
 */
export function calcZiwei(input: ZiweiInput): ZiweiResult {
  return calcMingPan(input)
}

// 仅导出外部实际使用的类型
export type { ZiweiInput, ZiweiResult } from './types'
