/**
 * 圈子详情页数据 + 类型（从原型 app/circles/[id]/page.tsx 1:1 迁移）
 * 含 CircleDetail / CirclePost / CircleMember / 专栏 / 活动 / 会员权益。
 */
import { apiGet, apiPost, apiPut, apiDelete, useMock } from '@/utils/request'

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
  type?: 'FREE' | 'PAID' | 'YEARLY'
  price?: number
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
  type: 'YEARLY',
  price: 19900,
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
  // —— 基础 ——
  detail: async (id: string): Promise<CircleDetail> => {
    if (useMock()) return { ...mockCircleDetail, id }
    return apiGet(`/circles/${id}`)
  },
  update: (id: string, data: Record<string, unknown>) => useMock() ? { ...data } : apiPut(`/circles/${id}`, data),

  // —— 帖子 ——
  getPostDetail: (circleId: string, postId: string) =>
    apiGet(`/circles/${circleId}/posts/${postId}`),
  posts: async (id: string, params?: { type?: string; isEssence?: string; page?: number; pageSize?: number }): Promise<{ data: CirclePost[]; total: number }> => {
    if (useMock()) return { data: mockDetailPosts, total: mockDetailPosts.length }
    const qs = new URLSearchParams()
    if (params?.type) qs.set('type', params.type)
    if (params?.isEssence) qs.set('isEssence', params.isEssence)
    if (params?.page) qs.set('page', String(params.page))
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize))
    return apiGet(`/circles/${id}/posts?${qs.toString()}`)
  },
  createPost: (circleId: string, data: { content: string; images?: string[]; title?: string; type?: string; isDraft?: boolean }) =>
    useMock() ? { id: String(Date.now()), ...data, createdAt: new Date().toISOString() } : apiPost(`/circles/${circleId}/posts`, data),
  updatePost: (circleId: string, postId: string, data: Record<string, unknown>) =>
    apiPut(`/circles/${circleId}/posts/${postId}`, data),
  deletePost: (circleId: string, postId: string) =>
    apiDelete(`/circles/${circleId}/posts/${postId}`),
  publishPost: (circleId: string, postId: string) =>
    apiPost(`/circles/${circleId}/posts/${postId}/publish`),
  toggleEssence: (circleId: string, postId: string) =>
    apiPost(`/circles/${circleId}/posts/${postId}/essence`),
  toggleTop: (circleId: string, postId: string) =>
    apiPost(`/circles/${circleId}/posts/${postId}/top`),
  rewardPost: (circleId: string, postId: string, amount: number, message?: string) =>
    apiPost(`/circles/${circleId}/posts/${postId}/reward`, { amount, message }),

  // —— 成员 ——
  listMembers: async (id: string, page = 1, pageSize = 20): Promise<{ data: CircleMember[]; total: number }> => {
    if (useMock()) return { data: mockMembers, total: mockMembers.length }
    return apiGet(`/circles/${id}/members?page=${page}&pageSize=${pageSize}`)
  },
  updateMemberRole: (circleId: string, userId: string, role: string) =>
    apiPut(`/circles/${circleId}/members/${userId}/role`, { role }),
  removeMember: (circleId: string, userId: string) =>
    apiDelete(`/circles/${circleId}/members/${userId}`),
  getMemberLeaderboard: (circleId: string, page = 1, pageSize = 20, period?: string) => {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (period) qs.set('period', period)
    return apiGet(`/circles/${circleId}/leaderboard?${qs.toString()}`)
  },

  // —— 公告 ——
  getAnnouncement: (circleId: string) => apiGet(`/circles/${circleId}/announcement`),
  listAnnouncements: (circleId: string, page = 1, pageSize = 20) =>
    apiGet(`/circles/${circleId}/announcements?page=${page}&pageSize=${pageSize}`),
  setAnnouncement: (circleId: string, content: string, isTop?: boolean) =>
    apiPut(`/circles/${circleId}/announcement`, { content, isTop }),
  deleteAnnouncement: (circleId: string, announcementId: string) =>
    apiDelete(`/circles/${circleId}/announcement/${announcementId}`),
  markAnnouncementRead: (circleId: string, announcementId: string) =>
    apiPost(`/circles/${circleId}/announcements/${announcementId}/read`),

  // —— 邀请 ——
  listInviteCodes: (circleId: string) => apiGet(`/circles/${circleId}/invite-codes`),
  getInvitationStats: (circleId: string) => apiGet(`/circles/${circleId}/invitation-stats`),

  // —— 专家/咨询 ——
  listExperts: (circleId: string) => apiGet(`/circles/${circleId}/experts`),
  getExpertConfig: (circleId: string, userId: string) => apiGet(`/circles/${circleId}/expert/${userId}`),
  setExpertConfig: (circleId: string, data: { askPrice?: number; callPrice?: number; bio?: string }) =>
    apiPost(`/circles/${circleId}/expert/config`, data),
  getExpertSlots: (expertId: string, date?: string) =>
    apiGet(`/circles/expert/${expertId}/slots${date ? `?date=${date}` : ''}`),
  createExpertBooking: (expertId: string, data: { slotDate: string; slotStart: string; slotEnd: string; topic?: string; notes?: string }) =>
    apiPost(`/circles/expert/${expertId}/bookings`, data),

  // —— 成员分组 ——
  listMemberGroups: (circleId: string) => apiGet(`/circles/${circleId}/member-groups`),
  createMemberGroup: (circleId: string, name: string, color?: string) =>
    apiPost(`/circles/${circleId}/member-groups`, { name, color }),
  updateMemberGroup: (circleId: string, groupId: string, data: { name?: string; color?: string }) =>
    apiPut(`/circles/${circleId}/member-groups/${groupId}`, data),
  deleteMemberGroup: (circleId: string, groupId: string) =>
    apiDelete(`/circles/${circleId}/member-groups/${groupId}`),
  addMembersToGroup: (circleId: string, groupId: string, userIds: string[]) =>
    apiPost(`/circles/${circleId}/member-groups/${groupId}/members`, { userIds }),
  removeMemberFromGroup: (circleId: string, groupId: string, userId: string) =>
    apiDelete(`/circles/${circleId}/member-groups/${groupId}/members/${userId}`),
  getGroupMembers: (circleId: string, groupId: string, page = 1, pageSize = 20) =>
    apiGet(`/circles/${circleId}/member-groups/${groupId}/members?page=${page}&pageSize=${pageSize}`),

  // —— 内容 ——
  getHotContent: (circleId: string, limit = 10) =>
    apiGet(`/circles/${circleId}/hot-content?limit=${limit}`),

  // —— 咨询问答（后端路由 /question，circleId 以 query/body 传递） ——
  listQuestions: async (circleId: string, page = 1, pageSize = 20) => {
    if (useMock()) return { data: mockQuestions, total: mockQuestions.length }
    return apiGet(`/question?circleId=${circleId}&page=${page}&pageSize=${pageSize}`)
  },
  createQuestion: (circleId: string, data: { title: string; content: string }) =>
    apiPost('/question/ask', { circleId, questionTitle: data.title, question: data.content }),

  // —— 咨询订单 ——
  listOrders: async (params?: { status?: string; page?: number; pageSize?: number }) => {
    if (useMock()) {
      let filtered = [...mockOrders]
      if (params?.status && params.status !== 'all') filtered = filtered.filter(o => o.status === params.status)
      return { data: filtered, total: filtered.length }
    }
    const qs = new URLSearchParams()
    if (params?.status && params.status !== 'all') qs.set('status', params.status)
    if (params?.page) qs.set('page', String(params.page))
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize))
    return apiGet(`/orders/my?${qs.toString()}`)
  },

  // —— 加入/退出 ——
  join: (id: string) => useMock() ? { success: true } : apiPost<{ success: boolean }>(`/circles/${id}/join`),
  leave: (id: string) => useMock() ? { success: true } : apiPost<{ success: boolean }>(`/circles/${id}/leave`),
}

