// 数字能量解读 · 数据与算法引擎
// 三套体系：①数字八星磁场（东方）②生命灵数（西方毕达哥拉斯）③梅花易数起卦（复用 lib/meihua-data）
// 定位：文化解读工具，输出"性格/风格/启示"，不输出吉凶断言

// ═══════════ 体系一：数字八星磁场 ═══════════

export type StarName = "天医" | "生气" | "延年" | "伏位" | "绝命" | "五鬼" | "六煞" | "祸害"

export interface StarInfo {
  name: StarName
  alias: string
  nature: "吉" | "平" | "煞"
  keyword: string
  /** 性格化解读（非断言）*/
  trait: string
  /** 雷达四维加权：财富/健康/贵人/事业，0~3 */
  weights: { wealth: number; health: number; noble: number; career: number }
}

export const STAR_INFO: Record<StarName, StarInfo> = {
  天医: {
    name: "天医", alias: "财富磁场", nature: "吉", keyword: "厚德载物",
    trait: "组合中带天医气场的人，往往心思单纯、乐于助人，人缘与财缘相伴而来，理财上偏向稳健积累。",
    weights: { wealth: 3, health: 2, noble: 1, career: 1 },
  },
  生气: {
    name: "生气", alias: "贵人磁场", nature: "吉", keyword: "生机盎然",
    trait: "生气磁场的气质是乐观随和、包容力强，容易获得朋友与贵人相助，行事不急不躁。",
    weights: { wealth: 1, health: 1, noble: 3, career: 1 },
  },
  延年: {
    name: "延年", alias: "事业磁场", nature: "吉", keyword: "刚毅担当",
    trait: "延年磁场的人以能力立身，性格果断、责任心强，是团队里让人放心的主心骨，适合独当一面。",
    weights: { wealth: 1, health: 1, noble: 1, career: 3 },
  },
  伏位: {
    name: "伏位", alias: "蓄势磁场", nature: "平", keyword: "静水流深",
    trait: "伏位是等待与蓄力的气场，性格上偏谨慎保守、耐心持重，善守成，转变需要外力推动。",
    weights: { wealth: 1, health: 1, noble: 1, career: 1 },
  },
  绝命: {
    name: "绝命", alias: "冒险磁场", nature: "煞", keyword: "敢想敢为",
    trait: "这一组合带有强烈的冒险与投机色彩，决策果敢但易大起大落，适合有意识地为自己设置安全边界。",
    weights: { wealth: 1, health: 0, noble: 0, career: 1 },
  },
  五鬼: {
    name: "五鬼", alias: "才智磁场", nature: "煞", keyword: "鬼才多变",
    trait: "五鬼磁场常见于点子多、思维跳跃的人，才华出众但心思不易安定，宜以专注化解多变。",
    weights: { wealth: 0, health: 0, noble: 1, career: 1 },
  },
  六煞: {
    name: "六煞", alias: "人际磁场", nature: "煞", keyword: "八面玲珑",
    trait: "六煞组合的人情商高、亲和力强，异性缘与社交运突出，但也容易在人情往来中消耗自己。",
    weights: { wealth: 1, health: 0, noble: 2, career: 0 },
  },
  祸害: {
    name: "祸害", alias: "口才磁场", nature: "煞", keyword: "能言善辩",
    trait: "祸害磁场以口才见长，表达欲与好胜心强，适合靠嘴吃饭的行业，注意言多必失即可。",
    weights: { wealth: 0, health: 0, noble: 0, career: 2 },
  },
}

/** 两位组合 → 八星映射（标准数字能量学口诀）*/
const PAIR_TO_STAR: Record<string, StarName> = {}
const PAIR_DEFS: [StarName, string[]][] = [
  ["天医", ["13", "31", "68", "86", "49", "94", "27", "72"]],
  ["生气", ["14", "41", "67", "76", "39", "93", "28", "82"]],
  ["延年", ["19", "91", "78", "87", "34", "43", "26", "62"]],
  ["绝命", ["12", "21", "69", "96", "48", "84", "37", "73"]],
  ["五鬼", ["18", "81", "79", "97", "36", "63", "24", "42"]],
  ["六煞", ["16", "61", "47", "74", "38", "83", "29", "92"]],
  ["祸害", ["17", "71", "89", "98", "46", "64", "23", "32"]],
  ["伏位", ["11", "22", "33", "44", "55", "66", "77", "88", "99"]],
]
for (const [star, pairs] of PAIR_DEFS) for (const p of pairs) PAIR_TO_STAR[p] = star

