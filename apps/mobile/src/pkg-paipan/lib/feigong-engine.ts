/**
 * 飞宫小奇门排盘引擎
 *
 * 黄金基准（竞品实测课例，2026-07-04 05:12 时辰起局）：
 *   四柱 丙午/甲午/己卯/丁卯；空亡 寅卯/辰巳/申酉/戌亥；
 *   青龙落卯（震3）；建起寅（勾陈支）；
 *   飞干 甲3 乙4 丙5(辛五合同宫) 丁6 戊7 己8 庚9 壬1 癸2；
 *   八门自青龙次宫（巽4）起休，方位顺时针：休4 生9 伤2 杜7 景6 死1 惊8 开3。
 *
 * 口诀（已与黄金基准逐项互证）：
 *   一、时上起青龙：青龙落时支，顺布十二黄黑道神（青龙明堂天刑朱雀金匮天德白虎玉堂天牢玄武司命勾陈）
 *   二、建除从勾陈支起建（= 青龙支前一支），顺布建除满平定执破危成收开闭
 *   三、甲乘龙飞九宫：青龙支所在宫起甲，沿宫序顺飞十干；落中宫之干的五合干抽出同居中宫（丙辛合），余干顺延
 *   四、龙头开八门：青龙宫的顺时针次宫起休门，沿方位顺时针环布休生伤杜景死惊开
 */

import { Solar } from "./lunar/index.js"
import { jieqiRangeAt, type JieqiMoment } from "./jieqi-engine"
import {
  GANS,
  ZHIS,
  type Zhi,
  dayGanzhi,
  yearGanzhi,
  monthGanzhi,
  hourGanzhi,
  kongWangOf,
} from "@/lib/paipan/ganzhi"

/* ============ 常量 ============ */

/** 黄黑道十二神（青龙起，顺行） */
const HUANGDAO_12 = ["青龙", "明堂", "天刑", "朱雀", "金匮", "天德", "白虎", "玉堂", "天牢", "玄武", "司命", "勾陈"]
/** 黄道吉神 */
const HUANGDAO_JI = new Set(["青龙", "明堂", "金匮", "天德", "玉堂", "司命"])

/** 建除十二神（建起，顺行） */
const JIANCHU_12 = ["建", "除", "满", "平", "定", "执", "破", "危", "成", "收", "开", "闭"]
/** 八门（休起，顺布） */
const MEN_8 = ["休门", "生门", "伤门", "杜门", "景门", "死门", "惊门", "开门"]
const MEN_JI = new Set(["休门", "生门", "开门"])

/** 方位顺时针宫环（坎起）：坎1→艮8→震3→巽4→离9→坤2→兑7→乾6 */
const CLOCK_RING = [1, 8, 3, 4, 9, 2, 7, 6]

/** 宫 → 宫内地支（固定） */
export const PALACE_ZHI: Record<number, Zhi[]> = {
  1: ["子"], 8: ["丑", "寅"], 3: ["卯"], 4: ["辰", "巳"],
  9: ["午"], 2: ["未", "申"], 7: ["酉"], 6: ["戌", "亥"],
}

/** 支 → 宫 */
const ZHI_PALACE: Record<string, number> = {
  子: 1, 丑: 8, 寅: 8, 卯: 3, 辰: 4, 巳: 4, 午: 9, 未: 2, 申: 2, 酉: 7, 戌: 6, 亥: 6,
}

/** 飞宫序（洛书连续：p → p+1，9 → 1，含中宫5） */
const FLY_SEQ = [1, 2, 3, 4, 5, 6, 7, 8, 9]

/** 天干五合 */
const WUHE: Record<string, string> = {
  甲: "己", 己: "甲", 乙: "庚", 庚: "乙", 丙: "辛", 辛: "丙", 丁: "壬", 壬: "丁", 戊: "癸", 癸: "戊",
}

