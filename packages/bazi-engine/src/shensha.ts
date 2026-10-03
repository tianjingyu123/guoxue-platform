/**
 * 合冲刑害检测 + 神煞辅助 + 胎元/命宫/身宫
 */
import type { Gan, Zhi, SiZhu, FenXiTiShi, Pillar } from './types'
import {
  GAN, ZHI,
  GAN_HE_PAIRS, ZHI_HE_PAIRS, ZHI_CHONG_PAIRS, ZHI_HAI_PAIRS,
  ZHI_SAN_HE, ZHI_SAN_HUI, ZHI_SAN_XING, ZHI_ZI_XING,
  ZHI_AN_HE, ZHI_XIANG_PO, ZHI_AN_JUE,
  CHANG_SHENG, DI_SHI, WU_HU_DUN,
} from './constants'
import { calcShiShen } from './sizhu'

/** 天干五合检测 */
export function detectGanHe(gans: Gan[]): string[] {
  const results: string[] = []
  for (let i = 0; i < gans.length; i++) {
    for (let j = i + 1; j < gans.length; j++) {
      const pair: [Gan, Gan] = [gans[i], gans[j]]
      if (GAN_HE_PAIRS.some(([a, b]) =>
        (a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0])
      )) {
        results.push(`${pair[0]}${pair[1]}合`)
      }
    }
  }
  return results
}

/** 地支六合检测 */
export function detectLiuHe(zhis: Zhi[]): string[] {
  const results: string[] = []
  for (let i = 0; i < zhis.length; i++) {
    for (let j = i + 1; j < zhis.length; j++) {
      const pair: [Zhi, Zhi] = [zhis[i], zhis[j]]
      if (ZHI_HE_PAIRS.some(([a, b]) =>
        (a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0])
      )) {
        results.push(`${pair[0]}${pair[1]}合`)
      }
    }
  }
  return results
}

/** 地支三合局检测 */
export function detectSanHe(zhis: Zhi[]): string[] {
  const results: string[] = []
  const zhiSet = new Set(zhis)
  for (const [a, b, c] of ZHI_SAN_HE) {
    if (zhiSet.has(a) && zhiSet.has(b) && zhiSet.has(c)) {
      results.push(`${a}${b}${c}三合`)
    }
    // 半合（任意两个）
    if (zhiSet.has(a) && zhiSet.has(b)) results.push(`${a}${b}半合`)
    if (zhiSet.has(b) && zhiSet.has(c)) results.push(`${b}${c}半合`)
    if (zhiSet.has(a) && zhiSet.has(c)) results.push(`${a}${c}半合`)
  }
  return results
}

/** 地支三会局检测 */
export function detectSanHui(zhis: Zhi[]): string[] {
  const results: string[] = []
  const zhiSet = new Set(zhis)
  for (const [a, b, c] of ZHI_SAN_HUI) {
    if (zhiSet.has(a) && zhiSet.has(b) && zhiSet.has(c)) {
      results.push(`${a}${b}${c}三会`)
    }
  }
  return results
}

/** 六冲检测 */
export function detectLiuChong(zhis: Zhi[]): string[] {
  const results: string[] = []
  for (let i = 0; i < zhis.length; i++) {
    for (let j = i + 1; j < zhis.length; j++) {
      const pair: [Zhi, Zhi] = [zhis[i], zhis[j]]
      if (ZHI_CHONG_PAIRS.some(([a, b]) =>
        (a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0])
      )) {
        results.push(`${pair[0]}${pair[1]}冲`)
      }
    }
  }
  return results
}

/** 六害检测 */
export function detectLiuHai(zhis: Zhi[]): string[] {
  const results: string[] = []
  for (let i = 0; i < zhis.length; i++) {
    for (let j = i + 1; j < zhis.length; j++) {
      const pair: [Zhi, Zhi] = [zhis[i], zhis[j]]
      if (ZHI_HAI_PAIRS.some(([a, b]) =>
        (a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0])
      )) {
        results.push(`${pair[0]}${pair[1]}害`)
      }
    }
  }
  return results
}

/** 三刑检测 */
export function detectSanXing(zhis: Zhi[]): string[] {
  const results: string[] = []
  const zhiSet = new Set(zhis)
  for (const [a, b, c] of ZHI_SAN_XING) {
    if (zhiSet.has(a) && zhiSet.has(b) && zhiSet.has(c)) {
      results.push(`${a}${b}${c}三刑`)
    }
  }
  return results
}

/** 自刑检测 */
export function detectZiXing(zhis: Zhi[]): string[] {
  const results: string[] = []
  const count: Record<string, number> = {}
  for (const z of zhis) {
    count[z] = (count[z] || 0) + 1
  }
  for (const z of ZHI_ZI_XING) {
    if (count[z] >= 2) {
      results.push(`${z}自刑`)
    }
  }
  return results
}

