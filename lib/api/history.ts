// 浏览历史 API
import { apiGet, apiPost, apiDelete, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { HistoryGroup, HistoryItem } from '../types/history'

// ========== Mock 数据 ==========

const mockHistoryData: HistoryGroup[] = [
  {
    date: '今天',
    items: [
      { id: 1, type: 'course', title: '八字入门实战课 - 第5章', subtitle: '已学习 45分钟', progress: 65, image: '', time: '14:30' },
      { id: 2, type: 'article', title: '八字中的食神制杀格局详解', subtitle: '周易大师', image: '', time: '11:20' },
      { id: 3, type: 'agent', title: '八字命理大师', subtitle: '对话 3 次', image: '', time: '10:15' },
    ]
  },
  {
    date: '昨天',
    items: [
      { id: 4, type: 'course', title: '紫微斗数精讲 - 第12章', subtitle: '已学习 30分钟', progress: 40, image: '', time: '20:45' },
      { id: 5, type: 'product', title: '开运水晶手链', subtitle: '浏览商品', image: '', time: '16:30' },
      { id: 6, type: 'circle', title: '八字命理研习社', subtitle: '浏览帖子 5 篇', image: '', time: '14:20' },
    ]
  },
  {
    date: '1月13日',
    items: [
      { id: 7, type: 'classic', title: '周易 - 乾卦', subtitle: '阅读 20分钟', image: '', time: '21:00' },
      { id: 8, type: 'article', title: '流年运势分析方法论', subtitle: '玄学居士', image: '', time: '19:30' },
      { id: 9, type: 'agent', title: '风水布局顾问', subtitle: '对话 1 次', image: '', time: '15:00' },
    ]
  },
]

// ========== API 函数 ==========

// 获取浏览历史
export async function getHistory(page: number = 1, pageSize: number = 20): Promise<ApiResponse<HistoryGroup[]>> {
  if (useMock()) {
    return { code: 200, data: mockHistoryData, message: 'success' }
  }
  return apiGet<HistoryGroup[]>('/user/history', { page, pageSize })
}

// 删除历史记录
export async function deleteHistory(ids: number[]): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    return { code: 200, data: { success: true }, message: '删除成功' }
  }
  return apiPost<{ success: boolean }>('/user/history/delete', { ids })
}

// 清空全部历史
export async function clearAllHistory(): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    return { code: 200, data: { success: true }, message: '清空成功' }
  }
  return apiDelete<{ success: boolean }>('/user/history/clear')
}

// 添加浏览历史（通常由前端自动调用）
export async function addHistory(item: Omit<HistoryItem, 'id'>): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    return { code: 200, data: { success: true }, message: 'success' }
  }
  return apiPost<{ success: boolean }>('/user/history/add', item)
}
