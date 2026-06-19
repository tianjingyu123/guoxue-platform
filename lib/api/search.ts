// 搜索相关 API
import { apiGet, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { HotSearch, SearchSuggestion, SearchResults } from '../types/search'

// ========== Mock 数据 ==========

const mockHotSearches: HotSearch[] = [
  { keyword: '八字入门', isHot: true, rank: 1 },
  { keyword: '紫微斗数', isHot: true, rank: 2 },
  { keyword: '风水布局', isHot: false, rank: 3 },
  { keyword: '奇门遁甲', isHot: true, rank: 4 },
  { keyword: '六爻预测', isHot: false, rank: 5 },
  { keyword: '梅花易数', isHot: false, rank: 6 },
  { keyword: '姓名学', isHot: false, rank: 7 },
  { keyword: '面相手相', isHot: false, rank: 8 },
]

const mockSuggestionsMap: Record<string, SearchSuggestion[]> = {
  '八': [
    { keyword: '八字排盘', count: 12800 },
    { keyword: '八字入门教程', count: 8560 },
    { keyword: '八字看婚姻', count: 6280 },
    { keyword: '八字看财运', count: 5120 },
    { keyword: '八字命理书籍', count: 3680 },
  ],
  '紫': [
    { keyword: '紫微斗数', count: 15600 },
    { keyword: '紫微斗数入门', count: 8920 },
    { keyword: '紫微斗数排盘', count: 7680 },
    { keyword: '紫微斗数课程', count: 4520 },
  ],
  '风': [
    { keyword: '风水学', count: 18200 },
    { keyword: '风水布局', count: 12800 },
    { keyword: '风水入门', count: 9560 },
    { keyword: '风水大师', count: 6280 },
  ],
}

const mockSearchResults: SearchResults = {
  circles: [
    { id: 1, name: '八字命理研习社', description: '专注八字命理学习与交流', highlight: '每日案例解析，从入门到精通的八字学习社区', cover: '/images/circles/circle-1.jpg', members: 12800, price: 0, owner: '张玄风', ownerAvatar: '/images/experts/expert-1.jpg', ownerTitle: '资深命理师', isVerified: true, tags: ['活跃', '干货多'], rating: 4.9, todayPosts: 56, recentJoiners: ['/images/avatars/avatar-1.jpg', '/images/avatars/avatar-2.jpg', '/images/avatars/avatar-3.jpg'] },
    { id: 2, name: '紫微斗数爱好者', description: '紫微斗数入门到精通', highlight: '紫微斗数系统学习，命盘解读、案例分析', cover: '/images/circles/circle-2.jpg', members: 8560, price: 0, owner: '紫微居士', ownerAvatar: '/images/experts/expert-2.jpg', ownerTitle: '斗数研究者', isVerified: true, tags: ['免费', '新手友好'], rating: 4.8, todayPosts: 32, recentJoiners: ['/images/avatars/avatar-2.jpg', '/images/avatars/avatar-3.jpg', '/images/avatars/avatar-1.jpg'] },
  ],
  courses: [
    { id: 1, title: '八字命理入门精讲', instructor: '李明远', price: 299, originalPrice: 599, cover: '', students: 1820 },
    { id: 2, title: '八字高级实战课程', instructor: '王易山', price: 599, originalPrice: 999, cover: '', students: 986 },
  ],
  products: [
    { id: 1, name: '渊海子平（精装典藏版）', price: 128, originalPrice: 168, image: '', sales: 2680 },
    { id: 2, name: '命理学基础工具套装', price: 299, originalPrice: 399, image: '', sales: 1520 },
  ],
  articles: [
    { id: 1, title: '八字入门：天干地支详解', author: '易学大师', avatar: '', views: 12800, likes: 356 },
    { id: 2, title: '如何看懂自己的八字命盘', author: '命理学堂', avatar: '', views: 8960, likes: 228 },
  ],
  users: [
    { id: 1, name: '李明远', title: '八字命理师', followers: 12800, avatar: '', isVerified: true },
    { id: 2, name: '王易山', title: '紫微斗数专家', followers: 8600, avatar: '', isVerified: true },
  ],
}

// ========== API 函数 ==========

// 获取热门搜索
export async function getHotSearches(): Promise<ApiResponse<HotSearch[]>> {
  if (useMock()) {
    return { code: 200, data: mockHotSearches, message: 'success' }
  }
  return apiGet<HotSearch[]>('/search/hot')
}

// 获取搜索联想
export async function getSearchSuggestions(keyword: string): Promise<ApiResponse<SearchSuggestion[]>> {
  if (useMock()) {
    const firstChar = keyword[0] || ''
    const suggestions = mockSuggestionsMap[firstChar] || []
    const filtered = suggestions.filter(s => s.keyword.toLowerCase().includes(keyword.toLowerCase()))
    return { code: 200, data: filtered, message: 'success' }
  }
  return apiGet<SearchSuggestion[]>('/search/suggestions', { keyword })
}

// 搜索
export async function search(keyword: string, type?: string, page: number = 1, pageSize: number = 20): Promise<ApiResponse<SearchResults>> {
  if (useMock()) {
    // 模拟搜索延迟
    await new Promise(resolve => setTimeout(resolve, 500))
    return { code: 200, data: mockSearchResults, message: 'success' }
  }
  return apiGet<SearchResults>('/search', { keyword, type, page, pageSize })
}