const GAN_WX: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
}
const PALACE_WX: Record<number, string> = { 1: "水", 8: "土", 3: "木", 4: "木", 9: "火", 2: "土", 7: "金", 6: "金", 5: "土" }
export const PALACE_NAME: Record<number, string> = { 1: "坎1宫", 8: "艮8宫", 3: "震3宫", 4: "巽4宫", 9: "离9宫", 2: "坤2宫", 7: "兑7宫", 6: "乾6宫", 5: "中5宫" }
const PALACE_FANGWEI: Record<number, string> = { 1: "正北", 8: "东北", 3: "正东", 4: "东南", 9: "正南", 2: "西南", 7: "正西", 6: "西北", 5: "中央" }
/** 先天卦（在后天宫位上） */
const XIANTIAN_GUA: Record<number, string> = { 1: "坤", 8: "震", 3: "离", 4: "兑", 9: "乾", 2: "巽", 7: "坎", 6: "艮" }
/** 后天宫 → 本宫卦 */
const HOUTIAN_GUA: Record<number, string> = { 1: "坎", 8: "艮", 3: "震", 4: "巽", 9: "离", 2: "坤", 7: "兑", 6: "乾" }
/** 先天卦数 */
const XIANTIAN_NUM: Record<string, number> = { 乾: 1, 兑: 2, 离: 3, 震: 4, 巽: 5, 坎: 6, 艮: 7, 坤: 8 }
/** 河图五行数 */
const HETU_NUM: Record<string, [number, number]> = { 水: [1, 6], 火: [2, 7], 木: [3, 8], 金: [4, 9], 土: [5, 10] }

/* ============ 象意文本 ============ */

export const GAN_XIANGYI: Record<string, string> = {
  甲: "甲为阳木，参天栋梁之木，为首为始为大。主人正直挺拔、有担当，象征领导、开创、名声、高大之物、头部、房梁、大树。",
  乙: "乙为阴木，花草藤蔓之木，性柔而韧。主人温和灵巧、能屈能伸，象征文书、绳索、曲折、花草、手臂、中医、弯路实现。",
  丙: "丙为阳火，太阳之火，光明磊落。主人热情豪爽、性急易怒，象征光明、名气、权威、乱子、血光、眼目、炉灶、闹市。",
  丁: "丁为阴火，灯烛之火，性质柔弱，有照亮万户之功。主人秀丽清高、和顺而有心计。象征玉女、希望、文书印信、火烛、眼睛、血管、针灸、马上达成——丁的希望最好。",
  戊: "戊为阳土，城墙堤坝之土，厚重守信。主人稳重固执，象征钱财、房产、堵塞、山丘、皮肉、仓库、担保、阻隔。",
  己: "己为阴土，田园之土，包容滋养。主人随和多思、心思细密，象征坟墓、私欲、田地、肚腹、暗昧不明之事、低洼之地。",
  庚: "庚为阳金，刀剑斧钺之金，刚硬肃杀。主人果断刚烈，象征阻隔、官讼、道路、白虎、骨骼、金属器械、军警、变革。",
  辛: "辛为阴金，首饰珠玉之金，贵重而锋利。主人爱面子、追求完美，象征错误、革新、珠宝、牙齿、锋刃、医药、罪罚。",
  壬: "壬为阳水，江河奔流之水，智而好动。主人聪明多变、漂泊不定，象征流动、走失、孕育、江湖、盗贼、腿脚、运输。",
  癸: "癸为阴水，雨露之水，滋润万物。主人内敛细腻、善谋深藏，象征隐藏、暧昧、泪水、网络、玄学、井泉、密事。",
}

