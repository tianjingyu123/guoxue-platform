/**
 * 圈子详情页数据 + 类型（从原型 app/circles/[id]/page.tsx 1:1 迁移）
 * 含 CircleDetail / CirclePost / CircleMember / 专栏 / 活动 / 会员权益。
 */
import { apiGet, apiPost, useMock } from '@/utils/request'

export interface CircleOwner { id: string; name: string; avatar: string }

export type CircleMemberRole = 'OWNER' | 'PARTNER' | 'ADMIN' | 'GUEST' | 'VOLUNTEER' | 'MEMBER'

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
  /** 圈子类型：免费/付费/年费 */
  type: 'FREE' | 'PAID' | 'YEARLY'
  /** 价格（元，FREE 为 0） */
  price: number
  /** 当前用户在该圈的角色（未加入为 null） */
  myRole: CircleMemberRole | null
  /** 年费到期时间（仅 YEARLY 有意义） */
  expireAt: string | null
  /** 加入是否需圈主审批（仅免费圈生效；true 时加入为「提交申请」而非直接进） */
  needApproval: boolean
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

export interface CircleCourse { id: string; title: string; cover: string; price: number; teacher: string }
export interface CircleLive { id: string; title: string; cover: string; hostName: string; status: 'live' | 'upcoming' | 'replay'; viewCount: number }
export interface CircleProduct { id: string; title: string; cover: string; price: number }
/** 后端 /courses、/live/rooms、/shop/products 列表项（仅声明本处访问到的字段·容错宽松） */
interface RawCircleCourse { id?: string; title?: string; cover?: string; price?: number | string; user?: { nickname?: string } | null }
interface RawCircleLive { id?: string; title?: string; cover?: string | null; status?: string; viewCount?: number; user?: { nickname?: string } | null }
interface RawCircleArticle { id?: string; title?: string; cover?: string; createdAt?: string; viewCount?: number; likeCount?: number; isPushHome?: boolean; user?: { nickname?: string } | null }
interface RawCircleProduct { id?: string; title?: string; cover?: string; images?: string[]; price?: number | string; effectivePrice?: number }

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
  type: 'PAID',
  price: 199,
  myRole: null,
  expireAt: null,
  needApproval: false,
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

/** ISO 时间 → 相对时间（与 circle-data 口径一致） */
function relTime(iso?: string): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return String(iso)
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

/** 后端成员角色（OWNER/ADMIN/MEMBER）→ 前端小写 */
function mapRole(r?: string): 'owner' | 'admin' | 'member' {
  const u = String(r || '').toUpperCase()
  return u === 'OWNER' ? 'owner' : u === 'ADMIN' ? 'admin' : 'member'
}

/* —— 后端原始响应类型（容错适配用，字段宽松全 optional，仅声明 adapter 实际访问到的字段） —— */
interface RawMembership { role?: string; expireAt?: string | null }
/** 后端 /circles/:id 详情（prisma 扁平对象） */
interface RawCircleDetail {
  id?: string
  name?: string
  cover?: string | null
  intro?: string
  description?: string
  tags?: string[]
  category?: string
  memberCount?: number
  postCount?: number
  _count?: { posts?: number } | null
  membership?: RawMembership | null
  todayActive?: number
  createdAt?: string | Date | null
  owner?: { id?: string; nickname?: string; name?: string; avatar?: string } | null
  announcement?: string
  type?: string
  price?: number | string | null
  needApproval?: boolean
}
/** 后端帖子项 */
interface RawCirclePost {
  id?: string
  content?: string
  title?: string
  images?: string[]
  user?: { id?: string; nickname?: string; avatar?: string; title?: string } | null
  userId?: string
  createdAt?: string
  likeCount?: number
  likes?: number
  commentCount?: number
  comments?: number
  isLiked?: boolean
  isTop?: boolean
  isPinned?: boolean
  isEssence?: boolean
}
/** /circles/:id/posts 响应（可能裸数组，由 Array.isArray 运行时分流） */
interface RawPostsResp { posts?: RawCirclePost[]; data?: RawCirclePost[]; total?: number }
/** 后端成员项 */
interface RawCircleMember {
  id?: string
  userId?: string
  user?: { id?: string; nickname?: string; avatar?: string } | null
  title?: string
  role?: string
  joinedAt?: string
  postCount?: number
  posts?: number
}
/** /circles/:id/members 响应（可能裸数组，由 Array.isArray 运行时分流） */
interface RawMembersResp { members?: RawCircleMember[]; data?: RawCircleMember[]; total?: number }

