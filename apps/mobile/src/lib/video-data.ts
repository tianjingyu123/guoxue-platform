/**
 * 短视频板块 mock 数据 —— 严格照搬原型 app/video/[id]/page.tsx mockVideos，逐字段对齐，不增删。
 * @data-needs: 视频流，参数 id(来自 onLoad 定位起始视频)，GET 返回 VideoItem[]
 */

import { apiGet, apiGetPaged, apiPost, apiPut, apiDelete, useMock } from '@/utils/request'

export interface VideoProduct {
  id: string
  name: string
  price: number
  originalPrice: number
  image: string
  sales: number
}

export interface VideoHotComment {
  user: string
  content: string
  likes: number
}

/** 视频评论（真连通用 comment 端点·targetType=VIDEO·含楼中楼 replies） */
export interface VideoComment {
  id: string
  userId: string
  user: string
  avatar: string
  content: string
  likes: number
  createdAt: string
  /** 楼中楼回复（后端 findByTarget 内联返回·递归结构） */
  replies: VideoComment[]
}

export interface VideoAuthor {
  id: string
  name: string
  avatar: string
  isFollowed: boolean
  followers: number
  verified: boolean
}

export interface VideoItem {
  id: string
  title: string
  author: VideoAuthor
  coverUrl: string
  videoUrl: string
  likes: number
  comments: number
  shares: number
  isLiked: boolean
  isCollected: boolean
  music: string
  products: VideoProduct[]
  hotComments: VideoHotComment[]
  /** 来源圈子（内容圈子化：每条视频标明出处，顶栏来源胶囊可点跳圈子详情） */
  circle?: { id: string; name: string }
}

export const mockVideos: VideoItem[] = [
  {
    id: '1',
    title: '八字命理入门：教你看懂自己的命盘',
    author: {
      id: '1',
      name: '易学张老师',
      avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=teacher1',
      isFollowed: false,
      followers: 128000,
      verified: true,
    },
    coverUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=700&fit=crop',
    videoUrl: '',
    likes: 12680,
    comments: 856,
    shares: 234,
    isLiked: false,
    isCollected: false,
    music: '原声 - 易学张老师',
    products: [
      {
        id: 'p1',
        name: '八字命理学入门书籍',
        price: 68,
        originalPrice: 98,
        image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&h=100&fit=crop',
        sales: 3280,
      },
    ],
    hotComments: [
      { user: '小白学易', content: '终于懂了，讲得太清楚了！', likes: 328 },
      { user: '命理爱好者', content: '老师能讲讲大运流年吗？', likes: 156 },
    ],
  },
  {
    id: '2',
    title: '紫微斗数：你的命宫主星是什么？#紫微斗数 #命理',
    author: {
      id: '2',
      name: '紫微斗数林师傅',
      avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=teacher2',
      isFollowed: true,
      followers: 86000,
      verified: true,
    },
    coverUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=700&fit=crop',
    videoUrl: '',
    likes: 8920,
    comments: 562,
    shares: 189,
    isLiked: true,
    isCollected: false,
    music: '古风BGM - 云水禅心',
    products: [],
    hotComments: [{ user: '紫微迷', content: '我是天府星，说得好准！', likes: 89 }],
  },
  {
    id: '3',
    title: '风水布局：客厅财位怎么找？这几点要注意',
    author: {
      id: '3',
      name: '风水大师王',
      avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=master1',
      isFollowed: false,
      followers: 256000,
      verified: true,
    },
    coverUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=700&fit=crop',
    videoUrl: '',
    likes: 23500,
    comments: 1280,
    shares: 567,
    isLiked: false,
    isCollected: true,
    music: '轻音乐 - 福运连连',
    products: [
      {
        id: 'p2',
        name: '招财貔貅摆件 天然黑曜石',
        price: 298,
        originalPrice: 398,
        image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=100&h=100&fit=crop',
        sales: 8560,
      },
      {
        id: 'p3',
        name: '五帝钱挂件 真品铜钱',
        price: 128,
        originalPrice: 168,
        image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=100&h=100&fit=crop',
        sales: 12300,
      },
    ],
    hotComments: [{ user: '装修小白', content: '正好要装修，太及时了！', likes: 256 }],
  },
  {
    id: '4',
    title: '姓名学：名字里这几个字最旺运势！',
    author: {
      id: '4',
      name: '姓名学专家陈',
      avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=expert1',
      isFollowed: false,
      followers: 198000,
      verified: false,
    },
    coverUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=700&fit=crop',
    videoUrl: '',
    likes: 45600,
    comments: 3420,
    shares: 1890,
    isLiked: false,
    isCollected: false,
    music: '国风音乐 - 锦绣',
    products: [
      {
        id: 'p4',
        name: '姓名学全解 起名改名宝典',
        price: 88,
        originalPrice: 128,
        image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&h=100&fit=crop',
        sales: 5680,
      },
    ],
    hotComments: [{ user: '准父母', content: '正好给宝宝起名，收藏了！', likes: 568 }],
  },
  {
    id: '5',
    title: '六爻占卜实战：如何起卦断卦',
    author: {
      id: '5',
      name: '六爻研究社',
      avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=liuyao',
      isFollowed: false,
      followers: 75000,
      verified: true,
    },
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=700&fit=crop',
    videoUrl: '',
    likes: 6780,
    comments: 423,
    shares: 156,
    isLiked: false,
    isCollected: false,
    music: '古琴曲 - 高山流水',
    products: [],
    hotComments: [{ user: '易学新手', content: '请问老师，六爻和梅花易数哪个更准？', likes: 78 }],
  },
]

