/**
 * 大六壬 · 前端类型与展示对照
 *
 * 起课算法已迁至服务端（shared 的 computeLiuren 经 POST /paipan/engine/daliuren 调用），前端不再引入 shared 引擎模块。
 * 结果类型用 `import type` —— 编译时擦除，不会把 shared 的推算代码打进前端包。
 * ⚠️ 十二神将名是**复制**的字面量：若从 shared 模块 import 这个值，整个大六壬引擎会随之打进包。
 */
export type { LiurenResult } from '@guoxue/shared/paipan/daliuren-engine'

/** 十二神将名（月将别名，用于展示；与 shared daliuren-engine 的 SHENJIANG_NAME 相同） */
export const SHENJIANG_NAME: Record<string, string> = {
  子: '神后', 丑: '大吉', 寅: '功曹', 卯: '太冲', 辰: '天罡', 巳: '太乙',
  午: '胜光', 未: '小吉', 申: '传送', 酉: '从魁', 戌: '河魁', 亥: '登明',
}
