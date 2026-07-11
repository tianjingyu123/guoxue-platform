/**
 * 玄空飞星核心算法与数据
 * 已按竞品案例验证：八运癸山丁向下卦（山星4入中顺飞/向星3入中逆飞）
 */
import { findTerm } from "@/lib/paipan/jieqi"

// ─── 二十四山（自北顺时针）───
export const MOUNTAINS = [
  "壬", "子", "癸", "丑", "艮", "寅", "甲", "卯", "乙", "辰", "巽", "巳",
  "丙", "午", "丁", "未", "坤", "申", "庚", "酉", "辛", "戌", "乾", "亥",
] as const

/** 每山所属卦宫（洛书数） */
export const MOUNTAIN_PALACE: number[] = [
  1, 1, 1, 8, 8, 8, 3, 3, 3, 4, 4, 4,
  9, 9, 9, 2, 2, 2, 7, 7, 7, 6, 6, 6,
]

/** 每山阴阳（true=阳→顺飞） */
export const MOUNTAIN_YANG: boolean[] = [
  true, false, false, false, true, true, true, false, false, false, true, true,
  true, false, false, false, true, true, true, false, false, false, true, true,
]

/** 每山元龙：0=地元 1=天元 2=人元 */
export const MOUNTAIN_YUAN: number[] = [
  0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2,
  0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2,
]

/** 卦宫（洛书数）→ 三山 [地元, 天元, 人元] 的山索引 */
export const PALACE_MOUNTAINS: Record<number, [number, number, number]> = {
  1: [0, 1, 2],    // 坎 壬子癸
  8: [3, 4, 5],    // 艮 丑艮寅
  3: [6, 7, 8],    // 震 甲卯乙
  4: [9, 10, 11],  // 巽 辰巽巳
  9: [12, 13, 14], // 离 丙午丁
  2: [15, 16, 17], // 坤 未坤申
  7: [18, 19, 20], // 兑 庚酉辛
  6: [21, 22, 23], // 乾 戌乾亥
}

/** 替卦口诀：子癸并甲申贪狼一路行；壬卯乙未坤五位为巨门；乾亥辰巽巳连戌武曲名；酉辛丑艮丙天星说破军；寅午庚丁上右弼四星临 */
const TI_TABLE: Record<string, number> = {
  子: 1, 癸: 1, 甲: 1, 申: 1,
  壬: 2, 卯: 2, 乙: 2, 未: 2, 坤: 2,
  戌: 6, 乾: 6, 亥: 6, 辰: 6, 巽: 6, 巳: 6,
  酉: 7, 辛: 7, 丑: 7, 艮: 7, 丙: 7,
  寅: 9, 午: 9, 庚: 9, 丁: 9,
}

/** 洛书宫位飞泊偏移：palace → offset */
function palaceOffset(palace: number): number {
  return (palace - 5 + 9) % 9
}

/** 星入中飞泊：返回 palace(1-9) → 星值 */
export function flyStar(center: number, forward: boolean): Record<number, number> {
  const out: Record<number, number> = {}
  for (let p = 1; p <= 9; p++) {
    const off = palaceOffset(p)
    const v = forward
      ? ((center - 1 + off) % 9) + 1
      : ((((center - 1 - off) % 9) + 9) % 9) + 1
    out[p] = v
  }
  return out
}

export interface XuankongChart {
  period: number
  sitting: string
  facing: string
  sittingPalace: number
  facingPalace: number
  yunPan: Record<number, number>
  shanPan: Record<number, number>
  xiangPan: Record<number, number>
  shanCenter: number
  shanForward: boolean
  xiangCenter: number
  xiangForward: boolean
  geju: string
  gejuGood: boolean
}