/** 地支暗合检测 */
export function detectAnHe(zhis: Zhi[]): string[] {
  const results: string[] = []
  for (let i = 0; i < zhis.length; i++) {
    for (let j = i + 1; j < zhis.length; j++) {
      for (const [a, b, desc] of ZHI_AN_HE) {
        if ((zhis[i] === a && zhis[j] === b) || (zhis[i] === b && zhis[j] === a)) {
          results.push(desc)
        }
      }
    }
  }
  return results
}

/** 地支相破检测 */
export function detectXiangPo(zhis: Zhi[]): string[] {
  const results: string[] = []
  for (let i = 0; i < zhis.length; i++) {
    for (let j = i + 1; j < zhis.length; j++) {
      for (const [a, b, desc] of ZHI_XIANG_PO) {
        if ((zhis[i] === a && zhis[j] === b) || (zhis[i] === b && zhis[j] === a)) {
          results.push(desc)
        }
      }
    }
  }
  return results
}

/** 地支暗绝检测 */
export function detectAnJue(zhis: Zhi[]): string[] {
  const results: string[] = []
  for (let i = 0; i < zhis.length; i++) {
    for (let j = i + 1; j < zhis.length; j++) {
      for (const [a, b, desc] of ZHI_AN_JUE) {
        if ((zhis[i] === a && zhis[j] === b) || (zhis[i] === b && zhis[j] === a)) {
          results.push(desc)
        }
      }
    }
  }
  return results
}

/** 完整合冲刑害检测 */
export function calcFenXiTiShi(siZhu: SiZhu): FenXiTiShi {
  const gans: Gan[] = [siZhu.nian.gan, siZhu.yue.gan, siZhu.ri.gan, siZhu.shi.gan]
  const zhis: Zhi[] = [siZhu.nian.zhi, siZhu.yue.zhi, siZhu.ri.zhi, siZhu.shi.zhi]

  return {
    ganHe: detectGanHe(gans),
    sanHe: detectSanHe(zhis),
    sanHui: detectSanHui(zhis),
    liuChong: detectLiuChong(zhis),
    liuHe: detectLiuHe(zhis),
    liuHai: detectLiuHai(zhis),
    sanXing: detectSanXing(zhis),
    ziXing: detectZiXing(zhis),
    anHe: detectAnHe(zhis),
    xiangPo: detectXiangPo(zhis),
    anJue: detectAnJue(zhis),
  }
}

// ---------- 胎元 ----------
/** 胎元 = 月干前一位 + 月支前三位 */
export function calcTaiYuan(yueGan: Gan, yueZhi: Zhi, riGan: Gan): Pillar {
  const ganIdx = (GAN.indexOf(yueGan) + 1) % 10
  const zhiIdx = (ZHI.indexOf(yueZhi) + 3) % 12
  const gan = GAN[ganIdx]
  const zhi = ZHI[zhiIdx]
  return {
    gan,
    zhi,
    ganShiShen: calcShiShen(riGan, gan),
    zhiShiShen: calcShiShen(riGan, zhi),
    cangGan: [],
    nayin: '',
  }
}

// ---------- 命宫 / 身宫 ----------

/**
 * 宫干：五虎遁（年上起月法）定寅位天干，再按宫支相对寅的位次顺推。
 *
 * 注意取的是**年柱**天干（立春为界），不是公历年。
 * 这一点由实测数据钉死：144 格样本里只有丑月那一行落在立春之前，
 * 年柱是己卯而非庚辰，宫干整行随之改用己年的五虎遁（丙寅起）——
 * 十二格全部吻合。若误用公历年干，那一行会整行错开。
 */
function gongGan(nianGan: Gan, zhiIdx: number): Gan {
  const yinGanIdx = GAN.indexOf(WU_HU_DUN[GAN.indexOf(nianGan)])
  return GAN[(yinGanIdx + ((zhiIdx - 2) % 12 + 12) % 12) % 10]
}

function makeGong(zhiIdx: number, nianGan: Gan, riGan: Gan): Pillar {
  const zhi = ZHI[zhiIdx]
  const gan = gongGan(nianGan, zhiIdx)
  return {
    gan,
    zhi,
    ganShiShen: calcShiShen(riGan, gan),
    zhiShiShen: calcShiShen(riGan, zhi),
    cangGan: [],
    nayin: '',
  }
}

