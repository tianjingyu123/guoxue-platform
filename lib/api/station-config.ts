// 分站配置相关 API
import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { StationConfig, StationConfigUpdateRequest, ImageUploadResponse, THEME_COLOR_PRESETS } from '../types/station-config'

// ========== Mock 数据 ==========

const mockStationConfig: StationConfig = {
  id: 1,
  code: 'demo_station',
  name: '明德国学馆',
  logo: '/placeholder.svg?height=120&width=120',
  description: '传承国学智慧，弘扬传统文化。明德国学馆致力于为国学爱好者提供专业的学习平台和优质的文化内容。',
  themeColorId: 'guoxue',
  contactPhone: '138****8888',
  contactWechat: 'mingde_guoxue',
  contactEmail: 'contact@mingde.com',
  miniProgramQrcode: '/placeholder.svg?height=200&width=200',
  miniProgramAppId: 'wx1234567890',
  masterInfo: {
    id: 101,
    nickname: '明德先生',
    avatar: '/placeholder.svg?height=60&width=60',
    phone: '138****8888',
    joinDate: '2025-01-15',
  },
  status: 'active',
  createdAt: '2025-01-15 10:00:00',
  updatedAt: '2026-06-01 15:30:00',
}

/**
 * 获取分站配置
 */
export async function getStationConfig(stationId?: number): Promise<ApiResponse<StationConfig>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return { code: 200, data: mockStationConfig, message: 'success' }
  }
  return apiGet<StationConfig>('/station/config', { stationId })
}

/**
 * 更新分站配置
 */
export async function updateStationConfig(
  stationId: number,
  data: StationConfigUpdateRequest
): Promise<ApiResponse<StationConfig>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 600))
    return {
      code: 200,
      data: { ...mockStationConfig, ...data, updatedAt: new Date().toLocaleString('zh-CN') },
      message: '保存成功',
    }
  }
  return apiPost<StationConfig>(`/station/${stationId}/config/update`, data)
}

/**
 * 上传图片
 */
export async function uploadImage(
  file: File,
  type: 'logo' | 'qrcode' | 'banner'
): Promise<ApiResponse<ImageUploadResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 800))
    return {
      code: 200,
      data: {
        url: URL.createObjectURL(file),
        width: 200,
        height: 200,
      },
      message: 'success',
    }
  }
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)
  return apiPost<ImageUploadResponse>('/upload/image', formData)
}

/**
 * 预览主题色效果
 */
export async function previewThemeColor(
  stationId: number,
  themeColorId: string,
  customColors?: { primary: string; secondary: string }
): Promise<ApiResponse<{ previewUrl: string }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: { previewUrl: `/station/preview?theme=${themeColorId}` },
      message: 'success',
    }
  }
  return apiPost<{ previewUrl: string }>(`/station/${stationId}/theme/preview`, { themeColorId, customColors })
}

/**
 * 验证分站名称是否可用
 */
export async function checkStationName(name: string, excludeId?: number): Promise<ApiResponse<{ available: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    // Mock: 名称包含"测试"则不可用
    return {
      code: 200,
      data: { available: !name.includes('测试') },
      message: 'success',
    }
  }
  return apiGet<{ available: boolean }>('/station/check-name', { name, excludeId })
}

/**
 * 获取分站运营数据摘要（用于配置页展示）
 */
export async function getStationSummary(stationId: number): Promise<ApiResponse<{
  memberCount: number
  totalRevenue: number
  contentCount: number
  visitCount: number
}>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: {
        memberCount: 1256,
        totalRevenue: 89650,
        contentCount: 328,
        visitCount: 45820,
      },
      message: 'success',
    }
  }
  return apiGet(`/station/${stationId}/summary`)
}