/** 格式化数字：>=10000 显示「万」 —— 照搬原型 formatNumber */
export function formatVideoNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toString()
}

/** 格式化时长 秒 -> m:ss —— 照搬原型 formatDuration */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// ===== 列表页（/videos）数据 —— 照搬原型 app/videos/page.tsx =====
export interface VideoListItem {
  id: string
  title: string
  coverUrl: string
  duration: number
  author: { name: string; avatar: string }
  likes: number
  plays: number
  hasProduct: boolean
  isHot: boolean
}

// ===== 搜索页（/videos/search）数据 —— 照搬原型 app/videos/search/page.tsx =====
export interface VideoSearchResult {
  id: string
  title: string
  author: string
  authorAvatar: string
  cover: string
  duration: string
  views: number
  publishedAt: string
  category: string
}

/** 视频语境搜索引导词（真实热搜为空/失败时的兜底；原硬编码命理词与视频语境不符已换） */
export const videoFallbackKeywords = ['国学讲座', '古籍导读', '诗词朗诵', '养生功法', '茶道文化', '书法教学', '太极拳', '汉服礼仪']

/** 热门搜索词 — GET /search/hot（全站真实搜索频次+运营兜底）；失败/空回退视频语境引导词 */
export async function fetchVideoHotKeywords(): Promise<string[]> {
  try {
    const data = await apiGet<Array<{ keyword?: string }>>('/search/hot?limit=8')
    const words = (Array.isArray(data) ? data : []).map((r) => r?.keyword || '').filter(Boolean)
    return words.length ? words : videoFallbackKeywords
  } catch {
    return videoFallbackKeywords
  }
}

// ===== 发布页（/videos/publish）数据 —— 照搬原型 app/videos/publish/page.tsx myProductLibrary/hotTags =====
export interface PublishProduct {
  id: string
  name: string
  cover: string
  price: number
  commission: number
  stock: number
}

