import { apiGet, apiPost, apiDelete, type ApiResponse } from '../api-client'
import type { DownloadItem, DownloadsResponse, DownloadStatus, DownloadFileType, StorageInfo } from '../types/downloads'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'

// Mock 数据
const mockDownloads: DownloadItem[] = [
  {
    id: 1,
    fileName: '周易入门精讲.mp4',
    fileType: 'video',
    fileSize: 524288000, // 500MB
    cover: '/placeholder.svg?height=60&width=80',
    sourceId: 101,
    sourceTitle: '周易六十四卦详解课程',
    sourceType: 'course',
    status: 'downloading',
    progress: 65,
    downloadedSize: 340787200,
    speed: 2097152, // 2MB/s
    startTime: '2026-06-03 14:30'
  },
  {
    id: 2,
    fileName: '八字命理基础.pdf',
    fileType: 'ebook',
    fileSize: 15728640, // 15MB
    cover: '/placeholder.svg?height=60&width=80',
    sourceId: 201,
    sourceTitle: '八字命理入门到精通',
    sourceType: 'ebook',
    status: 'downloading',
    progress: 30,
    downloadedSize: 4718592,
    speed: 1048576, // 1MB/s
    startTime: '2026-06-03 15:00'
  },
  {
    id: 3,
    fileName: '道德经注解.epub',
    fileType: 'classic',
    fileSize: 8388608, // 8MB
    cover: '/placeholder.svg?height=60&width=80',
    sourceId: 301,
    sourceTitle: '道德经',
    sourceType: 'classic',
    status: 'paused',
    progress: 45,
    downloadedSize: 3774873,
    startTime: '2026-06-03 10:00'
  },
  {
    id: 4,
    fileName: '紫微斗数实战讲座01.mp4',
    fileType: 'video',
    fileSize: 314572800, // 300MB
    cover: '/placeholder.svg?height=60&width=80',
    sourceId: 102,
    sourceTitle: '紫微斗数入门到精通',
    sourceType: 'course',
    status: 'completed',
    progress: 100,
    downloadedSize: 314572800,
    startTime: '2026-06-02 09:00',
    completedTime: '2026-06-02 09:30',
    localPath: '/downloads/video/ziwei_01.mp4'
  },
  {
    id: 5,
    fileName: '风水学基础教材.pdf',
    fileType: 'ebook',
    fileSize: 20971520, // 20MB
    cover: '/placeholder.svg?height=60&width=80',
    sourceId: 202,
    sourceTitle: '阳宅风水入门',
    sourceType: 'ebook',
    status: 'completed',
    progress: 100,
    downloadedSize: 20971520,
    startTime: '2026-06-01 14:00',
    completedTime: '2026-06-01 14:05',
    localPath: '/downloads/ebook/fengshui.pdf'
  },
  {
    id: 6,
    fileName: '论语全文.epub',
    fileType: 'classic',
    fileSize: 5242880, // 5MB
    cover: '/placeholder.svg?height=60&width=80',
    sourceId: 302,
    sourceTitle: '论语',
    sourceType: 'classic',
    status: 'completed',
    progress: 100,
    downloadedSize: 5242880,
    startTime: '2026-05-30 10:00',
    completedTime: '2026-05-30 10:02',
    localPath: '/downloads/classic/lunyu.epub'
  },
  {
    id: 7,
    fileName: '梅花易数讲座.mp3',
    fileType: 'audio',
    fileSize: 52428800, // 50MB
    cover: '/placeholder.svg?height=60&width=80',
    sourceId: 103,
    sourceTitle: '梅花易数精讲',
    sourceType: 'course',
    status: 'failed',
    progress: 20,
    downloadedSize: 10485760,
    startTime: '2026-06-03 12:00',
    errorMsg: '网络连接中断'
  },
  {
    id: 8,
    fileName: '六壬神课入门.pdf',
    fileType: 'document',
    fileSize: 12582912, // 12MB
    cover: '/placeholder.svg?height=60&width=80',
    sourceId: 203,
    sourceTitle: '大六壬预测学',
    sourceType: 'ebook',
    status: 'pending',
    progress: 0,
    downloadedSize: 0,
    startTime: '2026-06-03 15:30'
  }
]

