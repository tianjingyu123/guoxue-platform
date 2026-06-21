// 海报相关类型定义

// 海报类型
export type PosterType = 'invite' | 'course' | 'article' | 'live' | 'product' | 'profile' | 'circle'

// 海报模板
export interface PosterTemplate {
  id: number
  name: string
  thumbnail: string
  backgroundImage: string
  // 布局配置
  layout: 'default' | 'minimal' | 'featured'
}

// 海报内容数据
export interface PosterData {
  // 基础信息
  type: PosterType
  title: string
  subtitle?: string
  description?: string
  // 图片
  coverImage?: string
  qrCodeUrl: string
  // 用户信息
  userAvatar?: string
  userName?: string
  // 价格信息（课程/商品）
  price?: number
  originalPrice?: number
  // 额外数据
  extra?: {
    // 课程
    lessonCount?: number
    studentCount?: number
    // 文章
    readCount?: number
    likeCount?: number
    // 直播
    viewerCount?: number
    startTime?: string
    // 邀请
    inviteCode?: string
    benefits?: string[]
    // 圈子
    memberCount?: number
    contentCount?: number
  }
}

// 海报配置
export interface PosterConfig {
  // 画布尺寸
  width: number
  height: number
  // 背景
  backgroundColor?: string
  backgroundImage?: string
  backgroundGradient?: string
  // 模板
  templates: PosterTemplate[]
}

// 海报生成结果
export interface PosterResult {
  imageUrl: string
  base64?: string
}
