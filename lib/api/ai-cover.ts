// AI 封面图生成 API
import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { 
  CoverGenerateRequest, 
  CoverGenerateResponse, 
  CoverGenerateResult,
  CoverStyleOption,
  CoverHistoryItem
} from '../types/ai-cover'

// ========== Mock 数据 ==========

const mockStyles: CoverStyleOption[] = [
  {
    value: 'traditional',
    label: '传统国风',
    description: '融合中国传统元素，典雅大气',
    preview: '/placeholder.svg?height=80&width=120&text=国风',
  },
  {
    value: 'ink',
    label: '水墨风格',
    description: '写意山水，意境悠远',
    preview: '/placeholder.svg?height=80&width=120&text=水墨',
  },
  {
    value: 'minimalist',
    label: '简约现代',
    description: '简洁留白，突出主题',
    preview: '/placeholder.svg?height=80&width=120&text=简约',
  },
  {
    value: 'vintage',
    label: '复古怀旧',
    description: '古朴典雅，岁月沉淀',
    preview: '/placeholder.svg?height=80&width=120&text=复古',
  },
  {
    value: 'gradient',
    label: '渐变色彩',
    description: '现代渐变，视觉冲击',
    preview: '/placeholder.svg?height=80&width=120&text=渐变',
  },
  {
    value: 'illustration',
    label: '插画风格',
    description: '精美插画，生动有趣',
    preview: '/placeholder.svg?height=80&width=120&text=插画',
  },
]

const mockGeneratedCovers: CoverGenerateResult[] = [
  {
    id: 'cover_1',
    url: '/placeholder.svg?height=400&width=600&text=封面1',
    prompt: '传统国风，八卦图案，金色点缀，深红背景',
    style: 'traditional',
    size: '16:9',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cover_2',
    url: '/placeholder.svg?height=400&width=600&text=封面2',
    prompt: '传统国风，山水画意，云雾缭绕，古典韵味',
    style: 'traditional',
    size: '16:9',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cover_3',
    url: '/placeholder.svg?height=400&width=600&text=封面3',
    prompt: '传统国风，龙纹装饰，庄重典雅，红金配色',
    style: 'traditional',
    size: '16:9',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cover_4',
    url: '/placeholder.svg?height=400&width=600&text=封面4',
    prompt: '传统国风，祥云图案，福字元素，喜庆氛围',
    style: 'traditional',
    size: '16:9',
    createdAt: new Date().toISOString(),
  },
]

// ========== API 函数 ==========

/**
 * 获取封面风格选项
 */
export async function getCoverStyles(): Promise<ApiResponse<CoverStyleOption[]>> {
  if (useMock()) {
    return { code: 200, data: mockStyles, message: 'success' }
  }
  return apiGet<CoverStyleOption[]>('/ai/cover/styles')
}

/**
 * 生成智能 Prompt
 */
export async function generateSmartPrompt(
  title: string, 
  summary?: string, 
  style?: string
): Promise<ApiResponse<{ prompt: string }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 800))
    const styleText = style === 'ink' ? '水墨画风格，山水意境' : 
                      style === 'minimalist' ? '简约设计，大面积留白' :
                      style === 'vintage' ? '复古色调，做旧质感' :
                      '传统国风，典雅大气'
    return {
      code: 200,
      data: {
        prompt: `${styleText}，主题：${title}，${summary ? '内容概述：' + summary.slice(0, 50) + '，' : ''}高清细腻，适合作为文章封面`
      },
      message: 'success',
    }
  }
  return apiPost<{ prompt: string }>('/ai/cover/smart-prompt', { title, summary, style })
}

/**
 * 生成封面图
 */
export async function generateCover(
  request: CoverGenerateRequest
): Promise<ApiResponse<CoverGenerateResponse>> {
  if (useMock()) {
    // 模拟生成过程
    await new Promise(resolve => setTimeout(resolve, 3000))
    return {
      code: 200,
      data: {
        taskId: 'task_' + Date.now(),
        status: 'completed',
        results: mockGeneratedCovers.slice(0, request.count).map((c, i) => ({
          ...c,
          id: 'cover_' + Date.now() + '_' + i,
          prompt: request.prompt || c.prompt,
          style: request.style,
          size: request.size,
        })),
      },
      message: 'success',
    }
  }
  return apiPost<CoverGenerateResponse>('/ai/cover/generate', request)
}

/**
 * 查询生成任务状态
 */
export async function getCoverTaskStatus(taskId: string): Promise<ApiResponse<CoverGenerateResponse>> {
  if (useMock()) {
    return {
      code: 200,
      data: {
        taskId,
        status: 'completed',
        results: mockGeneratedCovers,
      },
      message: 'success',
    }
  }
  return apiGet<CoverGenerateResponse>(`/ai/cover/task/${taskId}`)
}

/**
 * 保存封面到素材库
 */
export async function saveCoverToLibrary(coverId: string): Promise<ApiResponse<{ libraryId: string }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: { libraryId: 'lib_' + Date.now() },
      message: '已保存到素材库',
    }
  }
  return apiPost<{ libraryId: string }>('/ai/cover/save', { coverId })
}

/**
 * 下载封面图
 */
export async function downloadCover(coverId: string): Promise<ApiResponse<{ downloadUrl: string }>> {
  if (useMock()) {
    return {
      code: 200,
      data: { downloadUrl: '/placeholder.svg?height=800&width=1200&text=下载' },
      message: 'success',
    }
  }
  return apiGet<{ downloadUrl: string }>(`/ai/cover/${coverId}/download`)
}

/**
 * 获取生成历史
 */
export async function getCoverHistory(page: number = 1): Promise<ApiResponse<CoverHistoryItem[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return {
      code: 200,
      data: [
        {
          id: 'history_1',
          title: '八字命理入门教程',
          results: mockGeneratedCovers.slice(0, 2),
          selectedId: 'cover_1',
          createdAt: '2026-06-03 10:30',
        },
        {
          id: 'history_2',
          title: '风水布局的基本原则',
          results: mockGeneratedCovers.slice(2, 4),
          createdAt: '2026-06-02 15:20',
        },
      ],
      message: 'success',
    }
  }
  return apiGet<CoverHistoryItem[]>('/ai/cover/history', { page })
}

/**
 * 获取风格名称
 */
export function getStyleName(style: string): string {
  const names: Record<string, string> = {
    traditional: '传统国风',
    ink: '水墨风格',
    minimalist: '简约现代',
    vintage: '复古怀旧',
    gradient: '渐变色彩',
    illustration: '插画风格',
  }
  return names[style] || style
}
