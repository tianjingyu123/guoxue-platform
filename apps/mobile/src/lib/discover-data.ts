import { apiGet, useMock } from '@/utils/request'
import type {
  ProductCardData, CourseCardData, LiveCardData,
  AgentCardData, ClassicCardData, VideoCardData,
} from '@/lib/card-utils'

// 核心入口宫格 - 商业变现板块入口（高频在前）
export const coreEntries = [
  { id: 'course', icon: 'book-open', label: '课程', href: '/courses' },
  { id: 'mall', icon: 'shopping-bag', label: '商城', href: '/mall' },
  { id: 'classics', icon: 'scroll-text', label: '古籍馆', href: '/classics/home' },
  { id: 'agent', icon: 'bot', label: '智能体广场', href: '/agents' },
  { id: 'circles', icon: 'users', label: '圈子广场', href: '/pages/circles/index' },
  { id: 'video', icon: 'play', label: '视频', href: '/videos' },
  { id: 'live', icon: 'radio', label: '直播', href: '/live' },
  { id: 'rank', icon: 'trending-up', label: '榜单', href: '/rankings' },
]

// 品类导航 - 10大内容品类
export const allCategory = { id: 'all', label: '推荐' }
export const categories = [
  { id: 'classic', label: '经典' },
  { id: 'poetry', label: '诗词' },
  { id: 'mingli', label: '命理' },
  { id: 'fengshui', label: '风水' },
  { id: 'health', label: '养生' },
  { id: 'martial', label: '武术' },
  { id: 'tea', label: '茶道' },
  { id: 'calligraphy', label: '书法' },
  { id: 'painting', label: '国画' },
  { id: 'music', label: '音乐' },
]

// 运营专栏 - 平台手动配置
export const columns = [
  { id: 'best-courses', title: '精选好课', subtitle: '名师系统课程', count: 36, href: '/topic/精选好课', cover: '/static/discover/board-courses.png', accent: '#A0621A' },
  { id: 'hot-products', title: '热门好物', subtitle: '开运法器精选', count: 128, href: '/topic/热门好物', cover: '/static/discover/board-products.png', accent: '#8B2E2E' },
  { id: 'new-classics', title: '古籍新上', subtitle: '经典原著典藏', count: 24, href: '/topic/古籍新上', cover: '/static/discover/board-classics.png', accent: '#7A5A20' },
  { id: 'rec-circles', title: '推荐圈子', subtitle: '同好交流社群', count: 52, href: '/topic/推荐圈子', cover: '/static/discover/board-circles.png', accent: '#5A3E6B' },
]

// 热搜词
export const hotWords = ['八字入门', '紫微斗数', '风水罗盘', '开运水晶', '六爻占卜']

// 推荐内容流数据
export type FeedItem =
  | { kind: 'product'; data: ProductCardData }
  | { kind: 'course'; data: CourseCardData }
  | { kind: 'live'; data: LiveCardData }
  | { kind: 'agent'; data: AgentCardData }
  | { kind: 'classic'; data: ClassicCardData }
  | { kind: 'video'; data: VideoCardData }