/** 排下卦/替卦盘。sittingIdx: 坐山在 MOUNTAINS 中的索引 */
export function computeChart(period: number, sittingIdx: number, useTi: boolean): XuankongChart {
  const facingIdx = (sittingIdx + 12) % 24
  const sittingPalace = MOUNTAIN_PALACE[sittingIdx]
  const facingPalace = MOUNTAIN_PALACE[facingIdx]
  const yuan = MOUNTAIN_YUAN[sittingIdx]
  const yunPan = flyStar(period, true)

  const resolve = (palace: number, refMountainIdx: number): { center: number; forward: boolean } => {
    const star = yunPan[palace]
    if (star === 5) {
      // 五入中：以本山阴阳定顺逆，下卦星取5；替卦以本山替星
      const c = useTi ? (TI_TABLE[MOUNTAINS[refMountainIdx]] ?? 5) : 5
      return { center: c, forward: MOUNTAIN_YANG[refMountainIdx] }
    }
    const mIdx = PALACE_MOUNTAINS[star][yuan]
    const center = useTi ? (TI_TABLE[MOUNTAINS[mIdx]] ?? star) : star
    return { center, forward: MOUNTAIN_YANG[mIdx] }
  }

  const s = resolve(sittingPalace, sittingIdx)
  const x = resolve(facingPalace, facingIdx)
  const shanPan = flyStar(s.center, s.forward)
  const xiangPan = flyStar(x.center, x.forward)

  // 格局判定
  let geju = "平常格局"
  let gejuGood = false
  const shanAtSit = shanPan[sittingPalace] === period
  const shanAtFace = shanPan[facingPalace] === period
  const xiangAtFace = xiangPan[facingPalace] === period
  const xiangAtSit = xiangPan[sittingPalace] === period
  if (shanAtSit && xiangAtFace) { geju = "旺山旺向"; gejuGood = true }
  else if (shanAtFace && xiangAtFace) { geju = "双星会向"; gejuGood = true }
  else if (shanAtSit && xiangAtSit) { geju = "双星会坐"; gejuGood = false }
  else if (shanAtFace && xiangAtSit) { geju = "上山下水"; gejuGood = false }

  return {
    period,
    sitting: MOUNTAINS[sittingIdx],
    facing: MOUNTAINS[facingIdx],
    sittingPalace,
    facingPalace,
    yunPan,
    shanPan,
    xiangPan,
    shanCenter: s.center,
    shanForward: s.forward,
    xiangCenter: x.center,
    xiangForward: x.forward,
    geju,
    gejuGood,
  }
}

// ─── 年月日时紫白飞星 ───
const dayIndex = (y: number, m: number, d: number) => Math.floor(Date.UTC(y, m - 1, d) / 86400000)
const norm9 = (n: number) => ((n - 1) % 9 + 9) % 9 + 1

/** 年紫白（以立春为界） */
export function yearStar(y: number, m: number, d: number): number {
  const lichun = findTerm(y, "立春")
  const Y = new Date(y, m - 1, d, 12).getTime() < lichun.getTime() ? y - 1 : y
  return norm9(11 - (Y % 9))
}

/** 月紫白（以节为界，寅月为正月） */
export function monthStar(y: number, m: number, d: number): number {
  const lichun = findTerm(y, "立春")
  const Y = new Date(y, m - 1, d, 12).getTime() < lichun.getTime() ? y - 1 : y
  const yZhi = (Y - 4) % 12
  // 正月起星：子午卯酉8 辰戌丑未5 寅申巳亥2
  const anchor = yZhi % 3 === 0 ? 8 : yZhi % 3 === 1 ? 5 : 2
  // 节气月序（寅=1）：按十二节判定
  const JIE = ["立春", "惊蛰", "清明", "立夏", "芒种", "小暑", "立秋", "白露", "寒露", "立冬", "大雪", "小寒"]
  const t = new Date(y, m - 1, d, 12).getTime()
  let mi = 0
  for (let i = 0; i < 12; i++) {
    // 小寒属岁末丑月：1月的日期对照当年小寒，其余月份对照次年小寒
    const termYear = i === 11 ? (m === 1 ? y : y + 1) : y
    const term = findTerm(termYear, JIE[i])
    if (t >= term.getTime()) mi = i + 1
  }
  if (mi === 0) mi = 12 // 小寒前属丑月
  return norm9(anchor - (mi - 1))
}

/** 日紫白：冬至前最近甲子起一白顺行；夏至前最近甲子起九紫逆行 */
export function dayStar(y: number, m: number, d: number): number {
  const di = dayIndex(y, m, d)
  const t = new Date(y, m - 1, d, 12).getTime()
  const summer = findTerm(y, "夏至")
  const winterPrev = findTerm(y - 1, "冬至")
  const winterThis = findTerm(y, "冬至")
  let anchor: Date
  let yang: boolean
  if (t >= winterThis.getTime()) { anchor = winterThis; yang = true }
  else if (t >= summer.getTime()) { anchor = summer; yang = false }
  else { anchor = winterPrev; yang = true }
  const anchorDi = Math.floor(Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate()) / 86400000)
  // 节气日前最近的甲子日：(di+17)%60===0 为甲子
  const rem = ((anchorDi + 17) % 60 + 60) % 60
  const jiaziDi = anchorDi - rem
  const days = di - jiaziDi
  return yang ? norm9(1 + days) : norm9(9 - days)
}

