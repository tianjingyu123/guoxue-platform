/**
 * 起名 · 前端类型
 *
 * 起名与姓名解析算法（含康熙笔画/拼音/生肖用字表）已迁至服务端（apps/server/src/modules/paipan/engine/），
 * 前端只经 POST /paipan/engine/qiming、/xingming 拿结果。
 */
import type { NameCandidate } from './qiming-data'

type WX = "金" | "木" | "水" | "火" | "土"
type Style = "classic" | "steady" | "fresh" | "auspicious"

export interface QimingProfile {
  surname: string
  gender: "男" | "女"
  shengxiao: string
  xingzuo: string
  birthText: string
  trueSolarText: string
  pillars: { label: string; shishen: string; gan: string; zhi: string; ganWuxing: string; zhiWuxing: string; canggan: string; nayin: string }[]
  wuxingRatio: { name: string; pct: number }[]
  xiyong: WX[]
  xiyongNote: string
  xiyongSource: { source: string; quote: string }
}

export interface QimingInput {
  surname: string
  gender: "男" | "女"
  nameType: "double" | "single"
  style: Style
  year: number
  month: number
  day: number
  hour: number
  minute: number
  city?: string
  fixChar?: string
  fixPosition?: "middle" | "last"
  blockChars?: string
}

export interface QimingOutput {
  profile: QimingProfile
  candidates: NameCandidate[]
  /** 理论可组合总数（展示用） */
  totalCount: number
}