export const feedItems: FeedItem[] = [
  { kind: 'product', data: { id: 'p1', title: '天然黑曜石貔貅手链 招财转运', cover: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&q=80', coverRatio: '3:4', price: 128, originalPrice: 268, sales: 2600, tag: '热销' } },
  { kind: 'agent', data: { id: 'a1', name: '八字命理大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80', description: '精准分析四柱八字，解读事业财运婚姻', useCount: 128000, rating: 4.9, tag: 'HOT' } },
  { kind: 'course', data: { id: 'c1', title: '紫微斗数入门到精通', cover: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80', coverRatio: '1:1', teacher: '林道长', teacherAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80', price: 199, originalPrice: 399, students: 3200, lessons: 36, tag: '系统课' } },
  { kind: 'live', data: { id: 'l1', title: '八字实战：如何看婚姻宫', host: '易学张老师', hostAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80', cover: 'https://images.unsplash.com/photo-1557425493-6f90ae4659fc?w=400&q=80', coverRatio: '3:4', viewers: 13000, status: 'live', liveType: 'knowledge' } },
  { kind: 'classic', data: { id: 'b1', title: '渊海子平', author: '徐子平', dynasty: '宋', description: '命理学开山之作，八字预测必读经典', isFree: true, readers: 62000 } },
  { kind: 'video', data: { id: 'v1', title: '一分钟看懂你的命宫主星是什么', cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80', coverRatio: '3:4', author: '紫微门人', plays: 286000, likes: 12000, duration: '01:23' } },
  { kind: 'product', data: { id: 'p2', title: '专业风水罗盘 纯铜精工', cover: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=400&q=80', coverRatio: '1:1', price: 298, originalPrice: 598, sales: 890, tag: '秒杀' } },
  { kind: 'agent', data: { id: 'a2', name: '周易占卜师', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80', description: '六爻起卦断事，趋吉避凶指引方向', useCount: 86000, rating: 4.8, tag: '精准' } },
  { kind: 'course', data: { id: 'c2', title: '风水堪舆实战班', cover: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80', coverRatio: '1:1', teacher: '王大师', teacherAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80', price: 299, originalPrice: 599, students: 1800, lessons: 48, tag: 'TOP3' } },
  { kind: 'classic', data: { id: 'b2', title: '滴天髓', author: '刘伯温', dynasty: '明', description: '命理学巅峰之作，论命精髓尽在此书', hasAudio: true, readers: 45000 } },
  { kind: 'live', data: { id: 'l2', title: '开运水晶专场 限量秒杀', host: '福缘阁主', hostAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80', cover: 'https://images.unsplash.com/photo-1600721391689-2564bb8055de?w=400&q=80', coverRatio: '3:4', reservations: 328, status: 'upcoming', scheduledTime: '今晚 20:00', liveType: 'commerce' } },
  { kind: 'video', data: { id: 'v2', title: '客厅财位怎么找？三步定位法', cover: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80', coverRatio: '1:1', author: '风水王老师', plays: 563000, likes: 38000, duration: '02:45' } },
  { kind: 'product', data: { id: 'p3', title: '开光五帝钱挂件 镇宅化煞', cover: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80', coverRatio: '1:1', price: 58, originalPrice: 128, sales: 4500, tag: '新品' } },
  { kind: 'course', data: { id: 'c3', title: '六爻预测从零开始', cover: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?w=400&q=80', coverRatio: '3:4', teacher: '陈老师', teacherAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80', price: 128, originalPrice: 299, students: 1300, lessons: 24 } },
]

// ============ API 层 ============

export const discoverApi = {
  /** 获取推荐流 — GET /discover */
  async getFeed(): Promise<FeedItem[]> {
    if (useMock()) return feedItems
    try {
      const data = await apiGet<any[]>('/discover')
      return (data || []) as FeedItem[]
    } catch {
      return feedItems
    }
  },

  /** 获取分类列表 — GET /discover/categories */
  async getCategories(): Promise<{ id: string; label: string }[]> {
    if (useMock()) return [allCategory, ...categories]
    try {
      const data = await apiGet<any[]>('/discover/categories')
      return (data && data.length > 0) ? data as any[] : [allCategory, ...categories]
    } catch {
      return [allCategory, ...categories]
    }
  },

  /** 获取热搜词 — GET /discover/hot */
  async getHotWords(): Promise<string[]> {
    if (useMock()) return hotWords
    try {
      const data = await apiGet<string[]>('/discover/hot')
      return (data && data.length > 0) ? data : hotWords
    } catch {
      return hotWords
    }
  },

  /** 获取推荐 — GET /discover/recommendations */
  async getRecommendations(): Promise<FeedItem[]> {
    if (useMock()) return feedItems.slice(0, 6)
    try {
      const data = await apiGet<any[]>('/discover/recommendations')
      return (data || []) as FeedItem[]
    } catch {
      return feedItems.slice(0, 6)
    }
  },
}