export const publishProductLibrary: PublishProduct[] = [
  { id: '1', name: '八字命理学入门书籍', cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&h=100&fit=crop', price: 68, commission: 10, stock: 500 },
  { id: '2', name: '招财貔貅摆件', cover: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=100&h=100&fit=crop', price: 298, commission: 15, stock: 200 },
  { id: '3', name: '五帝钱挂件', cover: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=100&h=100&fit=crop', price: 128, commission: 12, stock: 350 },
  { id: '4', name: '姓名学全解', cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&h=100&fit=crop', price: 88, commission: 10, stock: 800 },
  { id: '5', name: '风水堪舆实战课程', cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', price: 199, commission: 20, stock: 999 },
]

export const publishHotTags = ['易经', '风水', '八字', '命理', '国学', '周易', '梅花易数', '六爻']

export const videoSearchResults: VideoSearchResult[] = [
  { id: '1', title: '八字入门：四柱八字基础讲解', author: '周易大师', authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40', cover: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=300&h=160&fit=crop', duration: '28:35', views: 128500, publishedAt: '3天前', category: '八字' },
  { id: '2', title: '紫微斗数十四主星全解析', author: '张玄风', authorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=40', cover: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&h=160&fit=crop', duration: '45:12', views: 98200, publishedAt: '1周前', category: '紫微' },
  { id: '3', title: '奇门遁甲九宫布局实战课', author: '林奇门', authorAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=40', cover: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&h=160&fit=crop', duration: '32:48', views: 76400, publishedAt: '2周前', category: '奇门' },
  { id: '4', title: '风水布局：阳宅财位实操讲解', author: '王德华', authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40', cover: 'https://images.unsplash.com/photo-1502943693086-33b5b1cfdf2f?w=300&h=160&fit=crop', duration: '22:16', views: 62300, publishedAt: '3周前', category: '风水' },
]

// ============ API 层 ============

/* —— 后端原始响应类型（容错适配用，字段全 optional，仅声明 adapter 访问到的） —— */
interface RawVideoProduct { id?: string | number; productId?: string; title?: string; name?: string; price?: number | string; originalPrice?: number | string; images?: string[]; image?: string; cover?: string; salesCount?: number; sales?: number; commission?: number | string; stock?: number }
/** GET /shop/products/:id 精简形状（视频带货商品充实用·仅声明访问到的字段） */
interface RawShopProductLite { id?: string; title?: string; price?: number | string; originalPrice?: number | string | null; effectivePrice?: number | string; images?: string[]; cover?: string | null; salesCount?: number }
interface RawVideo {
  id?: string; title?: string
  user?: { id?: string; nickname?: string; avatar?: string } | null
  coverUrl?: string; videoUrl?: string
  likeCount?: number; likes?: number; commentCount?: number; comments?: number; shareCount?: number; shares?: number
  products?: RawVideoProduct[]
  /** 来源圈子（后端 /videos 与 /videos/:id 均 include circle:{id,name}） */
  circle?: { id?: string; name?: string } | null
}
/** 通用评论原始响应（GET /comment·targetType=VIDEO·replies 为后端内联楼中楼） */
interface RawComment {
  id?: string; content?: string; likeCount?: number; createdAt?: string; parentId?: string | null
  user?: { id?: string; nickname?: string; avatar?: string } | null
  replies?: RawComment[]
}

/** 后端评论 → 前端 VideoComment（递归映射楼中楼） */
function adaptComment(c: RawComment): VideoComment {
  return {
    id: c.id || '',
    userId: c.user?.id || '',
    user: c.user?.nickname || '匿名用户',
    avatar: c.user?.avatar || '',
    content: c.content || '',
    likes: c.likeCount ?? 0,
    createdAt: c.createdAt || '',
    replies: Array.isArray(c.replies) ? c.replies.map(adaptComment) : [],
  }
}

/** 评论时间 → 相对时间（刚刚/x分钟前/x小时前/x天前/日期） */
export function formatCommentTime(iso: string): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const diff = Date.now() - t
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`
  if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)}天前`
  const d = new Date(t)
  return `${d.getMonth() + 1}-${d.getDate()}`
}

/**
 * 反转义历史坏数据：后端旧版 SanitizePipe 曾把 URL 存成 HTML 实体（https:&#x2F;&#x2F;…），
 * 导致 <video src> 无效播不了。后端读取路径已归一化，此处前端再兜底一层（独立部署也生效）。
 */
function unescapeUrl(s?: string): string {
  if (!s || !s.includes('&')) return s || ''
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#x2F;/g, '/')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
}

/** 后端视频 → 前端 VideoItem（全屏流；followers/verified/music/hotComments 后端无→默认） */
function adaptVideoItem(v: RawVideo): VideoItem {
  return {
    id: v.id || '',
    title: v.title || '',
    author: {
      id: v.user?.id || '',
      name: v.user?.nickname || '',
      avatar: v.user?.avatar || '',
      isFollowed: false,
      followers: 0,
      verified: false,
    },
    coverUrl: unescapeUrl(v.coverUrl),
    videoUrl: unescapeUrl(v.videoUrl),
    likes: v.likeCount ?? v.likes ?? 0,
    comments: v.commentCount ?? v.comments ?? 0,
    shares: v.shareCount ?? v.shares ?? 0,
    isLiked: false,
    isCollected: false,
    music: '原声',
    // id 取 productId（VideoProduct 关联行的 id 是关联表主键，非商品 id·购买/加购要用商品 id）
    products: Array.isArray(v.products)
      ? v.products.map((p: RawVideoProduct) => ({ id: String(p.productId ?? p.id ?? ''), name: p.title || p.name || '', price: Number(p.price) || 0, originalPrice: Number(p.originalPrice) || 0, image: (Array.isArray(p.images) && p.images[0]) || p.image || '', sales: p.salesCount ?? p.sales ?? 0 }))
      : [],
    hotComments: [],
    // 来源圈子：仅当后端确实返回圈子关联时映射（无圈子 → undefined，顶栏胶囊不渲染）
    circle: v.circle?.id ? { id: v.circle.id, name: v.circle.name || '' } : undefined,
  }
}

export const videoApi = {
  /** 发布视频 — POST /videos（错误传播给页面；visibility 开放范围 CIRCLE_ONLY=仅本圈默认/PLATFORM=全平台·发布即可见，机审后台异步） */
  async publish(data: { circleId?: string; title: string; description?: string; videoUrl: string; coverUrl?: string; duration?: number; tags?: string[]; isPrivate?: boolean; products?: string[]; visibility?: 'CIRCLE_ONLY' | 'PLATFORM' }): Promise<unknown> {
    return await apiPost('/videos', data)
  },

  /** 视频列表（全屏流）— GET /videos（错误传播给页面三态，不回退假 mock） */
  async list(_params?: Record<string, unknown>): Promise<VideoItem[]> {
    const res = await apiGet<RawVideo[] | { videos?: RawVideo[]; data?: RawVideo[] }>('/videos?pageSize=50')
    const arr = Array.isArray(res) ? res : (res?.videos ?? res?.data ?? [])
    const seen = new Set<string>()
    return arr.map(adaptVideoItem).filter((v: VideoItem) => { if (seen.has(v.title)) return false; seen.add(v.title); return true })
  },

  /** 视频详情 — GET /videos/:id（错误传播） */
  async getById(id: string): Promise<VideoItem | null> {
    return adaptVideoItem(await apiGet<RawVideo>(`/videos/${id}`))
  },

  /**
   * 视频带货商品（佣-V2-P3）— GET /videos/:id 关联行仅存 productId → 逐件拉 /shop/products/:id 组装。
   * 限 5 件（后端发布侧上限）·单件失败/已下架跳过·全部失败=空态（与此前空列表一致，不阻断播放）。
   */
  async getVideoProducts(id: string): Promise<VideoProduct[]> {
    const v = await apiGet<RawVideo>(`/videos/${id}`)
    const rows = Array.isArray(v?.products) ? v.products.slice(0, 5) : []
    const enriched = await Promise.all(rows.map(async (row): Promise<VideoProduct | null> => {
      const pid = String(row.productId ?? '')
      if (!pid) return null
      try {
        const p = await apiGet<RawShopProductLite>(`/shop/products/${pid}`)
        return {
          id: pid,
          name: p?.title || '商品',
          price: Number(p?.effectivePrice ?? p?.price) || 0,
          originalPrice: Number(p?.originalPrice ?? p?.price) || 0,
          image: (Array.isArray(p?.images) && p.images[0]) || p?.cover || '',
          sales: p?.salesCount ?? 0,
        }
      } catch { return null }
    }))
    return enriched.filter((p): p is VideoProduct => !!p)
  },

  /** 收藏切换 — POST /videos/:id/collect（后端返回 {collected}） */
  async collect(id: string): Promise<{ success: boolean; isCollected: boolean }> {
    const res = await apiPost<{ collected: boolean }>(`/videos/${id}/collect`)
    return { success: true, isCollected: !!res?.collected }
  },

  /** 记录分享 — POST /videos/:id/share */
  async share(id: string): Promise<void> {
    await apiPost(`/videos/${id}/share`)
  },

  /** 编辑视频 — PUT /videos/:id（错误传播） */
  async update(id: string, data: Record<string, unknown>): Promise<unknown> {
    return await apiPut(`/videos/${id}`, data)
  },

  /** 删除视频 — DELETE /videos/:id */
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    await apiDelete(`/videos/${id}`)
    return { success: true, message: '删除成功' }
  },

  /** 点赞切换 — POST /videos/:id/like（后端返回 {liked}，计数由页面本地维护） */
  async like(id: string): Promise<{ success: boolean; isLiked: boolean }> {
    const res = await apiPost<{ liked: boolean }>(`/videos/${id}/like`)
    return { success: true, isLiked: !!res?.liked }
  },

  /**
   * 瀑布流列表 — GET /videos/items（后端结构已对齐 VideoListItem；seed 有大量重复→按标题去重）
   * sort: recommend(默认)/hot/follow —— 三 tab 各驱动不同查询；错误传播给页面三态，不回退假 mock。
   */
  async listItems(params?: { sort?: string }): Promise<VideoListItem[]> {
    const q = new URLSearchParams()
    q.set('pageSize', '50')
    if (params?.sort) q.set('sort', params.sort)
    const res = await apiGet<VideoListItem[] | { data?: VideoListItem[]; items?: VideoListItem[] }>(`/videos/items?${q.toString()}`)
    const arr = Array.isArray(res) ? res : (res?.data ?? res?.items ?? [])
    const seen = new Set<string>()
    return arr.filter((v: VideoListItem) => { const k = v.title || v.id; if (seen.has(k)) return false; seen.add(k); return true })
  },

  /**
   * 搜索视频 — GET /videos/search?keyword=（错误传播给页面三态）
   * 后端 items 字段已对齐 VideoSearchResult(id/title/author/authorAvatar/cover/duration/views/publishedAt/category)，直接返回。
   */
  async search(params: { keyword?: string; category?: string; page?: number; pageSize?: number } = {}): Promise<VideoSearchResult[]> {
    const q = new URLSearchParams()
    if (params.keyword) q.set('keyword', params.keyword)
    if (params.category) q.set('category', params.category)
    q.set('page', String(params.page ?? 1))
    q.set('pageSize', String(params.pageSize ?? 20))
    const res = await apiGet<{ items?: VideoSearchResult[] } | VideoSearchResult[]>(`/videos/search?${q.toString()}`)
    return Array.isArray(res) ? res : (res?.items ?? [])
  },

  /** 商品库列表 — GET /videos/products（带货选品；commission 后端无→降级0） */
  async getProductLibrary(_params?: Record<string, unknown>): Promise<PublishProduct[]> {
    const res = await apiGet<RawVideoProduct[] | { items?: RawVideoProduct[]; data?: RawVideoProduct[] }>('/videos/products')
    const arr = Array.isArray(res) ? res : (res?.items ?? res?.data ?? [])
    return arr.map((p: RawVideoProduct) => ({
      id: String(p.id),
      name: p.title || p.name || '',
      cover: (Array.isArray(p.images) && p.images[0]) || p.cover || '',
      price: Number(p.price) || 0,
      commission: Number(p.commission) || 0,
      stock: p.stock ?? 0,
    }))
  },

  // ───────── 评论子系统（P2·复用通用 comment 端点·targetType=VIDEO）─────────

  /** 视频评论列表 — GET /comment?targetType=VIDEO&targetId=（错误传播三态·apiGetPaged 保留 pagination.total·含楼中楼） */
  async getComments(videoId: string, page = 1, pageSize = 20): Promise<{ items: VideoComment[]; total: number }> {
    const res = await apiGetPaged<RawComment>(`/comment?targetType=VIDEO&targetId=${videoId}&page=${page}&pageSize=${pageSize}`)
    return { items: res.items.map(adaptComment), total: res.total }
  },

  /** 发表视频评论 — POST /comment（后端过内容审核·返回新评论供乐观插入·parentId=楼中楼回复） */
  async postComment(videoId: string, content: string, parentId?: string): Promise<VideoComment> {
    const res = await apiPost<RawComment>('/comment', { targetType: 'VIDEO', targetId: videoId, content, ...(parentId ? { parentId } : {}) })
    return adaptComment(res || {})
  },

  /** 点赞评论 — POST /comment/:id/like */
  async likeComment(commentId: string): Promise<void> {
    await apiPost(`/comment/${commentId}/like`)
  },

  // ───────── 关注作者（P2·复用 user follow 端点）─────────

  /** 是否已关注作者 — GET /users/:id/is-following（后端返回 {isFollowing}） */
  async isFollowing(userId: string): Promise<boolean> {
    const res = await apiGet<{ isFollowing?: boolean; following?: boolean }>(`/users/${userId}/is-following`)
    return !!(res?.isFollowing ?? res?.following)
  },

  /** 关注作者 — POST /users/:id/follow */
  async followAuthor(userId: string): Promise<void> {
    await apiPost(`/users/${userId}/follow`)
  },

  /** 取关作者 — DELETE /users/:id/follow */
  async unfollowAuthor(userId: string): Promise<void> {
    await apiDelete(`/users/${userId}/follow`)
  },
}
