/**
 * 汉字字典聚合引擎（自 V0 lib/yijing/zidian-engine.ts 移植，前端本地算）
 *
 * V0 原版是「仅服务端使用」（顶层 import 5.2MB 新华字典 + Node require zdic）。
 * 本移植版做了三处改造，使其可在小程序分包内运行：
 *   1. 新华字典释义/繁体（5.2MB）→ 不再本地加载，由后端 GET /zidian/lookup 注入（RemoteEntry）；
 *      拿不到远端数据时仍能出全部本地字段，仅释义位显示兜底文案（诚实降级，不编造）。
 *   2. pinyin-pro（多音字全列）→ 项目已有的 pinyin-lite（离线表，多音字取首选；代价见其头注释）。
 *      若后端返回了 pinyin，优先用后端的（新华字典的首选读音更准）。
 *   3. @vearvip zdic（99142 字简体笔画/现代部首）→ 依赖 Node require，无法上小程序；
 *      降级为康熙表的部首/笔画（V0 原本就有 `?? radical` / `?? strokesKangxi` 的降级路径）。
 *
 * 其余 24 个字段（康熙笔画、字形五行、81 数理、生肖宜忌、汉字结构、五音、三才、性别）
 * 全部本地计算，数据（kangxi-strokes / hanzi-structure）已在本分包内，零网络往返。
 */
import kangxiDict from './data/kangxi-strokes.json'
import structureDict from './data/hanzi-structure.json'
import { pinyinSymbol } from './pinyin-lite'
import { shuliInfoOf, shuliWuxing } from './xingming-engine'
import { assessCharForZodiac } from './shengxiao-naming'
import { namingCharPool } from './qiming-engine'

const KANGXI = kangxiDict as unknown as Record<string, [number, string, string]>
const STRUCTURE = structureDict as unknown as Record<string, string>

/** 后端注入的词典条目（GET /zidian/lookup 返回） */
export interface RemoteEntry {
  char: string
  traditional: string
  pinyin: string
  explanation: string
}

/* ============ 汉字结构（源自 CHISE IDS 首运算符） ============ */
export const STRUCTURE_LABEL: Record<string, string> = {
  L: '左右结构',
  T: '上下结构',
  L3: '左中右结构',
  T3: '上中下结构',
  E: '全包围结构',
  ET: '上三包围结构',
  EB: '下三包围结构',
  EL: '左三包围结构',
  ETL: '左上包围结构',
  ETR: '右上包围结构',
  EBL: '左下包围结构',
  O: '镶嵌穿插结构',
  S: '独体字',
}
/** 结构筛选可选项（按常用度排序，供 UI 使用） */
export const STRUCTURE_OPTIONS = ['L', 'T', 'ETL', 'EBL', 'E', 'S', 'L3', 'T3', 'ET', 'ETR', 'EL', 'EB', 'O'] as const

function structureOf(char: string): string {
  return STRUCTURE[char] || 'S'
}

/* ============ 五音（宫商角徵羽，按声母发音部位） ============ */
const WUYIN_TABLE: [RegExp, string, string][] = [
  [/^[gkh]/, '角', '牙音，五行属木'],
  [/^[dtnl]/, '徵', '舌音，五行属火'],
  [/^[bpmf]/, '羽', '唇音，五行属水'],
  [/^(zh|ch|sh|[zcsr])/, '商', '齿音，五行属金'],
  [/^[ywaoe]/, '宫', '喉音，五行属土'],
]

function wuyinOf(py: string): { yin: string; desc: string } {
  const clean = py
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  for (const [re, yin, desc] of WUYIN_TABLE) {
    if (re.test(clean)) return { yin, desc }
  }
  return { yin: '宫', desc: '喉音，五行属土' }
}