/** 后端圈子详情（prisma 扁平对象）→ 前端 CircleDetail */
function adaptDetail(c: RawCircleDetail): CircleDetail {
  return {
    id: c.id || '',
    name: c.name || '',
    cover: c.cover || '',
    description: c.intro ?? c.description ?? '',
    category: Array.isArray(c.tags) ? (c.tags[0] ?? '') : (c.category ?? ''),
    members: c.memberCount ?? 0,
    // 优先用真实关联计数 _count.posts（postCount 字段经实测虚高，与真实帖数不符）
    posts: c._count?.posts ?? c.postCount ?? 0,
    isJoined: !!c.membership,
    todayActive: c.todayActive, // 后端暂无 → undefined，页面隐藏
    createdAt: c.createdAt ? String(c.createdAt).slice(0, 10) : '',
    owner: {
      id: c.owner?.id ?? '',
      name: c.owner?.nickname ?? c.owner?.name ?? '',
      avatar: c.owner?.avatar ?? '',
    },
    announcement: c.announcement || undefined,
    tags: Array.isArray(c.tags) ? c.tags : [],
    type: (c.type as CircleDetail['type']) ?? 'FREE',
    price: c.price != null ? Number(c.price) : 0,
    myRole: (c.membership?.role as CircleMemberRole) ?? null,
    expireAt: c.membership?.expireAt ? String(c.membership.expireAt) : null,
    needApproval: !!c.needApproval,
  }
}

/** 后端帖子 → 前端 CirclePost */
function adaptPost(p: RawCirclePost): CirclePost {
  return {
    id: p.id || '',
    content: (p.content ?? p.title ?? '').trim(),
    images: Array.isArray(p.images) ? p.images : [],
    author: {
      id: p.user?.id ?? p.userId ?? '',
      name: p.user?.nickname ?? '匿名',
      avatar: p.user?.avatar ?? '',
      title: p.user?.title,
    },
    createdAt: relTime(p.createdAt),
    likes: p.likeCount ?? p.likes ?? 0,
    comments: p.commentCount ?? p.comments ?? 0,
    isLiked: p.isLiked ?? false,
    isPinned: p.isTop ?? p.isPinned ?? false,
    isEssence: p.isEssence ?? false,
  }
}

/** 后端成员 → 前端 CircleMember */
function adaptMember(m: RawCircleMember): CircleMember {
  return {
    id: m.user?.id ?? m.userId ?? m.id ?? '',
    name: m.user?.nickname ?? '成员',
    avatar: m.user?.avatar ?? '',
    title: m.title,
    role: mapRole(m.role),
    joinedAt: m.joinedAt ? String(m.joinedAt).slice(0, 10) : '',
    posts: m.postCount ?? m.posts ?? 0,
  }
}