const mockStorageInfo: StorageInfo = {
  totalSpace: 10737418240, // 10GB
  usedSpace: 4294967296, // 4GB
  downloadUsed: 942669824, // 约900MB
  breakdown: [
    { type: 'video', size: 629145600, count: 2 },
    { type: 'ebook', size: 157286400, count: 3 },
    { type: 'classic', size: 104857600, count: 2 },
    { type: 'audio', size: 52428800, count: 1 },
    { type: 'document', size: 0, count: 0 }
  ]
}

/**
 * 获取下载列表
 */
export async function getDownloads(
  page: number = 1,
  pageSize: number = 20,
  filter: 'all' | 'downloading' | 'completed' = 'all'
): Promise<ApiResponse<DownloadsResponse>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500))
    let filtered = mockDownloads
    if (filter === 'downloading') {
      filtered = mockDownloads.filter(d => ['downloading', 'paused', 'pending', 'failed'].includes(d.status))
    } else if (filter === 'completed') {
      filtered = mockDownloads.filter(d => d.status === 'completed')
    }
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return {
      code: 200,
      data: {
        list: filtered.slice(start, end),
        total: filtered.length,
        hasMore: end < filtered.length
      },
      message: 'success'
    }
  }
  
  return apiGet<DownloadsResponse>('/api/user/downloads', { page, pageSize, filter })
}

/**
 * 获取存储空间信息
 */
export async function getStorageInfo(): Promise<ApiResponse<StorageInfo>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: mockStorageInfo,
      message: 'success'
    }
  }
  
  return apiGet<StorageInfo>('/api/user/storage-info')
}

/**
 * 暂停下载
 */
export async function pauseDownload(downloadId: number): Promise<ApiResponse<null>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { code: 200, data: null, message: '已暂停' }
  }
  
  return apiPost<null>(`/api/downloads/${downloadId}/pause`)
}

/**
 * 继续下载
 */
export async function resumeDownload(downloadId: number): Promise<ApiResponse<null>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { code: 200, data: null, message: '已继续' }
  }
  
  return apiPost<null>(`/api/downloads/${downloadId}/resume`)
}

/**
 * 取消/删除下载
 */
export async function deleteDownload(downloadId: number): Promise<ApiResponse<null>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: null, message: '已删除' }
  }
  
  return apiDelete<null>(`/api/downloads/${downloadId}`)
}

/**
 * 重试下载
 */
export async function retryDownload(downloadId: number): Promise<ApiResponse<null>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return { code: 200, data: null, message: '已重新开始' }
  }
  
  return apiPost<null>(`/api/downloads/${downloadId}/retry`)
}

/**
 * 清除已完成的下载
 */
export async function clearCompletedDownloads(): Promise<ApiResponse<{ count: number }>> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 400))
    const count = mockDownloads.filter(d => d.status === 'completed').length
    return { code: 200, data: { count }, message: `已清除${count}项` }
  }
  
  return apiPost<{ count: number }>('/api/downloads/clear-completed')
}

/**
 * 获取文件类型图标名称
 */
export function getFileTypeIcon(type: DownloadFileType): string {
  const icons: Record<DownloadFileType, string> = {
    video: 'Video',
    ebook: 'BookOpen',
    classic: 'Scroll',
    audio: 'Headphones',
    document: 'FileText'
  }
  return icons[type] || 'File'
}

/**
 * 获取文件类型名称
 */
export function getFileTypeName(type: DownloadFileType): string {
  const names: Record<DownloadFileType, string> = {
    video: '视频',
    ebook: '电子书',
    classic: '古籍',
    audio: '音频',
    document: '文档'
  }
  return names[type] || '文件'
}

/**
 * 获取下载状态名称
 */
export function getStatusName(status: DownloadStatus): string {
  const names: Record<DownloadStatus, string> = {
    downloading: '下载中',
    paused: '已暂停',
    completed: '已完成',
    failed: '下载失败',
    pending: '等待中'
  }
  return names[status] || '未知'
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i]
}

/**
 * 格式化下载速度
 */
export function formatSpeed(bytesPerSecond: number): string {
  return formatFileSize(bytesPerSecond) + '/s'
}

/**
 * 获取内容打开路径
 */
export function getContentPath(item: DownloadItem): string {
  switch (item.sourceType) {
    case 'course':
      return `/course/${item.sourceId}`
    case 'ebook':
      return `/ebook/${item.sourceId}/read`
    case 'classic':
      return `/classics/${item.sourceId}/read`
    case 'video':
      return `/video/${item.sourceId}`
    default:
      return '#'
  }
}
