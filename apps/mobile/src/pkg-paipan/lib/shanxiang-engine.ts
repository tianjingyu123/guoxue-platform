// ─── 山向奇门排盘引擎 ───
// 风水择向奇门：向角度→二十四山→坐山配节气定局→年干五鼠遁向支得"用事干支"
// →复用时家奇门转盘核心排九宫→八煞/劫曜黄泉
// 黄金基准（竞品实测课例）：2022年 向195~199度 → 丑山未向 阳遁8局
//   干支壬寅丁未 旬首甲辰 值符天冲 值使伤门 空亡寅卯 马星巳 黄泉寅6
import { computeQimenForHour, type QimenHourChart } from "./qimen-engine"

const GANS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
const ZHIS = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

/** 二十四山（向）从 0° 起每 15° 一山：0~14=癸 …… 195~209=未（经黄金基准验证） */
export const FACING_SEQ = [
  "癸", "丑", "艮", "寅", "甲", "卯", "乙", "辰", "巽", "巳", "丙", "午",
  "丁", "未", "坤", "申", "庚", "酉", "辛", "戌", "乾", "亥", "壬", "子",
] as const

/** 坐山配节气定局表（壬起冬至序；[上元,中元,下元]；经黄金基准验证：坐丑=立春 8/5/2） */
const SIT_JU: Record<string, { yang: boolean; ju: [number, number, number]; jieqi: string }> = {
  壬: { yang: true, ju: [1, 7, 4], jieqi: "冬至" },
  子: { yang: true, ju: [2, 8, 5], jieqi: "小寒" },
  癸: { yang: true, ju: [3, 9, 6], jieqi: "大寒" },
  丑: { yang: true, ju: [8, 5, 2], jieqi: "立春" },
  艮: { yang: true, ju: [9, 6, 3], jieqi: "雨水" },
  寅: { yang: true, ju: [1, 7, 4], jieqi: "惊蛰" },
  甲: { yang: true, ju: [3, 9, 6], jieqi: "春分" },
  卯: { yang: true, ju: [4, 1, 7], jieqi: "清明" },
  乙: { yang: true, ju: [5, 2, 8], jieqi: "谷雨" },
  辰: { yang: true, ju: [4, 1, 7], jieqi: "立夏" },
  巽: { yang: true, ju: [5, 2, 8], jieqi: "小满" },
  巳: { yang: true, ju: [6, 3, 9], jieqi: "芒种" },
  丙: { yang: false, ju: [9, 3, 6], jieqi: "夏至" },
  午: { yang: false, ju: [8, 2, 5], jieqi: "小暑" },
  丁: { yang: false, ju: [7, 1, 4], jieqi: "大暑" },
  未: { yang: false, ju: [2, 5, 8], jieqi: "立秋" },
  坤: { yang: false, ju: [1, 4, 7], jieqi: "处暑" },
  申: { yang: false, ju: [9, 3, 6], jieqi: "白露" },
  庚: { yang: false, ju: [7, 1, 4], jieqi: "秋分" },
  酉: { yang: false, ju: [6, 9, 3], jieqi: "寒露" },
  辛: { yang: false, ju: [5, 8, 2], jieqi: "霜降" },
  戌: { yang: false, ju: [6, 9, 3], jieqi: "立冬" },
  乾: { yang: false, ju: [5, 8, 2], jieqi: "小雪" },
  亥: { yang: false, ju: [4, 7, 1], jieqi: "大雪" },
}

/** 二十四山双山地支（向上双山所对应地支，用于五鼠遁与马星） */
const DOUBLE_ZHI: Record<string, string> = {
  壬: "子", 癸: "丑", 艮: "寅", 甲: "卯", 乙: "辰", 巽: "巳",
  丙: "午", 丁: "未", 坤: "申", 庚: "酉", 辛: "戌", 乾: "亥",
  子: "子", 丑: "丑", 寅: "寅", 卯: "卯", 辰: "辰", 巳: "巳",
  午: "午", 未: "未", 申: "申", 酉: "酉", 戌: "戌", 亥: "亥",
}

/** 坐山所属卦 */
const SIT_GUA: Record<string, string> = {
  壬: "坎", 子: "坎", 癸: "坎", 丑: "艮", 艮: "艮", 寅: "艮",
  甲: "震", 卯: "震", 乙: "震", 辰: "巽", 巽: "巽", 巳: "巽",
  丙: "离", 午: "离", 丁: "离", 未: "坤", 坤: "坤", 申: "坤",
  庚: "兑", 酉: "兑", 辛: "兑", 戌: "乾", 乾: "乾", 亥: "乾",
}

/** 八煞黄泉诀：坎龙坤兔震山猴 巽鸡乾马兑蛇头 艮虎离猪为八煞 */
const BASHA_ZHI: Record<string, string> = {
  坎: "辰", 坤: "卯", 震: "申", 巽: "酉", 乾: "午", 兑: "巳", 艮: "寅", 离: "亥",
}

/** 劫曜干诀：坎癸坤乙震庚 艮丙巽辛兑丁 乾甲离壬 */
const JIEYAO_GAN: Record<string, string> = {
  坎: "癸", 坤: "乙", 震: "庚", 艮: "丙", 巽: "辛", 兑: "丁", 乾: "甲", 离: "壬",
}

/** 三奇六仪布局序（与奇门引擎一致，用于求劫曜干地盘落宫） */
const YIQI = ["戊", "己", "庚", "辛", "壬", "癸", "丁", "丙", "乙"]

const YUAN_NAMES = ["上元", "中元", "下元"]

