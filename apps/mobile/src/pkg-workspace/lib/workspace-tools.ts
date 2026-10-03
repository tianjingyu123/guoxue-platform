/**
 * 工作台 · 老师的常用排盘工具（对应 V0 workspace-tools.ts）
 *
 * 工具库真源 = 主包 lib/tools-data 的 tools（首页那套，24 个真工具），
 * 不像 V0 那样另立一份 paipanTools —— 两份工具表迟早会不一致。
 * 老师可增删排序，存 localStorage，对齐首页 tool-order/tool-favorites 的既有做法。
 */
import { tools as ALL_TOOLS } from '@/lib/tools-data'

const STORAGE_KEY = 'rebu:workspace-tools'

/** 默认常用：老师执业高频（都是已上线的真工具） */
export const DEFAULT_TOOL_KEYS = ['bazi', 'ziwei', 'liuyao', 'qimen', 'lijichi', 'hepan']

const VALID = new Set(ALL_TOOLS.filter((t) => !t.href.includes('coming-soon')).map((t) => t.id))

export function getWorkspaceToolKeys(): string[] {
  let raw: unknown
  try {
    raw = uni.getStorageSync(STORAGE_KEY)
  } catch {
    return [...DEFAULT_TOOL_KEYS]
  }
  if (!raw) return [...DEFAULT_TOOL_KEYS]
  try {
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(list)) return [...DEFAULT_TOOL_KEYS]
    // 过滤掉已下线/未开发的 key，保证健壮
    const valid = list.filter((k: unknown): k is string => typeof k === 'string' && VALID.has(k))
    return valid.length ? valid : [...DEFAULT_TOOL_KEYS]
  } catch {
    return [...DEFAULT_TOOL_KEYS]
  }
}

export function setWorkspaceToolKeys(keys: string[]): void {
  try {
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(keys))
  } catch {
    /* 隐私模式等存储失败：忽略，下次进来回退默认集 */
  }
}
