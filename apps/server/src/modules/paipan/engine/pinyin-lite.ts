// 轻量拼音查询：离线拼音表（data/pinyin-table.json·康熙字典 2 万字·267KB）
// 替代 pinyin-pro npm 依赖（整包 1MB+ 不适合小程序分包）。表由 pinyin-pro 离线生成，多音字取首选。
import tableData from './data/pinyin-table.json'

const TABLE = tableData as unknown as Record<string, string>

/** 拼音（调号数字形式，如 中→zhong1）；查不到返回空串 */
export function pinyinNum(ch: string): string {
  return TABLE[ch] ?? ''
}

/** 声调（1-4，轻声/未知=0） */
export function toneOf(ch: string): number {
  const py = TABLE[ch]
  if (!py) return 0
  const t = py.charCodeAt(py.length - 1) - 48
  return t >= 1 && t <= 4 ? t : 0
}

// 韵母标调映射
const TONE_MARKS: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
}

/** 拼音（符号声调形式，如 中→zhōng）；查不到返回原字 */
export function pinyinSymbol(ch: string): string {
  const py = TABLE[ch]
  if (!py) return ch
  const tone = py.charCodeAt(py.length - 1) - 48
  const base = tone >= 0 && tone <= 4 ? py.slice(0, -1) : py
  if (tone < 1 || tone > 4) return base
  // 标调规则：a > o > e 优先；iu/ui 标后者；否则最后一个韵母
  const mark = (idx: number) => base.slice(0, idx) + TONE_MARKS[base[idx]][tone - 1] + base.slice(idx + 1)
  for (const v of ['a', 'o', 'e']) {
    const i = base.indexOf(v)
    if (i >= 0) return mark(i)
  }
  const iu = base.indexOf('iu')
  if (iu >= 0) return mark(iu + 1)
  const ui = base.indexOf('ui')
  if (ui >= 0) return mark(ui + 1)
  for (let i = base.length - 1; i >= 0; i--) {
    if (TONE_MARKS[base[i]]) return mark(i)
  }
  return base
}