/** 时紫白所属遁：冬至后~夏至前为阳遁（时盘顺飞），否则阴遁（时盘逆飞） */
export function hourYang(y: number, m: number, d: number): boolean {
  const t = new Date(y, m - 1, d, 12).getTime()
  const summer = findTerm(y, "夏至")
  const winterThis = findTerm(y, "冬至")
  return t >= winterThis.getTime() || t < summer.getTime()
}

/** 时紫白：阳遁 仲日起1/季日起4/孟日起7 顺；阴遁 仲日起9/季日起6/孟日起3 逆 */
export function hourStar(y: number, m: number, d: number, hour: number): number {
  const di = dayIndex(y, m, d)
  const dZhi = ((di + 17) % 12 + 12) % 12
  const t = new Date(y, m - 1, d, 12).getTime()
  const summer = findTerm(y, "夏至")
  const winterThis = findTerm(y, "冬至")
  const yang = t >= winterThis.getTime() || t < summer.getTime()
  const group = dZhi % 3 // 0=仲(子午卯酉)? 子=0午=6卯=3酉=9 → %3===0 仲；辰戌丑未 %3===1 季；寅申巳亥 %3===2 孟
  const anchor = yang
    ? group === 0 ? 1 : group === 1 ? 4 : 7
    : group === 0 ? 9 : group === 1 ? 6 : 3
  const hZhi = Math.floor(((hour + 1) % 24) / 2)
  return yang ? norm9(anchor + hZhi) : norm9(anchor - hZhi)
}

// ─── 九星详解 ───
export const STAR_INFO: Record<number, { name: string; wx: string; ren: string; shi: string; body: string; ill: string; item: string }> = {
  1: { name: "一白贪狼星", wx: "水", ren: "中男、江湖之人、舟中之人、盗贼、匪。", shi: "险陷卑下、外云以柔、内序以利、飘泊不成，随波逐流。", body: "耳、血、肾。", ill: "耳痛、心疾、感染、胃冷、水泻、涸冷之病、血病。", item: "门窗、台灯、矮、珍珠、蓝宝石、冰箱、鱼缸、水车。" },
  2: { name: "二黑巨门星", wx: "土", ren: "老母、寡妇、农人、大腹之人、僧尼。", shi: "吝啬、迟疑、柔顺、迟钝、众多。", body: "腹、脾、胃、肌肉。", ill: "腹疾、脾胃之病、消化不良、浮肿、慢性病。", item: "方物、田土、布帛、��器、大车、釜。" },
  3: { name: "三碧禄存星", wx: "木", ren: "长男、盗贼、鼓噪之人、粗暴之人。", shi: "躁动、决断、震惊、虚惊、鼓动。", body: "足、肝、声音、筋。", ill: "足疾、肝病、惊恐、抽搐、声音嘶哑。", item: "竹木、乐器、闹钟、音响、电器。" },
  4: { name: "四绿文曲星", wx: "木", ren: "长女、文人、秀士、寡发之人、僧道。", shi: "进退不果、随风而顺、文书之事、传播。", body: "股、气、风疾。", ill: "股疾、风疾、感冒、中风、坐骨神经。", item: "绳索、扇、帆、长物、木香、花草。" },
  5: { name: "五黄廉贞星", wx: "土", ren: "帝王、至尊，失运为瘟神、恶人。", shi: "居中不动、掌控、灾病、是非、意外。", body: "脾胃、全身。", ill: "瘟疫、毒疮、癌症、急病、意外之灾。", item: "中央之物、旧物、废弃物。" },
  6: { name: "六白武曲星", wx: "金", ren: "老父、官贵、军警、司机、首领。", shi: "刚健、决断、权威、动而不息、官讼。", body: "首、肺、骨、大肠。", ill: "头疾、肺病、骨病、筋骨疼痛、旧疾复发。", item: "金玉、圆物、镜、钟、刀剑、机器、车。" },
  7: { name: "七赤破军星", wx: "金", ren: "少女、伶人、巫师、说客、军人。", shi: "口舌、毁折、喜悦、饮食、争斗。", body: "口、舌、肺、喉。", ill: "口舌之疾、喉症、气喘、肺疾、刀伤。", item: "刀剑、金器、乐器、缺损之物、酒器。" },
  8: { name: "八白左辅星", wx: "土", ren: "少男、山中之人、僧道、儿童。", shi: "静止、笃实、进取、储蓄、转变。", body: "手、指、背、鼻、脾胃。", ill: "手指之疾、脾胃病、背疾、鼻炎、结石。", item: "山石、田宅、门阙、果物、犬。" },
  9: { name: "九紫右弼星", wx: "火", ren: "中女、文人、目疾之人、甲胄之士。", shi: "文明、喜庆、升迁、虚心、明察。", body: "目、心、三焦。", ill: "目疾、心脏病、血症、火伤、炎症。", item: "灯烛、炉灶、文书、印章、干燥之物。" },
}

