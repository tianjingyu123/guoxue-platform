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
  /** 复盘链接：有 reopen 的工具按记录参数拼到结果页原盘重开；否则回退工具输入页 */
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
  /**
   * 兜底链接=工具输入页。🔴 必须写 uni 真实页面路径（/pkg-paipan/xx/index），不能写原型别名
   * （/paipan/xx）：消费方之一 pkg-workspace/paipan-center 不走 utils/router 的 resolve，
   * 拿到别名会拼错路径跳不动。
   */
  href: string
  /** 记录 → 标题（r 已按形状归一为「参数对象」；rec 是原始记录，外层字段从它取） */
  title: (r: any, rec: any) => string
  /** 记录 → 摘要（rec 是原始记录，包裹形状里带 summary） */
  summary: (r: any, rec: any) => string
  /**
   * 记录 → 复盘链接（按各工具历史页 open() 的重开协议逐个对着拼，不是猜的）。
   * 返回空/抛错则回退 href 输入页。没有结果页的工具（shuzi）不配。
   */
  reopen?: (r: any, rec: any) => string
}

const S = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v))

/** query 串：跳过 undefined/null/空串（0 保留） */
function qs(pairs: Array<[string, unknown]>): string {
  return pairs
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&')
}

/** payload 形协议（result 页 onLoad 里 JSON.parse(decodeURIComponent(q.payload))） */
function payloadOf(obj: unknown): string {
  return `payload=${encodeURIComponent(JSON.stringify(obj ?? {}))}`
}

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
  { key: 'bazi', label: '八字排盘', storageKey: 'rebu:bazi-history', href: '/pkg-paipan/bazi/index',
    title: (r) => S(r.name) || '未命名', summary: birth,
    reopen: (r) => `/pkg-paipan/bazi/result?${qs([
      ['name', S(r.name)], ['gender', S(r.gender)],
      ['year', r.year], ['month', r.month], ['day', r.day], ['hour', r.hour], ['minute', r.minute ?? 0],
    ])}` },
  { key: 'ziwei', label: '紫微斗数', storageKey: 'rebu:ziwei-history', href: '/pkg-paipan/ziwei/index',
    title: (r) => S(r.name) || '未命名', summary: birth,
    reopen: (r) => `/pkg-paipan/ziwei/result?${qs([
      ['name', S(r.name)], ['gender', S(r.gender)],
      ['y', r.y], ['m', r.m], ['d', r.d], ['hour', r.hour], ['minute', r.minute ?? 0],
      ['city', S(r.city)], ['lng', r.lng],
      ['useTrueSolar', r.useTrueSolar ? '1' : ''],
    ])}` },
  { key: 'qimen', label: '奇门遁甲', storageKey: 'rebu:qimen-history', href: '/pkg-paipan/qimen/index',
    title: (r) => S(r.matter) || '奇门起局', summary: (r) => S(r.juLabel) || birth(r),
    reopen: (r) => `/pkg-paipan/qimen/result?${qs([
      ['matter', S(r.matter)],
      ['year', r.year], ['month', r.month], ['day', r.day], ['hour', r.hour], ['minute', r.minute ?? 0],
      ['panMethod', S(r.panMethod)], ['flyMethod', S(r.flyMethod)],
      ['startMethod', S(r.startMethod)], ['anganMethod', S(r.anganMethod)],
      ['customJu', S(r.customJu)],
      ['useTrueSolar', r.useTrueSolar ? '1' : ''],
      ['lat', r.useTrueSolar ? r.lat ?? 0 : ''], ['lng', r.useTrueSolar ? r.lng ?? 0 : ''],
    ])}` },
  { key: 'yangpan', label: '阳盘命理', storageKey: 'rebu:yangpan-history', href: '/pkg-paipan/yangpan/index',
    title: (r) => S(r.name) || '未命名', summary: (r) => S(r.juLabel) || birth(r),
    reopen: (r) => `/pkg-paipan/yangpan/result?${qs([
      ['name', S(r.name)], ['gender', S(r.gender)],
      ['year', r.year], ['month', r.month], ['day', r.day], ['hour', r.hour], ['minute', r.minute ?? 0],
      ['panMethod', S(r.panMethod)], ['jigongMethod', S(r.jigongMethod)],
      ['startMethod', S(r.startMethod)], ['anganMethod', S(r.anganMethod)],
      ['place', S(r.place)],
      // result 页默认真太阳时开，false 必须显式传，否则复盘口径跟原盘对不上
      ['trueSolar', r.trueSolar === false ? 'false' : 'true'],
      ['earlyLateZi', r.earlyLateZi ? 'true' : ''], ['daylightSaving', r.daylightSaving ? 'true' : ''],
    ])}` },
  { key: 'xiaoliuren', label: '小六壬', storageKey: 'rebu:xiaoliuren-history', href: '/pkg-paipan/xiaoliuren/index',
    title: (r) => S(r.matter) || '小六壬', summary: (r) => S(r.palace) || birth(r),
    // 小六壬无独立结果页：与其历史页同款，回输入页带 replay 参数原盘重放
    reopen: (_r, rec) => `/pkg-paipan/xiaoliuren/index?replay=${encodeURIComponent(JSON.stringify(rec))}` },
  { key: 'meihua', label: '梅花易数', storageKey: 'rebu:meihua-history', href: '/pkg-paipan/meihua/index',
    title: (r, rec) => S(r.matter) || S(rec?.matter) || '梅花起卦',
    summary: (r, rec) => S(rec?.guaText) || S(r.guaText) || S(rec?.dateText) || S(r.dateText),
    reopen: (r) => `/pkg-paipan/meihua/result?${payloadOf(r)}` },
  // P2-16：原标「择日择吉」——rebu:lijichi-records 是「立极尺」（风水立向工具）的记录，工具名张冠李戴
  { key: 'lijichi', label: '立极尺', storageKey: 'rebu:lijichi-records', href: '/pkg-paipan/lijichi/index',
    title: (r) => S(r.client) || '立极尺', summary: (r) => [S(r.dateText), S(r.shanxiang)].filter(Boolean).join(' · '),
    reopen: (r) => {
      const params: Record<string, unknown> = { customer: S(r.client) === '未命名' ? '' : S(r.client), sitting: r.sitting }
      if (typeof r.heading === 'number') params.heading = r.heading
      if (r.plate) params.plate = r.plate
      if (r.note) params.note = r.note
      return `/pkg-paipan/lijichi/result?${payloadOf(params)}`
    } },
  { key: 'xingming', label: '姓名解析', storageKey: 'rebu:xingming-records', href: '/pkg-paipan2/xingming/index',
    title: (r) => S(r.name) || '姓名', summary: (r) => (r.score ? `五格 ${r.score} 分` : '五格剖象'),
    reopen: (r) => `/pkg-paipan2/xingming/result?${qs([
      ['name', S(r.name)], ['gender', S(r.gender)], ['birth', S(r.birth)],
      ['city', S(r.city)], ['district', S(r.district)],
    ])}` },
  { key: 'qiming', label: '周易起名', storageKey: 'rebu:qiming-records', href: '/pkg-paipan2/qiming/index',
    title: (r) => `${S(r.surname) || '起名'}${S(r.gender) === 'female' ? '（女）' : S(r.gender) === 'male' ? '（男）' : ''}`,
    summary: (r) => S(r.birth) || S(r.dateText),
    reopen: (r) => {
      const params: Record<string, unknown> = { ...r }
      for (const k of ['id', 'ts', 'pinned', 'group', 'dateText']) delete params[k]
      return `/pkg-paipan2/qiming/result?${payloadOf(params)}`
    } },
  // shuzi 无结果页（解读直接在输入页展示），复盘只能回输入页——不硬造 reopen
  { key: 'shuzi', label: '数字能量', storageKey: 'rebu:shuzi-history', href: '/pkg-paipan2/shuzi/index',
    title: (r) => S(r.raw) || '数字', summary: (r) => S(r.kindLabel) || S(r.dateText) },
  { key: 'zhuge', label: '诸葛神数', storageKey: 'rebu:zhuge-history', href: '/pkg-paipan2/zhuge/index',
    title: (r) => S(r.input) || '神数', summary: (r) => (r.signNumber ? `第 ${r.signNumber} 签` : S(r.dateText)),
    reopen: (r) => (r.input ? `/pkg-paipan2/zhuge/result?input=${encodeURIComponent(S(r.input))}` : '') },

  // ── { params, summary } 包裹形状
  { key: 'hepan', label: '八字合盘', storageKey: 'rebu:hepan-records', href: '/pkg-paipan/hepan/index',
    title: (r) => `${S(r.a?.name) || '男方'} · ${S(r.b?.name) || '女方'}`, summary: wrapped((r) => S(r.scene) || '合婚参断'),
    reopen: (r) => `/pkg-paipan/hepan/result?${payloadOf(r)}` },
  { key: 'liuyao', label: '六爻排盘', storageKey: 'rebu:liuyao-records', href: '/pkg-paipan2/liuyao/index',
    title: (r) => S(r.matter) || '六爻起卦', summary: wrapped(birth),
    reopen: (r) => `/pkg-paipan2/liuyao/result?${payloadOf(r)}` },
  { key: 'bazhai', label: '八宅风水', storageKey: 'rebu:bazhai-records', href: '/pkg-paipan/bazhai/index',
    title: (r) => S(r.customer) || '宅主', summary: wrapped((r) => S(r.sitting) || '八宅'),
    reopen: (r) => `/pkg-paipan/bazhai/result?${payloadOf(r)}` },
  { key: 'xuankong', label: '玄空飞星', storageKey: 'rebu:xuankong-records', href: '/pkg-paipan/xuankong/index',
    title: (r) => S(r.customer) || '宅盘', summary: wrapped((r) => [r.period ? `${r.period}运` : '', S(r.sitting)].filter(Boolean).join(' ')),
    reopen: (r) => `/pkg-paipan/xuankong/result?${payloadOf(r)}` },
  { key: 'yinpan', label: '阴盘奇门', storageKey: 'rebu:yinpan-records', href: '/pkg-paipan/yinpan/index',
    title: (r) => S(r.matter) || '阴盘起局', summary: wrapped(birth),
    reopen: (r) => `/pkg-paipan/yinpan/result?${payloadOf(r)}` },
  { key: 'yinpan-mingli', label: '命理奇门', storageKey: 'rebu:yinpan-mingli-history', href: '/pkg-paipan/yinpan-mingli/index',
    title: (r) => S(r.name) || '未命名', summary: wrapped(birth),
    reopen: (r) => `/pkg-paipan/yinpan-mingli/result?${payloadOf(r)}` },
  { key: 'qizheng', label: '七政四余', storageKey: 'rebu:qizheng-history', href: '/pkg-paipan/qizheng/index',
    title: (r) => S(r.name) || '未命名', summary: wrapped(birth),
    reopen: (r) => `/pkg-paipan/qizheng/result?${payloadOf(r)}` },
  { key: 'daliuren', label: '大六壬', storageKey: 'rebu:daliuren-history', href: '/pkg-paipan/daliuren/index',
    title: (r) => S(r.matter) || '大六壬课', summary: wrapped(birth),
    reopen: (r) => `/pkg-paipan/daliuren/result?${payloadOf(r)}` },
  // P2-16：原标「铁板神数」——rebu:chuanren-history 是「奇门穿壬」（奇门转大六壬双盘）的记录，工具名张冠李戴
  { key: 'chuanren', label: '奇门穿壬', storageKey: 'rebu:chuanren-history', href: '/pkg-paipan/chuanren/index',
    title: (r) => S(r.topic) || '起课', summary: wrapped(birth),
    reopen: (r) => `/pkg-paipan/chuanren/result?${payloadOf(r)}` },
  { key: 'feigong', label: '飞宫排盘', storageKey: 'rebu:feigong-history', href: '/pkg-paipan/feigong/index',
    title: (r) => S(r.topic) || '飞宫', summary: wrapped(birth),
    reopen: (r) => `/pkg-paipan/feigong/result?${payloadOf(r)}` },
  { key: 'taiyi', label: '太乙神数', storageKey: 'rebu:taiyi-history', href: '/pkg-paipan/taiyi/index',
    title: (r) => S(r.topic) || '太乙', summary: wrapped(birth),
    reopen: (r) => `/pkg-paipan/taiyi/result?${payloadOf(r)}` },

  // ── P2-17 补收录：三个自建 store（记录形状 { id, …外层摘要字段, params }，JSON 字符串存储）
  //    在落记录但此前没进聚合，聚合页/工作台永远看不到它们
  { key: 'jinkoujue', label: '金口诀', storageKey: 'rebu:jinkoujue-history', href: '/pkg-paipan/jinkoujue/index',
    title: (r, rec) => S(rec?.topic) || S(r.topic) || '金口诀',
    summary: (r, rec) => S(rec?.panText) || S(rec?.dateText) || birth(r),
    reopen: (r) => `/pkg-paipan/jinkoujue/result?${payloadOf(r)}` },
  { key: 'xiaochengtu', label: '小成图', storageKey: 'rebu:xiaochengtu-history', href: '/pkg-paipan/xiaochengtu/index',
    title: (r, rec) => S(rec?.matter) || S(r.matter) || '小成图',
    summary: (r, rec) => S(rec?.guaText) || S(rec?.dateText) || birth(r),
    reopen: (r) => `/pkg-paipan/xiaochengtu/result?${payloadOf(r)}` },
  { key: 'shanxiang', label: '山向奇门', storageKey: 'rebu:shanxiang-history', href: '/pkg-paipan/shanxiang/index',
    title: (r, rec) => S(rec?.name) || S(r.name) || '山向奇门',
    summary: (r, rec) => S(rec?.label) || S(rec?.dateText) || birth(r),
    reopen: (r) => `/pkg-paipan/shanxiang/result?${payloadOf(r)}` },
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
      // shuzi/zhuge/jinkoujue 等自建 store 没有 ts，用 id（= Date.now()）兜底
      const ts = Number(rec.ts) || (typeof rec.id === 'number' ? rec.id : 0)
      // 复盘链接按记录参数拼；坏记录拼不出来就回退输入页，不让聚合页整条崩掉
      let href = spec.href
      if (spec.reopen) {
        try { href = spec.reopen(p, rec) || spec.href } catch { href = spec.href }
      }
      return {
        toolKey: spec.key,
        toolLabel: spec.label,
        href,
        title: spec.title(p, rec),
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
