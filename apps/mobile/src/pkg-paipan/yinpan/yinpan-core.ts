/**
 * 阴盘奇门·共享核心（阴盘奇门 / 阴盘命理奇门两工具共用）
 * 视图模型转换、移星换斗、月将/外圈神将、宫位断语字典。
 * 盘面计算全部走 @/pkg-paipan/lib/qimen-engine（黄金案例已验证），此处只做展示层。
 */
import {
  type QimenResult,
  RING_PALACES,
  PALACE_DIZHI,
} from '@/pkg-paipan/lib/qimen-engine'
import { findTerm } from '@/lib/paipan/jieqi'

// ─── 基础常量 ───
export const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

export const BASHEN_SHORT: Record<string, string> = {
  值符: '符', 腾蛇: '蛇', 太阴: '阴', 六合: '六', 白虎: '白', 玄武: '玄', 九地: '地', 九天: '天',
}
export const JIUXING_SHORT: Record<string, string> = {
  天蓬: '蓬', 天任: '任', 天冲: '冲', 天辅: '辅', 天英: '英', 天芮: '芮', 天柱: '柱', 天心: '心', 天禽: '禽',
}
export const BAMEN_SHORT: Record<string, string> = {
  休门: '休', 生门: '生', 伤门: '伤', 杜门: '杜', 景门: '景', 死门: '死', 惊门: '惊', 开门: '开',
}

/** 先天宫（宫位详解用） */
export const XIANTIAN_GONG = ['', '坤', '巽', '离', '兑', '', '艮', '坎', '乾', '震']
/** 宫位取数（宫位详解用） */
export const PALACE_NUMS: Record<number, string> = {
  1: '1，6', 2: '2，5，8', 3: '3，8', 4: '4，9', 5: '5，10',
  6: '1，4，6，9', 7: '2，7', 8: '5，8，10', 9: '3，4，9',
}

/** 局数选项（自动 + 阳遁1-9 + 阴遁1-9） */
export const JU_OPTIONS = [
  '自动定局',
  '阳遁1局', '阳遁2局', '阳遁3局', '阳遁4局', '阳遁5局',
  '阳遁6局', '阳遁7局', '阳遁8局', '阳遁9局',
  '阴遁1局', '阴遁2局', '阴遁3局', '阴遁4局', '阴遁5局',
  '阴遁6局', '阴遁7局', '阴遁8局', '阴遁9局',
]

// ─── 十二神将 / 建除 / 贵神 ───
export const SHENJIANG = ['神后子', '大吉丑', '功曹寅', '太冲卯', '天罡辰', '太乙巳', '胜光午', '小吉未', '传送申', '从魁酉', '河魁戌', '登明亥']
export const JIANCHU = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭']
export const GUISHEN_12 = ['贵人', '腾蛇', '朱雀', '六合', '勾陈', '青龙', '天空', '白虎', '太常', '玄武', '太阴', '天后']
export const GUISHEN_ALT = ['天牢', '玉堂', '白虎', '金匮', '天德', '朱雀', '天刑', '明堂', '青龙', '司命', '勾陈', '玄武']

/** 月将（按中气：太阳过宫） */
export const YUEJIANG_BY_ZHONGQI: [string, string][] = [
  ['雨水', '亥'], ['春分', '戌'], ['谷雨', '酉'], ['小满', '申'], ['夏至', '未'], ['大暑', '午'],
  ['处暑', '巳'], ['秋分', '辰'], ['霜降', '卯'], ['小雪', '寅'], ['冬至', '丑'], ['大寒', '子'],
]