// ─── 山向星组合断语（山星+向星）───
export const COMBO_TEXT: Record<string, string> = {
  "1+1": "桃花、出门远行、漂泊。当令名扬科甲，失运漂泊淫乱。",
  "1+2": "腹水、耳病、流产、妇科病。土克水，中男受制。",
  "1+3": "长子得贵、出门发达。失运官非、盗劫。",
  "1+4": "一四同宫，准发科名之显。文昌得位，利读书考试。",
  "1+5": "子宫病、中毒、性病。失运阴处生疡。",
  "1+6": "文上有喜、武贵。金水相生，利文职升迁。",
  "1+7": "桃花、出门、酒色。金水多情，贪花恋酒。",
  "1+8": "土克水，兄弟不和、耳肾之疾、小口损伤。",
  "1+9": "水火既济，喜庆。失运水火相激，目疾心病。",
  "2+1": "腹疾、水肿、妇夺夫权。母子不和。",
  "2+2": "二黑叠临，病符重重。田产之富但多疾病。",
  "2+3": "斗牛煞，是非官讼、母子相争、口舌不断。",
  "2+4": "婆媳不和、风疾、股病。木克土，老母受欺。",
  "2+5": "二五交加必损主，重病、死亡、孤寡。大凶。",
  "2+6": "土金相生，进田产。失运僧道之财、吝啬。",
  "2+7": "先天火数，进财。失运火灾、横祸、口舌。",
  "2+8": "二八合十，田产大旺。利地产、农牧之业。",
  "2+9": "火土相生，田产喜庆。失运愚钝、目疾。",
  "3+1": "贵人得禄、长子发达。失运贼劫、官非。",
  "3+2": "斗牛煞，官讼是非、脾胃之疾。妻犯夫刚。",
  "3+3": "蚩尤叠临，盗贼官非、手足之伤。",
  "3+4": "同性木比，昧事无常。失运出盗贼乞丐。",
  "3+5": "穷困、传染病、肝病。木克土又逢五黄。",
  "3+6": "金克木，长子受伤、手足之疾、刀伤车祸。",
  "3+7": "穿心煞，被劫盗、官非、手足伤残。",
  "3+8": "损小口、小儿关煞。失运手足之伤。",
  "3+9": "木火通明，聪明文士。失运刻薄、目疾。",
  "4+1": "一四同宫，科名文贵。当令发科甲、出才子。",
  "4+2": "风行地上，寡妇当家、婆媳不和、股疾。",
  "4+3": "木木成林，昧事无常。失运出荡子淫妇。",
  "4+4": "文曲叠临，出文人雅士。失运漂泊、桃花。",
  "4+5": "乳病、疯疾、传染病。失运田园废尽。",
  "4+6": "金克木，长女受制、股疾、僧道之人。",
  "4+7": "金克木，桃花劫、姑嫂不和、刀伤。",
  "4+8": "木克土，小口不利、风疾、山林之财。",
  "4+9": "木火通明，聪明荣显。合先天金数，文章大利。",
  "5+1": "中毒、肾病、耳疾。五黄克入，阴病缠身。",
  "5+2": "二五交加，疾病死亡、孤寡贫穷。大凶。",
  "5+3": "肝病、穷困、传染。五黄遇木克，祸不单行。",
  "5+4": "疯疾、乳病、家道中落。",
  "5+5": "五黄叠临，灾祸连连、重病横祸。大凶之象。",
  "5+6": "旧疾复发、头疾、官灾。土金泄气稍缓。",
  "5+7": "口舌、喉疾、中毒、桃色纠纷。",
  "5+8": "五八同宫，当令进财。失运筋骨之疾、小口损。",
  "5+9": "火炎土燥，目疾、血症、愚顽。毒疮痼疾。",
  "6+1": "当令文上有喜、有权、官显。失运主桃花、淫乱、小产。",
  "6+2": "土金相生，武贵进田。失运鬼神作祟、僧道。",
  "6+3": "金克木，刀兵之伤、车祸、长子不利。",
  "6+4": "金克木，长女股疾、翁媳不睦。",
  "6+5": "头疾、骨病、官灾横祸。五黄助虐。",
  "6+6": "乾金叠临，武贵权威。失运官讼、孤傲。",
  "6+7": "交剑煞，争斗劫盗、官非口舌。",
  "6+8": "土金相生，武贵文财两全。当令大发田财。",
  "6+9": "火克金，长房血症、头疾。火烧天门，逆子骂父。",
  "7+1": "金水相生，桃花、出门得利。失运酒色破家。",
  "7+2": "先天火数，横财。失运火灾、口舌、宅母多病。",
  "7+3": "穿心煞，肝胆之疾、被劫、官非。",
  "7+4": "金克木，姑嫂勃谿、桃花劫。",
  "7+5": "口舌是非、中毒、喉疾、桃色。",
  "7+6": "交剑煞，劫盗争斗、交战之象。",
  "7+7": "七赤叠临，当令横财大发。失运盗贼火灾。",
  "7+8": "土金相生，少男少女，喜庆婚娶。进财。",
  "7+9": "火克金，回禄之灾、性病、口舌。防火灾。",
  "8+1": "土克水，耳肾之疾、兄弟不睦。当令文才。",
  "8+2": "二八合十，田产大旺。失运小口损伤、脾胃病。",
  "8+3": "��克土，损小口、山林破财。",
  "8+4": "木克土，小儿之伤、风湿、山产之利。",
  "8+5": "筋骨之疾、损小口。当令旺田宅。",
  "8+6": "土金相生，文武全才、田财两旺。",
  "8+7": "少男少女相配，婚喜临门。当令进财。",
  "8+8": "八白叠临，当令大发田财、忠孝之家。",
  "8+9": "火土相生，喜庆连连、婚娶添丁。当令大吉。",
  "9+1": "水火既济，喜庆科名。失运目疾心病、水火之灾。",
  "9+2": "火土相生，田产之富。失运出愚钝、产厄。",
  "9+3": "木火通明，文明之象。失运官非、目疾。",
  "9+4": "木火通明，才子佳人。合先天金数大利文章。",
  "9+5": "火炎土燥，毒疮、目疾、血症。",
  "9+6": "火烧天门，逆子、头疾、长房血症。",
  "9+7": "火克金，回禄之灾、口舌、防火。",
  "9+8": "火土相生，喜事重重、添丁进财。当令大吉。",
  "9+9": "九紫叠临，当令喜庆盈门。失运火灾、目疾。",
}