export const MEN_XIANGYI: Record<string, string> = {
  休门: "休门居坎1水宫，休养生息之门。吉门。宜休整、谈判、求财、见贵人、婚姻嫁娶；利公务人员与上班族。求职谒贵最宜。",
  生门: "生门居艮8土宫，生生不息之门。大吉之门。宜求财、开业、建造、种植、养殖、治病求医；生门所在方位为生气方，做生意首选。",
  伤门: "伤门居震3木宫，伤害之门。凶门。主伤灾、竞争、讨债、捕猎；宜钓鱼打猎、索债博弈、竞技比赛，余事不宜。",
  杜门: "杜门居巽4木宫，闭塞之门。小凶。主堵塞、保密、躲藏；宜躲灾避难、保守秘密、堵漏防泄，不宜开拓进取。",
  景门: "景门居离9火宫，光明景象之门。算作凶门而倾于平。景门发扬振作而不久长，宜游戏竞赛、上书献策、考试面试；多主文书之事，渔猎无所得。",
  死门: "死门居坤2土宫，死寂之门。大凶。主终结、吊丧、田土纠纷；宜吊丧送葬、行刑狩猎、了结旧事，百事不宜妄动。",
  惊门: "惊门居兑7金宫，惊恐之门。凶门。主惊慌、口舌、官讼；宜捉贼捕盗、诉讼博弈、以奇制胜，余事主虚惊不宁。",
  开门: "开门居乾6金宫，开拓通达之门。吉门。宜开业开工、求职上任、出行谒贵、见官办事；开门所在方大利公门进取。",
}

export const HUANGDAO_XIANGYI: Record<string, string> = {
  青龙: "黄道首吉之神，主喜庆财禄、贵人提携。所临之方百事皆宜。",
  明堂: "黄道吉神，主贵人明察、文书通达。宜上书面圣、拜见领导。",
  天刑: "黑道凶神，主刑罚伤灾。忌词讼动土，宜施针灸。",
  朱雀: "黑道凶神，主口舌是非、文书火速。忌签约争执，宜发文书传信息。",
  金匮: "黄道吉神，主财帛库藏。宜求财纳财、嫁娶开市。",
  天德: "黄道吉神，主福德庇佑。宜祈福修造、施恩布德。",
  白虎: "黑道凶神，主血光道路之事。忌出行动刀兵，宜狩猎祭祀。",
  玉堂: "黄道吉神，宫殿所在，神仙之居。主安泰清贵，宜入宅安床、读书进学。",
  天牢: "黑道凶神，天牢六星在北斗魁下。贵人牢，占与贯索同。主拘系困顿，忌兴讼冒进。",
  玄武: "黑道凶神，主盗贼暗昧、阴私失脱。忌交易托付，防小人窃取。",
  司命: "黄道吉神，主寿命督察。白天用事吉，宜祭祀祈福、修灶。",
  勾陈: "黑道凶神，主勾连纠缠、田土争讼。忌动土纠纷，事多拖延。",
}

export const JIANCHU_XIANGYI: Record<string, string> = {
  建: "旺相之日，宜出行赴任、上书求谒；不宜动土开仓。",
  除: "除旧布新，宜扫除疗病、驱邪祛旧；吉。",
  满: "丰收圆满，宜祈福纳采、开市交易；不宜服药求医。",
  平: "平常之日，宜修路平地、行车走马；诸事平平。",
  定: "安定之日，宜订盟纳采、宴会安床；不宜出行涉讼。",
  执: "固执操持，宜捕捉结网、立契签约；不宜搬迁远行。",
  破: "破败之日，忌诸吉事；唯宜破屋拆卸、治病破执。",
  危: "危险之日，诸事小心；宜安床置产，忌登高冒险。",
  成: "为白虎，凶则死丧不断，吉则诸事成就。宜开业结亲、入学上任。",
  收: "名贵人，福德，有人助，福禄。宜收纳财货、买田置产；不宜开市放债。",
  开: "开通顺遂，宜开业动工、婚嫁入学；百事可为。",
  闭: "闭塞之日，宜填坑筑堤、收敛存储；不宜开市出行。",
}

/* ============ 类型 ============ */