// ─── 干支组合断语（宫位详解） ───
export const GEJU_MEANINGS: Record<string, string> = {
  '己+壬': '地网高张。女子奸恶，男子遭伤，门迫星凶，两人俱亡，百事无成。凶。',
  '戊+己': '青龙相合。主有财运婚喜，门生宫百事吉，门克宫好事多磨。',
  '丙+辛': '天狱。主官司败诉，有牢狱之灾，谋事不宜。',
  '庚+庚': '太白同宫。主事多阻隔，不利经商出行。',
  '乙+辛': '青龙逃走。主人亡财破，奴仆拐带，六畜皆伤。凶。',
  '壬+癸': '幼女奸淫。主家丑外扬，讼狱难明。',
  '丁+癸': '朱雀投江。主文书口舌是非，音信沉溺不到。',
  '辛+乙': '白虎猖狂。主人亡家败，远行多殃，尊长不喜。',
}
export const MEN_COMBO: Record<string, string> = {
  '杜+开': '主见贵人官长，谋事主先破己财，后吉。',
  '杜+己': '主私谋害人招非。',
  '开+休': '主开创谋望皆顺，见贵求财两相宜。',
  '生+死': '主谋事先难后易，田宅之事有阻。',
  '景+惊': '主文书印信惊恐，虚惊之后有喜。',
}
/** 天干单象（宫位详解） */
export const GAN_XIANG: Record<string, string> = {
  甲: '甲为阳木，为参天大树，主首领、尊长、高贵，性直向上。',
  乙: '乙为阴木，为花草藤蔓，主柔和曲折，医药技艺，妻财之事。',
  丙: '丙为阳火，为太阳之火，主光明显达，性烈而急，文书炎上。',
  丁: '丁为阴火，为星烛之光，主文书信息，玉女私情，性柔内热。',
  戊: '戊为阳土，为城墙高山，主钱财资本，稳重迟缓，信实厚重。',
  己: '己为阴土，为田园之土，有培木溶水之能，其性温质软，低洼向阴。主人形体单薄，忧愁之相。',
  庚: '庚为阳金，为刀剑顽金，主阻隔凶讼，道路白虎，性刚而锐。',
  辛: '辛为阴金，为珠玉首饰，主错误罪愆，革故鼎新，小巧精细。',
  壬: '壬为阳水，为江河大水，主流动奔波，孕育智慧，暗昧不明。',
  癸: '癸为阴水，为雨露沟渠，主玄机闭塞，天网法律，阴私缠绵。',
}

// ─── 盘面视图模型 ───
export interface PalaceData {
  bashen: string
  jiuxing: string
  bamen: string
  tianGan: string
  diGan: string
  /** 值符宫双干 */
  tianGan2?: string
  /** 坤2宫中宫寄干 */
  diGan2?: string
  changsheng: { shen: string; tian: string; di: string }
  isZhifu: boolean
  isZhishi: boolean
  /** 入墓的干 */
  ruMu: string[]
  /** 击刑的干 */
  jiXing: string[]
  /** 门迫 */
  menPo: boolean
  /** 刑+墓 */
  xingMu: string[]
}

/** 真实引擎结果 → 阴盘盘面视图模型（中宫寄坤2） */
export function toYinpanVM(qr: QimenResult): Record<number, PalaceData> {
  const out: Record<number, PalaceData> = {}
  const zhongGan = qr.palaces[5]?.diGan || '' // 中宫地盘干（寄坤2）
  for (let p = 1; p <= 9; p++) {
    const pl = qr.palaces[p]
    if (!pl) continue
    out[p] = {
      bashen: pl.shen,
      jiuxing: pl.star,
      bamen: pl.men,
      tianGan: pl.tianGan,
      tianGan2: pl.tianGan2,
      diGan: pl.diGan,
      diGan2: p === 2 ? zhongGan : undefined,
      changsheng: { shen: '', tian: pl.csTian, di: pl.csDi },
      isZhifu: pl.isZhifu,
      isZhishi: pl.isZhishi,
      ruMu: pl.ruMu,
      jiXing: pl.jiXing,
      xingMu: pl.xingMu,
      menPo: pl.menPo,
    }
  }
  return out
}

