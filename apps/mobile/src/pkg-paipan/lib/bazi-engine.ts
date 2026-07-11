// ─── 八字业务引擎：将干支引擎输出组装为结果页数据 ───
import {
  GANS,
  ZHIS,
  type Gan,
  type Zhi,
  fourPillars,
  type FourPillars,
  shiShenShort,
  ZHI_CANG,
  naYin,
  changSheng,
  shenSha as coreShenSha,
  daYun as coreDaYun,
  trueSolarTime,
  GAN_WUXING,
  ZHI_WUXING,
} from "@/lib/paipan/ganzhi"
import { getJieqiRange } from "@/lib/paipan/jieqi"

export interface PillarView {
  gan: string
  zhi: string
  shiShen: string
  cangGan: { gan: string; shen: string }[]
  naYin: string
  diShi: string
  ziZuo: string
  kongWang: string
}

export interface BaziData {
  name: string
  gender: string
  zodiac: string
  qianKun: string
  birthYear: number
  solarDate: string
  lunarDate: string
  realSolarTime: string
  jieQi: string
  siZhu: { year: PillarView; month: PillarView; day: PillarView; hour: PillarView }
  shenSha: { year: string[]; month: string[]; day: string[]; hour: string[] }
  taiYuan: { gan: string; zhi: string; naYin: string }
  mingGong: { gan: string; zhi: string; naYin: string }
  shenGong: { gan: string; zhi: string; naYin: string }
  qiYun: string
  daYun: { year: number; gan: string; zhi: string; shiShen: string; shiShenZhi: string; age: number; active?: boolean }[]
  liuNian: { year: number; gan: string; zhi: string; shiShen: string; shiShenZhi: string; age: number; active?: boolean }[]
  relations: { tianGan: string[]; diZhi: string[] }
  wuxingState: Record<string, string>
  wuxingPower: Record<string, number>
  yongJi: { yongShen: string; xiShen: string; jiShen: string; tiaoHou: string; note: string }
}

const ZODIACS = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"]

// 主要城市经度（真太阳时修正用）
const CITY_LNG: Record<string, number> = {
  北京: 116.4, 上海: 121.47, 广州: 113.26, 深圳: 114.06, 杭州: 120.16, 南京: 118.78,
  成都: 104.07, 重庆: 106.55, 武汉: 114.3, 西安: 108.94, 天津: 117.2, 苏州: 120.58,
  郑州: 113.63, 长沙: 112.94, 沈阳: 123.43, 青岛: 120.38, 大连: 121.61, 厦门: 118.09,
  福州: 119.3, 昆明: 102.83, 兰州: 103.83, 乌鲁木齐: 87.62, 拉萨: 91.11, 哈尔滨: 126.63,
  长春: 125.32, 石家庄: 114.51, 太原: 112.55, 合肥: 117.28, 南昌: 115.89, 贵阳: 106.63,
  南宁: 108.37, 海口: 110.32, 银川: 106.28, 西宁: 101.78, 呼和浩特: 111.75,
}

/** 城市经度查询（查不到返回 undefined，其他排盘引擎复用） */
export function cityLongitude(city?: string | null): number | undefined {
  return city ? CITY_LNG[city] : undefined
}

export function lunarText(y: number, m: number, d: number): string {
  try {
    const parts = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", { month: "long", day: "numeric" }).formatToParts(new Date(y, m - 1, d))
    const mm = parts.find((p) => p.type === "month")?.value || ""
    const dd = Number(parts.find((p) => p.type === "day")?.value || "1")
    const CN_DAY = ["", "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十", "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"]
    return `${mm}${CN_DAY[dd] || dd}`
  } catch {
    return ""
  }
}

