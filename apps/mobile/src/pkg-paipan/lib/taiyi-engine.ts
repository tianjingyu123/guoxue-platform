/**
 * 太乙神数排盘引擎（时太乙为主，兼容年/月/日太乙）
 *
 * 黄金基准（竞品实测课例，2026-07-03 21:45 时太乙·指津）：
 *   四柱 丙午/甲午/戊寅/癸亥；积时数 7023780；阴遁 36 局；
 *   太乙在六宫；天目（文昌）临和德（艮）；计神加酉；始击临大威（午）；
 *   主算 25 / 客算 9 / 定算 34；主大将、主参将入中宫（杜塞）；
 *   客大将九宫；客参将七宫；值使惊门；五福在中宫。
 *
 * 已推演并验证的核心公式：
 *   积日 = 距上元甲子日数（经黄金基准校准：2026-07-03 → 585315，mod 60 = 15 = 戊寅 ✓）
 *   积时 = (积日 - 1) × 12 + 时辰序（子=1…亥=12）；7023780 mod 60 = 0 → 癸亥 ✓
 *   局数 = (积时 mod 360) mod 72，0 作 72
 *   太乙宫（阴遁）= 序[9,8,7,6,4,3,2,1]，位 = ceil(局/3) 对 8 取模
 *   文昌（阴遁）= 吕申起顺行、艮巽重留（18 步一循环）
 *   计神（阴遁）= 申起逆数至时支
 *   始击 = 计神加于和德，天目下临之辰所在十六神位
 *   主算 = 天目宫与太乙宫之间（两端不计）顺行诸宫洛书数之和
 *   客算 = 始击宫与太乙宫之间（两端不计）顺行诸宫洛书数之和
 *   大将 = 算去十位取个位（0 作 9 论）；参将 = 大将宫 × 3 去十位
 *   值使 = 积时 mod 240 每 30 时一门，序[休生伤杜景死惊开]（经黄金基准校准）
 */

import { Solar } from "./lunar/index.js"

/* ============ 基础常量 ============ */

const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

/** 十六神槽位（顺时针）：支位 + 四维 */
export const SLOT16 = [
  "子", "丑", "艮", "寅", "卯", "辰", "巽", "巳",
  "午", "未", "坤", "申", "酉", "戌", "乾", "亥",
] as const

/** 槽位 → 十六神名 */
export const GOD16: Record<string, string> = {
  子: "地主", 丑: "阳德", 艮: "和德", 寅: "吕申",
  卯: "高丛", 辰: "太阳", 巽: "大炅", 巳: "大神",
  午: "大威", 未: "天道", 坤: "大武", 申: "武德",
  酉: "太簇", 戌: "阴主", 乾: "阴德", 亥: "大义",
}

/** 槽位 → 洛书宫数（坎1 艮8 震3 巽4 离9 坤2 兑7 乾6） */
export const SLOT_PALACE: Record<string, number> = {
  子: 1, 丑: 8, 艮: 8, 寅: 8, 卯: 3, 辰: 4, 巽: 4, 巳: 4,
  午: 9, 未: 2, 坤: 2, 申: 2, 酉: 7, 戌: 6, 乾: 6, 亥: 6,
}

/** 顺行宫环（自坎起）：主客算按此序取两宫之间的洛书数 */
const PALACE_RING = [1, 8, 3, 4, 9, 2, 7, 6]

/** 太乙行宫序 */
const TAIYI_SEQ_YANG = [1, 2, 3, 4, 6, 7, 8, 9]
const TAIYI_SEQ_YIN = [9, 8, 7, 6, 4, 3, 2, 1]

/** 文昌（天目）行十六神序：阳遁起武德乾坤重留；阴遁起吕申艮巽重留 */
const WENCHANG_YANG = [
  "武德", "太簇", "阴主", "阴德", "阴德", "大义", "地主", "阳德", "和德",
  "吕申", "高丛", "太阳", "大炅", "大神", "大威", "天道", "大武", "大武",
]
const WENCHANG_YIN = [
  "吕申", "高丛", "太阳", "大炅", "大炅", "大神", "大威", "天道", "大武",
  "武德", "太簇", "阴主", "阴德", "大义", "地主", "阳德", "和德", "和德",
]

