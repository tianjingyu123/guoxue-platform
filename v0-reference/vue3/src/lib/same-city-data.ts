/**
 * 同城发现数据（从原型 lib/api/same-city.ts + types/same-city.ts 移植）
 * mock feed 列表 + 城市数据 + helper（标签/颜色/距离）
 * ⚠️ 接后端时替换 mockFeedItems/mockHotCities，保留类型与 helper
 */

export type SameCityContentType = 'activity' | 'course' | 'circle' | 'station' | 'article' | 'video'

export interface SameCityItem {
  id: number
  type: SameCityContentType
  title: string
  cover: string
  description?: string
  author?: { id: number; name: string; avatar: string }
  location: { name: string; address: string; distance?: number }
  startTime?: string
  endTime?: string
  price?: number
  isFree?: boolean
  viewCount?: number
  likeCount?: number
  commentCount?: number
  participantCount?: number
  tags?: string[]
  status?: string
}

export interface HotCity { code: string; name: string; count: number }

// ⚠️ 数据严格照搬原型 lib/api/same-city.ts mockSameCityItems，逐字段对齐（含 distance/价格/时间/统计数，不增删字段）
export const mockFeedItems: SameCityItem[] = [
  {
    id: 1, type: 'activity', title: '周末国学读书会·《论语》精读',
    cover: '', description: '每周六下午，一起品读经典，感悟人生智慧。',
    author: { id: 1, name: '国学社', avatar: '' },
    location: { name: '热卜国学中心', address: '北京市朝阳区建国路88号', distance: 1200 },
    startTime: '2026-06-07 14:00', endTime: '2026-06-07 17:00',
    isFree: true, participantCount: 28,
    tags: ['读书会', '论语', '免费'], status: '报名中',
  },
  {
    id: 2, type: 'course', title: '八字命理入门班·周末班',
    cover: '', description: '零基础入门，系统学习八字命理基础知识。',
    author: { id: 2, name: '李明德', avatar: '' },
    location: { name: '易学书院', address: '北京市海淀区中关村大街1号', distance: 3500 },
    startTime: '2026-06-15 09:00', endTime: '2026-06-15 17:00',
    price: 599, participantCount: 18,
    tags: ['八字', '入门', '周末'], status: '报名中',
  },
  {
    id: 3, type: 'circle', title: '北京易学爱好者交流群',
    cover: '', description: '北京地区易学爱好者交流平台，分享学习心得，组织线下活动。',
    author: { id: 3, name: '易友会', avatar: '' },
    location: { name: '北京市', address: '北京市', distance: 0 },
    viewCount: 5680, likeCount: 328, participantCount: 1256,
    tags: ['交流', '同城', '活动'],
  },
  {
    id: 4, type: 'station', title: '玄门工作室',
    cover: '', description: '专业命理咨询，一对一服务，预约制。',
    location: { name: '玄门工作室', address: '北京市西城区西单北大街100号', distance: 2800 },
    viewCount: 2350,
    tags: ['咨询', '预约'],
  },
  {
    id: 5, type: 'article', title: '北京古观象台：600年的星象观测史',
    cover: '', description: '探访北京古观象台，了解明清两代的天文观测历史。',
    author: { id: 4, name: '文化行者', avatar: '' },
    location: { name: '古观象台', address: '北京市东城区东裱褙胡同2号', distance: 1500 },
    viewCount: 3280, likeCount: 256, commentCount: 45,
    tags: ['历史', '天文', '探访'],
  },
  {
    id: 6, type: 'video', title: '实拍：北京白云观道士的一天',
    cover: '', description: '跟随镜头，了解道士的日常修行生活。',
    author: { id: 5, name: '道文化', avatar: '' },
    location: { name: '白云观', address: '北京市西城区白云观街9号', distance: 4200 },
    viewCount: 12560, likeCount: 1890, commentCount: 234,
    tags: ['道教', '白云观', '纪录'],
  },
]

export const mockHotCities: HotCity[] = [
  { code: 'beijing', name: '北京', count: 1256 },
  { code: 'shanghai', name: '上海', count: 986 },
  { code: 'guangzhou', name: '广州', count: 756 },
  { code: 'shenzhen', name: '深圳', count: 623 },
  { code: 'chengdu', name: '成都', count: 589 },
  { code: 'hangzhou', name: '杭州', count: 478 },
  { code: 'nanjing', name: '南京', count: 412 },
  { code: 'wuhan', name: '武汉', count: 356 },
]

export function getContentTypeLabel(type: SameCityContentType): string {
  const labels: Record<SameCityContentType, string> = {
    activity: '活动', course: '课程', circle: '圈子',
    station: '驿站', article: '文章', video: '视频',
  }
  return labels[type] || '内容'
}

// 类型标签配色（hex，适配 uni-app，非 Tailwind class）
export function getContentTypeColor(type: SameCityContentType): { color: string; bg: string } {
  const colors: Record<SameCityContentType, { color: string; bg: string }> = {
    activity: { color: '#EA580C', bg: 'rgba(234,88,12,0.1)' },
    course: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
    circle: { color: '#9333EA', bg: 'rgba(147,51,234,0.1)' },
    station: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
    article: { color: '#4B5563', bg: 'rgba(75,85,99,0.1)' },
    video: { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
  }
  return colors[type] || { color: '#4B5563', bg: 'rgba(75,85,99,0.1)' }
}

export function getTypeIconName(type: SameCityContentType): string {
  const icons: Record<SameCityContentType, string> = {
    activity: 'calendar', course: 'book-open', circle: 'users',
    station: 'building-2', article: 'file-text', video: 'video',
  }
  return icons[type] || 'compass'
}

export function formatDistance(meters?: number): string {
  if (!meters) return ''
  if (meters < 100) return '100m内'
  if (meters < 1000) return `${meters}m`
  return `${(meters / 1000).toFixed(1)}km`
}

export const filterTabs: { key: SameCityContentType | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'activity', label: '活动' },
  { key: 'course', label: '课程' },
  { key: 'circle', label: '圈子' },
  { key: 'station', label: '驿站' },
]
