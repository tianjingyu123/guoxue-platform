/**
 * 择吉引擎（普通择吉 · 本地真算）
 *
 * 万年历的「择日」tab 上个批次被整块砍掉了，理由是「AI 接口功能」——
 * 但普通择吉根本不需要 AI：老黄历本来就逐日载明宜忌/建除/天神/吉神凶煞，
 * 择吉就是「按事项筛日子 + 按吉凶排序」，是查表和排序，不是生成。
 * （V0 的「专业精批」那一档才要结合事主生辰做神煞筛选，那档留给 AI 批次。）
 *
 * 语料与全站同源：pkg-paipan/lib/lunar（《协纪辨方书》语料，与万年历日视图同一份），
 * 所以择吉推荐的日子点进黄历，宜忌逐字对得上——不会出现「择吉说宜嫁娶、黄历说忌嫁娶」。
 *
 * 每条推荐都给得出理由（reason），不做黑箱打分。
 */
import { Solar, Lunar } from './lunar/index.js'
import { dayLuck } from './wannianli-engine'

/** 择吉事项：label 是用户看的白话，terms 是黄历里的正式用语（命中任一即算） */
export interface ZejiEvent {
  key: string
  label: string
  terms: string[]
}

export interface ZejiCategory {
  key: string
  label: string
  events: ZejiEvent[]
}

/**
 * 事项表（沿用 V0 的六大类）。
 * 🔴 「开业/搬家/签约」是白话，老黄历里没有这三个词，分别对应「开市」「移徙·入宅」「立券·交易」——
 *    直接拿白话去匹配会一条都命中不了（实测引擎 120 天语料里这三个词出现 0 次）。
 */
export const ZEJI_CATEGORIES: ZejiCategory[] = [
  {
    key: 'common',
    label: '常用',
    events: [
      { key: 'jiaqu', label: '嫁娶', terms: ['嫁娶'] },
      { key: 'kaiye', label: '开业', terms: ['开市'] },
      { key: 'banjia', label: '搬家', terms: ['移徙', '入宅'] },
      { key: 'chuxing', label: '出行', terms: ['出行'] },
      { key: 'qianyue', label: '签约', terms: ['立券', '交易'] },
      { key: 'jisi', label: '祭祀', terms: ['祭祀'] },
      { key: 'qifu', label: '祈福', terms: ['祈福'] },
      { key: 'dongtu', label: '动土', terms: ['动土'] },
    ],
  },
  {
    key: 'marriage',
    label: '婚姻嫁娶',
    events: [
      { key: 'dingmeng', label: '订盟', terms: ['订盟'] },
      { key: 'nacai', label: '纳采', terms: ['纳采'] },
      { key: 'jiaqu2', label: '嫁娶', terms: ['嫁娶'] },
      { key: 'anchuang', label: '安床', terms: ['安床'] },
      { key: 'hezhang', label: '合帐', terms: ['合帐'] },
      { key: 'guanji', label: '冠笄', terms: ['冠笄'] },
      { key: 'huiqinyou', label: '会亲友', terms: ['会亲友'] },
    ],
  },
  {
    key: 'life',
    label: '生活起居',
    events: [
      { key: 'ruzhai', label: '入宅', terms: ['入宅', '移徙'] },
      { key: 'chuxing2', label: '出行', terms: ['出行'] },
      { key: 'lifa', label: '理发', terms: ['理发'] },
      { key: 'muyu', label: '沐浴', terms: ['沐浴'] },
      { key: 'saoshe', label: '扫舍', terms: ['扫舍'] },
      { key: 'qiuyi', label: '求医', terms: ['求医', '治病'] },
      { key: 'jiechu', label: '解除', terms: ['解除'] },
    ],
  },
  {
    key: 'trade',
    label: '生产贸易',
    events: [
      { key: 'kaishi', label: '开市', terms: ['开市'] },
      { key: 'jiaoyi', label: '交易', terms: ['交易'] },
      { key: 'liquan', label: '立券', terms: ['立券'] },
      { key: 'nacai2', label: '纳财', terms: ['纳财'] },
      { key: 'kaicang', label: '开仓', terms: ['开仓'] },
      { key: 'nachu', label: '纳畜', terms: ['纳畜'] },
    ],
  },
  {
    key: 'build',
    label: '建筑迁移',
    events: [
      { key: 'dongtu2', label: '动土', terms: ['动土'] },
      { key: 'shangliang', label: '上梁', terms: ['上梁'] },
      { key: 'qiji', label: '起基', terms: ['起基'] },
      { key: 'xiuzao', label: '修造', terms: ['修造'] },
      { key: 'zuozao', label: '作灶', terms: ['作灶'] },
      { key: 'chaixie', label: '拆卸', terms: ['拆卸'] },
      { key: 'putu', label: '破土', terms: ['破土'] },
    ],
  },
  {
    key: 'ritual',
    label: '祭祀祈福',
    events: [
      { key: 'jisi2', label: '祭祀', terms: ['祭祀'] },
      { key: 'qifu2', label: '祈福', terms: ['祈福'] },
      { key: 'qiusi', label: '求嗣', terms: ['求嗣'] },
      { key: 'zhaijiao', label: '斋醮', terms: ['斋醮'] },
      { key: 'kaiguang', label: '开光', terms: ['开光'] },
      { key: 'suhui', label: '塑绘', terms: ['塑绘'] },
      { key: 'xietu', label: '谢土', terms: ['谢土'] },
    ],
  },
]