/* ============ 结果类型 ============ */
export interface ZidianResult {
  char: string
  traditional: string
  pinyins: string[]
  primaryPinyin: string
  radical: string // 康熙部首（姓名学）
  radicalModern: string // 现代部首（无 zdic 时同康熙部首）
  structure: string // 汉字结构名（左右/上下/独体…）
  structureCode: string // 结构代码（L/T/S…，供筛选）
  strokesSimp: number // 简体笔画（无 zdic 时同康熙笔画）
  strokesKangxi: number // 康熙笔画（五格剖象用）
  wuxing: string // 字形五行（部首为主）
  wuxingShuli: string // 数理五行（康熙笔画尾数）
  wuyin: { yin: string; desc: string }
  shuli: { num: number; name: string; luck: string; judgment: string } // 康熙笔画对应 81 数理
  explanation: string // 新华字典释义（后端注入）
  hasExplanation: boolean // 释义是否来自词典（false=未取到，展示兜底文案）
  zodiacYi: string[] // 适宜生肖
  zodiacJi: { zodiac: string; reason: string }[] // 忌用生肖及理由
  naming: string // 姓名学综合提示
  unicode: string // 统一码 U+XXXX
  wuxingReason: string // 五行判定依据（形/音/数理）
  nameLuck: { level: string; comment: string } // 吉凶寓意综合评估
  genderFit: { fit: string; reason: string } // 适用性别
  sancaiAdvice: string // 三才搭配建议
}

/* ============ 部首五行判定依据 ============ */
const RADICAL_WX: Record<string, string> = {
  木: '木', 艹: '木', 竹: '木', 禾: '木', 米: '木', 麦: '木', 耒: '木',
  火: '火', 灬: '火', 日: '火', 光: '火', 赤: '火',
  土: '土', 山: '土', 石: '土', 田: '土', 王: '土', 玉: '土', 阜: '土', 邑: '土',
  金: '金', 钅: '金', 刀: '金', 刂: '金', 贝: '金', 皿: '金', 辛: '金', 酉: '金',
  水: '水', 氵: '水', 冫: '水', 雨: '水', 鱼: '水', 黑: '水', 子: '水',
}

function wuxingReasonOf(char: string, radical: string, wuxing: string, strokes: number, primaryPy: string): string {
  const wyn = wuyinOf(primaryPy)
  if (RADICAL_WX[radical] === wuxing) {
    return `「${char}」从${radical}部，字形直取${radical}性，故五行属${wuxing}（形法为主）`
  }
  if (shuliWuxing(strokes) === wuxing) {
    return `「${char}」康熙 ${strokes} 画，数理尾数配河图五行属${wuxing}（数法）；音韵${wyn.yin}音可参`
  }
  return `「${char}」综合字义内涵与传统字书归类定为${wuxing}行；部首「${radical}」、五音「${wyn.yin}」（${wyn.desc}）可互参`
}

/* ============ 适用性别（按字义关键词启发式） ============ */
const FEM_HINTS = ['女', '花', '香', '美', '娟', '婉', '柔', '妍', '淑', '雅', '芳', '丽', '娘', '姿', '眉', '黛', '婷', '妆', '绣', '珠', '琼', '瑶', '燕', '莺', '蝶', '萍', '薇', '蓉', '莲', '梅', '兰', '菊', '妹', '姐', '嫣', '娥']
const MASC_HINTS = ['刚', '强', '武', '勇', '雄', '威', '猛', '霸', '军', '兵', '将', '帅', '力', '山', '石', '铁', '钢', '峰', '岳', '涛', '浩', '宏', '伟', '豪', '杰', '龙', '虎', '鹏', '骏', '剑', '戈', '旗', '拓']

function genderFitOf(char: string, explanation: string): { fit: string; reason: string } {
  const text = char + explanation.slice(0, 120)
  const femHit = FEM_HINTS.some((h) => text.includes(h))
  const mascHit = MASC_HINTS.some((h) => text.includes(h))
  if (femHit && !mascHit) return { fit: '偏女性', reason: '字义意象柔美婉约，传统上多用于女名' }
  if (mascHit && !femHit) return { fit: '偏男性', reason: '字义意象刚健豪迈，传统上多用于男名' }
  return { fit: '中性', reason: '字义意象平和，男女名皆宜，视搭配而定' }
}

