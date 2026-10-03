/**
 * 奇门穿壬 · 前端类型与展示常量
 *
 * 排盘算法已迁至服务端（apps/server/src/modules/paipan/engine/chuanren-engine.ts），
 * 前端只经 POST /paipan/engine/chuanren 拿结果。奇门/六壬的结果类型以 `import type` 引入（编译时擦除）。
 */
import type { QimenHourChart } from '@guoxue/shared/paipan/qimen-engine'
import type { LiurenResult } from '@guoxue/shared/paipan/daliuren-engine'
import type { Zhi } from '@/lib/paipan/ganzhi'

export const SHENGXIAO = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"] as const
export type Shengxiao = (typeof SHENGXIAO)[number]

export interface ChuanrenOuterCell {
  zhi: Zhi
  /** 遁干（日柱顺遁六十甲子） */
  dunGan: string
  /** 天将（展示名：贵蛇朱六勾青空白常玄阴后） */
  jiang: string
  /** 建除神 */
  jianChu: string
  /** 十二宫（单字） */
  house: string
  houseFull: string
  /** 日旬空亡 */
  kong: boolean
  /** 马星 */
  ma: boolean
  /** 贵人所在 */
  gui: boolean
}

export interface ChuanrenResult {
  qimen: QimenHourChart
  /** 定局口径（展示用）：局名 / 三元 / 定局法中文名 */
  juInfo: { label: string; yuan: string; method: string }
  liuren: LiurenResult
  /** 外圈十二格（按地支索引） */
  outer: Record<string, ChuanrenOuterCell>
  /** 用神标签（如 甲午） */
  yongshen: string
  /** 贵人标签（阳贵/阴贵） */
  guirenLabel: string
  /** 年命生肖 */
  nianming?: Shengxiao
  /** 白话总断 */
  verdicts: { title: string; text: string }[]
  /** AI 摘要 */
  summary: string
}

/** 外圈布局（与竞品一致）：顶行 卯辰巳 → 右列 午未申 → 底行(右→左) 酉戌亥 → 左列(下→上) 子丑寅 */
export const OUTER_LAYOUT = {
  top: ["卯", "辰", "巳"] as Zhi[],
  right: ["午", "未", "申"] as Zhi[],
  bottom: ["亥", "戌", "酉"] as Zhi[],
  left: ["寅", "丑", "子"] as Zhi[],
}
