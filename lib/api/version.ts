import { apiGet, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { VersionInfo, UpdateChangeItem, UpdateType } from '../types/version'

// Mock 版本信息
const mockVersionInfo: VersionInfo = {
  version: '3.2.0',
  versionCode: 320,
  versionName: '国学新篇',
  updateType: 'recommended',
  title: '热卜 v3.2.0 更新',
  changes: [
    { type: 'feature', content: '新增AI排盘助手，智能解读命盘' },
    { type: 'feature', content: '群聊功能上线，支持创建学习群组' },
    { type: 'feature', content: '直播连麦功能，与老师实时互动' },
    { type: 'optimization', content: '课程播放体验优化，支持倍速播放' },
    { type: 'optimization', content: '搜索功能增强，新增语音搜索' },
    { type: 'fix', content: '修复视频卡顿问题' },
    { type: 'fix', content: '修复消息通知延迟' },
  ],
  fileSize: 45 * 1024 * 1024, // 45MB
  downloadUrl: 'https://app.example.com/download/rebu-3.2.0.apk',
  releaseDate: '2026-06-03',
  minSupportVersion: '2.0.0',
}

/**
 * 检查版本更新
 */
export async function checkForUpdate(currentVersion: string): Promise<ApiResponse<VersionInfo | null>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    // 模拟：当前版本低于最新版本时返回更新信息
    const current = currentVersion.split('.').map(Number)
    const latest = mockVersionInfo.version.split('.').map(Number)
    
    const needsUpdate = current[0] < latest[0] || 
      (current[0] === latest[0] && current[1] < latest[1]) ||
      (current[0] === latest[0] && current[1] === latest[1] && current[2] < latest[2])
    
    return {
      code: 200,
      data: needsUpdate ? mockVersionInfo : null,
      message: 'success',
    }
  }
  return apiGet<VersionInfo | null>('/system/version/check', { currentVersion })
}

/**
 * 获取更新类型标签
 */
export function getUpdateTypeLabel(type: UpdateType): string {
  const labels: Record<UpdateType, string> = {
    optional: '可选更新',
    recommended: '推荐更新',
    forced: '强制更新',
  }
  return labels[type]
}

/**
 * 获取更新内容类型图标
 */
export function getChangeTypeIcon(type: UpdateChangeItem['type']): string {
  const icons: Record<UpdateChangeItem['type'], string> = {
    feature: 'sparkles',
    optimization: 'zap',
    fix: 'wrench',
    security: 'shield',
  }
  return icons[type]
}

/**
 * 获取更新内容类型颜色
 */
export function getChangeTypeColor(type: UpdateChangeItem['type']): string {
  const colors: Record<UpdateChangeItem['type'], string> = {
    feature: 'text-primary',
    optimization: 'text-blue-600',
    fix: 'text-green-600',
    security: 'text-amber-600',
  }
  return colors[type]
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * 格式化下载速度
 */
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) return `${bytesPerSecond} B/s`
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
}
