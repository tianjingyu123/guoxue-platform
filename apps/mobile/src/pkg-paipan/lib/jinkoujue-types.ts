/**
 * 金口诀 · 前端类型
 *
 * 排课算法已迁至服务端（apps/server/src/modules/paipan/engine/jinkoujue-engine.ts + shared 的 computeJinkoujue），
 * 前端只经 POST /paipan/engine/jinkoujue 拿结果。
 * 结果类型用 `import type` 取自 shared —— 编译时擦除，不会把 shared 的推算代码打进前端包。
 */
export type { JkjPosition, JkjResult } from '@guoxue/shared/paipan'

export type DifenMethod = 'manual' | 'number' | 'random'

/** 十二地支（输入页地分选择用） */
export const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const
