// 下载文件类型
export type DownloadFileType = 'ebook' | 'video' | 'classic' | 'audio' | 'document'

// 下载状态
export type DownloadStatus = 'downloading' | 'paused' | 'completed' | 'failed' | 'pending'

// 下载项
export interface DownloadItem {
  id: number
  // 文件信息
  fileName: string
  fileType: DownloadFileType
  fileSize: number // 字节
  cover?: string
  // 来源信息
  sourceId: number
  sourceTitle: string
  sourceType: 'course' | 'ebook' | 'classic' | 'video'
  // 下载状态
  status: DownloadStatus
  // 下载进度（0-100）
  progress: number
  // 已下载大小（字节）
  downloadedSize: number
  // 下载速度（字节/秒）
  speed?: number
  // 时间
  startTime: string
  completedTime?: string
  // 本地路径（已完成时）
  localPath?: string
  // 错误信息（失败时）
  errorMsg?: string
}

// 下载列表响应
export interface DownloadsResponse {
  list: DownloadItem[]
  total: number
  hasMore: boolean
}

// 存储空间信息
export interface StorageInfo {
  // 总空间（字节）
  totalSpace: number
  // 已用空间（字节）
  usedSpace: number
  // 下载内容占用（字节）
  downloadUsed: number
  // 各类型占用
  breakdown: {
    type: DownloadFileType
    size: number
    count: number
  }[]
}