export interface FeigongPalace {
  palace: number
  name: string
  fangwei: string
  zhis: Zhi[]
  /** 黄黑道神（按宫内支序） */
  huangdao: string[]
  /** 建除神（按宫内支序） */
  jianchu: string[]
  men: string
  gan: string
  /** 中宫五合寄干 */
  gan2?: string
  isLong: boolean
  kongWang: boolean
  /** 干+宫 格局 */
  geju: { name: string; text: string; ji: "吉" | "平" | "凶" }
  /** 宫位取数 */
  quShu: number[]
  xiantianGua: string
}

export interface FeigongResult {
  method: "hour" | "number" | "random"
  methodLabel: string
  reportNumber?: number
  dateLabel: string
  lunarLabel: string
  jieqiLabel: string
  pillars: { year: string; month: string; day: string; time: string }
  kongWang: { year: string; month: string; day: string; time: string }
  qinglongZhi: Zhi
  qinglongPalace: number
  palaces: Record<number, FeigongPalace>
  /** 中宫展示（囚干） */
  center: { gans: string[]; text: string }
  verdicts: { title: string; text: string }[]
  aiSummary: string
}

/* ============ 干+宫 格局 ============ */

function ganGongGeju(gan: string, palace: number): { name: string; text: string; ji: "吉" | "平" | "凶" } {
  const gwx = GAN_WX[gan]
  const pwx = PALACE_WX[palace]
  const sheng: Record<string, string> = { 水: "木", 木: "火", 火: "土", 土: "金", 金: "水" }
  if (gwx === pwx) return { name: "比和格", text: "干宫比和，气势相扶，谋事得地利，宜守中求进，稳步可成。", ji: "吉" }
  if (sheng[pwx] === gwx) return { name: "得生格", text: "宫来生干，得地气滋养，如鱼得水。逢之贵人暗助，事半功倍。", ji: "吉" }
  if (sheng[gwx] === pwx) return { name: "脱泄格", text: "干去生宫，气机外泄，付出多而回报缓。宜聚气蓄力，勿轻掷资源。", ji: "平" }
  if ((gwx === "水" && pwx === "火") || (gwx === "火" && pwx === "金") || (gwx === "金" && pwx === "木") || (gwx === "木" && pwx === "土") || (gwx === "土" && pwx === "水"))
    return { name: "斗力格", text: "斗力格，我制于他我失利。口舌兴词概因此，逢之迅速退步停。事难宁。", ji: "凶" }
  return { name: "受制格", text: "宫来克干，身陷受制之地，行事多阻。宜避其锋芒，静待时机再动。", ji: "凶" }
}

/* ============ 主函数 ============ */