export interface StarHit {
  pair: string
  star: StarName
  /** 0 弱化标记：组合中含 0，气场减弱 */
  weakened: boolean
}

/**
 * 八星磁场分析。手机号取第 2 位起两两相扣（10 组）；其他数字全串两两相扣。
 * 含 0 规则：0 本身无磁场，跳 0 取前后非零位组合，并标记"弱化"。
 */
export function analyzeStars(raw: string, isPhone: boolean): StarHit[] {
  const digits = raw.replace(/\D/g, "")
  const seq = isPhone && digits.length === 11 ? digits.slice(1) : digits
  const hits: StarHit[] = []
  for (let i = 0; i < seq.length - 1; i++) {
    const a = seq[i]
    const b = seq[i + 1]
    if (a === "0" && b === "0") continue
    if (a === "0" || b === "0") {
      const d = a === "0" ? b : a
      const star = PAIR_TO_STAR[d + d]
      if (star) hits.push({ pair: a + b, star, weakened: true })
      continue
    }
    const star = PAIR_TO_STAR[a + b]
    if (star) hits.push({ pair: a + b, star, weakened: false })
  }
  return hits
}

/** 雷达四维评分（0~100）：由命中星的权重累加归一 */
export function radarScores(hits: StarHit[]): { wealth: number; health: number; noble: number; career: number } {
  const acc = { wealth: 0, health: 0, noble: 0, career: 0 }
  let max = 0
  for (const h of hits) {
    const w = STAR_INFO[h.star].weights
    const k = h.weakened ? 0.5 : 1
    acc.wealth += w.wealth * k
    acc.health += w.health * k
    acc.noble += w.noble * k
    acc.career += w.career * k
    max += 3 * k
  }
  if (max === 0) return { wealth: 50, health: 50, noble: 50, career: 50 }
  const norm = (v: number) => Math.round(Math.min(100, 30 + (v / max) * 180))
  return { wealth: norm(acc.wealth), health: norm(acc.health), noble: norm(acc.noble), career: norm(acc.career) }
}

/** 尾 4 位解读（对使用者影响最大）*/
export function tailAnalysis(raw: string): { tail: string; hits: StarHit[]; summary: string } {
  const digits = raw.replace(/\D/g, "")
  const tail = digits.slice(-4)
  const hits = analyzeStars(tail, false)
  if (hits.length === 0) return { tail, hits, summary: "尾号组合以 0 与伏位为主，气场偏静，性格上倾向低调蓄力。" }
  const names = [...new Set(hits.map((h) => STAR_INFO[h.star].alias))].join("、")
  return { tail, hits, summary: `尾号四位是与你日常接触最频繁的数字，主气场为${names}。${STAR_INFO[hits[hits.length - 1].star].trait}` }
}

// ═══════════ 体系二：生命灵数 ═══════════

export interface LifeNumberInfo {
  num: number
  title: string
  keyword: string
  /** 先天特质 */
  gift: string
  /** 人生课题 */
  lesson: string
  positives: string[]
  negatives: string[]
  luckyColor: string
  luckyStone: string
  /** 契合灵数 */
  match: number[]
}