// ─── 干支关系检测 ───
const GAN_HE: [string, string, string][] = [
  ["甲", "己", "甲己合土"], ["乙", "庚", "乙庚合金"], ["丙", "辛", "丙辛合水"], ["丁", "壬", "丁壬合木"], ["戊", "癸", "戊癸合火"],
]
const ZHI_CHONG: [string, string][] = [["子", "午"], ["丑", "未"], ["寅", "申"], ["卯", "酉"], ["辰", "戌"], ["巳", "亥"]]
const ZHI_LIUHE: [string, string, string][] = [
  ["子", "丑", "子丑合"], ["寅", "亥", "寅亥合"], ["卯", "戌", "卯戌合"], ["辰", "酉", "辰酉合"], ["巳", "申", "巳申合"], ["午", "未", "午未合"],
]
const SANHE: [string, string, string, string][] = [
  ["申", "子", "辰", "申子辰三合水"], ["亥", "卯", "未", "亥卯未三合木"], ["寅", "午", "戌", "寅午戌三合火"], ["巳", "酉", "丑", "巳酉丑三合金"],
]
const SANHUI: [string, string, string, string][] = [
  ["寅", "卯", "辰", "寅卯辰三会木"], ["巳", "午", "未", "巳午未三会火"], ["申", "酉", "戌", "申酉戌三会金"], ["亥", "子", "丑", "亥子丑三会水"],
]
const ZHI_HAI: [string, string][] = [["子", "未"], ["丑", "午"], ["寅", "巳"], ["卯", "辰"], ["申", "亥"], ["酉", "戌"]]
const ZHI_XING: [string, string, string][] = [
  ["寅", "巳", "寅巳刑"], ["巳", "申", "巳申刑"], ["丑", "戌", "丑戌刑"], ["戌", "未", "戌未刑"], ["子", "卯", "子卯刑"],
]

function detectRelations(fp: FourPillars): { tianGan: string[]; diZhi: string[] } {
  const gans = [fp.year.gan, fp.month.gan, fp.day.gan, fp.hour.gan]
  const zhis = [fp.year.zhi, fp.month.zhi, fp.day.zhi, fp.hour.zhi]
  const tianGan: string[] = []
  const diZhi: string[] = []
  for (const [a, b, label] of GAN_HE) {
    if (gans.includes(a as Gan) && gans.includes(b as Gan) && !tianGan.includes(label)) tianGan.push(label)
  }
  for (const [a, b, c, label] of SANHE) {
    if (zhis.includes(a as Zhi) && zhis.includes(b as Zhi) && zhis.includes(c as Zhi)) diZhi.push(label)
  }
  for (const [a, b, c, label] of SANHUI) {
    if (zhis.includes(a as Zhi) && zhis.includes(b as Zhi) && zhis.includes(c as Zhi)) diZhi.push(label)
  }
  for (const [a, b] of ZHI_CHONG) {
    if (zhis.includes(a as Zhi) && zhis.includes(b as Zhi)) diZhi.push(`${a}${b}冲`)
  }
  for (const [a, b, label] of ZHI_LIUHE) {
    if (zhis.includes(a as Zhi) && zhis.includes(b as Zhi)) diZhi.push(label)
  }
  for (const [a, b] of ZHI_HAI) {
    if (zhis.includes(a as Zhi) && zhis.includes(b as Zhi)) diZhi.push(`${a}${b}害`)
  }
  for (const [a, b, label] of ZHI_XING) {
    if (zhis.includes(a as Zhi) && zhis.includes(b as Zhi)) diZhi.push(label)
  }
  // 自刑
  for (const z of ["辰", "午", "酉", "亥"]) {
    if (zhis.filter((x) => x === z).length >= 2) diZhi.push(`${z}${z}自刑`)
  }
  return { tianGan, diZhi }
}

// ─── 旺相休囚死（按月支五行） ───
function wuxingStates(monthZhi: string): Record<string, string> {
  const seasonEl = ZHI_WUXING[monthZhi] // 当令五行
  const SHENG: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" }
  const KE: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" }
  const out: Record<string, string> = {}
  for (const el of ["木", "火", "土", "金", "水"]) {
    if (el === seasonEl) out[el] = "旺"
    else if (SHENG[seasonEl] === el) out[el] = "相"
    else if (SHENG[el] === seasonEl) out[el] = "休"
    else if (KE[el] === seasonEl) out[el] = "囚"
    else out[el] = "死"
  }
  return out
}

// ─── 五行能量（干1.0 支本气1.0 中气0.5 余气0.3） ───
function wuxingPower(fp: FourPillars): Record<string, number> {
  const score: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
  const pillars = [fp.year, fp.month, fp.day, fp.hour]
  for (const p of pillars) {
    score[GAN_WUXING[p.gan]] += 1
    const cang = ZHI_CANG[p.zhi]
    cang.forEach((g, i) => {
      score[GAN_WUXING[g]] += i === 0 ? 1 : i === 1 ? 0.5 : 0.3
    })
  }
  const total = Object.values(score).reduce((a, b) => a + b, 0)
  const out: Record<string, number> = {}
  for (const el of ["木", "火", "土", "金", "水"]) out[el] = Math.round((score[el] / total) * 100)
  return out
}

