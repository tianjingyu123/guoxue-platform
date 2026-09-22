// ─── 五运六气 · 领域静态数据 ───
// 依据《黄帝内经·素问》七篇大论（天元纪、五运行、六微旨、气交变、五常政、六元正纪、至真要）
// 六气配色遵循平台"现代东方美学"：风青 / 君火朱 / 相火橙 / 湿黄 / 燥金 / 寒玄

/** 六气键（三阴三阳） */
export type QiKey = "jueyin" | "shaoyin" | "shaoyang" | "taiyin" | "yangming" | "taiyang"

export interface QiInfo {
  key: QiKey
  /** 全称，如「厥阴风木」 */
  name: string
  /** 三阴三阳，如「厥阴」 */
  yinyang: string
  /** 气性简称，如「风」「君火」 */
  qi: string
  /** 对应五行 */
  element: string
  /** 主题色（图表标识） */
  color: string
  /** 浅色底 */
  soft: string
  /** 气候特点 */
  climate: string
  /** 易发疾病（民俗健康科普向） */
  ailments: string
  /** 养生原则 */
  principle: string
  /** 宜食 */
  favorFoods: string
  /** 应季药膳（2-3 道） */
  diets: { name: string; desc: string }[]
}

/**
 * 六气基础信息。
 * 说明：君火(少阴)与相火(少阳)同属火但分君相；风木主生发、湿土主长养、燥金主收敛、寒水主闭藏。
 */
export const QI_MAP: Record<QiKey, QiInfo> = {
  jueyin: {
    key: "jueyin",
    name: "厥阴风木",
    yinyang: "厥阴",
    qi: "风",
    element: "木",
    color: "oklch(0.55 0.13 155)",
    soft: "oklch(0.95 0.04 155)",
    climate: "风气偏胜，气候多变、乍暖还寒，草木萌发，风邪当令。",
    ailments: "易见眩晕、情志不舒、筋脉拘挛、肝胆不和及过敏、感冒等风证。",
    principle: "顺应生发，疏肝理气，忌大怒，宜舒展。",
    favorFoods: "宜省酸增甘以养脾，多食时令青蔬、枸杞、菊花、山药。",
    diets: [
      { name: "枸杞菊花茶", desc: "疏风清肝、明目，适宜风气当令时节。" },
      { name: "山药小米粥", desc: "健脾养胃，柔肝而不助风。" },
    ],
  },
  shaoyin: {
    key: "shaoyin",
    name: "少阴君火",
    yinyang: "少阴",
    qi: "君火",
    element: "火",
    color: "oklch(0.55 0.2 25)",
    soft: "oklch(0.95 0.03 25)",
    climate: "君火主令，气候转暖偏热，阳气升发，万物繁茂。",
    ailments: "易见心烦、失眠、口舌生疮、心悸及温热之疾。",
    principle: "养心安神，戒躁清热，作息有常，护养阳气而不过亢。",
    favorFoods: "宜清心降火，多食莲子、百合、绿豆、苦瓜、赤小豆。",
    diets: [
      { name: "莲子百合羹", desc: "清心安神，缓解暑热心烦。" },
      { name: "绿豆赤小豆汤", desc: "清热利湿，解君火之亢。" },
    ],
  },
  shaoyang: {
    key: "shaoyang",
    name: "少阳相火",
    yinyang: "少阳",
    qi: "相火",
    element: "火",
    color: "oklch(0.6 0.2 45)",
    soft: "oklch(0.95 0.04 45)",
    climate: "相火用事，暑热炎蒸，湿热交加，为一年最炎之时。",
    ailments: "易见暑热、口渴、疮疡、腹泻及湿热蕴结诸证。",
    principle: "清暑益气，健脾祛湿，避烈日、防中暑，起居避暑就凉。",
    favorFoods: "宜清补生津，多食西瓜、冬瓜、薏米、荷叶、乌梅。",
    diets: [
      { name: "冬瓜薏米汤", desc: "清热利湿，消暑而护脾胃。" },
      { name: "乌梅荷叶饮", desc: "生津止渴、解暑敛汗。" },
    ],
  },
  taiyin: {
    key: "taiyin",
    name: "太阴湿土",
    yinyang: "太阴",
    qi: "湿",
    element: "土",
    color: "oklch(0.62 0.11 75)",
    soft: "oklch(0.94 0.05 80)",
    climate: "湿气当令，天气闷湿多雨，云雨氤氲，长夏之候。",
    ailments: "易见困重乏力、脘腹胀满、食欲不振、泄泻及湿困脾胃。",
    principle: "健脾化湿，忌肥甘生冷，居处防潮，饮食有节。",
    favorFoods: "宜燥湿健脾，多食茯苓、白扁豆、芡实、山药、陈皮。",
    diets: [
      { name: "茯苓陈皮粥", desc: "健脾祛湿、理气和中。" },
      { name: "四神汤（芡实莲子茯苓山药）", desc: "补脾止泻，化长夏之湿。" },
    ],
  },
  yangming: {
    key: "yangming",
    name: "阳明燥金",
    yinyang: "阳明",
    qi: "燥",
    element: "金",
    color: "oklch(0.7 0.06 90)",
    soft: "oklch(0.95 0.02 90)",
    climate: "燥气主令，天高气爽、干燥少雨，阳气渐收，秋令之象。",
    ailments: "易见口鼻干燥、干咳、皮肤皲裂、便秘及燥伤津液。",
    principle: "润燥养阴，收敛神气，早卧早起，宁神敛肺。",
    favorFoods: "宜滋阴润燥，多食梨、银耳、蜂蜜、百合、白萝卜。",
    diets: [
      { name: "银耳雪梨羹", desc: "润肺生津，缓解秋燥。" },
      { name: "百合蜂蜜饮", desc: "养阴润燥、宁心安神。" },
    ],
  },
  taiyang: {
    key: "taiyang",
    name: "太阳寒水",
    yinyang: "太阳",
    qi: "寒",
    element: "水",
    color: "oklch(0.45 0.11 250)",
    soft: "oklch(0.94 0.03 250)",
    climate: "寒气用事，天寒地冻、万物闭藏，阴盛阳伏，冬令之候。",
    ailments: "易见畏寒肢冷、关节冷痛、咳喘、心脑血管不适及寒凝诸证。",
    principle: "温阳护肾，闭藏养精，早卧晚起，避寒就温。",
    favorFoods: "宜温补，多食羊肉、核桃、桂圆、生姜、黑豆、栗子。",
    diets: [
      { name: "当归生姜羊肉汤", desc: "温中补虚、散寒暖身。" },
      { name: "核桃桂圆黑豆粥", desc: "补肾温阳、益精养血。" },
    ],
  },
}

