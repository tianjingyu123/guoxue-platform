/**
 * 圈子数据 + 类型 + API 封装（从原型 app/circles/page.tsx 与 lib/api.ts circleApi 1:1 迁移）
 * mock 数据与原型完全一致；真实接口走 utils/request，mock 开关同原型口径。
 */
import { apiGet, apiPost, apiPut, useMock } from '@/utils/request'

export interface Circle {
  id: string
  name: string
  cover: string
  description: string
  category: string
  members: number
  posts: number
  isJoined: boolean
  isPaid?: boolean
  price?: number
  type?: 'FREE' | 'PAID' | 'YEARLY'
  todayActive?: number
  rank?: number
  tags?: string[]
  unread?: number
  lastPost?: string
  isOwner?: boolean
  owner?: string
  ownerAvatar?: string
  ownerTitle?: string
  isVerified?: boolean
  rating?: number
  ratingCount?: number
  hotPosts?: string[]
}

export interface CircleCategory { id: string; name: string; icon: string }

export interface UpcomingLive {
  id: string; title: string; host: string; avatar: string
  startTime: string; viewers: number; circleId: string; circleName: string
}

export interface TodayActivity {
  id: string; type: 'checkin' | 'homework' | 'qa'; title: string
  participants: number; deadline: string; circleId: string; reward: string
}

export interface HotPost {
  id: string; circleId: string; circleName: string
  author: { name: string; avatar: string; title?: string }
  content: string; images: string[]; likes: number; comments: number
  time: string; isPinned?: boolean
}

// ─── 分类（原型 categories，icon 用通用 book-open） ───
export const circleCategories: CircleCategory[] = [
  { id: '', name: '推荐', icon: 'star' },
  { id: 'bazi', name: '八字命理', icon: 'book-open' },
  { id: 'ziwei', name: '紫微斗数', icon: 'book-open' },
  { id: 'fengshui', name: '风水堪舆', icon: 'book-open' },
  { id: 'yijing', name: '易经', icon: 'book-open' },
  { id: 'liuyao', name: '六爻', icon: 'book-open' },
  { id: 'qimen', name: '奇门遁甲', icon: 'book-open' },
  { id: 'yangsheng', name: '养生', icon: 'book-open' },
  { id: 'shufa', name: '书法', icon: 'book-open' },
]

