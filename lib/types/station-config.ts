// 分站配置相关类型定义

// 主题色预设
export interface ThemeColorPreset {
  id: string
  name: string
  primary: string
  secondary: string
}

// 分站配置信息
export interface StationConfig {
  id: number
  code: string
  // 基本信息
  name: string
  logo: string
  description: string
  // 主题色
  themeColorId: string
  customPrimaryColor?: string
  customSecondaryColor?: string
  // 联系信息
  contactPhone?: string
  contactWechat?: string
  contactEmail?: string
  // 小程序配置
  miniProgramQrcode?: string
  miniProgramAppId?: string
  // 站长信息
  masterInfo: {
    id: number
    nickname: string
    avatar: string
    phone: string
    joinDate: string
  }
  // 状态
  status: 'active' | 'pending' | 'suspended'
  createdAt: string
  updatedAt: string
}

// 分站配置更新请求
export interface StationConfigUpdateRequest {
  name?: string
  logo?: string
  description?: string
  themeColorId?: string
  customPrimaryColor?: string
  customSecondaryColor?: string
  contactPhone?: string
  contactWechat?: string
  contactEmail?: string
  miniProgramQrcode?: string
}

// 图片上传响应
export interface ImageUploadResponse {
  url: string
  width: number
  height: number
}

// 预设主题色列表
export const THEME_COLOR_PRESETS: ThemeColorPreset[] = [
  { id: 'guoxue', name: '故宫红', primary: '#C41E3A', secondary: '#C9A96E' },
  { id: 'jade', name: '玉石青', primary: '#2E8B57', secondary: '#98D8C8' },
  { id: 'royal', name: '皇家蓝', primary: '#1E3A8A', secondary: '#60A5FA' },
  { id: 'zen', name: '禅意灰', primary: '#4A5568', secondary: '#A0AEC0' },
  { id: 'sunset', name: '晚霞紫', primary: '#7C3AED', secondary: '#C4B5FD' },
  { id: 'ocean', name: '海天蓝', primary: '#0EA5E9', secondary: '#7DD3FC' },
  { id: 'forest', name: '竹林绿', primary: '#059669', secondary: '#6EE7B7' },
  { id: 'earth', name: '大地褐', primary: '#92400E', secondary: '#FCD34D' },
]
