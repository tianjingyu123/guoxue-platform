// 小六壬推算核心——自 V0 app/xiaoliuren/result/page.tsx 内嵌逻辑逐段搬移
// 六宫掐指起课（大安/留连/速喜/赤口/小吉/空亡），支持道家/江氏/江氏2 三流派、时间/报数两种起课
// 四柱依赖 @/lib/paipan/ganzhi 真实引擎（VSOP87 节气定月柱）

import { Solar } from '@/pkg-paipan/lib/lunar/index.js'
import { GANS, ZHIS, fourPillars, kongWang } from '@/lib/paipan/ganzhi'

export const TIANGAN = GANS as readonly string[]
export const DIZHI = ZHIS as readonly string[]

// 六宫（起课循环序）
export const PALACES = ['大安', '留连', '速喜', '赤口', '小吉', '空亡'] as const
// 宫位显示布局：上行 留连/速喜/赤口，下行 大安/空亡/小吉
export const GRID_ORDER = [1, 2, 3, 0, 5, 4]
// 宫五行
export const PALACE_WX: Record<string, string> = { 大安: '木', 留连: '土', 速喜: '火', 赤口: '金', 小吉: '水', 空亡: '土' }

// 五行颜色（V0 tailwind 色 → 固定色值）
export const WX_TEXT: Record<string, string> = {
  木: '#16a34a', 火: '#dc2626', 土: '#b45309', 金: '#ca8a04', 水: '#2563eb',
}
export const WX_BAR: Record<string, string> = {
  木: '#22c55e', 火: '#ef4444', 土: '#b45309', 金: '#eab308', 水: '#3b82f6',
}
export const GAN_WX: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
}
export const ZHI_WX: Record<string, string> = {
  寅: '木', 卯: '木', 巳: '火', 午: '火', 辰: '土', 戌: '土', 丑: '土', 未: '土',
  申: '金', 酉: '金', 亥: '水', 子: '水',
}
// 九星（按宫支五行取星）
export const WX_STAR: Record<string, string> = { 木: '辅', 火: '英', 土: '芮', 金: '柱', 水: '蓬' }

// 六神
const LIUSHEN_DAOJIA = ['青龙', '朱雀', '螣蛇', '白虎', '玄武', '勾陈']
const LIUSHEN_JIANGSHI = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']
// 日干起六神：甲乙青龙 丙丁朱雀 戊勾陈 己螣蛇 庚辛白虎 壬癸玄武
const DAY_GAN_SHEN: Record<string, string> = {
  甲: '青龙', 乙: '青龙', 丙: '朱雀', 丁: '朱雀', 戊: '勾陈', 己: '螣蛇', 庚: '白虎', 辛: '白虎', 壬: '玄武', 癸: '玄武',
}

