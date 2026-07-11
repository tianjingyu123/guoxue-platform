/**
 * 电子罗盘几何与盘面数据层
 * 复用玄空飞星的二十四山定义（自北顺时针，子=正北0°，每山15°）。
 * 提供：度数↔山向映射、八卦/六十四卦/穿山七十二龙圈层、haversine 测距。
 */
import { MOUNTAINS } from "./xuankong-data"

export type PlateStyle = "sanyuan" | "sanhe" | "zonghe" | "jianyi"

export const PLATE_STYLES: { id: PlateStyle; name: string; desc: string }[] = [
  { id: "sanyuan", name: "三元盘", desc: "蒋盘·易卦六十四卦，玄空飞星常用" },
  { id: "sanhe", name: "三合盘", desc: "杨公盘·正针中针缝针三层，形势消砂纳水" },
  { id: "zonghe", name: "综合盘", desc: "三合三元兼备，内容最全" },
  { id: "jianyi", name: "简易盘", desc: "仅二十四山与度数，快速定向" },
]

// ─── 二十四山（复用玄空定义）───
export { MOUNTAINS }

/** 每山中心角度（度）。子(index1)=0°，每山15°。 */
export function mountainCenterDeg(idx: number): number {
  return (((idx - 1) * 15) % 360 + 360) % 360
}

/** 由罗盘朝向度数求最接近的山索引（0-23） */
export function degToMountainIdx(deg: number): number {
  const h = ((deg % 360) + 360) % 360
  const k = Math.round(h / 15) % 24
  return (k + 1) % 24
}

/**
 * 由朝向度数得坐向标签。
 * 约定（与主流罗盘 App 一致）：机顶指向=向首，背后=坐山。
 * 例：读数 167.7°（丙方）→ 坐壬向丙（壬山丙向）；读数 180°→ 坐子向午。
 */
export function sittingFacing(deg: number): {
  sittingIdx: number
  facingIdx: number
  sitting: string
  facing: string
  label: string
  deg: number
} {
  const facingIdx = degToMountainIdx(deg)
  const sittingIdx = (facingIdx + 12) % 24
  return {
    sittingIdx,
    facingIdx,
    sitting: MOUNTAINS[sittingIdx],
    facing: MOUNTAINS[facingIdx],
    label: `坐${MOUNTAINS[sittingIdx]}向${MOUNTAINS[facingIdx]}`,
    deg: Math.round((((deg % 360) + 360) % 360) * 10) / 10,
  }
}

// ─── 八卦（后天方位，自北顺时针）───
export interface BaguaItem {
  name: string
  symbol: string
  dir: string
  centerDeg: number
}
export const BAGUA: BaguaItem[] = [
  { name: "坎", symbol: "☵", dir: "北", centerDeg: 0 },
  { name: "艮", symbol: "☶", dir: "东北", centerDeg: 45 },
  { name: "震", symbol: "☳", dir: "东", centerDeg: 90 },
  { name: "巽", symbol: "☴", dir: "东南", centerDeg: 135 },
  { name: "离", symbol: "☲", dir: "南", centerDeg: 180 },
  { name: "坤", symbol: "☷", dir: "西南", centerDeg: 225 },
  { name: "兑", symbol: "☱", dir: "西", centerDeg: 270 },
  { name: "乾", symbol: "☰", dir: "西北", centerDeg: 315 },
]

// ─── 六十四卦（Unicode 卦符 U+4DC0–U+4DFF，圆图匀布）───
/** 生成 64 卦符号，用于三元盘易卦层 */
export const HEXAGRAM_SYMBOLS: string[] = Array.from({ length: 64 }, (_, i) =>
  String.fromCharCode(0x4dc0 + i),
)

/**
 * 伏羲六十四卦圆图卦名（按下卦分宫排列）。
 * 顺时针，乾居正南(180°)、坤居正北(0°)，与三元玄空盘一致。
 * 右半（南→北，下卦序 巽坎艮坤）：乾起，坤止；左半（北→南，下卦序 震离兑乾）复起。
 */
export const HEXAGRAM_NAMES: string[] = [
  "乾", "姤", "大過", "鼎", "恒", "巽", "井", "蠱", "升",
  "訟", "困", "未濟", "解", "渙", "坎", "蒙", "師",
  "遯", "咸", "旅", "小過", "漸", "蹇", "艮", "謙",
  "否", "萃", "晉", "豫", "觀", "比", "剝", "坤",
  "復", "頤", "屯", "益", "震", "噬嗑", "隨", "無妄",
  "明夷", "賁", "既濟", "家人", "豐", "離", "革", "同人",
  "臨", "損", "節", "中孚", "歸妹", "睽", "兌", "履",
  "泰", "大畜", "需", "小畜", "大壯", "大有", "夬",
]

/** 天元龙（每卦三山之中山）：子艮卯巽午坤酉乾，盘面红色高亮 */
export const TIANYUAN_MOUNTAINS = new Set(["子", "艮", "卯", "巽", "午", "坤", "酉", "乾"])

/** 后天八卦三爻阴阳（自下而上）。true=阳爻(整)，false=阴爻(断) */
export const TRIGRAM_LINES: Record<string, [boolean, boolean, boolean]> = {
  乾: [true, true, true],
  兑: [true, true, false],
  离: [true, false, true],
  震: [true, false, false],
  巽: [false, true, true],
  坎: [false, true, false],
  艮: [false, false, true],
  坤: [false, false, false],
}

// ─── 穿山七十二龙（60甲子 + 每卦界缝空亡，共72格）───
const TIANGAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
const DIZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
/** 72 龙：每 5° 一格，八卦交界处为空亡（空），其余顺布六十甲子。 */
export const CHUANSHAN_72: string[] = (() => {
  const out: string[] = []
  let jiazi = 0
  for (let i = 0; i < 72; i++) {
    // 每 9 格（45°=一卦）的首格为界缝空亡
    if (i % 9 === 0) {
      out.push("空")
    } else {
      const gan = TIANGAN[jiazi % 10]
      const zhi = DIZHI[jiazi % 12]
      out.push(gan + zhi)
      jiazi++
    }
  }
  return out
})()

// ─── 三合三针偏移 ───
/** 正针（地盘）=0°基准；人盘中针逆偏 7.5°；天盘缝针顺偏 7.5° */
export const SANHE_NEEDLES = [
  { key: "zheng", name: "地盘正针", offset: 0 },
  { key: "zhong", name: "人盘中针", offset: -7.5 },
  { key: "feng", name: "天盘缝针", offset: 7.5 },
] as const

// ─── haversine 测距（米）───
export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** 米 → 中式尺（1米≈3尺） */
export function metersToChi(m: number): number {
  return m * 3
}

/** 两点连线方位角（度，正北0°顺时针） */
export function bearing(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat))
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng))
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

/** 由方位角求所属八方名 */
export function bearingToDirection(deg: number): string {
  const dirs = ["正北", "东北", "正东", "东南", "正南", "西南", "正西", "西北"]
  return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8]
}
