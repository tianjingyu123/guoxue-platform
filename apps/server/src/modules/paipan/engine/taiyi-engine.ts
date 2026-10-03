/**
 * 太乙神数排盘引擎（时太乙为主，兼容年/月/日太乙）
 *
 * 黄金基准（竞品实测课例，2026-07-03 21:45 时太乙·指津）：
 *   四柱 丙午/甲午/戊寅/癸亥；阴遁 36 局；
 *   （竞品页给的积时数是 7023780；我们经 ★23/★41 两次积日校准后显示 7034580，
 *    两者差 8640，但局数/五福/值使/干支等所有盘面量一致 —— 详见 JIRI_OFFSET 注释）
 *   太乙在六宫；天目（文昌）临和德（艮）；计神加酉；始击临大威（午）；
 *   主算 25 / 客算 9 / 定算 34；主大将、主参将入中宫（杜塞）；
 *   客大将九宫；客参将七宫；值使惊门；五福在中宫。
 *
 * 已推演并验证的核心公式：
 *   积日 = 距上元甲子日数（经黄金基准校准：2026-07-03 → 585315，mod 60 = 15 = 戊寅 ✓）
 *   积时 = (积日 - 1) × 12 + 时辰序（子=1…亥=12）；mod 60 = 0 → 癸亥 ✓
 *   局数 = (积时 mod 360) mod 72，0 作 72
 *   太乙宫（阴遁）= 序[9,8,7,6,4,3,2,1]，位 = ceil(局/3) 对 8 取模
 *   文昌（阴遁）= 吕申起顺行、艮巽重留（18 步一循环）
 *   计神（阴遁）= 申起逆数至时支
 *   始击 = 计神加于和德，天目下临之辰所在十六神位
 *   主算/客算/定算 = 自文昌/始击/定目起，顺行逐宫累加太乙九宫数至太乙前一宫（★26，见 suanFrom）
 *   定目 = 盘式主支之合神移至主支，文昌随之同移
 *   大将 = 算去十位取个位（0 作 9 论）；参将 = 大将宫 × 3 去十位
 *   值使 = 积时 mod 240 每 30 时一门，序[休生伤杜景死惊开]（经黄金基准校准）
 */

import { Solar } from "./vendor/lunar"

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

/**
 * 槽位 → 太乙九宫数（一乾 二离 三艮 四震 五中 六兑 七坤 八坎 九巽）
 *
 * ★26（2026-09-22）：原表按**洛书**（坎1 艮8 震3 巽4 离9 坤2 兑7 乾6）配方位。
 * 《太乙金镜式经》立成明写「太乙在一宫**乾**」，太乙九宫与洛书沿环的数序相同、整体差一格（45°），
 * 所以太乙行宫/文昌序列/对宫/相邻这些「只看数」的逻辑一直对，错的是「数 ↔ 方位」：
 * 文昌、始击落哪一宫，三算从哪一宫数起，盘面把星画在哪个方位，都偏了一格。
 */
export const SLOT_PALACE: Record<string, number> = {
  子: 8, 丑: 3, 艮: 3, 寅: 3, 卯: 4, 辰: 9, 巽: 9, 巳: 9,
  午: 2, 未: 7, 坤: 7, 申: 7, 酉: 6, 戌: 1, 乾: 1, 亥: 1,
}

/** 顺行宫环（自坎起，太乙九宫数；与原洛书环数序相同，仅起点转一格） */
const PALACE_RING = [8, 3, 4, 9, 2, 7, 6, 1]

/** 正宫槽位（八卦正位）；其余八槽为间辰 */
const ZHENG_SLOTS = new Set(["子", "艮", "卯", "巽", "午", "坤", "酉", "乾"])

/** 地支六合 */
const LIUHE: Record<string, string> = { 子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯", 辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午" }

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

