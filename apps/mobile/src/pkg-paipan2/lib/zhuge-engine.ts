import signsData from "./data/zhuge-signs.json"
import kangxiData from "./data/kangxi-strokes.json"

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
}

const SIGNS = signsData as Record<string, ZhugeSign>

/**
 * 康熙笔画：直查康熙字典笔画库（{字:[笔画,五行,部首]}·2万+字），
 * 比 V0 的 cnchar 简体笔画+部首修正方案更正统（V0 方案已弃，cnchar 依赖同弃）。
 * 数字一~十按数值计（测字通行规则）。
 */
const NUM_STROKES: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
}
const KANGXI = kangxiData as unknown as Record<string, [number, string, string]>

/** 单字康熙笔画；不在字典中的生僻字返回 null（占卜须准确，不静默兜底） */
export function kangxiStrokes(ch: string): { trad: string; strokes: number } | null {
  if (NUM_STROKES[ch] !== undefined) return { trad: ch, strokes: NUM_STROKES[ch] }
  const s = KANGXI[ch]?.[0]
  if (!s) return null
  return { trad: ch, strokes: s }
}

/** 是否为汉字 */
export function isHan(ch: string): boolean {
  return /^[\u4e00-\u9fff\u3400-\u4dbf]$/u.test(ch)
}

/** 诸葛神数占算：三字 → 康熙笔画 → 各取个位组三位数 → 超384循环减384 */
export function paiZhuge(input: string): ZhugeResult {
  const chars = Array.from(input.trim())
  if (chars.length !== 3 || !chars.every(isHan)) {
    throw new Error("请输入三个汉字")
  }
  const maybeInfos = chars.map((c) => ({ ch: c, info: kangxiStrokes(c) }))
  const missing = maybeInfos.filter((x) => !x.info).map((x) => x.ch)
  if (missing.length) {
    throw new Error(`「${missing.join('」「')}」不在康熙字典库中，请换字再测`)
  }
  const infos = maybeInfos.map((x) => x.info!)
  const strokes = infos.map((i) => i.strokes)
  const digits = strokes.map((s) => s % 10)
  let n = digits[0] * 100 + digits[1] * 10 + digits[2]
  if (n === 0) n = 384
  while (n > 384) n -= 384
  const sign = SIGNS[String(n)]
  return {
    input: chars.join(""),
    tradChars: infos.map((i) => i.trad),
    strokes,
    digits,
    rawNumber: digits[0] * 100 + digits[1] * 10 + digits[2],
    signNumber: n,
    sign,
  }
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

/** 白话总断 */
export function zhugeVerdict(r: ZhugeResult): string[] {
  const out: string[] = []
  const luckMap: Record<string, string> = {
    上上签: "这是最高等级的吉签，所问之事时机极佳，可放手推进。",
    上签: "此为吉签，大方向有利，稳步进行即可见成果。",
    中上签: "签属中上，事有可为，但需要一分耐心与经营。",
    中签: "签属中平，成败各半，关键看你如何应对变化。",
    中下签: "签属中下，暂宜守成蓄力，不宜激进冒进。",
    下签: "此为下签，目前阻力较大，建议缓一步、避其锋。",
    下下签: "此为下下签，凡事宜停宜守，静待时机转换。",
  }
  out.push(
    `【签等】${r.sign.luck}——${luckMap[r.sign.luck] ?? "签意需结合所问之事细参。"}`,
  )
  out.push(
    `【卦象】${r.sign.gong} ${r.sign.gua}：本卦为体、变卦为用，卦变的方向就是事情演化的方向，可对照详细解签中的卦理细读。`,
  )
  out.push(
    `【测字】「${r.input}」繁体笔画 ${r.strokes.join("、")}，取个位得 ${r.digits.join("")}，循环归入第 ${r.signNumber} 签——字是心念的投影，签由念起。`,
  )
  out.push(
    "【提醒】签辞是启示而非定数，得到指引后应穿过迷惘、努力向前，不必沉溺反复占问。",
  )
  return out
}