/** 移星换斗：天盘组（神/星/门/天盘干）顺转 n 宫，地盘不动 */
export function rotateBoard(base: Record<number, PalaceData>, n: number): Record<number, PalaceData> {
  const out: Record<number, PalaceData> = {}
  if (base[5]) out[5] = base[5]
  for (let r = 0; r < 8; r++) {
    const from = RING_PALACES[r]
    const to = RING_PALACES[(r + n) % 8]
    const src = base[from]
    const dst = base[to]
    if (!src || !dst) continue
    out[to] = {
      ...dst,
      bashen: src.bashen,
      jiuxing: src.jiuxing,
      bamen: src.bamen,
      tianGan: src.tianGan,
      tianGan2: src.tianGan2,
      isZhifu: src.isZhifu,
      isZhishi: src.isZhishi,
      // 转后状态以显示为主：清空状态色与长生，避免误导
      ruMu: [], jiXing: [], xingMu: [], menPo: false,
      changsheng: { shen: '', tian: '', di: '' },
    }
  }
  return out
}

/** 干字状态色 class（刑+墓=天蓝 / 入墓=琥珀 / 击刑=紫） */
export function ganColorCls(gan: string, d: PalaceData): string {
  if (d.xingMu.includes(gan)) return 'g-xm'
  if (d.ruMu.includes(gan)) return 'g-rm'
  if (d.jiXing.includes(gan)) return 'g-jx'
  return ''
}

/** 月将地支（按中气太阳过宫，精确节气计算；钟面按北京时间解释） */
export function yuejiangZhiOf(date: Date): string {
  const t =
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()) -
    8 * 3600000
  let best: { time: number; zhi: string } | null = null
  for (const yy of [date.getFullYear() - 1, date.getFullYear()]) {
    for (const [term, zhi] of YUEJIANG_BY_ZHONGQI) {
      const tt = findTerm(yy, term).getTime()
      if (tt <= t && (!best || tt > best.time)) best = { time: tt, zhi }
    }
  }
  return best?.zhi || '子'
}

// ─── 外圈神将 ───
export interface OuterRingItem {
  zhi: string
  label: string
  jianchu?: string
}

export type ShenjiangMode = 'year' | 'month' | 'day' | 'hour'

/** 外圈十二位：天门地户=月将+建除；年月日时神将=贵神12位 */
export function buildOuterRing(
  showTianmen: boolean,
  shenjiangMode: ShenjiangMode | null,
  yuejiangIdx: number,
): OuterRingItem[] | null {
  if (showTianmen) {
    return DIZHI.map((zhi, i) => ({
      zhi,
      label: (SHENJIANG[(yuejiangIdx + i) % 12] || '').slice(0, 2) + zhi,
      jianchu: JIANCHU[(i + yuejiangIdx * 5) % 12],
    }))
  }
  if (shenjiangMode) {
    const baseIdx = { year: 0, month: 3, day: 6, hour: 9 }[shenjiangMode]
    const list = shenjiangMode === 'day' || shenjiangMode === 'hour' ? GUISHEN_ALT : GUISHEN_12
    return DIZHI.map((zhi, i) => ({
      zhi,
      label: list[(i + baseIdx + yuejiangIdx) % 12] || '',
    }))
  }
  return null
}

/** 用神落宫：某天干在盘面（天/地盘）出现的宫位 */
export function findGanPalaces(palaces: Record<number, PalaceData>, gan: string): number[] {
  return Object.entries(palaces)
    .filter(([p, d]) => Number(p) !== 5 && (d.tianGan === gan || d.diGan === gan || d.tianGan2 === gan))
    .map(([p]) => Number(p))
}

/** 某地支所在宫位（外圈定位用） */
export function zhiPalaces(zhi: string): number[] {
  return RING_PALACES.filter((p) => (PALACE_DIZHI[p] || []).includes(zhi))
}

/** 六十甲子年干支（流年展开用） */
const GAN10 = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
export function yearGZ(y: number): { gan: string; zhi: string } {
  return {
    gan: GAN10[(((y - 4) % 10) + 10) % 10] || '甲',
    zhi: DIZHI[(((y - 4) % 12) + 12) % 12] || '子',
  }
}