// ─── 直播预告（原型 upcomingLives） ───
export const upcomingLives: UpcomingLive[] = [
  { id: 'live1', title: '八字入门精讲（第3期）', host: '周易大师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=master', startTime: '今晚 20:00', viewers: 1280, circleId: '1', circleName: '八字研习社' },
  { id: 'live2', title: '紫微斗数实战案例分析', host: '张玄风', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang', startTime: '明天 19:30', viewers: 860, circleId: '2', circleName: '紫微斗数学院' },
]

// ─── 今日活动（原型 todayActivities） ───
export const todayActivities: TodayActivity[] = [
  { id: 'act1', type: 'checkin', title: '《易经》共读打卡 Day 15', participants: 328, deadline: '23:59', circleId: '4', reward: '+10经验' },
  { id: 'act2', type: 'homework', title: '八字案例分析作业', participants: 156, deadline: '本周日', circleId: '1', reward: '+50经验' },
  { id: 'act3', type: 'qa', title: '限时免费提问活动', participants: 89, deadline: '12:00', circleId: '1', reward: '免费' },
]

// ─── 热门帖子信息流（原型 hotPosts） ───
export const hotPosts: HotPost[] = [
  { id: 'p1', circleId: '1', circleName: '八字研习社', author: { name: '周易大师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=master', title: '圈主' }, content: '今天分享一个八字案例：某人八字为甲子、丙寅、戊辰、壬戌，这个八字有什么特点？从五行来看，日主戊土生于寅月...', images: ['https://picsum.photos/400/300?random=201'], likes: 328, comments: 56, time: '2小时前', isPinned: true },
  { id: 'p2', circleId: '2', circleName: '紫微斗数学院', author: { name: '张玄风', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang', title: '嘉宾' }, content: '紫微斗数中的「四化」如何理解？化禄主福、化权主权、化科主名、化忌主烦。今天重点讲讲化忌...', images: [], likes: 256, comments: 42, time: '3小时前' },
  { id: 'p3', circleId: '3', circleName: '风水堪舆交流', author: { name: '王德华', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wang' }, content: '分享一个商铺选址的风水案例。这家店位于T字路口，门前有一棵大树遮挡，开业三个月生意惨淡...', images: ['https://picsum.photos/400/300?random=202', 'https://picsum.photos/400/300?random=203'], likes: 198, comments: 38, time: '5小时前' },
]

// ─── 圈子 mock（原型 mockCircles，完全一致） ───
export const mockCircles: Circle[] = [
  { id: '1', name: '八字命理研习社', cover: 'https://picsum.photos/400/300?random=101', description: '专注八字命理学习与实践的高质量社群', category: 'bazi', members: 12800, posts: 3560, isJoined: true, isPaid: true, price: 99, type: 'YEARLY', todayActive: 128, rank: 1, tags: ['TOP1', '活跃'], owner: '周易大师', ownerTitle: '20年命理研究', isVerified: true, rating: 4.9, ratingCount: 1286 },
  { id: '2', name: '紫微斗数精研会', cover: 'https://picsum.photos/400/300?random=102', description: '深入研究紫微斗数，探索命运密码', category: 'ziwei', members: 8560, posts: 2180, isJoined: false, isPaid: false, type: 'FREE', todayActive: 86, rank: 2, tags: ['免费', '新手友好'], owner: '张玄风', ownerTitle: '紫微传承人', isVerified: true, rating: 4.8, ratingCount: 856 },
  { id: '3', name: '风水堪舆学院', cover: 'https://picsum.photos/400/300?random=103', description: '实战派风水知识分享与交流', category: 'fengshui', members: 6280, posts: 1890, isJoined: true, isPaid: true, price: 199, type: 'PAID', todayActive: 45, rank: 3, tags: ['大咖入驻', '实战派'], owner: '陈风水', ownerTitle: '实战派风水师', isVerified: true, rating: 4.7, ratingCount: 628 },
  { id: '4', name: '易经读书会', cover: 'https://picsum.photos/400/300?random=104', description: '一起研读易经经典，品味古人智慧', category: 'yijing', members: 5200, posts: 1560, isJoined: false, isPaid: false, type: 'FREE', todayActive: 42, tags: ['免费', '经典'], owner: '易学居士', ownerTitle: '易学研究者', isVerified: true, rating: 4.6, ratingCount: 520 },
  { id: '5', name: '六爻预测交流', cover: 'https://picsum.photos/400/300?random=105', description: '六爻占卜技法研讨与实战分享', category: 'liuyao', members: 4800, posts: 1280, isJoined: false, isPaid: true, price: 58, type: 'PAID', todayActive: 38, tags: ['进阶'], owner: '六爻居士', ownerTitle: '六爻研究者', isVerified: true, rating: 4.5, ratingCount: 480 },
  { id: '6', name: '奇门遁甲秘境', cover: 'https://picsum.photos/400/300?random=106', description: '帝王之术，择吉避凶', category: 'qimen', members: 3600, posts: 960, isJoined: false, isPaid: true, price: 198, type: 'PAID', todayActive: 28, tags: ['高阶', '稀缺'], owner: '奇门居士', ownerTitle: '奇门传人', isVerified: true, rating: 4.8, ratingCount: 360 },
  { id: '7', name: '中医养生圈', cover: 'https://picsum.photos/400/300?random=107', description: '传统养生智慧分享，日常保健必备', category: 'yangsheng', members: 9200, posts: 2860, isJoined: true, isPaid: false, type: 'FREE', todayActive: 96, tags: ['免费', '科普'], owner: '李时珍后人', ownerTitle: '中医师', rating: 4.9, ratingCount: 920 },
  { id: '8', name: '道家养生文化', cover: 'https://picsum.photos/400/300?random=108', description: '道家养生功法与理论研习', category: 'dao', members: 9800, posts: 2560, isJoined: false, isPaid: true, price: 68, type: 'YEARLY', todayActive: 98, tags: ['活跃', '干货多'], owner: '李道长', ownerTitle: '武当道士', isVerified: true, rating: 4.9, ratingCount: 980 },
  { id: '9', name: '面相手相研究', cover: 'https://picsum.photos/400/300?random=109', description: '观人识面，掌握命运', category: 'xiangshu', members: 5680, posts: 1230, isJoined: false, isPaid: false, type: 'FREE', todayActive: 42, tags: ['免费', '图文多'], owner: '相面先生', ownerTitle: '相学研究者', rating: 4.6, ratingCount: 568 },
  { id: '10', name: '梅花易数交流', cover: 'https://picsum.photos/400/300?random=110', description: '随时随地起卦断卦，日常预测必备', category: 'meihua', members: 2560, posts: 720, isJoined: false, isPaid: false, type: 'FREE', todayActive: 18, tags: ['免费', '入门'], owner: '梅花仙子', ownerTitle: '梅花易数传人', rating: 4.5, ratingCount: 256 },
]

// ─── API（mock 优先，与原型 Promise.allSettled 容错口径一致） ───
export const circleApi = {
  list: async (params?: { category?: string; keyword?: string; page?: number; pageSize?: number }): Promise<{ data: Circle[]; total: number }> => {
    if (useMock()) {
      let filtered = [...mockCircles]
      if (params?.category) filtered = filtered.filter(c => c.category === params.category)
      if (params?.keyword) {
        const kw = params.keyword.toLowerCase()
        filtered = filtered.filter(c => c.name.toLowerCase().includes(kw) || c.description.toLowerCase().includes(kw))
      }
      return { data: filtered, total: filtered.length }
    }
    const qs = new URLSearchParams()
    if (params?.category) qs.set('category', params.category)
    if (params?.keyword) qs.set('keyword', params.keyword)
    if (params?.page) qs.set('page', String(params.page))
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize))
    return apiGet(`/circles?${qs.toString()}`)
  },
  my: async (): Promise<Circle[]> => {
    if (useMock()) return mockCircles.filter(c => c.isJoined).map((c, i) => ({ ...c, unread: [12, 3, 0][i] || 0, lastPost: ['今日话题：如何看流年大运', '紫微斗数案例分析第56期', '常用穴位按摩指南'][i] || '' }))
    return apiGet('/circles/my')
  },
  getRanking: async (sortBy?: string): Promise<Circle[]> => {
    if (useMock()) return mockCircles.map((c, i) => ({ ...c, rank: i + 1 }))
    return apiGet(`/circles/ranking${sortBy ? `?sortBy=${sortBy}` : ''}`)
  },
  join: (id: string) => useMock() ? { success: true } : apiPost<{ success: boolean }>(`/circles/${id}/join`),
  leave: (id: string) => useMock() ? { success: true } : apiPost<{ success: boolean }>(`/circles/${id}/leave`),

  /** 创建圈子 */
  create: async (data: { name: string; cover?: string; description: string; category: string; tags?: string[]; isPublic?: boolean; joinMode?: string; price?: number }) => {
    if (useMock()) return { id: String(Date.now()), ...data, members: 1, posts: 0, isJoined: true }
    return apiPost('/circles', data)
  },
  /** 更新圈子 */
  update: (id: string, data: Record<string, unknown>) => useMock() ? { ...data } : apiPut(`/circles/${id}`, data),
  /** 草稿列表 */
  getDrafts: (page = 1, pageSize = 20) => {
    if (useMock()) return { data: [], total: 0 }
    return apiGet(`/circles/drafts?page=${page}&pageSize=${pageSize}`)
  },
  /** 生成邀请码 */
  generateInviteCode: (circleId: string, maxUses?: number) => useMock() ? { code: 'MOCK-' + Date.now(), maxUses: maxUses || 10 } : apiPost(`/circles/${circleId}/invite-code`, { maxUses }),
  /** 通过邀请码加入 */
  joinByInviteCode: (code: string) => useMock() ? { success: true } : apiPost('/circles/join-by-code', { code }),
  /** 入圈状态 */
  getJoinStatus: (circleId: string) => useMock() ? { isJoined: false, isExpired: false } : apiGet(`/circles/${circleId}/join/status`),
  /** 准备付费入圈 */
  prepareJoin: (circleId: string, payMethod?: string) => useMock() ? { orderId: 'mock-oid-' + Date.now(), orderNo: 'MO' + Date.now(), amount: 19900 } : apiPost(`/circles/${circleId}/join/prepare`, { payMethod }),
  /** 确认付费入圈 */
  confirmJoin: (circleId: string, data: { payMethod?: string; orderNo?: string; referrerId?: string }) => useMock() ? { success: true } : apiPost(`/circles/${circleId}/join/confirm`, data),
  /** 续费 */
  renew: (circleId: string, payMethod?: string) => useMock() ? { success: true } : apiPost(`/circles/${circleId}/renew`, { payMethod }),
}

/** 成员数格式化：>=1万显示「x.x万」（原型口径） */
export function formatMembers(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : String(n)
}

// ============================================
// 辅助 API 函数：直播预告 / 活动 / 热帖
// ============================================

/** 获取直播预告（真实 API 走 /live/scheduled） */
export async function fetchUpcomingLives(): Promise<UpcomingLive[]> {
  if (useMock()) return upcomingLives
  try {
    const data = await apiGet<any>('/live/scheduled?page=1&pageSize=5')
    return (data.rooms || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      host: r.user?.nickname || '未知',
      avatar: r.user?.avatar || '',
      startTime: r.startTime ? formatRelativeTime(r.startTime) : '待定',
      viewers: 0,
      circleId: r.circle?.id || '',
      circleName: r.circle?.name || '',
    }))
  } catch { return upcomingLives }
}

/** 获取今日活动（当前后端无对应接口，保留 mock） */
export async function fetchTodayActivities(): Promise<TodayActivity[]> {
  return todayActivities
}

/** 获取热门帖子（当前后端无全局热帖接口，保留 mock；后续可走 /circles/:id/hot-content 聚合） */
export async function fetchHotPosts(): Promise<HotPost[]> {
  return hotPosts
}

/** 格式化相对时间 */
function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '即将开始'
  if (mins < 60) return `${mins}分钟后`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  if (hours < 48) return '昨天'
  return `${Math.floor(hours / 24)}天前`
}