/** 主气固定顺序（初之气→终之气，地气恒定） */
export const HOST_QI_ORDER: QiKey[] = ["jueyin", "shaoyin", "shaoyang", "taiyin", "yangming", "taiyang"]

/** 客气三阴三阳推移顺序（依次而转） */
export const GUEST_QI_SEQUENCE: QiKey[] = ["jueyin", "shaoyin", "taiyin", "shaoyang", "yangming", "taiyang"]

/** 六步节气边界：每步始于该节气（初之气始于大寒） */
export const STEP_BOUNDARIES = [
  { step: 1, label: "初之气", start: "大寒", end: "春分" },
  { step: 2, label: "二之气", start: "春分", end: "小满" },
  { step: 3, label: "三之气", start: "小满", end: "大暑" },
  { step: 4, label: "四之气", start: "大暑", end: "秋分" },
  { step: 5, label: "五之气", start: "秋分", end: "小雪" },
  { step: 6, label: "终之气", start: "小雪", end: "大寒" },
] as const

// ─── 五运（大运/中运） ───
export type YunElement = "wood" | "fire" | "earth" | "metal" | "water"

export interface YunInfo {
  key: YunElement
  element: string
  color: string
  soft: string
  /** 太过之名 */
  excessName: string
  /** 不及之名 */
  deficientName: string
  /** 太过特点 */
  excessTrait: string
  /** 不及特点 */
  deficientTrait: string
  /** 该运总体养生方向 */
  guidance: string
}

