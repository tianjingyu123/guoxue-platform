/**
 * 圈子数据 + 类型 + API 封装（从原型 app/circles/page.tsx 与 lib/api.ts circleApi 1:1 迁移）
 * mock 数据与原型完全一致；真实接口走 utils/request，mock 开关同原型口径。
 */
import { apiGet, apiPost, useMock } from '@/utils/request'

export interface Circle {
  id: string
  name: string
  cover: string
  description: string
  category: string
  members: number
  posts: number
  isJoined: boolean
  todayActive?: number
  rank?: number
  isPaid?: boolean
  price?: number
}

export interface CircleCategory { id: string; name: string; icon: string }

export interface UpcomingLive {
  id: string; title: string; host: string; avatar: string
  startTime: string; viewers: number; circleId: string; circleName: string
}

export interface TodayActivity {
  id: string; type: 'checkin' | 'homework' | 'qa' | 'post'; title: string
  circleId: string; circleName?: string; author?: string; time?: string
  // 以下为运营活动专属字段，后端暂无对应模型，今日动态(post)不含
  participants?: number; deadline?: string; reward?: string
}

export interface HotPost {
  id: string; circleId: string; circleName: string
  author: { name: string; avatar: string; title?: string }
  content: string; images: string[]; likes: number; comments: number
  time: string; isPinned?: boolean
}

// ─── 分类（id 对齐后端圈子真实中文 tag，确保点击能精确过滤；后端 where.tags={has:tag}） ───
export const circleCategories: CircleCategory[] = [
  { id: '', name: '推荐', icon: 'star' },
  { id: '国学', name: '国学', icon: 'book-open' },
  { id: '易经', name: '易经', icon: 'book-open' },
  { id: '诗词', name: '诗词', icon: 'book-open' },
  { id: '书法', name: '书法', icon: 'book-open' },
  { id: '命理', name: '命理', icon: 'book-open' },
  { id: '儒家', name: '儒家', icon: 'book-open' },
  { id: '道家', name: '道家', icon: 'book-open' },
]

// 注：直播预告 / 今日活动 / 热门帖子 已改为真实接口
// （circleApi.getUpcomingLives / getActivities / getHotPosts）。
// 后端无数据时返回空数组 → 页面对应板块走空态隐藏，不再展示写死假数据（遵守前端数据流铁律）。

// ─── 圈子 mock（list/my/getRanking 接口失败时的兜底，原型 mockCircles） ───
export const mockCircles: Circle[] = [
  { id: '1', name: '八字研习社', cover: 'https://picsum.photos/400/300?random=101', description: '专注八字命理学习与交流', category: 'bazi', members: 12800, posts: 3560, isJoined: true, todayActive: 128, rank: 1 },
  { id: '2', name: '紫微斗数爱好者', cover: 'https://picsum.photos/400/300?random=102', description: '探索紫微斗数的奥秘', category: 'ziwei', members: 8600, posts: 2180, isJoined: false, todayActive: 86, rank: 2 },
  { id: '3', name: '风水学堂', cover: 'https://picsum.photos/400/300?random=103', description: '风水堪舆知识分享', category: 'fengshui', members: 6500, posts: 1820, isJoined: true, todayActive: 56, rank: 3 },
  { id: '4', name: '易经读书会', cover: 'https://picsum.photos/400/300?random=104', description: '一起研读易经经典', category: 'yijing', members: 5200, posts: 1560, isJoined: false, todayActive: 42 },
  { id: '5', name: '六爻预测交流', cover: 'https://picsum.photos/400/300?random=105', description: '六爻占卜实战分享', category: 'liuyao', members: 4800, posts: 1280, isJoined: false, todayActive: 38 },
  { id: '6', name: '奇门遁甲研究', cover: 'https://picsum.photos/400/300?random=106', description: '奇门遁甲术数探讨', category: 'qimen', members: 3600, posts: 960, isJoined: false, todayActive: 28 },
  { id: '7', name: '中医养生圈', cover: 'https://picsum.photos/400/300?random=107', description: '传统养生智慧分享', category: 'yangsheng', members: 9200, posts: 2860, isJoined: true, todayActive: 96 },
  { id: '8', name: '书法艺术', cover: 'https://picsum.photos/400/300?random=108', description: '书法练习与鉴赏', category: 'shufa', members: 7800, posts: 2340, isJoined: false, todayActive: 68 },
]

/* —— 后端原始响应类型（容错适配用，字段宽松全 optional，仅声明 adapter 实际访问到的字段） —— */
interface RawCircle {
  id?: string
  name?: string
  cover?: string | null
  intro?: string
  description?: string
  category?: string
  tags?: string[]
  memberCount?: number
  members?: number
  postCount?: number
  posts?: number
  isJoined?: boolean
  todayActive?: number
  rank?: number
  type?: string
  isPaid?: boolean
  price?: number | string
}
/** /circles 与 /circles/my 列表响应（可能是裸数组，由 Array.isArray 运行时分流） */
interface RawCircleListResp { data?: RawCircle[]; circles?: RawCircle[] }

