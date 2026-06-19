// 版本更新相关类型定义

// 更新类型
export type UpdateType = 'optional' | 'recommended' | 'forced'

// 更新内容项
export interface UpdateChangeItem {
  type: 'feature' | 'optimization' | 'fix' | 'security'
  content: string
}

// 版本信息
export interface VersionInfo {
  // 版本号
  version: string
  versionCode: number
  // 版本名称
  versionName?: string
  // 更新类型
  updateType: UpdateType
  // 更新内容
  title: string
  changes: UpdateChangeItem[]
  // 文件信息
  fileSize: number       // 字节
  downloadUrl: string
  // 发布时间
  releaseDate: string
  // 最低支持版本（低于此版本强制更新）
  minSupportVersion?: string
}

// 更新状态
export type UpdateStatus = 'idle' | 'downloading' | 'installing' | 'completed' | 'error'

// 更新进度
export interface UpdateProgress {
  status: UpdateStatus
  progress: number       // 0-100
  downloadedSize: number
  totalSize: number
  speed?: number         // 字节/秒
  errorMessage?: string
}