// ─── 简化用神推断（扶抑法启发式） ───
function inferYongJi(fp: FourPillars, states: Record<string, string>, power: Record<string, number>) {
  const dg = fp.day.gan
  const dEl = GAN_WUXING[dg]
  const SHENG_ME: Record<string, string> = { 木: "水", 火: "木", 土: "火", 金: "土", 水: "金" }
  const WO_SHENG: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" }
  const WO_KE: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" }
  const KE_WO: Record<string, string> = { 土: "木", 水: "土", 火: "水", 金: "火", 木: "金" }
  // 身强判断：日主+生我 能量 > 45% 或日主当令
  const selfPower = power[dEl] + power[SHENG_ME[dEl]] * 0.6
  const strong = selfPower > 42 || states[dEl] === "旺" || states[dEl] === "相"
  const EL_GAN: Record<string, string> = { 木: "甲木", 火: "丙火", 土: "戊土", 金: "庚金", 水: "壬水" }
  if (strong) {
    return {
      yongShen: EL_GAN[WO_KE[dEl]],
      xiShen: EL_GAN[WO_SHENG[dEl]],
      jiShen: EL_GAN[SHENG_ME[dEl]],
      tiaoHou: `${WO_SHENG[dEl]}${WO_KE[dEl]}流通，泄克并用`,
      note: `${dg}${dEl}日主偏强（含生扶约${Math.round(selfPower)}%），宜克泄耗：取${WO_KE[dEl]}为用、${WO_SHENG[dEl]}为喜，忌${SHENG_ME[dEl]}再生扶。`,
    }
  }
  return {
    yongShen: EL_GAN[SHENG_ME[dEl]],
    xiShen: EL_GAN[dEl],
    jiShen: EL_GAN[KE_WO[dEl]],
    tiaoHou: `${SHENG_ME[dEl]}${dEl}相生，印比扶身`,
    note: `${dg}${dEl}日主偏弱（含生扶约${Math.round(selfPower)}%），宜生扶：取${SHENG_ME[dEl]}印为用、${dEl}比劫为喜，忌${KE_WO[dEl]}克身。`,
  }
}

