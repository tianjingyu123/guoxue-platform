/** 排盘分组管理 —— 三工具(八字/奇门/阳盘)共享 API */
import { apiGet, apiPost, apiPut, apiDelete, useMock } from '@/utils/request'

export interface GroupItem {
  id: string
  name: string
  count: number
  color?: string
}

const _mockGroups: Record<string, GroupItem[]> = {
  BAZI: [
    { id: '0', name: '家人', count: 3, color: '#3b82f6' },
    { id: '1', name: '朋友', count: 5, color: '#22c55e' },
    { id: '2', name: '客户', count: 3, color: '#f97316' },
  ],
  QIMEN: [
    { id: '0', name: '工作事业', count: 3, color: '#3b82f6' },
    { id: '1', name: '财运投资', count: 2, color: '#22c55e' },
    { id: '2', name: '感情婚姻', count: 2, color: '#f97316' },
    { id: '3', name: '健康出行', count: 1, color: '#a855f7' },
  ],
  YANGPAN: [
    { id: '0', name: '客户', count: 12, color: '#3b82f6' },
    { id: '1', name: '家人', count: 5, color: '#22c55e' },
    { id: '2', name: '朋友', count: 8, color: '#f97316' },
  ],
}

export const groupApi = {
  async list(paipanType: string): Promise<GroupItem[]> {
    if (true) return _mockGroups[paipanType] || []
    try {
      return await apiGet<GroupItem[]>(`/paipan/groups?paipanType=${paipanType}`)
    } catch { return [] }
  },

  async create(paipanType: string, name: string, color?: string): Promise<GroupItem> {
    if (true) return { id: String(Date.now()), name, count: 0, color }
    return await apiPost<GroupItem>('/paipan/groups', { paipanType, name, color })
  },

  async rename(paipanType: string, oldName: string, newName: string): Promise<void> {
    if (true) return
    await apiPut<void>('/paipan/groups', { paipanType, oldName, newName })
  },

  async delete(paipanType: string, name: string): Promise<void> {
    if (true) return
    await apiDelete<void>('/paipan/groups', { paipanType, name })
  },
}