/** 值使八门序（经黄金基准校准：积时 7023780 → 惊门） */
const DOORS = ["休", "生", "伤", "杜", "景", "死", "惊", "开"]

/** 五福行宫序（乾坤艮巽中，45 时一移） */
const WUFU_SEQ = [6, 2, 8, 4, 5]

/* ============ 类型 ============ */

export type PanShi = "year" | "month" | "day" | "hour"
export type SuanFa = "tongzong" | "zhijin" | "jinjing"

export interface TaiyiResult {
  panShiLabel: string
  suanFaLabel: string
  dateLabel: string
  lunarLabel: string
  jieQiLabel: string
  pillars: { year: string; month: string; day: string; time: string }
  kongWang: { year: string; month: string; day: string; time: string }
  jiShi: number
  dunType: "阳遁" | "阴遁"
  juNumber: number
  taiyiPalace: number
  wenchang: { god: string; slot: string; palace: number }
  shiji: { god: string; slot: string; palace: number }
  jiShen: string
  zhuSuan: number
  keSuan: number
  dingSuan: number
  zhuDaJiang: number
  zhuCanJiang: number
  keDaJiang: number
  keCanJiang: number
  zhiShi: string
  wuFu: number
  juHourGanZhi: string[]
  geJu: { title: string; text: string; type: "ji" | "xiong" | "ping" }[]
  shuZhan: { title: string; text: string }[]
  juYao: string
  baiHua: string
}

/* ============ 工具 ============ */

/** 本地日期 → 自 1970-01-01 起的天数（按本地历日） */
function localDays(y: number, m: number, d: number): number {
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000)
}

/** 积日校准常量：2026-07-03（localDays=20637）→ 积日 585315 */
const JIRI_OFFSET = 585315 - localDays(2026, 7, 3)

/** 五行 of 数（一水二火三木四金五土，0 作十论土） */
const NUM_WUXING = ["土", "水", "火", "木", "金", "土", "水", "火", "木", "金"]

/** 五音（经黄金基准校准：25→羽水后妃，9→角木人民） */
const WUYIN = [
  { yin: "羽", wx: "水", zhu: "后妃" },
  { yin: "宫", wx: "土", zhu: "君王" },
  { yin: "商", wx: "金", zhu: "大臣" },
  { yin: "徵", wx: "火", zhu: "事变" },
  { yin: "角", wx: "木", zhu: "人民" },
]

const numToCn = (n: number): string => {
  const cn = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]
  if (n <= 10) return cn[n]
  if (n < 20) return `十${cn[n % 10]}`
  return `${cn[Math.floor(n / 10)]}十${n % 10 === 0 ? "" : cn[n % 10]}`
}

/** 甲子序（1-60）→ 干支 */
const jiaziName = (n: number): string => {
  const i = ((n - 1) % 60 + 60) % 60
  return GAN[i % 10] + ZHI[i % 12]
}

/** 干支 → 旬空 */
function xunKong(gz: string): string {
  const g = GAN.indexOf(gz[0])
  const z = ZHI.indexOf(gz[1])
  const xunStart = (z - g + 12) % 12
  const k1 = (xunStart + 10) % 12
  const k2 = (xunStart + 11) % 12
  return ZHI[k1] + ZHI[k2]
}

/* ============ 主排盘 ============ */

