/**
 * 圈子详情页数据 + 类型（从原型 app/circles/[id]/page.tsx 1:1 迁移）
 * 含 CircleDetail / CirclePost / CircleMember / 专栏 / 活动 / 会员权益。
 */
import { apiGet, apiPost, useMock } from '@/utils/request'

export interface CircleOwner { id: string; name: string; avatar: string }

export interface CircleDetail {
  id: string
  name: string
  cover: string
  description: string
  category: string
  members: number
  posts: number
  isJoined: boolean
  todayActive?: number
  createdAt: string
  owner: CircleOwner
  rules?: string[]
  announcement?: string
  tags?: string[]
}

export interface CirclePost {
  id: string
  content: string
  images?: string[]
  author: { id: string; name: string; avatar: string; title?: string }
  createdAt: string
  likes: number
  comments: number
  isLiked: boolean
  isPinned?: boolean
  isEssence?: boolean
}

export interface CircleMember {
  id: string
  name: string
  avatar: string
  title?: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
  posts: number
}

export interface CircleColumn {
  id: string; title: string; author: string; cover: string
  articles: number; views: number; isPremium: boolean
}

export interface CircleActivity {
  id: string; type: 'live' | 'checkin' | 'homework'; title: string
  time: string; status: 'upcoming' | 'ongoing'; participants?: number
}

export interface CircleArticle {
  id: string; title: string; cover: string; author: string
  publishedAt: string; views: number; likes: number; isFeatured: boolean
}

export interface MemberBenefit { icon: string; title: string; desc: string }

// ─── mock 数据（与原型完全一致） ───
export const mockCircleDetail: CircleDetail = {
  id: '1',
  name: '八字命理研习社',
  cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop',
  description: '探讨八字命理学的专业圈子，汇聚众多命理爱好者和专业人士，共同研习传统命理文化。',
  category: '命理',
  members: 12580,
  posts: 3256,
  isJoined: false,
  todayActive: 128,
  createdAt: '2023-01-15',
  owner: { id: '1', name: '周易大师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=master' },
  rules: ['禁止发布广告信息', '尊重他人，理性讨论', '禁止人身攻击', '原创内容请标注'],
  announcement: '欢迎加入八字命理研习社！本圈子致力于传承和发扬中华传统命理文化，定期举办线上交流活动，欢迎各位同好积极参与讨论。近期将举办「八字入门精讲」系列直播，敬请期待！',
  tags: ['八字', '命理', '国学', '传统文化'],
}

export const memberBenefits: MemberBenefit[] = [
  { icon: 'book-open', title: '专属内容', desc: '解锁全部精华帖子' },
  { icon: 'message-circle', title: '直接提问', desc: '向圈主发起提问' },
  { icon: 'play', title: '直播回放', desc: '观看历史直播' },
  { icon: 'award', title: '专属勋章', desc: '展示会员身份' },
]

export const mockColumns: CircleColumn[] = [
  { id: 'col1', title: '八字入门系列', author: '周易大师', cover: 'https://picsum.photos/200/150?random=301', articles: 12, views: 8560, isPremium: true },
  { id: 'col2', title: '十神详解', author: '周易大师', cover: 'https://picsum.photos/200/150?random=302', articles: 8, views: 5280, isPremium: false },
  { id: 'col3', title: '实战案例分析', author: '周易大师', cover: 'https://picsum.photos/200/150?random=303', articles: 24, views: 12800, isPremium: true },
]

export const mockCircleArticles: CircleArticle[] = [
  { id: '1', title: '八字入门：如何正确排出你的生辰八字', cover: '/images/feed/article-1.jpg', author: '玄微子', publishedAt: '2024-01-15', views: 8520, likes: 1256, isFeatured: true },
  { id: '2', title: '紫微斗数与八字命理的区别与联系', cover: '/images/feed/article-2.jpg', author: '玄微子', publishedAt: '2024-01-12', views: 3200, likes: 456, isFeatured: false },
  { id: '3', title: '如何从八字看财运旺衰', cover: '', author: '玄微子', publishedAt: '2024-01-08', views: 5600, likes: 890, isFeatured: false },
]

