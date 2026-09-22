/**
 * 诸葛神数 · 前端类型与签号格式化
 *
 * 排盘算法与 384 签文库已迁至服务端（apps/server/src/modules/paipan/engine/zhuge-engine.ts），
 * 前端只经 POST /paipan/engine/zhuge 拿结果（含白话总断）。这里只留类型与纯展示用的签号转汉字。
 */
export interface ZhugeSign {
  luck: string
  gong: string
  gua: string
  text: string
  jie: string[]
}

export interface ZhugeResult {
  input: string
  tradChars: string[]
  strokes: number[] // 康熙笔画
  digits: number[] // 各取个位（10的倍数取0）
  rawNumber: number // 三位数
  signNumber: number // 1~384
  sign: ZhugeSign
  /** 白话总断（服务端给出；原在前端结果页由 zhugeVerdict 现算） */
  verdict: string[]
}

/** 中文签号（第八十七签） */
export function cnSignNumber(n: number): string {
  const digits = "零一二三四五六七八九"
  if (n <= 10) return "一二三四五六七八九十"[n - 1]
  if (n < 20) return `十${n % 10 ? digits[n % 10] : ""}`
  if (n < 100) {
    const t = Math.floor(n / 10)
    return `${digits[t]}十${n % 10 ? digits[n % 10] : ""}`
  }
  const h = Math.floor(n / 100)
  const rest = n % 100
  const s = `${digits[h]}百`
  if (rest === 0) return s
  if (rest < 10) return `${s}零${digits[rest]}`
  if (rest < 20) return `${s}一十${rest % 10 ? digits[rest % 10] : ""}`
  const t = Math.floor(rest / 10)
  return `${s}${digits[t]}十${rest % 10 ? digits[rest % 10] : ""}`
}