// ─── 宫位详解 ───
export const PALACE_INFO: Record<string, { meta: string; jue: string }> = {
  大安: {
    meta: '为青龙木，属春季，位在东方，地支为寅卯，数为一、五、七。有安稳、吉祥之含义。',
    jue: '大安事事昌，求谋在东方，失物去不远，宅舍保安康。行人身未动，病者主无妨，将军回田野，仔细更推详。',
  },
  留连: {
    meta: '为土，属四季土，位在四维，地支为辰未，数为二、八、十。有迟滞、纠缠之含义。',
    jue: '留连事难成，求谋日未明，官事凡宜缓，去者未回程。失物南方见，急讨方称心，更须防口舌，人口且平平。',
  },
  速喜: {
    meta: '为朱雀火，属夏季，位在南方，地支为巳午，数为三、六、九。有快速、喜庆之含义。',
    jue: '速喜喜来临，求财向南行，失物申未午，逢人路上寻。官事有福德，病者无祸侵，田宅六畜吉，行人有信音。',
  },
  赤口: {
    meta: '为白虎金，属秋季，位在西方，地支为申酉，数为四、七、十。有口舌、官非之含义。',
    jue: '赤口主口舌，官非切宜防，失物急去寻，行人有惊慌。六畜多作怪，病者出西方，更须防咀咒，恐怕染瘟殃。',
  },
  小吉: {
    meta: '人来喜时，为玄武水，属冬季，位在北方，地支为亥子，数为五、三、八。有和合、吉利之含义。',
    jue: '小吉最吉昌，路上好商量，阴人来报喜。失物在坤方(西南)，行人立便至，交易甚是强，凡事皆和合，病者祈上苍。',
  },
  空亡: {
    meta: '为勾陈土，属中央，地支为戌丑，数为六、九、十。有落空、虚耗之含义。',
    jue: '空亡事不祥，阴人多乖张，求财无利益，行人有灾殃。失物寻不见，官事有刑伤，病人逢暗鬼，禳解保安康。',
  },
}
export const LIUQIN_INFO: Record<string, string> = {
  父母: '主长辈、文书、房屋、车辆、庇护之事。父母临宫主有长辈助力，或文书信息之事。',
  兄弟: '主朋友，平辈。兄弟临吉位主朋友相助；临凶位主竞争、破财、口舌之事。',
  子孙: '主晚辈、下属、福神。子孙临宫主忧愁可解，谋事有福；亦主小儿、宠物之事。',
  妻财: '主财物、妻子、钱财之事。妻财临吉位主求财顺利；临凶位主财物耗损。',
  官鬼: '主官司、疾病、压力、工作。官鬼临吉位主功名有望；临凶位主官非疾病。',
  自身: '为求测人本人，代表自己当下的状态与位置。自身所临之宫，即事之核心。',
}
export const LIUSHEN_INFO: Record<string, string> = {
  青龙: '五行属木，主喜事、财帛、贵人。青龙主动，主新事、生机、酒宴、婚喜之事。',
  朱雀: '五行属火，主口舌、文书、信息。朱雀主言语是非，亦主文章、消息、音信。',
  勾陈: '五行属土，主田土，房产，契约之事。勾陈主慢，拖延，凝滞，阻力。主陈旧，老的，熟人，旧事。',
  螣蛇: '五行属火，主虚惊、怪异、缠绕。螣蛇主事多虚惊，缠绵不清，或有惊恐怪梦。',
  白虎: '五行属金，主凶伤、道路、血光。白虎主刚猛急速，主伤灾、手术、交通之事。',
  玄武: '五行属水，主暗昧、盗失、欺骗。玄武主阴私暗昧之事，防盗失、防小人暗算。',
}