/** /circles/ranking 排行榜项 */
interface RawRankingCircle {
  id?: string | number
  rank?: number | string
  name?: string
  cover?: string
  memberCount?: number | string
  postCount?: number | string
  categoryLevel1?: string
  owner?: { nickname?: string } | null
}
interface RawRankingResp { items?: RawRankingCircle[]; data?: RawRankingCircle[] }

/** /live/scheduled 直播预告项 */
interface RawLive {
  id?: string
  title?: string
  user?: { nickname?: string; avatar?: string } | null
  startTime?: string
  viewCount?: number
  circle?: { id?: string; name?: string } | null
  circleId?: string
}
interface RawLiveResp { rooms?: RawLive[]; data?: RawLive[] }

/** /circles/activities 今日动态项 */
interface RawActivity {
  id?: string
  title?: string
  circle?: { id?: string; name?: string } | null
  user?: { nickname?: string } | null
  createdAt?: string
}
interface RawActivityResp { data?: RawActivity[] }

/** /circles/hot-posts 热门帖子项 */
interface RawHotPost {
  id?: string
  circleId?: string
  circle?: { id?: string; name?: string } | null
  user?: { nickname?: string; avatar?: string; title?: string } | null
  content?: string
  title?: string
  images?: string[]
  likes?: number
  comments?: number
  createdAt?: string
  isPinned?: boolean
}
interface RawHotPostResp { data?: RawHotPost[] }

/** /circles/my-stats 我的圈子汇总 */
interface RawMyStats { joinedCount?: number | string; postCount?: number | string; likeReceived?: number | string }

/**
 * 后端圈子项 → 前端 Circle 字段适配。
 * 后端返回 {memberCount,postCount,intro,tags,type,price,owner}，前端期望 {members,posts,description,category,isJoined}。
 * 后端列表无 category（用 tags）/isJoined（需登录判断），分别用 tags 首项 / false 兜底。
 */
function adaptCircle(c: RawCircle): Circle {
  return {
    id: c.id || '',
    name: c.name || '',
    cover: c.cover || '',
    description: c.intro ?? c.description ?? '',
    category: c.category ?? (Array.isArray(c.tags) ? c.tags[0] : '') ?? '',
    members: c.memberCount ?? c.members ?? 0,
    posts: c.postCount ?? c.posts ?? 0,
    isJoined: c.isJoined ?? false,
    todayActive: c.todayActive,
    rank: c.rank,
    isPaid: c.type ? c.type === 'PAID' : (c.isPaid ?? false),
    price: c.price != null ? Number(c.price) : 0,
  }
}

/** ISO 时间 → 相对时间「x分钟前 / x小时前 / x天前 / M月D日」 */
function relativeTime(iso?: string): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}小时前`
  const day = Math.floor(hour / 24)
  if (day < 7) return `${day}天前`
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/** 直播开始时间 → 友好展示「今天 HH:mm / 明天 HH:mm / M月D日 HH:mm」 */
function formatStartTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(iso); target.setHours(0, 0, 0, 0)
  const dayDiff = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (dayDiff === 0) return `今天 ${hh}:${mm}`
  if (dayDiff === 1) return `明天 ${hh}:${mm}`
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hh}:${mm}`
}

/** 后端 LiveRoom（/live/scheduled） → 前端 UpcomingLive */
function adaptLive(r: RawLive): UpcomingLive {
  return {
    id: r.id || '',
    title: r.title || '',
    host: r.user?.nickname || '',
    avatar: r.user?.avatar || '',
    startTime: formatStartTime(r.startTime),
    viewers: r.viewCount ?? 0,
    circleId: r.circle?.id || r.circleId || '',
    circleName: r.circle?.name || '',
  }
}

/** 后端今日动态（/circles/activities，语义为「圈子今日新帖」） → 前端 TodayActivity */
function adaptActivity(a: RawActivity): TodayActivity {
  return {
    id: a.id || '',
    type: 'post',
    title: a.title || '',
    circleId: a.circle?.id || '',
    circleName: a.circle?.name || '',
    author: a.user?.nickname || '',
    time: relativeTime(a.createdAt),
  }
}

/** 后端热门帖子（/circles/hot-posts） → 前端 HotPost */
function adaptHotPost(p: RawHotPost): HotPost {
  return {
    id: p.id || '',
    circleId: p.circleId || p.circle?.id || '',
    circleName: p.circle?.name || '',
    author: { name: p.user?.nickname || '匿名', avatar: p.user?.avatar || '', title: p.user?.title },
    content: (p.content || p.title || '').trim(),
    images: Array.isArray(p.images) ? p.images : [],
    likes: p.likes ?? 0,
    comments: p.comments ?? 0,
    time: relativeTime(p.createdAt),
    isPinned: p.isPinned ?? false,
  }
}