export const YUN_MAP: Record<YunElement, YunInfo> = {
  wood: {
    key: "wood", element: "木", color: "oklch(0.55 0.13 155)", soft: "oklch(0.95 0.04 155)",
    excessName: "发生", deficientName: "委和",
    excessTrait: "木运太过，风气流行，肝木偏亢，易犯脾土，多见眩晕、胁痛、脾胃不和。",
    deficientTrait: "木运不及，燥金乘之，生发无力，易见筋骨不利、情志抑郁、易感风寒。",
    guidance: "重在疏肝健脾，调畅情志，饮食省酸增甘。",
  },
  fire: {
    key: "fire", element: "火", color: "oklch(0.55 0.2 25)", soft: "oklch(0.95 0.03 25)",
    excessName: "赫曦", deficientName: "伏明",
    excessTrait: "火运太过，炎暑流行，心火偏亢，易见心烦、失眠、疮疡、津伤。",
    deficientTrait: "火运不及，寒水乘之，阳气不振，易见畏寒、心悸、神疲。",
    guidance: "重在养心安神，清心不伤阳，作息规律。",
  },
  earth: {
    key: "earth", element: "土", color: "oklch(0.62 0.11 75)", soft: "oklch(0.94 0.05 80)",
    excessName: "敦阜", deficientName: "卑监",
    excessTrait: "土运太过，湿气流行，脾湿壅盛，易见困重、腹胀、水湿停聚。",
    deficientTrait: "土运不及，风木乘之，脾失健运，易见食少、泄泻、消化不利。",
    guidance: "重在健脾祛湿，饮食有节，居处防潮。",
  },
  metal: {
    key: "metal", element: "金", color: "oklch(0.7 0.06 90)", soft: "oklch(0.95 0.02 90)",
    excessName: "坚成", deficientName: "从革",
    excessTrait: "金运太过，燥气流行，肺金偏亢，易见干咳、咽燥、皮肤干裂。",
    deficientTrait: "金运不及，火热乘之，肺气不宣，易见咳喘、易感、气短。",
    guidance: "重在润肺养阴，收敛神气，滋润防燥。",
  },
  water: {
    key: "water", element: "水", color: "oklch(0.45 0.11 250)", soft: "oklch(0.94 0.03 250)",
    excessName: "流衍", deficientName: "涸流",
    excessTrait: "水运太过，寒气流行，肾水偏盛，易见畏寒、水肿、关节冷痛。",
    deficientTrait: "水运不及，湿土乘之，肾气不足，易见腰膝酸软、水湿内停。",
    guidance: "重在温阳护肾，闭藏养精，避寒就温。",
  },
}

/** 年干 → 中运五行（天干化五运：甲己土 乙庚金 丙辛水 丁壬木 戊癸火） */
export const GAN_YUN: Record<string, YunElement> = {
  甲: "earth", 己: "earth",
  乙: "metal", 庚: "metal",
  丙: "water", 辛: "water",
  丁: "wood", 壬: "wood",
  戊: "fire", 癸: "fire",
}

/** 年支 → 司天之气（地支化六气） */
export const ZHI_SITIAN: Record<string, QiKey> = {
  子: "shaoyin", 午: "shaoyin",      // 少阴君火
  丑: "taiyin", 未: "taiyin",        // 太阴湿土
  寅: "shaoyang", 申: "shaoyang",    // 少阳相火
  卯: "yangming", 酉: "yangming",    // 阳明燥金
  辰: "taiyang", 戌: "taiyang",      // 太阳寒水
  巳: "jueyin", 亥: "jueyin",        // 厥阴风木
}

/** 司天 → 在泉（对化：子午对卯酉之属，即三之气对终之气） */
export const SITIAN_ZAIQUAN: Record<QiKey, QiKey> = {
  shaoyin: "yangming",   // 少阴君火 ↔ 阳明燥金
  yangming: "shaoyin",
  taiyin: "taiyang",     // 太阴湿土 ↔ 太阳寒水
  taiyang: "taiyin",
  jueyin: "shaoyang",    // 厥阴风木 ↔ 少阳相火
  shaoyang: "jueyin",
}

/** 客运五步顺序：以中运为初运，依五行相生轮转（木→火→土→金→水） */
export const YUN_SHENG: Record<YunElement, YunElement> = {
  wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood",
}

export const COMPLIANCE_TEXT =
  "本工具基于《黄帝内经》五运六气学说推演，仅供中国传统文化研习与健康科普参考，不构成任何医疗诊断或治疗建议。如有身体不适，请及时就医，切勿自行用药。"