// ─── 日时断（六六三十六断）───
export const RISHI_DUAN: Record<string, string> = {
  '大安+大安': '身命两安然，谋为宜守旧，失物不出户，行人尚未还。',
  '大安+留连': '安中有滞，事缓则圆，失物难寻，行人未至。',
  '大安+速喜': '静中逢喜，谋事可成，婚姻有分，失物东南寻。',
  '大安+赤口': '安中防口舌，谋事莫与人争，失物防人取，行人有阻声。',
  '大安+小吉': '安而且吉，百事和合，求财有利，行人即归。',
  '大安+空亡': '外安内虚，谋事多空，失物难见，病者宜禳解。',
  '留连+大安': '迟中转安，久谋方成，失物家内寻，行人缓步归。',
  '留连+留连': '事事拖延，反复难定，失物南方，行人无音。',
  '留连+速喜': '先迟后喜，事将转机，文书将至，失物午未寻。',
  '留连+赤口': '迟滞加口舌，谋事防小人，官非宜缓解，失物急去寻。',
  '留连+小吉': '缓中有吉，阴人相助，婚姻可成，行人在路。',
  '留连+空亡': '迟而落空，谋为不利，失物难寻，病者留连。',
  '速喜+大安': '喜中得安，谋事顺遂，求财东方，行人将至。',
  '速喜+留连': '喜中有滞，先得后缓，文书有阻，失物南方寻。',
  '速喜+速喜': '喜上加喜，百事速成，求财大利，音信立至。',
  '速喜+赤口': '喜中防舌，乐极防争，交易防失，官事有惊。',
  '速喜+小吉': '喜吉相逢，凡事大吉，婚姻天成，病者即愈。',
  '速喜+空亡': '喜而不实，虚喜一场，谋事防空，失物难见。',
  '赤口+大安': '口舌得解，凶中化安，官非可息，行人平安。',
  '赤口+留连': '口舌缠绵，官非拖延，谋事不利，失物难寻。',
  '赤口+速喜': '争中有喜，讼事得理，失物急寻可得，行人有信。',
  '赤口+赤口': '口舌重重，官非莫入，出行不利，六畜防怪。',
  '赤口+小吉': '先凶后吉，口舌自散，谋事晚成，行人便至。',
  '赤口+空亡': '口舌落空，虚惊一场，官非自散，病者宜解。',
  '小吉+大安': '吉而且安，万事亨通，求谋两遂，家宅安康。',
  '小吉+留连': '吉中有缓，好事多磨，婚姻迟成，行人在途。',
  '小吉+速喜': '吉喜临门，谋望速成，财喜两至，音信即来。',
  '小吉+赤口': '吉中防口，和合防争，交易可成，慎防反复。',
  '小吉+小吉': '二吉重逢，事事和合，求财大利，行人立至。',
  '小吉+空亡': '吉而有虚，谋事七分，失物坤方，缓则落空。',
  '空亡+大安': '空中得安，先失后稳，谋为守静，病者无妨。',
  '空亡+留连': '空而又缓，百事无成，行人无信，失物难寻。',
  '空亡+速喜': '空亡加速喜，事事怨自己，婚姻有一定，失物在家里。',
  '空亡+赤口': '空中口舌，虚言诳语，防人暗算，官事无凭。',
  '空亡+小吉': '空中有吉，绝处逢生，阴人暗助，晚有好音。',
  '空亡+空亡': '万事皆空，谋为莫动，静守为上，祈禳自安。',
}

// ─── 四柱推算（共享 ganzhi 引擎：节气定月柱+北京时间日柱）───
export interface PillarLite { g: string; z: string; gi: number; zi: number }
export interface SizhuLite { year: PillarLite; month: PillarLite; day: PillarLite; hour: PillarLite }

export function getSizhu(year: number, month: number, day: number, hour: number, minute = 0): SizhuLite {
  const fp = fourPillars(year, month, day, hour, minute)
  const wrap = (p: { gan: string; zhi: string }): PillarLite => ({
    g: p.gan,
    z: p.zhi,
    gi: TIANGAN.indexOf(p.gan),
    zi: DIZHI.indexOf(p.zhi),
  })
  return { year: wrap(fp.year), month: wrap(fp.month), day: wrap(fp.day), hour: wrap(fp.hour) }
}

/** 某柱的旬空（两支连写，如「戌亥」） */
export function getKong(gi: number, zi: number): string {
  return kongWang(gi, zi).join('')
}

/** 六十甲子序号 */
export function jiaziIndex(gi: number, zi: number): number {
  for (let i = 0; i < 60; i++) if (i % 10 === gi && i % 12 === zi) return i
  return 0
}

/** 五行生克 → 六亲（me=日干五行，other=宫支五行） */
export function liuqin(me: string, other: string): string {
  if (me === other) return '兄弟'
  const sheng: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
  if (sheng[other] === me) return '父母'
  if (sheng[me] === other) return '子孙'
  const ke: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }
  if (ke[other] === me) return '官鬼'
  return '妻财'
}

// ─── 排盘核心 ───
export interface PalaceResult {
  name: string
  liushen: string
  star: string // 如 "柱金" / "任空"
  starKong: boolean
  gan: string
  zhi: string
  qin: string
  markers: string[] // 月/日/时
}

export interface PaipanResult {
  palaces: PalaceResult[]
  monthPalace: number
  dayPalace: number
  hourPalace: number
}