export function paiFeigong(input: {
  date: Date
  method: "hour" | "number" | "random"
  reportNumber?: number
}): FeigongResult {
  const { date, method } = input
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const hh = date.getHours()
  const mi = date.getMinutes()

  // ── 四柱 ──
  const yp = yearGanzhi(y, m, d, hh, mi)
  const mp = monthGanzhi(y, m, d, hh, mi)
  const dp = dayGanzhi(y, m, d, hh)
  const tp = hourGanzhi(dp.gan, hh)
  const pillars = {
    year: `${yp.gan}${yp.zhi}`,
    month: `${mp.gan}${mp.zhi}`,
    day: `${dp.gan}${dp.zhi}`,
    time: `${tp.gan}${tp.zhi}`,
  }
  const kw = {
    year: kongWangOf(yp.gan, yp.zhi).join(""),
    month: kongWangOf(mp.gan, mp.zhi).join(""),
    day: kongWangOf(dp.gan, dp.zhi).join(""),
    time: kongWangOf(tp.gan, tp.zhi).join(""),
  }
  const dayKong = kongWangOf(dp.gan, dp.zhi)

  // ── 农历与节气 ──
  const solar = Solar.fromYmdHms(y, m, d, hh, mi, 0)
  const lunar = solar.getLunar()
  const lunarLabel = `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`
  // 🔴 节气区间按**瞬时**判：lunar.getPrevJieQi() 是按天判的——2026 立春交节在 04:02，
  // 当天 03:00 问它就已答「立春」，而同一时刻月柱(Exact)还是丑月，盘面会自相矛盾。
  const jqRange = jieqiRangeAt(y, m, d, hh, mi)
  const fmtJq = (jq: JieqiMoment) =>
    `${jq.name}${jq.year}.${String(jq.month).padStart(2, "0")}.${String(jq.day).padStart(2, "0")} ${jq.timeText.slice(0, 5)}`
  const jieqiLabel = `${fmtJq(jqRange.prev)} ~ ${fmtJq(jqRange.next)}`

  // ── 一、定青龙支 ──
  let qinglongZhi: Zhi
  let reportNumber = input.reportNumber
  if (method === "number") {
    const n = Math.max(1, reportNumber ?? 1)
    qinglongZhi = ZHIS[(n - 1) % 12]
  } else if (method === "random") {
    const n = Math.floor(Math.random() * 12) + 1
    reportNumber = n
    qinglongZhi = ZHIS[n - 1]
  } else {
    qinglongZhi = tp.zhi
  }
  const qlIdx = ZHIS.indexOf(qinglongZhi)
  const qinglongPalace = ZHI_PALACE[qinglongZhi]

  // ── 十二黄黑道神：青龙起时支顺行 ──
  const huangdaoByZhi: Record<string, string> = {}
  for (let i = 0; i < 12; i++) huangdaoByZhi[ZHIS[(qlIdx + i) % 12]] = HUANGDAO_12[i]

  // ── 二、建除：勾陈支（青龙前一支）起建 ──
  const jianIdx = (qlIdx + 11) % 12
  const jianchuByZhi: Record<string, string> = {}
  for (let i = 0; i < 12; i++) jianchuByZhi[ZHIS[(jianIdx + i) % 12]] = JIANCHU_12[i]

  // ── 三、甲乘龙飞九宫（五合入中） ──
  const ganAt: Record<number, string[]> = {}
  for (const p of FLY_SEQ) ganAt[p] = []
  {
    const pulled = new Set<string>()
    let cursor = qinglongPalace
    for (const g of GANS) {
      if (pulled.has(g)) continue
      ganAt[cursor].push(g)
      if (cursor === 5) {
        const mate = WUHE[g]
        if (!pulled.has(mate) && !ganAt[5].includes(mate)) {
          ganAt[5].push(mate)
          pulled.add(mate)
        }
      }
      cursor = cursor === 9 ? 1 : cursor + 1
    }
  }

  // ── 四、龙头开八门：青龙次宫（顺时针）起休门 ──
  const menAt: Record<number, string> = {}
  {
    const start = (CLOCK_RING.indexOf(qinglongPalace) + 1) % 8
    for (let i = 0; i < 8; i++) menAt[CLOCK_RING[(start + i) % 8]] = MEN_8[i]
  }

  // ── 组装九宫 ──
  const palaces: Record<number, FeigongPalace> = {}
  for (const p of [1, 2, 3, 4, 6, 7, 8, 9]) {
    const zhis = PALACE_ZHI[p]
    const gan = ganAt[p][0] ?? ""
    palaces[p] = {
      palace: p,
      name: PALACE_NAME[p],
      fangwei: PALACE_FANGWEI[p],
      zhis,
      huangdao: zhis.map((z) => huangdaoByZhi[z]),
      jianchu: zhis.map((z) => jianchuByZhi[z]),
      men: menAt[p],
      gan,
      isLong: p === qinglongPalace,
      kongWang: zhis.some((z) => dayKong.includes(z)),
      geju: ganGongGeju(gan, p),
      quShu: (() => {
        // 取数 = 后天宫数 + 本宫卦先天卦数 + 河图五行数（乾6宫：6 + 乾先天1 + 金4,9 = 1,4,6,9）
        const set = new Set<number>([p, XIANTIAN_NUM[HOUTIAN_GUA[p]]])
        for (const n of HETU_NUM[PALACE_WX[p]]) if (n <= 9) set.add(n)
        return Array.from(set).sort((a, b) => a - b)
      })(),
      xiantianGua: XIANTIAN_GUA[p],
    }
  }
  const centerGans = ganAt[5]
  const center = {
    gans: centerGans,
    text:
      centerGans.length >= 2
        ? `${centerGans.join("")}五合入中宫，二气相囚于中，主事有牵合暗联、当下难即分明。`
        : centerGans.length === 1
          ? `${centerGans[0]}独居中宫，气机内敛，事在酝酿之中。`
          : "中宫无干。",
  }

  // ── 白话总断 ──
  const qlPalaceObj = palaces[qinglongPalace]
  const jiMen: string[] = []
  for (const p of [1, 2, 3, 4, 6, 7, 8, 9]) {
    if (MEN_JI.has(palaces[p].men)) jiMen.push(`${palaces[p].men}在${PALACE_FANGWEI[p]}`)
  }
  const jiShen: string[] = []
  for (const p of [1, 2, 3, 4, 6, 7, 8, 9]) {
    for (const h of palaces[p].huangdao) {
      if (HUANGDAO_JI.has(h)) {
        jiShen.push(`${h}(${PALACE_FANGWEI[p]})`)
        break
      }
    }
  }
  const methodLabel = method === "hour" ? "时辰起局" : method === "number" ? `报数起局（${reportNumber}）` : `随机起局（${reportNumber}）`
  const verdicts: { title: string; text: string }[] = [
    {
      title: "龙头定局",
      text: `青龙落${qinglongZhi}，居${qlPalaceObj.name}（${qlPalaceObj.fangwei}），此为本局龙头、事情的发端之地。${
        HUANGDAO_JI.has("青龙") ? "青龙为黄道首吉之神，主事有贵人喜气相扶。" : ""
      }${qlPalaceObj.kongWang ? "唯龙头临日空，喜气打折，事恐雷声大雨点小。" : ""}`,
    },
    {
      title: "吉门方位",
      text: `本局三吉门：${jiMen.join("、")}。出行办事、求财谒贵，宜取吉门所在方位而动；用事时辰亦可参照吉门落宫取数。`,
    },
    {
      title: "黄道吉方",
      text: `黄道吉神所在：${jiShen.slice(0, 4).join("、")}等方。临事择方，先黄道后吉门，两者相叠之方为上上之选。`,
    },
    {
      title: "中宫气机",
      text: center.text + (centerGans.length >= 2 ? "谋事若涉合作牵连，宜先厘清权责再行。" : ""),
    },
  ]

  const aiSummary = [
    `飞宫小奇门 ${methodLabel}`,
    `${y}年${m}月${d}日 ${hh}时${mi}分（${lunarLabel}）`,
    `四柱：${pillars.year} ${pillars.month} ${pillars.day} ${pillars.time}`,
    `青龙落${qinglongZhi}（${qlPalaceObj.name}）`,
    ...[1, 8, 3, 4, 9, 2, 7, 6].map((p) => {
      const o = palaces[p]
      return `${o.name}：${o.huangdao.join("")}/${o.jianchu.join("")}/${o.men}/${o.gan}${o.kongWang ? "/空" : ""}`
    }),
    `中宫：${centerGans.join("")}`,
  ].join("\n")

  return {
    method,
    methodLabel,
    reportNumber,
    dateLabel: `${y}年${String(m).padStart(2, "0")}月${String(d).padStart(2, "0")}日 ${String(hh).padStart(2, "0")}时${String(mi).padStart(2, "0")}分`,
    lunarLabel,
    jieqiLabel,
    pillars,
    kongWang: kw,
    qinglongZhi,
    qinglongPalace,
    palaces,
    center,
    verdicts,
    aiSummary,
  }
}