export const LIFE_NUMBERS: Record<number, LifeNumberInfo> = {
  1: {
    num: 1, title: "开创者", keyword: "独立·领导",
    gift: "天生带着开路的能量，独立自主、目标感强，擅长从零到一，愿意为自己的选择负全责。",
    lesson: "学会与人协作、接受帮助——不必事事一个人扛。",
    positives: ["果断", "自信", "行动力强", "有主见"], negatives: ["固执", "好胜", "不擅示弱"],
    luckyColor: "正红", luckyStone: "石榴石", match: [3, 5, 9],
  },
  2: {
    num: 2, title: "协调者", keyword: "敏感·合作",
    gift: "细腻敏感、善解人意，是天然的倾听者与协调者，擅长在关系中觉察他人未说出口的需求。",
    lesson: "建立自己的边界与立场，学会说\u201c不\u201d。",
    positives: ["温和", "体贴", "耐心", "擅长配合"], negatives: ["优柔寡断", "依赖", "多虑"],
    luckyColor: "月白", luckyStone: "月光石", match: [4, 6, 8],
  },
  3: {
    num: 3, title: "表达者", keyword: "创意·表达",
    gift: "表达与创意是你的天赋，乐观幽默、感染力强，擅长把抽象的感受转化为语言、画面或作品。",
    lesson: "把灵感落地，练习深耕而非浅尝辄止。",
    positives: ["幽默", "灵感充沛", "社交自然", "乐观"], negatives: ["三分钟热度", "情绪化", "散漫"],
    luckyColor: "明黄", luckyStone: "黄水晶", match: [1, 5, 7],
  },
  4: {
    num: 4, title: "建造者", keyword: "稳定·秩序",
    gift: "务实可靠、条理分明，擅长把混乱变成秩序，是把蓝图变成现实的执行型人才。",
    lesson: "允许变化发生，为生活保留一点弹性与即兴。",
    positives: ["踏实", "自律", "有毅力", "值得信赖"], negatives: ["刻板", "抗拒变化", "过度谨慎"],
    luckyColor: "大地棕", luckyStone: "虎眼石", match: [2, 6, 8],
  },
  5: {
    num: 5, title: "自由者", keyword: "自由·冒险",
    gift: "热爱自由与新鲜感，适应力与好奇心极强，人生的关键词是体验——旅行、变化与未知都滋养你。",
    lesson: "在自由与承诺之间找到平衡，学会坚持完成。",
    positives: ["灵活", "勇于尝试", "多才多艺", "反应快"], negatives: ["不安定", "冲动", "怕受束缚"],
    luckyColor: "青碧", luckyStone: "绿松石", match: [1, 3, 7],
  },
  6: {
    num: 6, title: "守护者", keyword: "关怀·责任",
    gift: "有很强的关怀与审美能量，重情重义、乐于付出，家庭与亲密关系在你的生命里占据核心位置。",
    lesson: "照顾别人之前先照顾自己，付出需有边界。",
    positives: ["有爱心", "有审美", "可靠", "重承诺"], negatives: ["控制欲", "过度牺牲", "求完美"],
    luckyColor: "藕粉", luckyStone: "粉晶", match: [2, 4, 9],
  },
  7: {
    num: 7, title: "探索者", keyword: "思辨·真理",
    gift: "天生的思考者与研究者，直觉敏锐、洞察力深，喜欢独处与深度思考，不满足于表面的答案。",
    lesson: "向信任的人敞开内心，思考之外也要体验。",
    positives: ["聪慧", "有洞见", "独立思考", "专注"], negatives: ["疏离", "多疑", "过度理性"],
    luckyColor: "黛紫", luckyStone: "紫水晶", match: [3, 5, 9],
  },
  8: {
    num: 8, title: "掌舵者", keyword: "格局·成就",
    gift: "对目标、资源与权力有天然的驾驭力，格局大、执行强，是九个灵数中最具事业能量的一个。",
    lesson: "在成就之外练习柔软，财富之上看见人。",
    positives: ["有魄力", "组织力强", "抗压", "目标清晰"], negatives: ["工作狂", "强势", "得失心重"],
    luckyColor: "玄金", luckyStone: "金发晶", match: [2, 4, 6],
  },
  9: {
    num: 9, title: "梦想家", keyword: "博爱·理想",
    gift: "富有同理心与理想主义色彩，胸怀宽广、愿意为更大的意义付出，常被艺术、公益与人文吸引。",
    lesson: "理想需要落点，学会先完成小事再谈远方。",
    positives: ["慈悲", "浪漫", "有感召力", "无私"], negatives: ["不切实际", "逃避冲突", "界限模糊"],
    luckyColor: "海蓝", luckyStone: "海蓝宝", match: [1, 6, 7],
  },
  11: {
    num: 11, title: "启迪者（卓越数）", keyword: "直觉·灵感",
    gift: "11 是卓越数：兼具 2 的敏感与 1 的开创，直觉极强，常能启发和照亮身边的人。",
    lesson: "巨大的敏感是天线也是负担，学会接地与休息。",
    positives: ["直觉超群", "有魅力", "理想主义", "启发他人"], negatives: ["神经紧绷", "自我怀疑", "起伏大"],
    luckyColor: "银白", luckyStone: "白水晶", match: [2, 6, 22],
  },
  22: {
    num: 22, title: "筑梦师（卓越数）", keyword: "宏图·落地",
    gift: "22 是卓越数：4 的务实乘以双倍能量，既能仰望星空又能砌好每一块砖，有成就大事业的潜质。",
    lesson: "别被自己的宏图吓退，从第一步开始。",
    positives: ["远见", "超强执行", "沉稳", "使命感"], negatives: ["压力山大", "求全", "大器晚成"],
    luckyColor: "赭石", luckyStone: "黑曜石", match: [4, 8, 11],
  },
  33: {
    num: 33, title: "大爱者（卓越数）", keyword: "奉献·疗愈",
    gift: "33 是卓越数：6 的关怀升维成无条件的大爱，有疗愈他人的天赋，常出现在师者、医者身上。",
    lesson: "先成为自己，再成为所有人的光。",
    positives: ["疗愈力", "包容", "智慧", "奉献"], negatives: ["过载", "圣母倾向", "忽视自我"],
    luckyColor: "暖金", luckyStone: "琥珀", match: [6, 9, 11],
  },
}