/**
 * 命宫：卯上起正月**逆**数至生月，再自该宫起子时**逆**数至生时。
 *
 * 化简后 `命宫支序 ≡ 5 − 月支序 − 时支序 (mod 12)`（子＝0）。
 *
 * 🔴 2026-09-19 修。原实现是 `(月支序 + 时支序) % 12`，注释还写着「顺数」——
 * 方向与基准相反，且没有那个常数项。寅月子时原本算出「寅」，实测是「卯」。
 *
 * 基准来源：旧版 App `cn.net.rebu.bazi` 实机逐盘排出的 **12×12 全矩阵**
 * （固定 2000 年·男·真太阳时关，只变月支与时辰；月支取月中、远离节气交界 ≥10 天，
 * 时辰取各时辰中点；uiautomator 读结果页文本，非 OCR）。
 * 本式对 **144/144 格全中，地支与天干皆无例外**。
 *
 * 决策人口径：「以前我们都是按照旧版这样排的」——跟旧版。
 *
 * **月支而非农历月**（2026-09-19 补采 4 格判别样本实测定案）：
 * 上述 144 格全取在月中，农历月与节气月格格重合，判不出取的是哪一个；
 * 另采的 4 格给出 **月支 4/4、两种农历月口径各 1/4**。
 * 其中非闰月的两格已使农历月方案出局，闰四月的两格进一步证明
 * **闰月不扰动本规则**（排除「平时取月支、闰月特殊处理」）。
 * 结论：本式根本不经过农历月这一步，闰月对命宫/身宫不产生影响。
 * 判别样本钉在 `__tests__/fixtures/minggong-shengong-144.json` 的 `discriminating` 里——
 * 若有人改回按农历月推算，144 格矩阵**照样全绿**，只有那 4 格会红。
 */
export function calcMingGong(yueZhi: Zhi, shiZhi: Zhi, nianGan: Gan, riGan: Gan): Pillar {
  const idx = (5 - ZHI.indexOf(yueZhi) - ZHI.indexOf(shiZhi) + 24) % 12
  return makeGong(idx, nianGan, riGan)
}

/**
 * 身宫：起点同命宫（卯上起正月），但月、时皆**顺**数。
 *
 * 化简后 `身宫支序 ≡ 1 + 月支序 + 时支序 (mod 12)`（子＝0）。
 *
 * 🔴 2026-09-19 修。原实现是 `(月支序 − 时支序) % 12`、注释写「逆数」，
 * 同样方向反了。命宫与身宫两个方向**恰好被对调**。
 *
 * 由两式可直接推出 `命宫支序 + 身宫支序 ≡ 6 (mod 12)` 恒成立。
 * 采样方把这条当作自检项报了过来（144/144 成立），
 * 但它是两式的**代数推论**，不构成独立证据——真正的判据是逐格比对。
 */
export function calcShenGong(yueZhi: Zhi, shiZhi: Zhi, nianGan: Gan, riGan: Gan): Pillar {
  const idx = (1 + ZHI.indexOf(yueZhi) + ZHI.indexOf(shiZhi)) % 12
  return makeGong(idx, nianGan, riGan)
}

// ---------- 十二长生地势 ----------
/** 计算某个天干在地支的十二长生地势 */
export function calcDiShi(gan: Gan, zhi: Zhi): string {
  const changShengZhi = CHANG_SHENG[gan]
  if (!changShengZhi) return ''
  const csIdx = ZHI.indexOf(changShengZhi)
  const zhiIdx = ZHI.indexOf(zhi)
  const ganIdx = GAN.indexOf(gan)
  const isYang = ganIdx % 2 === 0
  // 阳干顺行，阴干逆行
  const offset = isYang
    ? ((zhiIdx - csIdx) % 12 + 12) % 12
    : ((csIdx - zhiIdx) % 12 + 12) % 12
  return DI_SHI[offset]
}

// ---------- 旺相休囚死 ----------
/** 旺相休囚死（按月令判断天干状态） */
export function calcWangXiang(riGan: Gan, yueZhi: Zhi): string {
  // 月令五行：寅卯木、巳午火、申酉金、亥子水、辰戌丑未土
  const wuXing: Record<string, string> = {
    '甲': '木','乙': '木',
    '丙': '火','丁': '火',
    '戊': '土','己': '土',
    '庚': '金','辛': '金',
    '壬': '水','癸': '水',
  }
  const zhiWuXing: Record<string, string> = {
    '寅': '木','卯': '木',
    '巳': '火','午': '火',
    '申': '金','酉': '金',
    '亥': '水','子': '水',
    '辰': '土','戌': '土','丑': '土','未': '土',
  }

  const riWx = wuXing[riGan]
  const yueWx = zhiWuXing[yueZhi]

  // 月令生我 → 相，月令同我 → 旺，我生月令 → 休，我克月令 → 囚，月令克我 → 死
  const shengMap: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' }
  const keMap: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' }

  if (riWx === yueWx) return '旺'
  if (shengMap[yueWx] === riWx) return '相'
  if (shengMap[riWx] === yueWx) return '休'
  if (keMap[riWx] === yueWx) return '囚'
  if (keMap[yueWx] === riWx) return '死'
  return ''
}
