import { apiGet } from '@/utils/request'
import type {
  ProductCardData, CourseCardData, LiveCardData,
  AgentCardData, ClassicCardData, VideoCardData,
} from '@/lib/card-utils'

// 核心入口宫格 - 商业变现板块入口（高频在前）
export const coreEntries = [
  { id: 'course', icon: 'book-open', label: '课程', href: '/courses' },
  { id: 'mall', icon: 'shopping-bag', label: '商城', href: '/mall' },
  { id: 'classics', icon: 'scroll-text', label: '古籍馆', href: '/pkg-classics/home/index' },
  { id: 'audiobook', icon: 'headphones', label: '听书', href: '/pkg-classics/audiobooks/index' },
  { id: 'paipan', icon: 'layout-grid', label: '排盘', href: '/pages/paipan/index' },
  { id: 'competition', icon: 'trophy', label: '赛事', href: '/competition/home' },
  { id: 'agent', icon: 'bot', label: '智能体广场', href: '/agents' },
  { id: 'circles', icon: 'users', label: '圈子广场', href: '/pages/circles/index' },
  { id: 'video', icon: 'play', label: '视频', href: '/videos' },
  { id: 'live', icon: 'radio', label: '直播', href: '/pkg-live/plaza/index' },
]

// 全部服务矩阵 — 覆盖所有已完工分包，解决"已开发但无入口可达"的孤岛问题
export const serviceGroups = [
  {
    title: '经营变现',
    items: [
      { id: 'merchant', icon: 'store', label: '商家入驻', href: '/merchant/join' },
      { id: 'operator', icon: 'briefcase', label: '分站运营', href: '/operator' },
      { id: 'institute', icon: 'graduation-cap', label: '研究院', href: '/institute' },
      { id: 'offline', icon: 'map-pin', label: '线下驿站', href: '/offline/stations' },
    ],
  },
  {
    title: '学习互动',
    items: [
      { id: 'bounty', icon: 'gift', label: '悬赏求解', href: '/bounty' },
      { id: 'expert', icon: 'user-check', label: '达人咨询', href: '/pkg-circle/circles/consult-experts' },
    ],
  },
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

// 运营专栏 - 平台手动配置（死入口大扫除 2026-07：href 从空话题聚合改指平台真实板块页）
export const columns = [
  { id: 'best-courses', title: '精选好课', subtitle: '名师系统课程', count: 36, href: '/courses-list', cover: 'https://api.rebugx.cn/assets/discover/board-courses.webp', accent: '#A0621A' },
  { id: 'hot-products', title: '热门好物', subtitle: '开运法器精选', count: 128, href: '/mall/category', cover: 'https://api.rebugx.cn/assets/discover/board-products.webp', accent: '#8B2E2E' },
  { id: 'new-classics', title: '古籍新上', subtitle: '经典原著典藏', count: 24, href: '/pkg-classics/home/index', cover: 'https://api.rebugx.cn/assets/discover/board-classics.webp', accent: '#7A5A20' },
  { id: 'rec-circles', title: '推荐圈子', subtitle: '同好交流社群', count: 52, href: '/pages/circles/index', cover: 'https://api.rebugx.cn/assets/discover/board-circles.webp', accent: '#5A3E6B' },
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

// ─── 后端发现页 sections（多类型聚合）→ 前端混排 FeedItem[] ───
/* —— 后端原始响应类型（容错适配用，字段全 optional，仅声明 adapter 实际访问到的字段） —— */
/** 后端 section item 统计字段 */
interface RawFeedStats {
  price?: number | string
  studentCount?: number | string
  salesCount?: number | string
  viewCount?: number | string
  likeCount?: number | string
}
/** 后端发现页 section item 原始结构（{id,title,cover,type,intro,tags,stats}） */
interface RawFeedItemData {
  id?: string
  type?: string
  title?: string
  cover?: string
  intro?: string
  tags?: string[]
  stats?: RawFeedStats | null
}
/** 后端发现页响应：{sections:[{type,items}]} 或 {items} 或数组 */
interface RawDiscoverSection { type?: string; items?: RawFeedItemData[] }
interface RawDiscoverWrap { sections?: RawDiscoverSection[]; items?: RawFeedItemData[] }
type RawDiscoverData = RawDiscoverWrap | RawFeedItemData[]

function dNum(v: unknown): number { const x = Number(v); return Number.isFinite(x) ? x : 0 }
/** 后端 section item（{id,title,cover,type,intro,tags,stats}）→ 前端 FeedItem */
function adaptFeedItem(it: RawFeedItemData): FeedItem | null {
  const t = it?.type || ''
  if (t === 'course') return { kind: 'course', data: { id: it.id || '', title: it.title || '', cover: it.cover || '', coverRatio: '1:1', teacher: '', teacherAvatar: '', price: dNum(it.stats?.price), students: dNum(it.stats?.studentCount), lessons: 0 } }
  if (t === 'product') return { kind: 'product', data: { id: it.id || '', title: it.title || '', cover: it.cover || '', coverRatio: '3:4', price: dNum(it.stats?.price), sales: dNum(it.stats?.salesCount) } }
  if (t === 'classic') return { kind: 'classic', data: { id: it.id || '', title: it.title || '', author: it.tags?.[0] || '', description: it.intro || '', readers: dNum(it.stats?.viewCount) } }
  if (t === 'bot') return { kind: 'agent', data: { id: it.id || '', name: it.title || '', avatar: it.cover || '', description: it.intro || '', useCount: 0 } }
  if (t === 'content' || t === 'video' || t === 'article') return { kind: 'video', data: { id: it.id || '', title: it.title || '', cover: it.cover || '', coverRatio: '3:4', author: '', plays: dNum(it.stats?.viewCount), likes: dNum(it.stats?.likeCount), duration: '' } }
  return null
}
/** 后端 {sections:[{type,items}]} 或 {items}/数组 → 交错混排 FeedItem[] */
function adaptDiscoverFeed(res: RawDiscoverData | null): FeedItem[] {
  // res 可能是 {sections}/{items} 对象、item 数组或 null；wrap 取出对象形态以便访问 sections/items
  const wrap: RawDiscoverWrap | null = Array.isArray(res) ? null : res
  let buckets: FeedItem[][] = []
  if (Array.isArray(wrap?.sections)) {
    buckets = wrap!.sections!.map((sec: RawDiscoverSection) => (sec.items || []).map(adaptFeedItem).filter((x: FeedItem | null): x is FeedItem => x !== null))
  } else {
    const arr: RawFeedItemData[] = Array.isArray(res) ? res : (wrap?.items ?? [])
    buckets = [arr.map(adaptFeedItem).filter((x: FeedItem | null): x is FeedItem => x !== null)]
  }
  const out: FeedItem[] = []
  for (let i = 0, added = true; added; i++) {
    added = false
    for (const b of buckets) { if (i < b.length) { out.push(b[i]); added = true } }
  }
  return out
}

export const discoverApi = {
  /**
   * 发现页推荐流 — GET /discover（后端 sections 多类型聚合 → 前端混排 FeedItem）
   * @param category 标准一级品类（中文键，如「诗词歌赋」）；传入或 'all' 即「推荐」
   */
  async getFeed(category?: string): Promise<FeedItem[]> {
    const filtered = !!category && category !== 'all'
    try {
      const qs = filtered ? `&categoryLevel1=${encodeURIComponent(category as string)}` : ''
      const items = adaptDiscoverFeed(await apiGet<RawDiscoverData>(`/discover?pageSize=20${qs}`))
      // 品类模式无数据 → 返回空（走 empty 态）；推荐模式兜底本地示例流
      return items.length ? items : (filtered ? [] : feedItems)
    } catch {
      return filtered ? [] : feedItems
    }
  },

  /** 获取品类导航 — GET /discover/categories（后端品类树 Record<一级,二级[]> → tab 列表） */
  async getCategories(): Promise<{ id: string; label: string }[]> {
    try {
      const tree = await apiGet<Record<string, string[]>>('/discover/categories')
      const keys = tree && typeof tree === 'object' && !Array.isArray(tree) ? Object.keys(tree) : []
      return keys.length
        ? [allCategory, ...keys.map(k => ({ id: k, label: k }))]
        : [allCategory, ...categories]
    } catch {
      return [allCategory, ...categories]
    }
  },

  /** 获取热搜词 — GET /search/hot（搜索频次 + 运营兜底，返回 [{keyword,count}]） */
  async getHotWords(): Promise<string[]> {
    try {
      const data = await apiGet<Array<{ keyword: string; count?: number }>>('/search/hot?limit=8')
      const words = Array.isArray(data) ? data.map(d => d?.keyword).filter((w): w is string => !!w) : []
      return words.length ? words : hotWords
    } catch {
      return hotWords
    }
  },

  /** 个性化推荐 — GET /discover/recommendations（同 sections 适配） */
  async getRecommendations(): Promise<FeedItem[]> {
    try {
      const items = adaptDiscoverFeed(await apiGet<RawDiscoverData>('/discover/recommendations?pageSize=12'))
      return items.length ? items : feedItems.slice(0, 6)
    } catch {
      return feedItems.slice(0, 6)
    }
  },
}

// ============ 分板块橱窗（发现页策展）============
// 发现页四橱窗（本周新课/直播预告/新书上架/掌柜好物）复用各板块真实 list 接口，
// 每节仅取头几条真数据；接口失败/空 → 该节隐藏（诚实降级，不造假）。

/** 橱窗小卡统一形状（各板块字段归一为发现页横滑卡消费） */
export interface ShowcaseCard {
  id: string
  title: string
  cover?: string
  /** 封面档位：course=信息类模糊延展 / classic=书封 / product=白底 / live=预告 */
  coverType: 'course' | 'classic' | 'product' | 'live'
  ratio: '4:3' | '3:4' | '1:1'
  /** 主辅信息：价格文案 / 讲师 / 朝代 等 */
  price?: number
  meta?: string
  /** 右上角标（直播预告时间 / 免费等），可空 */
  badge?: string
  badgeStrong?: boolean
  /** 点击去向（真实板块页） */
  href: string
}

/** 主题策展带（后台运营位，当前无接口 → 用真数据合成一张「本周精选」，见 getThemeBand 注释） */
export interface ThemeBand {
  eyebrow: string
  title: string
  subtitle: string
  cover?: string
  href: string
}

function sNum(v: unknown): number { const x = Number(v); return Number.isFinite(x) ? x : 0 }

export const discoverShowcaseApi = {
  /** 本周新课 — GET /courses?sort=newest（课程 4:3 信息类模糊延展） */
  async newCourses(): Promise<ShowcaseCard[]> {
    try {
      const { coursesListApi } = await import('@/lib/courses-list-data')
      const { items } = await coursesListApi.list({ sort: 'newest', pageSize: 6 })
      return items.slice(0, 6).map((c) => ({
        id: String(c.id), title: c.title, cover: c.cover, coverType: 'course', ratio: '4:3',
        price: c.free ? undefined : sNum(c.price),
        meta: c.free ? '免费学' : (c.teacher || (c.lessons ? `共 ${c.lessons} 讲` : '精品好课')),
        href: `/course/${c.id}`,
      }))
    } catch { return [] }
  },

  /** 直播预告 — GET /live/plaza，取即将开播/直播中（3:4 竖卡 + 时间角标） */
  async livePreviews(): Promise<ShowcaseCard[]> {
    try {
      const { liveApi } = await import('@/lib/live-data')
      const list = await liveApi.getPlaza()
      const arr = Array.isArray(list) ? list : []
      // 预告优先，其次直播中，凑够 5 条
      const upcoming = arr.filter((l) => l.status === 'upcoming')
      const living = arr.filter((l) => l.status === 'live')
      return [...upcoming, ...living].slice(0, 5).map((l) => ({
        id: String(l.id), title: l.title, cover: l.cover, coverType: 'live', ratio: '3:4',
        meta: l.hostName || (l.type === 'commerce' ? '带货专场' : '知识授课'),
        badge: l.status === 'upcoming' ? (l.scheduledTime || '预告') : '直播中',
        badgeStrong: true,
        href: `/live/${l.id}`,
      }))
    } catch { return [] }
  },

  /** 新书上架 — GET /classics/ranking?sort=new（书封 3:4，无封面走 smart-cover 兜底） */
  async newClassics(): Promise<ShowcaseCard[]> {
    try {
      const { classicsApi } = await import('@/lib/classics-data')
      const { books } = await classicsApi.ranking('new')
      const arr = Array.isArray(books) ? books : []
      return arr.slice(0, 6).map((b) => ({
        id: String(b.id), title: b.title, cover: '', coverType: 'classic', ratio: '3:4',
        meta: [b.dynasty && `${b.dynasty}代`, b.author].filter(Boolean).join(' · ') || '典藏',
        href: `/classics/${b.id}`,
      }))
    } catch { return [] }
  },

  /** 掌柜好物 — GET /shop/products?sort=newest（商品 1:1 白底 contain） */
  async newProducts(): Promise<ShowcaseCard[]> {
    try {
      const { shopApi } = await import('@/lib/shop-data')
      const { items } = await shopApi.getMallProducts({ sort: 'newest', pageSize: 6 })
      return items.slice(0, 6).map((p) => ({
        id: String(p.id), title: p.name, cover: p.cover, coverType: 'product', ratio: '1:1',
        price: sNum(p.price),
        meta: p.sales ? `已售 ${p.sales}` : '掌柜精选',
        href: `/mall/product/${p.id}`,
      }))
    } catch { return [] }
  },

  /**
   * 今日热榜 — 后端暂无「全站热度榜」聚合端点，复用发现页推荐流 getFeed 头部真数据取标题。
   * 返回 Top3 {title, tail}，tail 为类型文案。运营位/真榜接口待后端补。
   */
  async hotBoard(): Promise<{ title: string; tail: string; href: string }[]> {
    try {
      const items = await discoverApi.getFeed('all')
      const tailMap: Record<string, string> = {
        live: '直播中', course: '热学好课', classic: '全站热读',
        product: '掌柜热卖', agent: '智能体热榜', video: '今日必看',
      }
      const hrefMap: Record<FeedItem['kind'], (id: string) => string> = {
        live: (id) => `/live/${id}`,
        course: (id) => `/course/${id}`,
        classic: (id) => `/classics/${id}`,
        product: (id) => `/mall/product/${id}`,
        agent: (id) => `/agent/${id}`,
        video: (id) => `/video/${id}`,
      }
      return items.slice(0, 3).map((it) => {
        const title = it.kind === 'agent' ? it.data.name : it.data.title
        return { title, tail: tailMap[it.kind] || '全站热议', href: hrefMap[it.kind](String(it.data.id)) }
      })
    } catch { return [] }
  },

  /**
   * 主题策展带 — ⚠️ 后端暂无「专题运营位」CMS/接口。当前用「本周新课」首条真数据
   * 合成一张导流卡（点击进课程列表）作为诚实占位；待后端补运营位后替换为真专题。
   */
  async getThemeBand(): Promise<ThemeBand | null> {
    try {
      const courses = await this.newCourses()
      const first = courses[0]
      if (!first) return null
      return {
        eyebrow: '本周精选',
        title: '名师新课 · 系统进阶',
        subtitle: `${first.title} 等好课上新`,
        cover: first.cover,
        href: '/courses-list',
      }
    } catch { return null }
  },
}