/* ============ 三才搭配建议 ============ */
const WX_SHENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const WX_SHENG_ME: Record<string, string> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' }
const WX_KE: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

function sancaiAdviceOf(wuxing: string): string {
  return `此字五行属${wuxing}：宜与属${WX_SHENG_ME[wuxing]}之字相邻（${WX_SHENG_ME[wuxing]}生${wuxing}，得生扶）或属${WX_SHENG[wuxing]}之字相邻（${wuxing}生${WX_SHENG[wuxing]}，气韵流通）；慎与属${WX_KE[wuxing]}之字紧邻（${wuxing}克${WX_KE[wuxing]}，三才易生冲克）。用于名字中间或末尾皆可，以八字喜用为最终取舍。`
}

const NO_EXPLANATION = '（未取到新华字典释义，以下姓名学信息由本地推算，仍可参考）'

/**
 * 单字查询；查无此字返回 null。
 * @param remote 后端注入的词典条目（繁体/拼音/释义）。缺省时释义降级为兜底文案，其余字段照常计算。
 */
export function lookupChar(ch: string, remote?: RemoteEntry): ZidianResult | null {
  const char = ch.trim().charAt(0)
  if (!char || !/[一-鿿]/.test(char)) return null

  const kx = KANGXI[char]
  // 康熙表未收录且后端也没有 → 视为不认识这个字
  if (!kx && !remote) return null

  // 拼音：后端（新华字典首选读音）优先，回退本地离线表
  const localPy = pinyinSymbol(char)
  const primary = remote?.pinyin || localPy || ''
  const pinyins = [...new Set([primary, localPy].filter(Boolean))]

  const strokesKangxi = kx?.[0] ?? 0
  const wuxing = kx?.[1] ?? shuliWuxing(strokesKangxi)
  const radical = kx?.[2] ?? ''
  const shuliDetail = shuliInfoOf(strokesKangxi)

  /* 十二生肖逐一评估 */
  const ZODIACS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
  const zodiacYi: string[] = []
  const zodiacJi: { zodiac: string; reason: string }[] = []
  for (const z of ZODIACS) {
    const a = assessCharForZodiac(char, z)
    if (a.score > 0) zodiacYi.push(z)
    else if (a.score < 0) zodiacJi.push({ zodiac: z, reason: a.badHits.map((h) => h.reason).join('；') })
  }

  /* 姓名学综合提示 */
  const namingParts: string[] = [
    `康熙笔画 ${strokesKangxi} 画，字形五行属${wuxing}`,
    `数理${shuliDetail.luck}（${shuliDetail.name}）`,
  ]
  if (zodiacYi.length) namingParts.push(`宜生肖：${zodiacYi.join('、')}`)
  if (zodiacJi.length) namingParts.push(`忌生肖：${zodiacJi.map((x) => x.zodiac).join('、')}`)

  const hasExplanation = !!remote?.explanation
  const explanation = remote?.explanation || NO_EXPLANATION
  const luckLevel = shuliDetail.luck.includes('大吉')
    ? '大吉'
    : shuliDetail.luck.includes('吉')
      ? '吉'
      : shuliDetail.luck.includes('凶')
        ? '慎用'
        : '平'

  return {
    char,
    traditional: remote?.traditional || char,
    pinyins,
    primaryPinyin: primary,
    radical,
    radicalModern: radical,
    structure: STRUCTURE_LABEL[structureOf(char)],
    structureCode: structureOf(char),
    strokesSimp: strokesKangxi,
    strokesKangxi,
    wuxing,
    wuxingShuli: shuliWuxing(strokesKangxi),
    wuyin: wuyinOf(primary),
    shuli: { num: strokesKangxi, ...shuliDetail },
    explanation,
    hasExplanation,
    zodiacYi,
    zodiacJi,
    naming: namingParts.join('；'),
    unicode: `U+${char.codePointAt(0)!.toString(16).toUpperCase()}`,
    wuxingReason: wuxingReasonOf(char, radical, wuxing, strokesKangxi, primary),
    nameLuck: {
      level: luckLevel,
      comment: `康熙 ${strokesKangxi} 画得「${shuliDetail.name}」数，${shuliDetail.judgment.slice(0, 40)}`,
    },
    genderFit: genderFitOf(char, explanation),
    sancaiAdvice: sancaiAdviceOf(wuxing),
  }
}