// ─── 排龙诀（十二双山配龙，自水口双山起顺布）───
export const SHUANG_SHAN: string[][] = [
  ["壬", "子"], ["癸", "丑"], ["艮", "寅"], ["甲", "卯"], ["乙", "辰"], ["巽", "巳"],
  ["丙", "午"], ["丁", "未"], ["坤", "申"], ["庚", "酉"], ["辛", "戌"], ["乾", "亥"],
]
export const DRAGONS = ["破军", "右弼", "武曲", "破军", "廉贞", "破军", "文曲", "破军", "禄存", "破军", "贪狼", "左辅"]

export function getDragons(shuikouIdx: number): string[] {
  // 水口所在双山索引
  const ss = SHUANG_SHAN.findIndex((pair) => pair.includes(MOUNTAINS[shuikouIdx]))
  const out: string[] = new Array(12)
  for (let i = 0; i < 12; i++) out[(ss + i) % 12] = DRAGONS[i]
  return out
}

/** 洛书数 → 汉字 */
export const CN_NUM = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"]

/** 当前日期所属大运（三元九运，2004-2023八运，2024-2043九运） */
export function currentPeriod(year: number): number {
  const base = 1864 // 一运起始（甲子）
  const idx = Math.floor((((year - base) % 180) + 180) % 180 / 20)
  return idx + 1
}