// ─── API（真实接口优先，失败回退 mock；后端字段经 adaptCircle 适配） ───
export const circleApi = {
  list: async (params?: { category?: string; keyword?: string }): Promise<{ data: Circle[]; total: number }> => {
    try {
      const qs: string[] = []
      if (params?.category) qs.push(`category=${encodeURIComponent(params.category)}`)
      if (params?.keyword) qs.push(`keyword=${encodeURIComponent(params.keyword)}`)
      const res = await apiGet<RawCircle[] | RawCircleListResp>(`/circles${qs.length ? '?' + qs.join('&') : ''}`)
      // apiGet 已剥离信封，res 即后端 data（圈子数组）
      const arr = Array.isArray(res) ? res : (res?.data ?? res?.circles ?? [])
      return { data: arr.map(adaptCircle), total: arr.length }
    } catch {
      // 关键词搜索失败返回空（走空态，不展示假数据）；分类浏览保留兜底
      return params?.keyword ? { data: [], total: 0 } : { data: mockCircles, total: mockCircles.length }
    }
  },
  my: async (): Promise<Circle[]> => {
    try {
      const res = await apiGet<RawCircle[] | RawCircleListResp>('/circles/my')
      const arr = Array.isArray(res) ? res : (res?.data ?? [])
      return arr.map(adaptCircle)
    } catch {
      return mockCircles.filter(c => c.isJoined)
    }
  },
  /**
   * 圈子排行榜 — GET /circles/ranking（真连，后端 {items}）
   * @param sortBy memberCount(成员数) / activityScore(最活跃) / postCount(内容数)
   */
  getRanking: async (sortBy: RankSortBy = 'memberCount'): Promise<RankingCircle[]> => {
    try {
      const res = await apiGet<RawRankingResp>(`/circles/ranking?sortBy=${sortBy}&pageSize=20`)
      const arr: RawRankingCircle[] = res?.items ?? (Array.isArray(res) ? res : (res?.data ?? []))
      return arr.map((c: RawRankingCircle, i: number): RankingCircle => ({
        id: String(c.id),
        rank: Number(c.rank) || i + 1,
        name: c.name || '',
        cover: c.cover || '',
        memberCount: Number(c.memberCount) || 0,
        postCount: Number(c.postCount) || 0,
        category: c.categoryLevel1 || '',
        owner: c.owner?.nickname || '',
      }))
    } catch {
      return []
    }
  },
  /** 直播预告（全平台即将开始的直播；后端无未来直播时返回 []，页面空态隐藏） */
  getUpcomingLives: async (): Promise<UpcomingLive[]> => {
    try {
      const res = await apiGet<RawLive[] | RawLiveResp>('/live/scheduled')
      const arr = Array.isArray(res) ? res : (res?.rooms ?? res?.data ?? [])
      return arr.map(adaptLive)
    } catch {
      return []
    }
  },
  /** 今日活动（圈子今日新动态；后端今日无新帖时返回 []，页面空态隐藏） */
  getActivities: async (): Promise<TodayActivity[]> => {
    try {
      const res = await apiGet<RawActivity[] | RawActivityResp>('/circles/activities')
      const arr = Array.isArray(res) ? res : (res?.data ?? [])
      return arr.map(adaptActivity)
    } catch {
      return []
    }
  },
  /** 圈子活动列表（抛错版，供活动列表页做 loading/error/empty 三态；errors 上抛由页面捕获） */
  listActivities: async (limit = 20): Promise<TodayActivity[]> => {
    const res = await apiGet<RawActivity[] | RawActivityResp>(`/circles/activities?limit=${limit}`)
    const arr = Array.isArray(res) ? res : (res?.data ?? [])
    return arr.map(adaptActivity)
  },
  /** 全平台热门帖子（跨圈子按热度排序；失败返回 []，页面空态隐藏） */
  getHotPosts: async (): Promise<HotPost[]> => {
    try {
      const res = await apiGet<RawHotPost[] | RawHotPostResp>('/circles/hot-posts')
      const arr = Array.isArray(res) ? res : (res?.data ?? [])
      return arr.map(adaptHotPost)
    } catch {
      return []
    }
  },
  /** 我的圈子数据汇总（已加入/发帖/获赞，真实聚合；失败返回全 0 占位） */
  getMyStats: async (): Promise<MyCircleStats> => {
    try {
      const res = await apiGet<RawMyStats>('/circles/my-stats')
      return {
        joinedCount: Number(res?.joinedCount) || 0,
        postCount: Number(res?.postCount) || 0,
        likeReceived: Number(res?.likeReceived) || 0,
      }
    } catch {
      return { joinedCount: 0, postCount: 0, likeReceived: 0 }
    }
  },
  join: (id: string) => apiPost<{ success: boolean }>(`/circles/${id}/join`),
  leave: (id: string) => apiPost<{ success: boolean }>(`/circles/${id}/leave`),
}

/** 我的圈子数据汇总 */
export interface MyCircleStats {
  joinedCount: number
  postCount: number
  likeReceived: number
}

/** 排行榜排序维度 */
export type RankSortBy = 'memberCount' | 'activityScore' | 'postCount'

/** 排行榜圈子条目 */
export interface RankingCircle {
  id: string
  rank: number
  name: string
  cover: string
  memberCount: number
  postCount: number
  category: string
  owner: string
}

/** 成员数格式化：>=1万显示「x.x万」（原型口径） */
export function formatMembers(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : String(n)
}
