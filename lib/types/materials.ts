// 推广素材相关类型定义

// 素材类型
export type MaterialType = 'poster' | 'copywriting' | 'qrcode'

// 素材分类
export interface MaterialCategory {
  id: string
  type: MaterialType
  name: string
  count: number
}

// 海报素材
export interface PosterMaterial {
  id: number
  type: 'poster'
  title: string
  thumbnail: string
  fullImage: string
  width: number
  height: number
  useCount: number
  createdAt: string
  tags: string[]
}

// 文案素材
export interface CopywritingMaterial {
  id: number
  type: 'copywriting'
  title: string
  content: string
  copyCount: number
  createdAt: string
  tags: string[]
  // 适用场景
  scene: string
}

// 二维码素材
export interface QrcodeMaterial {
  id: number
  type: 'qrcode'
  title: string
  qrcodeUrl: string
  targetUrl: string
  // 二维码类型
  qrcodeType: 'register' | 'product' | 'circle' | 'activity' | 'custom'
  scanCount: number
  createdAt: string
  // 有效期
  expireAt?: string
}

// 联合类型
export type Material = PosterMaterial | CopywritingMaterial | QrcodeMaterial

// 素材库数据
export interface MaterialsData {
  categories: MaterialCategory[]
  materials: Material[]
  total: number
  hasMore: boolean
}

// 素材详情（海报）
export interface PosterDetail extends PosterMaterial {
  description: string
  downloadCount: number
  shareCount: number
}