// ─── API（detail 主数据真连，失败抛出走页面 error 态；次要数据失败/后端无接口走空态隐藏，不展示假数据） ───
export const circleDetailApi = {
  detail: async (id: string): Promise<CircleDetail> => {
    return adaptDetail(await apiGet<RawCircleDetail>(`/circles/${id}`))
  },
  posts: async (id: string): Promise<{ data: CirclePost[]; total: number }> => {
    try {
      const r = await apiGet<RawPostsResp>(`/circles/${id}/posts`)
      const arr: RawCirclePost[] = Array.isArray(r) ? r : (r?.posts ?? r?.data ?? [])
      return { data: arr.map(adaptPost), total: r?.total ?? arr.length }
    } catch { return { data: [], total: 0 } }
  },
  listMembers: async (id: string): Promise<{ data: CircleMember[]; total: number }> => {
    try {
      const r = await apiGet<RawMembersResp>(`/circles/${id}/members`)
      const arr: RawCircleMember[] = Array.isArray(r) ? r : (r?.members ?? r?.data ?? [])
      return { data: arr.map(adaptMember), total: r?.total ?? arr.length }
    } catch { return { data: [], total: 0 } }
  },
  // 后端无 /circles/:id/columns|articles|activities → 返回空，页面对应板块空态隐藏（不展示假数据）
  columns: async (_id: string): Promise<CircleColumn[]> => [],
  articles: async (_id: string): Promise<CircleArticle[]> => [],
  activities: async (_id: string): Promise<CircleActivity[]> => [],
  /** 圈内课程（真连 GET /courses?circleId=·课程模型已有 circleId·圈子内变现展示）。失败降级空。 */
  courses: async (id: string): Promise<CircleCourse[]> => {
    try {
      const r = await apiGet<unknown>(`/courses?circleId=${id}&pageSize=6`)
      const arr: RawCircleCourse[] = Array.isArray(r) ? r : ((r as { items?: RawCircleCourse[]; courses?: RawCircleCourse[]; data?: RawCircleCourse[] })?.items ?? (r as { courses?: RawCircleCourse[] })?.courses ?? (r as { data?: RawCircleCourse[] })?.data ?? [])
      return arr.map((c) => ({
        id: String(c.id ?? ''),
        title: c.title ?? '',
        cover: c.cover ?? '',
        price: Number(c.price) || 0,
        teacher: c.user?.nickname ?? '',
      }))
    } catch { return [] }
  },
  /** 圈内已发布文章（真连 GET /articles?circleId=·成员/圈主发布的文章·修"文章板块看不到"）。失败降级空。 */
  postedArticles: async (id: string): Promise<CircleArticle[]> => {
    try {
      const r = await apiGet<unknown>(`/articles?circleId=${id}&pageSize=6`)
      const arr: RawCircleArticle[] = Array.isArray(r) ? r : ((r as { items?: RawCircleArticle[]; data?: RawCircleArticle[] })?.items ?? (r as { data?: RawCircleArticle[] })?.data ?? [])
      return arr.map((a) => ({
        id: String(a.id ?? ''),
        title: a.title ?? '',
        cover: a.cover ?? '',
        author: a.user?.nickname ?? '',
        publishedAt: a.createdAt ?? '',
        views: Number(a.viewCount) || 0,
        likes: Number(a.likeCount) || 0,
        isFeatured: !!a.isPushHome,
      }))
    } catch { return [] }
  },
  /** 圈内直播（真连 GET /live/rooms?circleId=·含往期/进行/预告·LiveRoom 已有 circleId）。失败降级空。 */
  lives: async (id: string): Promise<CircleLive[]> => {
    try {
      const r = await apiGet<unknown>(`/live/rooms?circleId=${id}&pageSize=8`)
      const arr: RawCircleLive[] = Array.isArray(r) ? r : ((r as { rooms?: RawCircleLive[]; items?: RawCircleLive[]; data?: RawCircleLive[] })?.rooms ?? (r as { items?: RawCircleLive[] })?.items ?? (r as { data?: RawCircleLive[] })?.data ?? [])
      return arr.map((v) => {
        const u = String(v.status ?? '').toUpperCase()
        const status: CircleLive['status'] = u === 'LIVING' ? 'live' : u === 'WAITING' ? 'upcoming' : 'replay'
        return { id: String(v.id ?? ''), title: v.title ?? '', cover: v.cover ?? '', hostName: v.user?.nickname ?? '', status, viewCount: Number(v.viewCount) || 0 }
      })
    } catch { return [] }
  },
  /** 圈内商品（真连 GET /shop/products?circleId=·Product 已有 circleId·圈主选品展示）。失败降级空。 */
  products: async (id: string): Promise<CircleProduct[]> => {
    try {
      const r = await apiGet<unknown>(`/shop/products?circleId=${id}&status=ON_SALE&pageSize=6`)
      const arr: RawCircleProduct[] = Array.isArray(r) ? r : ((r as { products?: RawCircleProduct[]; items?: RawCircleProduct[]; data?: RawCircleProduct[] })?.products ?? (r as { items?: RawCircleProduct[] })?.items ?? (r as { data?: RawCircleProduct[] })?.data ?? [])
      return arr.map((p) => ({
        id: String(p.id ?? ''),
        title: p.title ?? '',
        cover: (Array.isArray(p.images) ? p.images[0] : p.cover) ?? '',
        price: Number(p.effectivePrice ?? p.price) || 0,
      }))
    } catch { return [] }
  },
  // 免费圈直接成员 {success}；需审批免费圈返回 {status:'pending',message}
  join: (id: string) => apiPost<{ success?: boolean; status?: string; message?: string }>(`/circles/${id}/join`),
  leave: (id: string) => apiPost<{ success: boolean }>(`/circles/${id}/leave`),
  /**
   * 查询当前用户入圈状态 — GET /circles/:id/join/status（需登录，权威判断是否已加入 / 角色）。
   * ⚠️ 详情端点 GET /circles/:id 未挂 JwtAuthGuard，req.user 恒空 → membership 恒 null →
   *    detail.isJoined 恒 false、myRole 恒 null。故登录态下须单独查此鉴权端点覆盖真实加入态。
   * 失败返回 { joined:false }（不阻断页面渲染）。
   */
  getJoinStatus: async (id: string): Promise<{ joined: boolean; role: CircleMemberRole | null; expired: boolean }> => {
    try {
      const r = await apiGet<{ joined?: boolean; role?: string; expired?: boolean }>(`/circles/${id}/join/status`)
      return { joined: !!r?.joined, role: (r?.role as CircleMemberRole) ?? null, expired: !!r?.expired }
    } catch {
      return { joined: false, role: null, expired: false }
    }
  },
}