export function paiPan(opts: {
  school: string
  lunarMonth: number
  lunarDay: number
  hourNum: number
  numbers: number[] | null
  sizhu: SizhuLite
}): PaipanResult {
  const { school, lunarMonth, lunarDay, hourNum, numbers, sizhu } = opts
  // 月/日/时 落宫
  let n1 = lunarMonth
  let n2 = lunarDay
  let n3 = hourNum
  if (numbers && numbers.length > 0) {
    n1 = numbers[0]
    n2 = numbers[1] ?? numbers[0]
    n3 = numbers[2] ?? numbers[numbers.length - 1]
  }
  const monthPalace = (n1 - 1) % 6
  const dayPalace = (monthPalace + n2 - 1) % 6
  const hourPalace = (dayPalace + n3 - 1) % 6

  // 干支：时柱定于时宫，按宫序每宫 +2 位六十甲子
  const hourGZ = jiaziIndex(sizhu.hour.gi, sizhu.hour.zi)
  const ganzhi: { g: string; z: string }[] = new Array(6)
  for (let d = 0; d < 6; d++) {
    const idx = (hourGZ + 2 * d) % 60
    ganzhi[(hourPalace + d) % 6] = { g: TIANGAN[idx % 10], z: DIZHI[idx % 12] }
  }

  // 六神
  const shen: string[] = new Array(6)
  if (school === 'daojia') {
    // 道家：青龙起日宫，顺行
    for (let d = 0; d < 6; d++) shen[(dayPalace + d) % 6] = LIUSHEN_DAOJIA[d]
  } else {
    // 江氏：日干定首神。江氏起大安，江氏2（活六神）起时宫
    const first = DAY_GAN_SHEN[sizhu.day.g]
    const startIdx = LIUSHEN_JIANGSHI.indexOf(first)
    const anchor = school === 'jiangshi2' ? hourPalace : 0
    for (let d = 0; d < 6; d++) shen[(anchor + d) % 6] = LIUSHEN_JIANGSHI[(startIdx + d) % 6]
  }

  // 日柱旬空
  const dayKong = getKong(sizhu.day.gi, sizhu.day.zi)
  const meWx = GAN_WX[sizhu.day.g]

  const palaces: PalaceResult[] = PALACES.map((name, i) => {
    const gz = ganzhi[i]
    const zhiWx = ZHI_WX[gz.z]
    const isKongZhi = dayKong.includes(gz.z)
    const star = isKongZhi ? '任空' : `${WX_STAR[zhiWx]}${zhiWx}`
    let qin = liuqin(meWx, zhiWx)
    if (gz.g === sizhu.day.g) qin = '兄弟'
    if (i === hourPalace) qin = '自身'
    const markers: string[] = []
    if (i === monthPalace) markers.push('月')
    if (i === dayPalace) markers.push('日')
    if (i === hourPalace) markers.push('时')
    return { name, liushen: shen[i], star, starKong: isKongZhi, gan: gz.g, zhi: gz.z, qin, markers }
  })

  return { palaces, monthPalace, dayPalace, hourPalace }
}

// ─── 农历（lunar-typescript 真历法，多端一致；替代 V0 的 Intl 方案——小程序端无 Intl） ───
const CN_DAY = ['', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十']
const CN_MONTH = ['', '一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

export function getLunar(year: number, month: number, day: number): { m: number; d: number; text: string } {
  try {
    const lunar = Solar.fromYmd(year, month, day).getLunar()
    const rawM = lunar.getMonth() // 负数表示闰月
    const isLeap = rawM < 0
    const m = Math.abs(rawM)
    const d = lunar.getDay()
    return { m, d, text: `${isLeap ? '闰' : ''}${CN_MONTH[m]}${CN_DAY[d] || d}` }
  } catch {
    // 极端异常时退化为公历数字起课（与 V0 catch 分支一致）
    return { m: month, d: day, text: '' }
  }
}