export interface LifeNumberResult {
  master: number
  isMaster: boolean
  steps: string[]
  info: LifeNumberInfo
}

/** 生命灵数计算：逐位相加至个位；11/22/33 为卓越数保留 */
export function lifeNumber(raw: string): LifeNumberResult | null {
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 0) return null
  const steps: string[] = []
  const cur = digits.split("").map(Number)
  let sum = cur.reduce((a, b) => a + b, 0)
  steps.push(`${cur.join("+")} = ${sum}`)
  while (sum >= 10 && sum !== 11 && sum !== 22 && sum !== 33) {
    const parts = String(sum).split("").map(Number)
    const next = parts.reduce((a, b) => a + b, 0)
    steps.push(`${parts.join("+")} = ${next}`)
    sum = next
  }
  const isMaster = sum === 11 || sum === 22 || sum === 33
  return { master: sum, isMaster, steps, info: LIFE_NUMBERS[sum] }
}

// ═══════════ 输入类型 ═══════════

export type InputKind = "phone" | "plate" | "birth" | "custom"

export const INPUT_KINDS: { id: InputKind; label: string; placeholder: string; hint: string }[] = [
  { id: "phone", label: "手机号", placeholder: "请输入手机号", hint: "11 位手机号，从第 2 位起两两分析" },
  { id: "plate", label: "车牌号", placeholder: "请输入车牌号（如京A12345）", hint: "自动提取车牌中的数字部分" },
  { id: "birth", label: "生日", placeholder: "请输入出生日期（如19900520）", hint: "8 位出生日期，生命灵数解读最准确" },
  { id: "custom", label: "自定义", placeholder: "请输入任意对你有意义的数字", hint: "门牌号、工号、纪念日……皆可解读" },
]

/** 校验并提取数字串 */
export function extractDigits(kind: InputKind, raw: string): { ok: boolean; digits: string; error?: string } {
  const digits = raw.replace(/\D/g, "")
  if (kind === "phone") {
    if (digits.length !== 11 || !digits.startsWith("1")) return { ok: false, digits, error: "请输入 11 位手机号" }
  } else if (kind === "birth") {
    if (digits.length !== 8) return { ok: false, digits, error: "请输入 8 位出生日期，如 19900520" }
    const m = Number(digits.slice(4, 6))
    const d = Number(digits.slice(6, 8))
    if (m < 1 || m > 12 || d < 1 || d > 31) return { ok: false, digits, error: "日期不合法，请检查月份与日期" }
  } else {
    if (digits.length < 2) return { ok: false, digits, error: "至少需要 2 位数字" }
    if (digits.length > 20) return { ok: false, digits, error: "最多支持 20 位数字" }
  }
  return { ok: true, digits }
}