export const mockActivities: CircleActivity[] = [
  { id: 'act1', type: 'live', title: '八字入门精讲（第3期）', time: '今晚 20:00', status: 'upcoming' },
  { id: 'act2', type: 'checkin', title: '《滴天髓》共读打卡 Day 15', time: '进行中', status: 'ongoing', participants: 328 },
  { id: 'act3', type: 'homework', title: '八字案例分析作业', time: '本周日截止', status: 'ongoing', participants: 156 },
]

export const mockDetailPosts: CirclePost[] = [
  { id: '1', content: '今天分享一个八字案例分析：某人八字为甲子、丙寅、戊辰、壬戌，这个八字有什么特点？欢迎大家一起探讨。从五行来看...', images: ['https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop'], author: { id: '1', name: '周易大师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=master', title: '圈主' }, createdAt: '2024-01-15 10:30', likes: 128, comments: 32, isLiked: false, isPinned: true, isEssence: true },
  { id: '2', content: '请教各位老师，关于日主强弱的判断，除了看得令、得地、得生、得助之外，还有什么需要注意的要点吗？', author: { id: '2', name: '命理新手', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=newbie' }, createdAt: '2024-01-15 09:15', likes: 45, comments: 18, isLiked: true },
  { id: '3', content: '分享一本好书《滴天髓》，这是学习八字必读的经典之作，里面的义理非常深刻，推荐给大家。', images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=300&fit=crop'], author: { id: '3', name: '古籍爱好者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=book' }, createdAt: '2024-01-14 16:20', likes: 89, comments: 24, isLiked: false },
]

export const mockMembers: CircleMember[] = [
  { id: '1', name: '周易大师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=master', title: '资深命理师', role: 'owner', joinedAt: '2023-01-15', posts: 156 },
  { id: '2', name: '紫微研究者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ziwei', title: '管理员', role: 'admin', joinedAt: '2023-02-20', posts: 89 },
  { id: '3', name: '命理新手', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=newbie', role: 'member', joinedAt: '2024-01-10', posts: 12 },
  { id: '4', name: '古籍爱好者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=book', role: 'member', joinedAt: '2023-12-05', posts: 34 },
]

// ─── API（mock 容错，与原型 Promise.all + catch 口径一致） ───
export const circleDetailApi = {
  detail: async (id: string): Promise<CircleDetail> => {
    if (useMock()) return { ...mockCircleDetail, id }
    return apiGet(`/circles/${id}`)
  },
  posts: async (id: string): Promise<{ data: CirclePost[]; total: number }> => {
    if (useMock()) return { data: mockDetailPosts, total: mockDetailPosts.length }
    return apiGet(`/circles/${id}/posts`)
  },
  listMembers: async (id: string): Promise<{ data: CircleMember[]; total: number }> => {
    if (useMock()) return { data: mockMembers, total: mockMembers.length }
    return apiGet(`/circles/${id}/members`)
  },
  /** 圈子专栏列表 — GET /circles/:id/columns */
  columns: async (id: string): Promise<CircleColumn[]> => {
    if (useMock()) return mockColumns
    try {
      const data = await apiGet<any>(`/circles/${id}/columns`)
      return (data?.items || data) as CircleColumn[]
    } catch { return mockColumns }
  },
  /** 圈子精选文章 — GET /circles/:id/articles */
  articles: async (id: string): Promise<CircleArticle[]> => {
    if (useMock()) return mockCircleArticles
    try {
      const data = await apiGet<any>(`/circles/${id}/articles`)
      return (data?.items || data) as CircleArticle[]
    } catch { return mockCircleArticles }
  },
  /** 圈子活动列表 — GET /circles/:id/activities */
  activities: async (id: string): Promise<CircleActivity[]> => {
    if (useMock()) return mockActivities
    try {
      const data = await apiGet<any>(`/circles/${id}/activities`)
      return (data?.items || data) as CircleActivity[]
    } catch { return mockActivities }
  },
  join: (id: string) => apiPost<{ success: boolean }>(`/circles/${id}/join`),
  leave: (id: string) => apiPost<{ success: boolean }>(`/circles/${id}/leave`),
}