// ─── 咨询 mock 数据 ───
export interface QuestionItem {
  id: string; title: string; content: string; asker: string; avatar: string
  views: number; likes: number; answers: number; status: 'answered' | 'unanswered'; time: string
}

export const mockQuestions: QuestionItem[] = [
  { id: '1', title: '如何通过八字看一个人的财运？', content: '我想了解如何从八字命盘中看出一个人的财运好坏，有什么关键要素吗？', asker: '张女士', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40', views: 1250, likes: 85, answers: 12, status: 'answered', time: '2024-01-20 14:30' },
  { id: '2', title: '紫微斗数和八字哪个准确率更高？', content: '想对比一下两种算命方法的准确率，求推荐。', asker: '李先生', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40', views: 850, likes: 62, answers: 8, status: 'answered', time: '2024-01-20 10:15' },
  { id: '3', title: '流年大运是如何计算的？', content: '请问流年大运的计算方法，以及如何才能准确的判断出一个人的吉凶祸福。', asker: '王女士', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40', views: 620, likes: 45, answers: 5, status: 'unanswered', time: '2024-01-20 09:45' },
]

export interface OrderItem {
  id: string; orderNo: string; expert: string; avatar: string
  type: 'call' | 'text'; amount: string; status: 'completed' | 'pending' | 'refunded'
  createdAt: string; desc: string
}

export const mockOrders: OrderItem[] = [
  { id: '1', orderNo: 'CS202401200001', expert: '周易大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', type: 'call', amount: '¥84.00', status: 'completed', createdAt: '2024-01-20', desc: '电话咨询 28分钟' },
  { id: '2', orderNo: 'CS202401180002', expert: '张玄风', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80', type: 'text', amount: '¥30.00', status: 'completed', createdAt: '2024-01-18', desc: '图文咨询' },
  { id: '3', orderNo: 'CS202401220003', expert: '李玄机', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80', type: 'text', amount: '¥80.00', status: 'pending', createdAt: '2024-01-22', desc: '图文咨询（待回复）' },
  { id: '4', orderNo: 'CS202401100004', expert: '王德华', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80', type: 'call', amount: '¥126.00', status: 'completed', createdAt: '2024-01-10', desc: '电话咨询 42分钟' },
  { id: '5', orderNo: 'CS202401050005', expert: '林奇门', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80', type: 'call', amount: '¥0.00', status: 'refunded', createdAt: '2024-01-05', desc: '已退款' },
]

export interface ExpertItem {
  id: string; name: string; avatar: string; title?: string; specialty: string; tags: string[]
  rating: number; reviewCount: number; callPrice: number; textPrice: number
  responseTime: string; online: boolean; verified: boolean; answerCount: number
}

export const mockExperts: ExpertItem[] = [
  { id: '1', name: '周易大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', title: '资深命理师', specialty: '八字命理', tags: ['四柱', '流年', '大运'], rating: 4.9, reviewCount: 1256, callPrice: 3, textPrice: 50, responseTime: '5分钟内', online: true, verified: true, answerCount: 3860 },
  { id: '2', name: '张玄风', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80', title: '紫微斗数专家', specialty: '紫微斗数', tags: ['命宫', '四化', '格局'], rating: 4.8, reviewCount: 980, callPrice: 3, textPrice: 30, responseTime: '10分钟内', online: true, verified: true, answerCount: 2540 },
  { id: '3', name: '李玄机', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80', title: '易学研究员', specialty: '易经占卜', tags: ['六十四卦', '梅花', '起卦'], rating: 4.7, reviewCount: 742, callPrice: 2, textPrice: 30, responseTime: '15分钟内', online: false, verified: true, answerCount: 1980 },
  { id: '4', name: '王德华', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80', title: '风水大师', specialty: '风水堪舆', tags: ['阳宅', '阴宅', '布局'], rating: 4.8, reviewCount: 624, callPrice: 4, textPrice: 80, responseTime: '30分钟内', online: true, verified: true, answerCount: 1560 },
  { id: '5', name: '林奇门', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80', title: '奇门研究者', specialty: '奇门遁甲', tags: ['起局', '决策', '事业'], rating: 4.6, reviewCount: 468, callPrice: 2, textPrice: 30, responseTime: '20分钟内', online: false, verified: false, answerCount: 1240 },
]

// ─── 管理页扩展类型与 mock ───

export interface GuestItem {
  id: string; name: string; avatar: string; title: string
  role: 'guest' | 'teacher'; joinedAt: string; status: 'active' | 'pending'
  stats: { articles: number; courses: number; lives: number; totalRevenue: number; thisMonthRevenue: number }
  revenueShare: number; permissions: string[]
}

export const mockGuests: GuestItem[] = [
  { id: '1', name: '张玄风', avatar: '/static/avatars/u1.png', title: '资深命理师', role: 'guest', joinedAt: '2024-01-10', status: 'active', stats: { articles: 28, courses: 3, lives: 12, totalRevenue: 12680.5, thisMonthRevenue: 2350 }, revenueShare: 70, permissions: ['article', 'course', 'live', 'qa'] },
  { id: '2', name: '李易安', avatar: '/static/avatars/u2.png', title: '紫微斗数讲师', role: 'teacher', joinedAt: '2024-02-15', status: 'active', stats: { articles: 15, courses: 5, lives: 8, totalRevenue: 8920, thisMonthRevenue: 1680 }, revenueShare: 60, permissions: ['article', 'course'] },
  { id: '3', name: '王命理', avatar: '/static/avatars/u3.png', title: '八字研究者', role: 'guest', joinedAt: '2024-03-01', status: 'pending', stats: { articles: 0, courses: 0, lives: 0, totalRevenue: 0, thisMonthRevenue: 0 }, revenueShare: 50, permissions: ['article'] },
]

export interface CalEvent {
  id: string; date: string; title: string; time: string; circle: string
  type: 'activity' | 'live' | 'offline'
}

export const mockCalEvents: CalEvent[] = [
  { id: '1', date: '2026-06-12', title: '八字命理公开课', time: '19:00', circle: '八字命理研习社', type: 'live' },
  { id: '2', date: '2026-06-15', title: '风水勘察分享会', time: '14:00', circle: '风水堪舆交流', type: 'offline' },
  { id: '3', date: '2026-06-15', title: '易经读书会', time: '20:00', circle: '易经研究会', type: 'activity' },
  { id: '4', date: '2026-06-18', title: '紫微斗数进阶班', time: '10:00', circle: '紫微斗数学院', type: 'live' },
  { id: '5', date: '2026-06-22', title: '奇门遁甲实战课', time: '15:30', circle: '奇门遁甲精研', type: 'live' },
  { id: '6', date: '2026-06-28', title: '国学文化交流茶会', time: '14:00', circle: '国学文化圈', type: 'offline' },
]

export interface CallRecord {
  id: string; expert: string; avatar: string; specialty: string
  type: 'incoming' | 'outgoing' | 'missed'; duration: string; time: string; cost: string
}

export const mockCallRecords: CallRecord[] = [
  { id: '1', expert: '周易大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', specialty: '八字命理', type: 'outgoing', duration: '28分钟', time: '今天 14:35', cost: '¥84.00' },
  { id: '2', expert: '张玄风', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80', specialty: '紫微斗数', type: 'incoming', duration: '15分钟', time: '昨天 20:12', cost: '¥45.00' },
  { id: '3', expert: '李玄机', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80', specialty: '易经', type: 'missed', duration: '--', time: '昨天 09:30', cost: '¥0.00' },
  { id: '4', expert: '王德华', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80', specialty: '风水', type: 'outgoing', duration: '42分钟', time: '2024-01-10', cost: '¥126.00' },
  { id: '5', expert: '林奇门', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80', specialty: '奇门遁甲', type: 'outgoing', duration: '10分钟', time: '2024-01-08', cost: '¥30.00' },
]

// ─── 管理页 API（已对齐后端路由） ───
export const circleManageApi = {
  // 后端: circle-backend/guests（JWT 鉴权，自动取当前用户的圈子）
  listGuests: async (_circleId: string) => {
    if (useMock()) return [...mockGuests]
    return apiGet('/circle-backend/guests')
  },
  // 后端暂无活动日历 API，当前仅 mock
  listCalendarEvents: async (_circleId: string, _year?: number, _month?: number) => {
    return [...mockCalEvents]
  },
  // 后端: GET /call?status&page&pageSize
  listMyCalls: async (params?: { status?: string; page?: number; pageSize?: number }) => {
    if (useMock()) return [...mockCallRecords]
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.page) qs.set('page', String(params.page))
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize))
    return apiGet(`/call?${qs.toString()}`)
  },
  // 后端: GET /circles/:id/dashboard/overview
  getDashboard: async (circleId: string) => {
    if (useMock()) return {
      stats: { totalViews: 44690, totalLikes: 2824, totalComments: 558, totalShares: 687 },
      topPosts: mockHotContent,
    }
    return apiGet(`/circles/${circleId}/dashboard/overview`)
  },
  // 后端: GET /circles/:id/invite-codes
  listInviteCodes: async (circleId: string) => {
    if (useMock()) return { stats: { totalInvited: 156, usedCodes: 12, pendingCodes: 5, thisWeek: 23 }, codes: [] as any[] }
    return apiGet(`/circles/${circleId}/invite-codes`)
  },
}

const mockHotContent = [
  { id: '1', title: '八字五行详解：从生克制化到格局分析', author: '周易大师', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60', views: 12580, likes: 864, comments: 203 },
  { id: '2', title: '紫微斗数十四主星性格分析全集', author: '张玄风', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=60', views: 9840, likes: 620, comments: 145 },
  { id: '3', title: '2024年甲辰年各生肖运势完整版', author: '李玄机', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60', views: 8720, likes: 512, comments: 89 },
  { id: '4', title: '风水布局实战：客厅财位的正确摆放', author: '王德华', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60', views: 7350, likes: 430, comments: 67 },
  { id: '5', title: '奇门遁甲基础：九宫八卦布局详解', author: '林奇门', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=60', views: 6200, likes: 398, comments: 54 },
]
