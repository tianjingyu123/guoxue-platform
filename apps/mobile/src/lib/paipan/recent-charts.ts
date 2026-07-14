/**
 * 跨工具「最近排盘」聚合（主包）
 *
 * 为什么在主包：分包之间不能互相 import（pkg-workspace 拿不到 pkg-paipan/*-history.ts），
 * 但记录本来就在本地 storage 里、key 固定。这里直接按 key 读，不依赖任何分包。
 *
 * 🔴 storageKey / 字段名逐个对着各工具的 *-history.ts 核过，不是猜的：
 *    · 记录有两种形状：扁平（bazi/ziwei/qimen…）与 { params, summary } 包裹（hepan/liuyao/xuankong…）
 *    · 同是「问事」，六爻/奇门/大六壬叫 matter，太乙/飞宫叫 topic
 *    · 紫微的生日字段是 y/m/d，不是 year/month/day
 *    · hepan/liuyao/bazhai/xuankong/yinpan 的真 key 是 *-records，*-history 是已迁移的旧键
 *    改这些 store 时必须同步这里，否则最近排盘会静默变空标题。
 *
 * 🔴 只读真实记录。V0 原稿的「最近排盘」是写死的假存档（陈婉清/李泽宇…），按
 * 「假数据直接删除」的规矩弃用——老师没排过盘，这里就该是空的。
 */
import { formatRecordTime } from './history-core'

export interface RecentChart {
  toolKey: string
  toolLabel: string
  /** 结果页路径（复盘用） */
  href: string
  /** 主标题：客户名 / 问事 */
  title: string
  /** 副标题：一句话摘要 */
  summary: string
  ts: number
  timeText: string
  /** 原始记录（生成报告时作为盘面素材） */
  raw: Record<string, unknown>
}

interface ToolSpec {
  key: string
  label: string
  storageKey: string
  href: string
  /** 记录 → 标题（r 已按形状归一为「参数对象」） */
  title: (r: any) => string
  /** 记录 → 摘要（rec 是原始记录，包裹形状里带 summary） */
  summary: (r: any, rec: any) => string
}

const S = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v))