/**
 * 五福行宫序：乾1 艮3 巽9 坤7 中5（太乙九宫数），45 数一移，225 一周。
 * 出处《太乙金镜式经·推五福太乙法》：「命起乾艮巽坤中宫，筭外即五福所在」。
 * ★26 前写作 [6, 2, 8, 4, 5]（注释「乾坤艮巽中」）：既是洛书数，顺序也错（坤艮互换）。
 */
const WUFU_SEQ = [1, 3, 9, 7, 5]
/**
 * 金镜五福另有上元：「置上元积年以来至开元十二年甲子岁，积得一万三千三百三十一岁」，
 * 且「今开元十二年甲子在辽东（艮）十一年也」——13331 mod 225 = 56 = 45 + 11，恰为第 2 宫（艮）第 11 年。
 */
const WUFU_JINIAN_724 = 13331

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
  /** 定目（定算的起点）：盘式主支之合神移至主支，文昌随之同移所临（★26） */
  dingmu: { god: string; slot: string; palace: number }
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

/**
 * 积日校准常量。
 *
 * ⚠️ 这个常数同时被**两个不同模数**约束，改动前两条都要验：
 *   - 时太乙走积时 =(积日−1)×12+时辰序，局数取 mod 360 → 只约束积日 **mod 30**（12×30=360）
 *   - 日太乙直接拿积日取 mod 360 → 约束积日 **mod 360**
 *
 * 2026-09-20 修正 +180：原值是拿时太乙黄金基准反推的，只满足 mod 30，mod 360 是自由的，
 * 于是日太乙局数**固定偏 180 ⇒ 偏 36 局**（180 mod 72 = 36）。
 * 竞品结果页页脚直接给出积日数，据此定死：2026-09-20 → 3709381894，mod 360 = 214；
 * 我们 585394 + 180 = 585574，mod 360 = 214 ✓
 *
 * 2026-09-21 再修正 180 → 900（★41）。上一版声称「+180 对时太乙零影响（已实跑逐项确认）」，
 * 列了 180 mod 60、2160 mod 360、2160 mod 60、2160 mod 240 四条——**唯独漏了五福的 mod 225**。
 * 五福是 `WUFU_SEQ[floor((积时 mod 225) / 45)]`（5 位 × 45 时），而 2160 mod 225 = 135 ≠ 0，
 * 于是时太乙五福被挪了 3 位：黄金基准「五福在中宫(5)」变成了 8 宫。
 *
 * 900 同时满足全部五个模数，且对日太乙与 +180 完全等效（900 − 180 = 720 = 2×360）：
 *   900 mod 60 = 0（日柱不变）      10800 mod 360 = 0（时太乙局数不变）
 *   10800 mod 60 = 0（干支不变）    10800 mod 240 = 0（值使不变）
 *   **10800 mod 225 = 0（五福不变）** 900 mod 360 = 180（日太乙局数偏移与上一版一致）
 *
 * ⚠️ 代价：积时**显示数值**变为 7034580，与竞品时太乙页给的 7023780 差 8640。
 * 这是没法两全的——竞品自己那两个基准就互相矛盾：
 * 时太乙页的积时反推出 jiRi = 585315，而日太乙页的积日要求再 +180 天。
 * 取舍是：**盘面量（局数/五福/值使/干支）全对 优先于 中间数值显示一致**。
 *
 * 教训（两条）：
 *  1. **校准基准的约束强度必须不低于使用场景的需求**——拿时太乙反推的常数用到日太乙上就是欠约束的。
 *  2. **「零影响」必须把所有模数列全再下结论**。上一版漏了一个模数就断言零影响，
 *     而那个模数恰好不整除。改这个常数前，先把下面所有对积时取模的地方数一遍：
 *     mod 360（局数）、mod 240（值使）、mod 225（五福）、mod 60（干支，两处）。
 */