/** 按 label 找事项（黄历宜忌点击联动时，传进来的是「嫁娶」这样的词） */
export function findEventByTerm(term: string): ZejiEvent | null {
  for (const c of ZEJI_CATEGORIES) {
    for (const e of c.events) {
      if (e.label === term || e.terms.includes(term)) return e
    }
  }
  return null
}

export interface ZejiDay {
  /** 供页面跳黄历日视图用 */
  date: Date
  solarText: string
  weekday: string
  lunarText: string
  ganzhi: string
  /** 吉度 0–100 */
  score: number
  /** 黄道/黑道 */
  luck: 'good' | 'bad' | 'neutral'
  zhiShen: string
  jianChu: string
  yi: string[]
  ji: string[]
  chongSha: string
  jiShen: string[]
  xiongShen: string[]
  /** 为什么推它——逐条列出，不做黑箱 */
  reasons: string[]
  /** 距今天数 */
  daysFromNow: number
}

const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六']

/**
 * 吉度打分 —— 规则全部写在这里，看得见摸得着：
 *   命中「宜」                 +55（基准分：这天本就宜办此事）
 *   黄道吉日（建除+天神）      +20 / 黑道 −18
 *   天神为吉                   +8
 *   吉神数量                   每个 +2（最多 +12）
 *   凶煞数量                   每个 −2（最多 −12）
 *   宜项越多说明日子越通达      (宜数−忌数) 每 1 项 +1（区间 −5 ~ +5）
 * 命中「忌」的日子直接淘汰，不打分。
 */
function scoreDay(lunar: Lunar, hitTerms: string[]): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 55
  reasons.push(`黄历载明宜「${hitTerms.join('、')}」`)

  const luck = dayLuck(lunar)
  if (luck === 'good') {
    score += 20
    reasons.push(`黄道吉日（${lunar.getZhiXing()}日 · ${lunar.getDayTianShen()}）`)
  } else if (luck === 'bad') {
    score -= 18
    reasons.push(`黑道日（${lunar.getZhiXing()}日 · ${lunar.getDayTianShen()}），谨慎择用`)
  }

  if (lunar.getDayTianShenLuck() === '吉') score += 8

  const jiShen = lunar.getDayJiShen()
  const xiongShen = lunar.getDayXiongSha()
  const jiBonus = Math.min(jiShen.length * 2, 12)
  const xiongPenalty = Math.min(xiongShen.length * 2, 12)
  score += jiBonus - xiongPenalty
  if (jiShen.length) reasons.push(`吉神：${jiShen.slice(0, 4).join(' ')}`)
  if (xiongShen.length) reasons.push(`凶煞：${xiongShen.slice(0, 4).join(' ')}`)

  const diff = lunar.getDayYi().length - lunar.getDayJi().length
  score += Math.max(-5, Math.min(5, diff))

  return { score: Math.max(1, Math.min(100, Math.round(score))), reasons }
}

export interface PickOptions {
  /** 目标黄历用语（命中任一即算）——取自 ZejiEvent.terms */
  terms: string[]
  /** 从哪天开始扫（默认明天：今天多半来不及） */
  from?: Date
  /** 扫多少天（默认 90 天，约一季） */
  days?: number
  /** 最多返回几条（默认 12） */
  limit?: number
}

/**
 * 择吉：在未来 N 天里找出宜办此事的日子，按吉度排序。
 * 命中「忌」的日子一律剔除（宁可少推，不能推一个黄历明确写着「忌嫁娶」的日子）。
 */
export function pickAuspiciousDays(opts: PickOptions): ZejiDay[] {
  const { terms, days = 90, limit = 12 } = opts
  if (!terms.length) return []

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const from = opts.from ? new Date(opts.from) : new Date(today.getTime() + 86400000)
  from.setHours(0, 0, 0, 0)

  const out: ZejiDay[] = []

  for (let i = 0; i < days; i++) {
    const d = new Date(from.getTime() + i * 86400000)
    const solar = Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate())
    const lunar = solar.getLunar()

    const yi = lunar.getDayYi()
    const ji = lunar.getDayJi()

    // 黄历明确写着「忌」的，直接出局
    if (terms.some((t) => ji.includes(t))) continue

    const hit = terms.filter((t) => yi.includes(t))
    if (!hit.length) continue

    const { score, reasons } = scoreDay(lunar, hit)

    out.push({
      date: d,
      solarText: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      weekday: `星期${WEEK_CN[solar.getWeek()]}`,
      lunarText: `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
      ganzhi: `${lunar.getDayInGanZhi()}日`,
      score,
      luck: dayLuck(lunar),
      zhiShen: `${lunar.getDayTianShen()}（${lunar.getDayTianShenType()}日）`,
      jianChu: `${lunar.getZhiXing()}日`,
      yi,
      ji,
      chongSha: `冲${lunar.getDayChongShengXiao()}(${lunar.getDayChongGan()}${lunar.getDayChong()}) 煞${lunar.getDaySha()}`,
      jiShen: lunar.getDayJiShen(),
      xiongShen: lunar.getDayXiongSha(),
      reasons,
      daysFromNow: Math.round((d.getTime() - today.getTime()) / 86400000),
    })
  }

  // 吉度高的在前；同分则近日在前（择日多半是越早越好）
  out.sort((a, b) => b.score - a.score || a.date.getTime() - b.date.getTime())
  return out.slice(0, limit)
}