export interface PlazaChar extends ZidianResult {
  meaning: string
  fit: string
  poem?: { source: string; quote: string }
}

/**
 * 选字广场：从精选起名字库（159 字，含字义/诗词）按五行/笔画/吉凶/性别/结构/部首筛选。
 * 纯本地（字库 + 康熙表 + 结构表都在分包内），不依赖后端释义。
 */
export function filterChars(opts: {
  wuxing?: string
  strokesMin?: number
  strokesMax?: number
  luck?: string
  gender?: string
  structure?: string // 结构代码 L/T/S…
  radical?: string // 部首
  limit?: number
}): PlazaChar[] {
  const { wuxing, strokesMin = 1, strokesMax = 48, luck, gender, structure, radical, limit = 120 } = opts
  const out: PlazaChar[] = []
  for (const p of namingCharPool()) {
    if (out.length >= limit) break
    const kx = KANGXI[p.char]
    if (!kx) continue
    const [strokes, wx] = kx
    if (wuxing && wx !== wuxing) continue
    if (strokes < strokesMin || strokes > strokesMax) continue
    if (structure && structureOf(p.char) !== structure) continue
    if (luck) {
      const l = shuliInfoOf(strokes).luck
      if (luck === '吉' ? !l.includes('吉') : !l.includes(luck)) continue
    }
    if (gender === '男' && p.fit === 'f') continue
    if (gender === '女' && p.fit === 'm') continue
    const r = lookupChar(p.char)
    if (!r) continue
    if (radical && r.radicalModern !== radical) continue
    out.push({ ...r, meaning: p.meaning, fit: p.fit, poem: p.poem })
  }
  return out
}

/** 选字广场可选维度（仅返回字库中真实存在的结构与部首，避免空筛选） */
export function plazaFacets(): {
  structures: { code: string; label: string; count: number }[]
  radicals: { radical: string; count: number }[]
} {
  const structCount: Record<string, number> = {}
  const radCount: Record<string, number> = {}
  for (const p of namingCharPool()) {
    const sc = structureOf(p.char)
    structCount[sc] = (structCount[sc] || 0) + 1
    const kx = KANGXI[p.char]
    const rad = kx?.[2]
    if (rad) radCount[rad] = (radCount[rad] || 0) + 1
  }
  const structures = STRUCTURE_OPTIONS.filter((c) => structCount[c]).map((c) => ({
    code: c,
    label: STRUCTURE_LABEL[c],
    count: structCount[c],
  }))
  const radicals = Object.entries(radCount)
    .sort((a, b) => b[1] - a[1])
    .map(([radical, count]) => ({ radical, count }))
  return { structures, radicals }
}

/**
 * 多字批量查询（词语/名字逐字拆解，最多 8 字）。
 * @param remotes 后端返回的词典条目数组，按 char 索引注入
 */
export function lookupText(text: string, remotes: RemoteEntry[] = []): ZidianResult[] {
  const byChar = new Map(remotes.map((r) => [r.char, r]))
  const chars = [...text.replace(/[^一-鿿]/g, '')].slice(0, 8)
  const out: ZidianResult[] = []
  for (const ch of chars) {
    const r = lookupChar(ch, byChar.get(ch))
    if (r) out.push(r)
  }
  return out
}