export function paiTaiyi(input: {
  date: Date
  panShi: PanShi
  suanFa: SuanFa
}): TaiyiResult {
  const { date, panShi, suanFa } = input
  const solar = Solar.fromDate(date)
  const lunar = solar.getLunar()

  /* --- 四柱与空亡 --- */
  const pillars = {
    year: lunar.getYearInGanZhiExact(),
    month: lunar.getMonthInGanZhiExact(),
    day: lunar.getDayInGanZhiExact2(),
    time: lunar.getTimeInGanZhi(),
  }
  const kongWang = {
    year: xunKong(pillars.year),
    month: xunKong(pillars.month),
    day: xunKong(pillars.day),
    time: xunKong(pillars.time),
  }

  /* --- 积日 / 积时 --- */
  let y = solar.getYear()
  let mo = solar.getMonth()
  let d = solar.getDay()
  const hh = date.getHours()
  // 晚子时（23 时后）归次日
  if (hh >= 23) {
    const next = new Date(date.getTime() + 86400000)
    y = next.getFullYear(); mo = next.getMonth() + 1; d = next.getDate()
  }
  const jiRi = localDays(y, mo, d) + JIRI_OFFSET
  const hourIdx = hh >= 23 ? 1 : Math.floor((hh + 1) / 2) + 1 // 子=1…亥=12
  const jiShiHour = (jiRi - 1) * 12 + hourIdx

  // 积年（统宗/金镜两派上元常量；指津之时太乙用积时法）
  const jiNianTongzong = y + 10153857 + 1 // 校准：1984 → 10155841（甲子）
  const jiNianJinjing = 1937281 + (y - 724)
  const lunarMonthNo = Math.abs(lunar.getMonth())
  const jiYue = (jiNianTongzong - 1) * 12 + lunarMonthNo + 2 // 月积（自子月起）
  const jiShi =
    panShi === "hour" ? jiShiHour
    : panShi === "day" ? jiRi
    : panShi === "month" ? jiYue
    : suanFa === "jinjing" ? jiNianJinjing : jiNianTongzong

  /* --- 阴阳遁（冬至后阳遁，夏至后阴遁） --- */
  const jieQiTable = lunar.getJieQiTable()
  const dongZhi = jieQiTable["冬至"] ?? jieQiTable["DONG_ZHI"]
  const xiaZhi = jieQiTable["夏至"] ?? jieQiTable["XIA_ZHI"]
  const t = date.getTime()
  const dzT = dongZhi ? new Date(dongZhi.toYmdHms().replace(" ", "T")).getTime() : 0
  const xzT = xiaZhi ? new Date(xiaZhi.toYmdHms().replace(" ", "T")).getTime() : 0
  let isYin: boolean
  if (xzT && dzT) {
    if (xzT < dzT) isYin = t >= xzT && t < dzT
    else isYin = t >= xzT || t < dzT
  } else {
    const m2 = solar.getMonth()
    isYin = m2 >= 7 && m2 <= 11 // 兜底
  }
  const dunType: "阳遁" | "阴遁" = isYin ? "阴遁" : "阳遁"

  /* --- 局数 --- */
  const zhouJiYu = ((jiShi % 360) + 360) % 360
  let juNumber = zhouJiYu % 72
  if (juNumber === 0) juNumber = 72

  /* --- 太乙行宫（三数一迁） --- */
  const seq = isYin ? TAIYI_SEQ_YIN : TAIYI_SEQ_YANG
  const taiyiPalace = seq[(Math.ceil(juNumber / 3) - 1) % 8]

  /* --- 文昌（天目） --- */
  const wcList = isYin ? WENCHANG_YIN : WENCHANG_YANG
  const wcGod = wcList[(juNumber - 1) % 18]
  const wcSlot = (Object.keys(GOD16) as string[]).find((k) => GOD16[k] === wcGod)!
  const wenchang = { god: wcGod, slot: wcSlot, palace: SLOT_PALACE[wcSlot] }

  /* --- 计神（阳遁寅起顺数，阴遁申起逆数；以盘式主支为引） --- */
  const drivingZhi =
    panShi === "hour" ? pillars.time[1]
    : panShi === "day" ? pillars.day[1]
    : panShi === "month" ? pillars.month[1]
    : pillars.year[1]
  const dzIdx = ZHI.indexOf(drivingZhi)
  const jiShenIdx = isYin ? (8 - dzIdx + 12) % 12 : (2 + dzIdx) % 12
  const jiShen = ZHI[jiShenIdx]

  /* --- 始击（计神加和德，天目下临之辰） --- */
  const jsSlotIdx = SLOT16.indexOf(jiShen as (typeof SLOT16)[number])
  const heDeIdx = SLOT16.indexOf("艮")
  const tmSlotIdx = SLOT16.indexOf(wcSlot as (typeof SLOT16)[number])
  const sjSlotIdx = ((tmSlotIdx - (jsSlotIdx - heDeIdx)) % 16 + 16) % 16
  const sjSlot = SLOT16[sjSlotIdx]
  const shiji = { god: GOD16[sjSlot], slot: sjSlot, palace: SLOT_PALACE[sjSlot] }

  /* --- 主算 / 客算 / 定算（两宫之间顺行洛书数之和，两端不计） --- */
  const suanBetween = (fromPalace: number, toPalace: number): number => {
    const fi = PALACE_RING.indexOf(fromPalace)
    const ti = PALACE_RING.indexOf(toPalace)
    let sum = 0
    let i = (fi + 1) % 8
    while (i !== ti) {
      sum += PALACE_RING[i]
      i = (i + 1) % 8
    }
    return sum === 0 ? PALACE_RING[ti] : sum // 同宫或相邻兜底
  }
  const zhuSuan = suanBetween(wenchang.palace, taiyiPalace)
  const keSuan = suanBetween(shiji.palace, taiyiPalace)
  const dingSuan = zhuSuan + keSuan

  /* --- 八将 --- */
  const jiangGong = (suan: number): number => {
    let g = suan % 10
    if (g === 0) g = suan % 9 === 0 ? 9 : suan % 9
    return g
  }
  const zhuDaJiang = jiangGong(zhuSuan)
  const zhuCanJiang = jiangGong(zhuDaJiang * 3)
  const keDaJiang = jiangGong(keSuan)
  const keCanJiang = jiangGong(keDaJiang * 3)

  /* --- 值使（30 数一门，240 一周） --- */
  const zhiShi = DOORS[Math.floor((((jiShi % 240) + 240) % 240) / 30)] + "门"

  /* --- 五福（45 数一移） --- */
  const wuFu = WUFU_SEQ[Math.floor((((jiShi % 225) + 225) % 225) / 45)]

  /* --- 本局时辰干支（时太乙专属：同局五干支） --- */
  const juHourGanZhi: string[] = []
  if (panShi === "hour") {
    const base = ((jiShiHour % 72) + 72) % 72
    for (let k = 0; k < 5; k++) {
      const mod60 = (((base + k * 72) % 60) + 60) % 60
      juHourGanZhi.push(jiaziName(mod60 === 0 ? 60 : mod60))
    }
    juHourGanZhi.sort((a, b) => a.localeCompare(b, "zh"))
  }

  /* --- 格局判断 --- */
  const geJu: TaiyiResult["geJu"] = []
  const opp: Record<number, number> = { 1: 9, 9: 1, 3: 7, 7: 3, 2: 8, 8: 2, 4: 6, 6: 4 }
  const adjacent = (a: number, b: number): boolean => {
    const ai = PALACE_RING.indexOf(a)
    const bi = PALACE_RING.indexOf(b)
    const diff = Math.abs(ai - bi)
    return diff === 1 || diff === 7
  }
  const jiangList = [
    { name: "主大将", gong: zhuDaJiang, side: "主" },
    { name: "主参将", gong: zhuCanJiang, side: "主" },
    { name: "客大将", gong: keDaJiang, side: "客" },
    { name: "客参将", gong: keCanJiang, side: "客" },
  ]
  const zhuBihe = zhuDaJiang === 5 && zhuCanJiang === 5
  if (zhuBihe) {
    geJu.push({
      title: "主方杜塞",
      text: "主大将和主参将入第5宫，被封闭，应固守，不宜主动出击。",
      type: "xiong",
    })
  } else if (zhuDaJiang === 5 || zhuCanJiang === 5) {
    geJu.push({
      title: "主将入中",
      text: `${zhuDaJiang === 5 ? "主大将" : "主参将"}入中宫被囚，主方力量受制，谋事迟滞。`,
      type: "xiong",
    })
  }
  for (const j of jiangList) {
    if (j.gong === 5) continue
    if (j.gong === taiyiPalace) {
      geJu.push({
        title: `${j.name}掩太乙`,
        text: `${j.name}与太乙同宫为「掩」，${j.side === "主" ? "主" : "客"}方贴身相逼，事起仓促，宜慎防突变。`,
        type: "xiong",
      })
    } else if (adjacent(j.gong, taiyiPalace)) {
      const inner = j.side === "客" ? "容易被内部势力侵凌，灾缓而轻。" : "近逼有掣肘，行事宜留余地。"
      geJu.push({
        title: `${j.name}内宫迫`,
        text: `${j.name}居太乙前后一宫为「迫」，${inner}`,
        type: "xiong",
      })
    } else if (opp[j.gong] === taiyiPalace) {
      geJu.push({
        title: `${j.name}格太乙`,
        text: `${j.name}与太乙对宫为「格」，两力相持，事多阻隔，宜以静制动。`,
        type: "ping",
      })
    }
  }
  // 发用判断：星不囚不掩不迫者可发
  const faChecks = [
    { name: "太乙", gong: taiyiPalace },
    { name: "文昌门", gong: wenchang.palace },
    { name: "始击门", gong: shiji.palace },
    { name: "客大门", gong: keDaJiang },
  ]
  for (const f of faChecks) {
    if (f.gong !== 5) {
      geJu.push({
        title: `${f.name}${f.name === "太乙" ? "发" : "具将发"}`,
        text: `${f.name}居${numToCn(f.gong)}宫不受囚制，气机通达，其所主之事可以发动。`,
        type: "ji",
      })
    }
  }

  /* --- 数占九断 --- */
  const shuZhan: TaiyiResult["shuZhan"] = []
  shuZhan.push({
    title: "数之多少定胜负",
    text: zhuSuan > keSuan ? `主${zhuSuan}胜客${keSuan}败。` : zhuSuan < keSuan ? `客${keSuan}胜主${zhuSuan}败。` : `主客算均${zhuSuan}，势均力敌。`,
  })
  const dLabel = (n: number): string => {
    const ge = n % 10
    const shi = Math.floor(n / 10)
    if (ge === 5) return "杜塞数"
    if (shi === 0) return ge % 2 === 1 ? "单阳" : "单阴"
    if (shi % 2 === 1 && ge % 2 === 1) return "重阳"
    if (shi % 2 === 0 && ge % 2 === 0) return "重阴"
    return "阴阳相和数"
  }
  const zl = dLabel(zhuSuan)
  const kl = dLabel(keSuan)
  shuZhan.push({
    title: "定阴阳孤单成败",
    text: `主算${zl}。客算${kl}${kl.startsWith("单") ? "，不利上，不利主" : ""}。`,
  })
  const eHui = (label: string): string => (label === "重阳" ? "有阳厄" : label === "重阴" ? "有阴厄" : "无厄")
  shuZhan.push({ title: "以数之阴阳重否占厄会", text: `${eHui(zl)}。${eHui(kl)}。` })
  const changDuan = (n: number): string => (n >= 20 ? "数长，利缓进而深入" : n <= 10 ? "数短，利速战速决" : "长短适中")
  shuZhan.push({
    title: "数长数短定深浅缓急",
    text: `主算${changDuan(zhuSuan)}。${keSuan <= 10 ? "无长短之分。" : `客算${changDuan(keSuan)}。`}`,
  })
  const wy = (n: number) => WUYIN[n % 5]
  shuZhan.push({
    title: "推数之五音以占灾变",
    text: `主算五音：在${wy(zhuSuan).yin}音属${wy(zhuSuan).wx}，${wy(zhuSuan).zhu}。客算五音：在${wy(keSuan).yin}音属${wy(keSuan).wx}，${wy(keSuan).zhu}。`,
  })
  const yiChang = zl === "杜塞数" || kl.startsWith("单")
  shuZhan.push({
    title: "推数之所主以占吉凶",
    text: yiChang
      ? "异常。算数阴阳不和，气机偏枯，所谋之事易生波折，宜守常应变。"
      : "平顺。算数阴阳得配，气机流通，所谋之事循序可成。",
  })
  const outerPalaces = [2, 4, 6, 8]
  const taiyiOuter = outerPalaces.includes(taiyiPalace)
  shuZhan.push({
    title: "推数之内外以助主客",
    text: taiyiOuter ? "太乙居外宫，助客人，利陈兵原野时先起事。" : "太乙居内宫，助主人，利守土应敌后发制人。",
  })
  // 内外：十六神以子至巳（阳半盘）为内，午至亥（阴半盘）为外
  const tmInner = SLOT16.indexOf(wenchang.slot as (typeof SLOT16)[number]) < 8
  shuZhan.push({ title: "内外数", text: tmInner ? "天目在内，可以攻。" : "天目在外，宜先固守而后图进。" })
  // 相和：十位与个位五行比和（同行）方为相和；个位数无从相配作不和论
  const xiangHe = (n: number): boolean => {
    if (n < 10) return false
    const shiWx = NUM_WUXING[Math.floor(n / 10) % 10]
    const geWx = NUM_WUXING[n % 10]
    return shiWx === geWx
  }
  shuZhan.push({
    title: "数是否相和",
    text: `主算${xiangHe(zhuSuan) ? "相和" : "不和"}。客算${xiangHe(keSuan) ? "相和" : "不和"}。`,
  })

  /* --- 局要（古籍体例概述） --- */
  const juYao = [
    `第${numToCn(juNumber)}局`,
    panShi === "hour" && juHourGanZhi.length ? ` ${juHourGanZhi.join(" ")}` : "",
    ` 太乙在${numToCn(taiyiPalace)}宫，天目${wenchang.god}`,
    `（主算${numToCn(zhuSuan)}，值使${zhiShi}，`,
    zhuBihe ? "主大将、参将不出中宫，" : `主大将${numToCn(zhuDaJiang)}宫，主参将${numToCn(zhuCanJiang)}宫，`,
    `始击将${shiji.god}。客算${numToCn(keSuan)}，客大将${numToCn(keDaJiang)}宫${keDaJiang !== 5 ? "发" : ""}，`,
    `客参将${numToCn(keCanJiang)}宫${adjacent(keCanJiang, taiyiPalace) ? "内迫" : ""}，计神${jiShen}。`,
    taiyiOuter ? `此局太乙助客，${keDaJiang !== 5 ? "客大将发，" : ""}利为客，见阵利先动。` : "此局太乙助主，利为主，宜后发制人。",
    zhuBihe ? "主人杜塞，无门不利，宜固守。" : "",
    `）`,
  ].join("")

  /* --- 白话总断 --- */
  const baiHua = [
    `本课为${dunType}第${juNumber}局，太乙落${numToCn(taiyiPalace)}宫（${taiyiOuter ? "外宫，气助客方" : "内宫，气助主方"}）。`,
    `主算${zhuSuan}、客算${keSuan}，${zhuSuan > keSuan ? "主数占优，先守后动更有利" : keSuan > zhuSuan ? "客数占优，宜主动出击、先发制人" : "主客均势，成败取决于时机把握"}。`,
    zhuBihe ? "主方两将俱入中宫被封，属「杜塞」之局：眼下不宜强行推进，固守积蓄、待时而动是上策。" : "",
    `值使${zhiShi}当值，${zhiShi === "开门" || zhiShi === "休门" || zhiShi === "生门" ? "三吉门主事，行事得门径之便" : "门气偏滞，凡事多留一手准备"}。`,
    "以上为格局气机的推演，具体行止仍应结合实际情势综合判断。",
  ].filter(Boolean).join("")

  /* --- 标签 --- */
  const panShiLabels: Record<PanShi, string> = { year: "年太乙", month: "月太乙", day: "日太乙", hour: "时太乙" }
  const suanFaLabels: Record<SuanFa, string> = { tongzong: "统宗", zhijin: "指津", jinjing: "金镜" }
  const jq = lunar.getPrevJieQi(true)
  const nq = lunar.getNextJieQi(true)
  const jieQiLabel = `${jq.getName()}${jq.getSolar().toYmdHms().slice(0, 16).replace(/-/g, ".")} ~ ${nq.getName()}${nq.getSolar().toYmdHms().slice(0, 16).replace(/-/g, ".")}`

  return {
    panShiLabel: panShiLabels[panShi],
    suanFaLabel: suanFaLabels[suanFa],
    dateLabel: `${y}年${String(mo).padStart(2, "0")}月${String(d).padStart(2, "0")}日 ${String(date.getHours()).padStart(2, "0")}时${String(date.getMinutes()).padStart(2, "0")}分`,
    lunarLabel: `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    jieQiLabel,
    pillars,
    kongWang,
    jiShi,
    dunType,
    juNumber,
    taiyiPalace,
    wenchang,
    shiji,
    jiShen,
    zhuSuan,
    keSuan,
    dingSuan,
    zhuDaJiang,
    zhuCanJiang,
    keDaJiang,
    keCanJiang,
    zhiShi,
    wuFu,
    juHourGanZhi,
    geJu,
    shuZhan,
    juYao,
    baiHua,
  }
}