export interface ShanxiangResult {
  /** 输入向角度（0-359） */
  degree: number
  /** 5度带展示区间，如 "195~199" */
  degreeBand: string
  /** 坐山 / 向山 */
  sitting: string
  facing: string
  /** 山向标签，如 "丑山未向" */
  label: string
  /** 坐山所配节气与三元 */
  jieqi: string
  yuan: string
  /** 局 */
  ju: { isYang: boolean; num: number; label: string }
  /** 年干支 / 用事干支（五鼠遁） */
  yearGZ: string
  useGZ: string
  /** 黄泉：八煞支 + 劫曜干及其地盘落宫 */
  huangquan: { zhi: string; yaoGan: string; yaoPalace: number; label: string }
  /** 奇门盘 */
  chart: QimenHourChart
  /** 白话总断 */
  plainVerdicts: { title: string; text: string }[]
}

/** 年干支（历法年序，山向奇门以用事年份取） */
export function yearGanzhi(year: number): { gan: string; zhi: string } {
  const idx = ((year - 4) % 60 + 60) % 60
  return { gan: GANS[idx % 10], zhi: ZHIS[idx % 12] }
}

/** 主排盘 */
export function paiShanxiang(degree: number, year: number): ShanxiangResult {
  const deg = ((Math.round(degree) % 360) + 360) % 360
  const mIdx = Math.floor(deg / 15)
  const facing = FACING_SEQ[mIdx]
  const sitting = FACING_SEQ[(mIdx + 12) % 24]
  const bandIdx = Math.floor((deg % 15) / 5)
  const bandStart = Math.floor(deg / 5) * 5
  const degreeBand = `${bandStart}~${bandStart + 4}`

  // 定局：坐山配节气 + 5度带分元
  const sj = SIT_JU[sitting]
  const juNum = sj.ju[bandIdx]
  const isYang = sj.yang

  // 年干支 + 五鼠遁向支 → 用事干支
  const yg = yearGanzhi(year)
  const yearGanIdx = GANS.indexOf(yg.gan)
  const useZhi = DOUBLE_ZHI[facing]
  const useZhiIdx = ZHIS.indexOf(useZhi)
  const useGan = GANS[((yearGanIdx % 5) * 2 + useZhiIdx) % 10]

  // 排奇门转盘
  const chart = computeQimenForHour(useGan, useZhi, isYang, juNum)

  // 黄泉：八煞支 + 劫曜干地盘落宫
  const gua = SIT_GUA[sitting]
  const bashaZhi = BASHA_ZHI[gua]
  const yaoGanRaw = JIEYAO_GAN[gua]
  const yaoGan = yaoGanRaw === "甲" ? chart.xunshou.yi : yaoGanRaw
  const yaoPalace = (() => {
    // 地盘：阳遁顺布/阴遁逆布 YIQI（与奇门引擎 buildDipan 一致）
    for (let i = 0; i < 9; i++) {
      const p = isYang ? ((juNum - 1 + i) % 9) + 1 : ((juNum - 1 - i + 18) % 9) + 1
      if (YIQI[i] === yaoGan) return p
    }
    return 5
  })()

  // 白话总断
  const plainVerdicts: { title: string; text: string }[] = []
  plainVerdicts.push({
    title: "山向格局",
    text: `坐${sitting}向${facing}，向上角度落${degreeBand}度（${sj.jieqi}${YUAN_NAMES[bandIdx]}），起${chart.ju.label}。${yg.gan}${yg.zhi}年用事，五鼠遁得${useGan}${useZhi}，旬首${chart.xunshou.name.slice(0, 2)}。`,
  })
  plainVerdicts.push({
    title: "值符值使",
    text: `值符${chart.zhifu.star}落${chart.zhifu.palace}宫、值使${chart.zhishi.men}落${chart.zhishi.palace}宫。值符所在方位得旺气可倚，值使门方宜作主要动线与纳气口参考。`,
  })
  plainVerdicts.push({
    title: "黄泉煞方",
    text: `坐${sitting}属${gua}卦，八煞在${bashaZhi}方、劫曜${yaoGan}落${yaoPalace}宫。${bashaZhi}方与${yaoPalace}宫方位忌开门、放水、动土，犯之主破财伤丁，宜静不宜动。`,
  })
  const kongList = Object.values(chart.palaces).filter((p) => p.kongWang).map((p) => p.palace)
  const maList = Object.values(chart.palaces).filter((p) => p.maXing).map((p) => p.palace)
  plainVerdicts.push({
    title: "空亡与马星",
    text: `旬空${chart.xunshou.kong}（落${kongList.join("、")}宫），空亡方立向纳气无力，不宜作大门朝向。马星${chart.maXing}${maList.length ? `落${maList.join("、")}宫` : ""}，主变动驿动，宜作通道、车库等动象布置。`,
  })
  const poList = Object.values(chart.palaces).filter((p) => p.menPo)
  if (poList.length) {
    plainVerdicts.push({
      title: "门迫提示",
      text: `${poList.map((p) => `${p.men}迫于${p.palace}宫`).join("；")}。门迫之方气机受克，开门动作宜避开，或以通关五行化解。`,
    })
  }

  return {
    degree: deg,
    degreeBand,
    sitting,
    facing,
    label: `${sitting}山${facing}向`,
    jieqi: sj.jieqi,
    yuan: YUAN_NAMES[bandIdx],
    ju: chart.ju,
    yearGZ: `${yg.gan}${yg.zhi}`,
    useGZ: `${useGan}${useZhi}`,
    huangquan: { zhi: bashaZhi, yaoGan, yaoPalace, label: `${bashaZhi}${yaoPalace}` },
    chart,
    plainVerdicts,
  }
}
