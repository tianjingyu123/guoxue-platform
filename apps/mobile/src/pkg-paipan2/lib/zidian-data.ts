/**
 * 字典查询 · 后端取数 + 本地聚合
 *
 * 分工（与 apps/server/src/modules/zidian 一致）：
 *   后端：繁体 / 拼音 / 新华字典释义（原始 JSON 5.2MB，超小程序分包 2MB 上限，必须下沉）
 *   前端：康熙笔画、字形五行、81 数理、生肖宜忌、汉字结构、五音、三才、性别 等 24 字段（本地算）
 *
 * 后端不可达时不阻断：仍返回本地算的全部字段，释义位显示兜底文案（hasExplanation=false）。
 */
import { apiGet } from '@/utils/request'
import { lookupText, lookupChar, type RemoteEntry, type ZidianResult } from './zidian-engine'

const LOOKUP_CACHE = new Map<string, RemoteEntry>()

/** 批量取远端词条（带内存缓存，同一字不重复请求） */
async function fetchRemote(chars: string[]): Promise<RemoteEntry[]> {
  const miss = chars.filter((c) => !LOOKUP_CACHE.has(c))
  if (miss.length) {
    try {
      const res = await apiGet<{ results: RemoteEntry[] }>(`/zidian/lookup?q=${encodeURIComponent(miss.join(''))}`)
      for (const r of res?.results ?? []) LOOKUP_CACHE.set(r.char, r)
    } catch {
      // 网络失败 → 降级为纯本地字段，不抛错
    }
  }
  return chars.map((c) => LOOKUP_CACHE.get(c)).filter((r): r is RemoteEntry => !!r)
}

/** 查一个字（词典未收录的生僻字仍可出本地字段；完全不认识的字返回 null） */
export async function queryChar(ch: string): Promise<ZidianResult | null> {
  const char = ch.trim().charAt(0)
  if (!char) return null
  const [remote] = await fetchRemote([char])
  return lookupChar(char, remote)
}

/** 查一段文字/姓名（逐字拆解，最多 8 字） */
export async function queryText(text: string): Promise<ZidianResult[]> {
  const chars = [...text.replace(/[^一-鿿]/g, '')].slice(0, 8)
  if (!chars.length) return []
  const remotes = await fetchRemote(chars)
  return lookupText(chars.join(''), remotes)
}

/** 按拼音检索（去声调前缀匹配，后端返回最多 50 字） */
export async function searchByPinyin(pinyin: string): Promise<ZidianResult[]> {
  const q = pinyin.trim().toLowerCase()
  if (!q) return []
  try {
    const res = await apiGet<{ results: RemoteEntry[] }>(`/zidian/search?pinyin=${encodeURIComponent(q)}`)
    const out: ZidianResult[] = []
    for (const r of res?.results ?? []) {
      LOOKUP_CACHE.set(r.char, r)
      const item = lookupChar(r.char, r)
      if (item) out.push(item)
    }
    return out
  } catch {
    return []
  }
}

/** 词典收录量（页面底部展示；取不到返回 0，不展示） */
export async function dictStats(): Promise<number> {
  try {
    const res = await apiGet<{ total: number }>('/zidian/stats')
    return res?.total ?? 0
  } catch {
    return 0
  }
}

export type { ZidianResult, RemoteEntry }