const JIRI_OFFSET = 585315 + 900 - localDays(2026, 7, 3)

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
  // 日太乙恒阳遁 —— 上面的节气规则在此盘式下已被竞品实测四次证伪。
  //
  // 实测（2026 统宗，四柱/空亡/节气均逐项核对无误）：
  //   09-20 阳遁70局 · 09-23 阳遁1局 · 10-28 阳遁36局 · 12-04 阳遁1局
  // 四例全在夏至后冬至前，按节气规则应为阴遁，实得阳遁。
  // 局号 mod72 四中四（70/1/36/1）⇒ **局数公式本身与竞品相同，分歧只在遁向**。
  // 周期型解释也已排除：mod144 在 72 两侧都有样本（1/70/73/108）、
  // mod288 在 144 两侧都有（70/73/108/145），无一成立。
  //
  // 结构性证据（不只是归纳）：10-28 日太乙给「**阳**遁36局」，而时太乙黄金基准
  // （2026-07-03 指津，见文件头）是「**阴**遁36局」。同一局号在两种盘式下遁向相反
  // ⇒ 阴阳遁不由局号决定，是**盘式属性**。
  //
  // 必须改 isYin 本身而非只改 dunType：下游太乙行宫、文昌、计神都读 isYin。
  // 局限：仅在「日太乙 + 统宗」下实测；指津/金镜未验；年/月/时太乙一律不动，仍走节气判定。
  // 若今后采到日太乙的阴遁反例，此处须立即修正。
  if (panShi === "day") isYin = false
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

  /* --- 计神（阳遁寅起、阴遁申起，皆逆数；以盘式主支为引） --- */
  // ★26（2026-09-22）：原阳遁写作「寅起顺数」(2 + 支序)。金镜立成阳局计神随局逐一递减（寅 丑 子 亥 …），
  // 与阴局（申 未 午 …）同为逆行；原写法只在主支为子/午时碰巧相同，其余阳遁盘计神、始击、客算皆错。
  const drivingZhi =
    panShi === "hour" ? pillars.time[1]
    : panShi === "day" ? pillars.day[1]
    : panShi === "month" ? pillars.month[1]
    : pillars.year[1]
  const dzIdx = ZHI.indexOf(drivingZhi)
  const jiShenIdx = isYin ? (8 - dzIdx + 12) % 12 : (2 - dzIdx + 12) % 12
  const jiShen = ZHI[jiShenIdx]

  /* --- 始击（计神加和德，天目下临之辰） --- */
  const jsSlotIdx = SLOT16.indexOf(jiShen as (typeof SLOT16)[number])
  const heDeIdx = SLOT16.indexOf("艮")
  const tmSlotIdx = SLOT16.indexOf(wcSlot as (typeof SLOT16)[number])
  const sjSlotIdx = ((tmSlotIdx - (jsSlotIdx - heDeIdx)) % 16 + 16) % 16
  const sjSlot = SLOT16[sjSlotIdx]
  const shiji = { god: GOD16[sjSlot], slot: sjSlot, palace: SLOT_PALACE[sjSlot] }

  /* --- 主算 / 客算 / 定算 --- */
  // ★26（2026-09-22）三处改正，依据《太乙金镜式经》（四库本）「阳局/阴局天目地目计神主客大小将立成」144 局：
  //   1. 宫数用太乙九宫（见 SLOT_PALACE），不是洛书；
  //   2. 起点在**正宫**计本宫数（若即太乙宫，只计本宫）；在**间辰**计 1，再自顺行下一正宫起；
  //      逐宫累加，至太乙前一宫止。原「两端不计」的写法与立成表主算仅 67/144、客算 55/144 相符；
  //      新规则主算 138/144、客算 139/144，其余 11 处 6 处恰差 10（刻本「二十/三十」之讹的典型样子），
  //      另与书中 6 条行文例句、竞品 4 个日太乙样本、文件头时太乙黄金基准（25/9/34）全部吻合；
  //   3. 定算自**定目**起算（盘式主支之合神移至主支，文昌随之同移所临），不是「主算 + 客算」。
  //      原写法只在文件头那个黄金样本上碰巧成立（25 + 9 = 34），竞品 4 例（15/13/36/13）无一满足。
  //   （★42 修过的「同宫绕满一圈」「相邻兜底」两处在新规则下自然不再存在。）
  const nextZheng = (slotIdx: number): number => {
    for (let k = 1; k <= 16; k++) if (ZHENG_SLOTS.has(SLOT16[(slotIdx + k) % 16])) return (slotIdx + k) % 16
    return slotIdx
  }
  const suanFrom = (fromSlot: string): number => {
    let idx = SLOT16.indexOf(fromSlot as (typeof SLOT16)[number])
    let total: number
    if (ZHENG_SLOTS.has(fromSlot)) {
      total = SLOT_PALACE[fromSlot]
      if (total === taiyiPalace) return total
    } else {
      total = 1
    }
    idx = nextZheng(idx)
    while (SLOT_PALACE[SLOT16[idx]] !== taiyiPalace) {
      total += SLOT_PALACE[SLOT16[idx]]
      idx = nextZheng(idx)
    }
    return total
  }
  // 定目：主支之合神移至主支（十六槽上移了几格），文昌随之同移几格
  const heShen = LIUHE[drivingZhi]
  const moveSteps = SLOT16.indexOf(drivingZhi as (typeof SLOT16)[number]) - SLOT16.indexOf(heShen as (typeof SLOT16)[number])
  const dmSlot = SLOT16[(((tmSlotIdx + moveSteps) % 16) + 16) % 16]
  const dingmu = { god: GOD16[dmSlot], slot: dmSlot, palace: SLOT_PALACE[dmSlot] }
  const zhuSuan = suanFrom(wenchang.slot)
  const keSuan = suanFrom(shiji.slot)
  const dingSuan = suanFrom(dingmu.slot)

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
  //
  // ★25 日太乙值使整体差一门（2026-09-20 修）。
  //
  // `DOORS` 的相位注释写着「经黄金基准校准：积时 7023780 → 惊门」——
  // 又是**只拿时太乙一种盘式反推的常数**。日太乙走 `jiShi = jiRi` 这条路径，
  // 从来没有被任何基准约束过，于是整体偏了一门。
  // 这是「校准基准的约束强度低于使用场景的需求」在本文件里的**第二次命中**，
  // 第一次是 JIRI_OFFSET（★23，见文件头）。
  //
  // 竞品实测四例（2026 统宗·日太乙），方向完全一致，我们恒比竞品晚一门：
  //   09-20 惊/开 · 09-23 惊/开 · 10-28 开/休 · 12-04 休/生   （竞品/原实现）
  // 积日 −30 即门序 −1，四例全中；覆盖 惊·开·休 三门，含一次跨 240 回绕
  // （10-28 从 217 走到 252）与一次门界跨越，35 天与 37 天两个间隔各恰好进一门，
  // 反过来印证「30 数一门」这个周期没错，错的只是相位。
  //
  // ⚠️ 这是**校准不是推导**：四个样本、只覆盖八门中的三门、只验过「日太乙＋统宗」。
  // 年/月太乙同样从未被基准约束过，但没有实测样本，**一律不动**——
  // 宁可留着一处已知未验，也不要凭同构猜想把三种盘式一起改掉。
  const zhiShiJi = panShi === "day" ? jiShi - 30 : jiShi
  const zhiShi = DOORS[Math.floor((((zhiShiJi % 240) + 240) % 240) / 30)] + "门"

  /* --- 五福（45 数一移） --- */
  // 金镜岁太乙用五福自己的积年（见 WUFU_JINIAN_724）；其余盘式/算法沿用本盘积数（时太乙经黄金基准校准）
  const wuFuJi = panShi === "year" && suanFa === "jinjing" ? WUFU_JINIAN_724 + (y - 724) : jiShi
  const wuFu = WUFU_SEQ[Math.floor((((wuFuJi % 225) + 225) % 225) / 45)]

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
    dingmu,
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