/** 生辰摘要（year/month/day 或紫微的 y/m/d） */
function birth(r: any): string {
  const y = r.year ?? r.y
  const m = r.month ?? r.m
  const d = r.day ?? r.d
  if (!y || !m || !d) return S(r.birth) || S(r.dateText)
  const hh = r.hour
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}${
    hh === undefined || hh === null ? '' : ` ${String(hh).padStart(2, '0')}时`
  }`
}

/** 包裹形状的 summary 优先，其次自算 */
const wrapped = (fallback: (r: any) => string) => (r: any, rec: any) => S(rec?.summary) || fallback(r)

export const RECENT_TOOLS: ToolSpec[] = [
  // ── 扁平形状（params 直接铺在记录上）
  { key: 'bazi', label: '八字排盘', storageKey: 'rebu:bazi-history', href: '/paipan/bazi',
    title: (r) => S(r.name) || '未命名', summary: birth },
  { key: 'ziwei', label: '紫微斗数', storageKey: 'rebu:ziwei-history', href: '/paipan/ziwei',
    title: (r) => S(r.name) || '未命名', summary: birth },
  { key: 'qimen', label: '奇门遁甲', storageKey: 'rebu:qimen-history', href: '/paipan/qimen',
    title: (r) => S(r.matter) || '奇门起局', summary: (r) => S(r.juLabel) || birth(r) },
  { key: 'yangpan', label: '阳盘命理', storageKey: 'rebu:yangpan-history', href: '/paipan/yangpan',
    title: (r) => S(r.name) || '未命名', summary: (r) => S(r.juLabel) || birth(r) },
  { key: 'xiaoliuren', label: '小六壬', storageKey: 'rebu:xiaoliuren-history', href: '/paipan/xiaoliuren',
    title: (r) => S(r.matter) || '小六壬', summary: (r) => S(r.palace) || birth(r) },
  { key: 'meihua', label: '梅花易数', storageKey: 'rebu:meihua-history', href: '/paipan/meihua',
    title: (r) => S(r.matter) || '梅花起卦', summary: (r) => S(r.guaText) || S(r.dateText) },
  { key: 'lijichi', label: '择日择吉', storageKey: 'rebu:lijichi-records', href: '/paipan/lijichi',
    title: (r) => S(r.client) || '择日', summary: (r) => [S(r.dateText), S(r.shanxiang)].filter(Boolean).join(' · ') },
  { key: 'xingming', label: '姓名解析', storageKey: 'rebu:xingming-records', href: '/paipan/xingming',
    title: (r) => S(r.name) || '姓名', summary: (r) => (r.score ? `五格 ${r.score} 分` : '五格剖象') },
  { key: 'qiming', label: '周易起名', storageKey: 'rebu:qiming-records', href: '/paipan/qiming',
    title: (r) => `${S(r.surname) || '起名'}${S(r.gender) === 'female' ? '（女）' : S(r.gender) === 'male' ? '（男）' : ''}`,
    summary: (r) => S(r.birth) || S(r.dateText) },
  { key: 'shuzi', label: '数字能量', storageKey: 'rebu:shuzi-history', href: '/paipan/shuzi',
    title: (r) => S(r.raw) || '数字', summary: (r) => S(r.kindLabel) || S(r.dateText) },
  { key: 'zhuge', label: '诸葛神数', storageKey: 'rebu:zhuge-history', href: '/paipan/zhuge',
    title: (r) => S(r.input) || '神数', summary: (r) => (r.signNumber ? `第 ${r.signNumber} 签` : S(r.dateText)) },

  // ── { params, summary } 包裹形状
  { key: 'hepan', label: '八字合盘', storageKey: 'rebu:hepan-records', href: '/paipan/hepan',
    title: (r) => `${S(r.a?.name) || '男方'} · ${S(r.b?.name) || '女方'}`, summary: wrapped((r) => S(r.scene) || '合婚参断') },
  { key: 'liuyao', label: '六爻排盘', storageKey: 'rebu:liuyao-records', href: '/paipan/liuyao',
    title: (r) => S(r.matter) || '六爻起卦', summary: wrapped(birth) },
  { key: 'bazhai', label: '八宅风水', storageKey: 'rebu:bazhai-records', href: '/paipan/bazhai',
    title: (r) => S(r.customer) || '宅主', summary: wrapped((r) => S(r.sitting) || '八宅') },
  { key: 'xuankong', label: '玄空飞星', storageKey: 'rebu:xuankong-records', href: '/paipan/xuankong',
    title: (r) => S(r.customer) || '宅盘', summary: wrapped((r) => [r.period ? `${r.period}运` : '', S(r.sitting)].filter(Boolean).join(' ')) },
  { key: 'yinpan', label: '阴盘奇门', storageKey: 'rebu:yinpan-records', href: '/paipan/yinpan',
    title: (r) => S(r.matter) || '阴盘起局', summary: wrapped(birth) },
  { key: 'yinpan-mingli', label: '命理奇门', storageKey: 'rebu:yinpan-mingli-history', href: '/paipan/yinpan-mingli',
    title: (r) => S(r.name) || '未命名', summary: wrapped(birth) },
  { key: 'qizheng', label: '七政四余', storageKey: 'rebu:qizheng-history', href: '/paipan/qizheng',
    title: (r) => S(r.name) || '未命名', summary: wrapped(birth) },
  { key: 'daliuren', label: '大六壬', storageKey: 'rebu:daliuren-history', href: '/paipan/daliuren',
    title: (r) => S(r.matter) || '大六壬课', summary: wrapped(birth) },
  { key: 'chuanren', label: '铁板神数', storageKey: 'rebu:chuanren-history', href: '/paipan/chuanren',
    title: (r) => S(r.topic) || '起课', summary: wrapped(birth) },
  { key: 'feigong', label: '飞宫排盘', storageKey: 'rebu:feigong-history', href: '/paipan/feigong',
    title: (r) => S(r.topic) || '飞宫', summary: wrapped(birth) },
  { key: 'taiyi', label: '太乙神数', storageKey: 'rebu:taiyi-history', href: '/paipan/taiyi',
    title: (r) => S(r.topic) || '太乙', summary: wrapped(birth) },
]

const SPEC_BY_KEY = new Map(RECENT_TOOLS.map((t) => [t.key, t]))

export function toolSpecOf(key: string): ToolSpec | undefined {
  return SPEC_BY_KEY.get(key)
}

/** 读一个工具的记录（storage 坏了/格式变了都不抛，返回空） */
function readOne(spec: ToolSpec): RecentChart[] {
  let raw: unknown
  try {
    raw = uni.getStorageSync(spec.storageKey)
  } catch {
    return []
  }
  if (!raw) return []
  let list: any[]
  try {
    list = typeof raw === 'string' ? JSON.parse(raw) : (raw as any[])
  } catch {
    return []
  }
  if (!Array.isArray(list)) return []
  return list
    .filter((rec) => rec && typeof rec === 'object')
    .map((rec) => {
      // 两种形状归一：包裹形状取 params，扁平形状就是记录本身
      const p = rec.params && typeof rec.params === 'object' ? rec.params : rec
      // shuzi/zhuge 是自建 store，没有 ts，用 id（= Date.now()）兜底
      const ts = Number(rec.ts) || (typeof rec.id === 'number' ? rec.id : 0)
      return {
        toolKey: spec.key,
        toolLabel: spec.label,
        href: spec.href,
        title: spec.title(p),
        summary: spec.summary(p, rec),
        ts,
        timeText: ts ? formatRecordTime(ts) : '',
        raw: rec,
      }
    })
}

/**
 * 全工具最近排盘，按时间倒序
 * @param limit 取前 N 条
 * @param toolKeys 只看这几个工具（缺省=全部）
 */
export function recentCharts(limit = 10, toolKeys?: string[]): RecentChart[] {
  const specs = toolKeys?.length ? RECENT_TOOLS.filter((t) => toolKeys.includes(t.key)) : RECENT_TOOLS
  const all: RecentChart[] = []
  for (const spec of specs) all.push(...readOne(spec))
  return all.sort((a, b) => b.ts - a.ts).slice(0, limit)
}

/** 各工具的记录条数（工具矩阵角标） */
export function chartCounts(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const spec of RECENT_TOOLS) out[spec.key] = readOne(spec).length
  return out
}