// ─── 主函数 ───
export function computeBazi(input: {
  name: string
  gender: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
  city?: string
  district?: string
  useTrueSolar?: boolean
  earlyZi?: boolean
}): BaziData {
  const { name, gender, year, month, day, hour, minute } = input
  const lng = CITY_LNG[input.city || ""] ?? 116.4
  // 真太阳时修正
  let cy = year, cm = month, cd = day, ch = hour, cmin = minute
  let realSolarText = ""
  if (input.useTrueSolar !== false) {
    const corrected = trueSolarTime(new Date(year, month - 1, day, hour, minute), lng)
    cy = corrected.getFullYear()
    cm = corrected.getMonth() + 1
    cd = corrected.getDate()
    ch = corrected.getHours()
    cmin = corrected.getMinutes()
    realSolarText = `${cy}年${String(cm).padStart(2, "0")}月${String(cd).padStart(2, "0")}日 ${String(ch).padStart(2, "0")}时${String(cmin).padStart(2, "0")}分（${input.city || "北京"}${input.district ? " " + input.district : ""}）`
  }

  const fp = fourPillars(cy, cm, cd, ch, cmin, input.earlyZi)
  const dg = fp.day.gan

  const mkView = (p: typeof fp.year, isDay = false): PillarView => ({
    gan: p.gan,
    zhi: p.zhi,
    shiShen: isDay ? "日元" : shiShenShort(dg, p.gan),
    cangGan: ZHI_CANG[p.zhi].map((g) => ({ gan: g, shen: shiShenShort(dg, g) })),
    naYin: p.nayin,
    diShi: changSheng(dg, p.zhi),
    ziZuo: changSheng(p.gan, p.zhi),
    kongWang: p.kong.join(""),
  })

  // 神煞按柱分配
  const globalSS = coreShenSha(fp)
  const perPillar: Record<"year" | "month" | "day" | "hour", string[]> = { year: [], month: [], day: [], hour: [] }
  const zhiOf = { year: fp.year.zhi, month: fp.month.zhi, day: fp.day.zhi, hour: fp.hour.zhi }
  for (const [ssName, zhiList] of Object.entries(globalSS)) {
    for (const key of ["year", "month", "day", "hour"] as const) {
      if (zhiList.includes(zhiOf[key])) perPillar[key].push(ssName)
    }
  }

  // 胎元：月干进一、月支进三
  const tgIdx = (GANS.indexOf(fp.month.gan) + 1) % 10
  const tzIdx = (ZHIS.indexOf(fp.month.zhi) + 3) % 12
  const taiYuan = { gan: GANS[tgIdx], zhi: ZHIS[tzIdx], naYin: naYin(GANS[tgIdx], ZHIS[tzIdx]) }

  // 命宫：寅起正月顺数至生月，从生月宫起生时逆数至卯
  const hourZhiIdx = Math.floor(((ch + 1) % 24) / 2)
  let mgZhiIdx = (26 - fp.monthNo - hourZhiIdx) % 12
  mgZhiIdx = ((mgZhiIdx % 12) + 12) % 12
  // 命宫天干五虎遁（年干起）
  const wuhuStart = { 甲: 2, 己: 2, 乙: 4, 庚: 4, 丙: 6, 辛: 6, 丁: 8, 壬: 8, 戊: 0, 癸: 0 }[fp.year.gan]!
  const mgMonthNo = ((mgZhiIdx - 2 + 12) % 12) + 1 // 该支对应的月序
  const mgGan = GANS[(wuhuStart + mgMonthNo - 1) % 10]
  const mingGong = { gan: mgGan, zhi: ZHIS[mgZhiIdx], naYin: naYin(mgGan, ZHIS[mgZhiIdx]) }

  // 身宫：月支起子顺数至生时
  const sgZhiIdx = (fp.monthNo + 1 + hourZhiIdx) % 12
  const sgMonthNo = ((sgZhiIdx - 2 + 12) % 12) + 1
  const sgGan = GANS[(wuhuStart + sgMonthNo - 1) % 10]
  const shenGong = { gan: sgGan, zhi: ZHIS[sgZhiIdx], naYin: naYin(sgGan, ZHIS[sgZhiIdx]) }

  // 大运
  const dy = coreDaYun(fp, gender === "女" ? "female" : "male", cy, cm, cd, ch, cmin)
  const nowYear = new Date().getFullYear()
  const daYunList = dy.list.map((d) => ({
    year: d.startYear,
    gan: d.gan,
    zhi: d.zhi,
    shiShen: shiShenShort(dg, d.gan),
    shiShenZhi: shiShenShort(dg, ZHI_CANG[d.zhi][0]),
    age: d.startAge,
    active: nowYear >= d.startYear && nowYear < d.startYear + 10,
  }))

  // 流年（当前年前2年起，共10年）
  const liuNian = Array.from({ length: 10 }, (_, i) => {
    const yy = nowYear - 2 + i
    const idx = (((yy - 4) % 60) + 60) % 60
    const g = GANS[idx % 10]
    const z = ZHIS[idx % 12]
    return {
      year: yy,
      gan: g,
      zhi: z,
      shiShen: shiShenShort(dg, g),
      shiShenZhi: shiShenShort(dg, ZHI_CANG[z][0]),
      age: yy - fp.effYear,
      active: yy === nowYear,
    }
  })

  // 节气区间文本
  const { prev, next } = getJieqiRange(new Date(cy, cm - 1, cd, ch, cmin))
  const dPrev = (new Date(cy, cm - 1, cd, ch, cmin).getTime() - prev.date.getTime()) / 86400000
  const dNext = (next.date.getTime() - new Date(cy, cm - 1, cd, ch, cmin).getTime()) / 86400000
  const jieQi = `${prev.name}后${Math.floor(dPrev)}天${Math.floor((dPrev % 1) * 24)}小时，${next.name}前${Math.floor(dNext)}天${Math.floor((dNext % 1) * 24)}小时`

  const states = wuxingStates(fp.month.zhi)
  const power = wuxingPower(fp)

  return {
    name,
    gender,
    zodiac: ZODIACS[(((fp.effYear - 4) % 12) + 12) % 12],
    qianKun: gender === "女" ? "坤造" : "乾造",
    birthYear: fp.effYear,
    solarDate: `${year}年${month}月${day}日 ${String(hour).padStart(2, "0")}时${String(minute).padStart(2, "0")}分`,
    lunarDate: lunarText(year, month, day),
    realSolarTime: realSolarText || "未启用",
    jieQi,
    siZhu: { year: mkView(fp.year), month: mkView(fp.month), day: mkView(fp.day, true), hour: mkView(fp.hour) },
    shenSha: perPillar,
    taiYuan,
    mingGong,
    shenGong,
    qiYun: `${dy.qiyunText}，${dy.forward ? "顺" : "逆"}行大运。`,
    daYun: daYunList,
    liuNian,
    relations: detectRelations(fp),
    wuxingState: states,
    wuxingPower: power,
    yongJi: inferYongJi(fp, states, power),
  }
}
