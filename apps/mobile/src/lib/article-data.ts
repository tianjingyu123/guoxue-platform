/**
 * 文章详情页数据（从原型 app/articles/[id]/page.tsx 1:1 迁移）
 * 内容块模型支持正文内联嵌入推荐卡（圈子/课程/商品/排盘/智能体）
 */
import { normalizeArticleContent } from '@/utils/rich-content'

export type EmbedType = 'circle' | 'course' | 'product' | 'paipan' | 'agent'

export type ContentBlock =
  | { type: 'text'; content: string }
  | { type: 'heading'; content: string }
  | { type: 'quote'; content: string }
  | { type: 'list'; items: string[] }
  | { type: 'image'; src: string; caption?: string }
  // 嵌入卡 payload 形态随 embedType 而异（圈子/课程/商品各不同），仅 mock 使用，保留 any
  | { type: 'embed'; embedType: EmbedType; data: any }

export interface ArticleAuthor {
  id: string
  name: string
  avatar: string
  title: string
  followers: number
  isFollowed: boolean
}

export interface ArticleData {
  id: string
  title: string
  cover?: string
  coverRatio?: '16:9' | '3:4'
  tags: string[]
  author: ArticleAuthor
  publishedAt: string
  views: number
  likes: number
  collects: number
  comments: number
  isLiked: boolean
  isCollected: boolean
  aiSummary?: string
  audioUrl?: string
  blocks: ContentBlock[]
  sourceCircle: { id: string; name: string; cover: string; description: string; members: number; postsToday: number; isJoined: boolean }
  authorOtherArticles: { id: string; title: string; cover?: string; views: number; likes: number }[]
  relatedArticles: { id: string; title: string; cover?: string; author: string; likes: number }[]
}

export interface CommentReply {
  id: string
  content: string
  author: { id: string; name: string; avatar: string }
  createdAt: string
  likes: number
  isLiked: boolean
}
export interface ArticleComment {
  id: string
  content: string
  author: { id: string; name: string; avatar: string }
  createdAt: string
  likes: number
  isLiked: boolean
  replies?: CommentReply[]
  replyCount?: number
}

const DICE = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`

// @data-needs: 文章详情, 参数 {id}, 返回 {ArticleData}
export const mockArticle: ArticleData = {
  id: '1',
  title: '八字入门：如何正确排出你的生辰八字',
  cover: '/images/feed/article-1.jpg',
  coverRatio: '16:9',
  tags: ['八字入门', '命理学', '五行'],
  author: { id: 'author-1', name: '玄微子', avatar: DICE('xuanweizi'), title: '易学传承人 · 20年经验', followers: 12680, isFollowed: false },
  publishedAt: '2024-01-15',
  views: 8520,
  likes: 1256,
  collects: 892,
  comments: 2,
  isLiked: false,
  isCollected: false,
  aiSummary: '本文系统介绍了八字命理的基础概念，包括天干地支、四柱构成、真太阳时校正与五行十神关系，适合零基础读者建立完整的八字认知框架。',
  audioUrl: '/audio/article-1.mp3',
  blocks: [
    { type: 'text', content: '八字，又称四柱，是中国传统命理学的核心方法之一。它以一个人出生的年、月、日、时四个时间点，各配以天干地支，形成八个字，故称「八字」。' },
    { type: 'heading', content: '一、什么是八字？' },
    { type: 'text', content: '八字命理学认为，一个人出生时的天干地支，蕴含着其一生的命运信息。通过分析八字中的五行生克、十神关系、神煞等要素，可以推断一个人的性格、事业、婚姻、财运等方面的情况。' },
    { type: 'list', items: ['天干十个：甲乙丙丁戊己庚辛壬癸', '地支十二个：子丑寅卯辰巳午未申酉戌亥', '天干地支两两相配，循环六十，称为六十甲子'] },
    { type: 'embed', embedType: 'paipan', data: { title: 'AI 智能排盘', description: '输入生辰，一键生成专业八字命盘' } },
    { type: 'heading', content: '二、如何排八字？' },
    { type: 'text', content: '排八字的第一步是确定出生的准确时间。需要注意的是，八字使用的是真太阳时，而非北京时间，不同地区需根据经度进行时差校正。' },
    { type: 'quote', content: '年柱以立春为界，月柱以节气为准，日柱以子时为分界，时柱则根据出生时辰确定。' },
    { type: 'embed', embedType: 'course', data: { id: 'c1', title: '八字命理系统课程：从零到精通', cover: '/images/courses/course-1.jpg', price: 299, students: 1580 } },
    { type: 'heading', content: '三、八字的基本构成' },
    { type: 'text', content: '八字由四柱组成，每柱包含一个天干和一个地支。年柱代表祖上和童年，月柱代表父母和青年，日柱代表自己和配偶，时柱代表子女和晚年。日干是八字的核心，称为「日主」，代表命主本人。' },
    { type: 'embed', embedType: 'product', data: { id: 'p1', name: '《渊海子平》精装典藏版', cover: '/images/products/book-1.jpg', price: 128, originalPrice: 168 } },
    { type: 'heading', content: '四、学习建议' },
    { type: 'text', content: '学习八字需要循序渐进，建议从基础概念开始，先熟悉天干地支、五行生克、十神含义，再逐步深入到格局、用神、大运流年等高级内容。实践是最好的老师，多分析真实案例、与同好交流探讨尤为重要。' },
    { type: 'embed', embedType: 'agent', data: { id: 'a1', name: '八字智能解读', description: 'AI 分析你的命盘，给出专业解读' } },
  ],
  sourceCircle: { id: 'circle-1', name: '八字命理研究社', cover: '/images/circles/circle-1.jpg', description: '专注八字命理研究，分享实战案例与学习心得', members: 3280, postsToday: 56, isJoined: false },
  authorOtherArticles: [
    { id: '2', title: '紫微斗数与八字命理的区别与联系', cover: '/images/feed/article-2.jpg', views: 3200, likes: 456 },
    { id: '3', title: '如何从八字看财运旺衰', views: 5600, likes: 890 },
    { id: '4', title: '八字合婚的基本原则', cover: '/images/feed/article-1.jpg', views: 4500, likes: 678 },
  ],
  relatedArticles: [
    { id: '5', title: '十神详解：正官七杀的吉凶判断', cover: '/images/feed/article-2.jpg', author: '李命理', likes: 320 },
    { id: '6', title: '大运流年如何影响一生运势', author: '周易大师', likes: 540 },
  ],
}

// ============ 真实 API 层（列表 / 发布 / 草稿 / 标签） ============
import { apiGet, apiGetOptionalAuth, apiPost, apiPut, apiDelete, apiGetPaged } from '@/utils/request'

/** 文章列表项（对齐后端 article.service.listArticles 的 select 字段） */
export interface ArticleListItem {
  id: string
  title: string
  cover?: string | null
  excerpt?: string | null
  tags: string[]
  viewCount: number
  likeCount: number
  collectCount: number
  createdAt: string
  user?: { id: string; nickname: string; avatar?: string | null } | null
  circle?: { id: string; name: string } | null
}

/** 热门标签（对齐后端 topicTag 表） */
export interface HotTag {
  id: string
  name: string
  postCount?: number
}

/** 我的草稿列表项（对齐后端 getMyDrafts 的 select：id/title/cover/excerpt/updatedAt） */
export interface DraftListItem {
  id: string
  title: string
  cover?: string | null
  excerpt?: string | null
  updatedAt: string
}

/** 解析后端分页信封 paginated → {rows,total} / 兼容多种命名 */
function parseList<T>(res: unknown): { items: T[]; total: number } {
  const r = (res ?? {}) as { rows?: T[]; items?: T[]; list?: T[]; total?: number }
  const items: T[] = r.rows ?? r.items ?? r.list ?? (Array.isArray(res) ? (res as T[]) : [])
  const total: number = r.total ?? items.length
  return { items, total }
}

// ============ 文章详情（真连后端 GET /articles/:id） ============

/** 内联推荐卡（对齐后端 ArticleRecommend 表：recommendType/targetId/title/cover/sortOrder） */
export interface ArticleRecommendCard {
  id: string
  recommendType: 'CIRCLE' | 'COURSE' | 'PRODUCT' | 'PAIPAN' | 'BOT'
  targetId: string
  title?: string
  cover?: string
}

/** 文章带货商品卡（源自 recommends 里 PRODUCT 类型·价格逐件拉 /shop/products/:id 充实·参照短视频带货抽屉） */
export interface ArticleProductCard {
  id: string        // = 商品 id（recommend.targetId）
  name: string
  cover: string
  price: number
  originalPrice: number
}

/** 相关文章卡（对齐后端 getRelated 的 select 字段） */
export interface RelatedArticleCard {
  id: string
  title: string
  cover?: string | null
  likes: number
}

/** 文章详情（对齐后端 article.getDetail 返回；后端无 blocks，正文为富文本 HTML，用 rich-text 渲染） */
export interface ArticleDetail {
  id: string
  title: string
  cover?: string | null
  tags: string[]
  author: { id: string; name: string; avatar: string }
  circleId: string
  publishedAt: string
  views: number
  likes: number
  collects: number
  comments: number
  content: string // 富文本 HTML
  recommends: ArticleRecommendCard[]
  products: ArticleProductCard[]  // 带货商品（recommends 里 PRODUCT 类型抽出·抖音式抽屉展示）
  sourceCircle?: { id: string; name: string; cover?: string | null; members: number }
  related: RelatedArticleCard[]
}

const REC_TYPES = ['CIRCLE', 'COURSE', 'PRODUCT', 'PAIPAN', 'BOT'] as const

/** 推荐卡 → 目标路由（供 detail 页内联卡跳转） */
export function recommendRoute(c: ArticleRecommendCard): string {
  switch (c.recommendType) {
    case 'CIRCLE': return `/circles/${c.targetId}`
    case 'COURSE': return `/courses/${c.targetId}`
    case 'PRODUCT': return `/shop/${c.targetId}`
    case 'PAIPAN': return '/paipan'
    case 'BOT': return `/agent/${c.targetId}`
    default: return ''
  }
}

/* —— 后端原始响应类型（容错适配用，字段宽松全 optional，仅声明 adapter 实际访问到的字段，不 export） —— */
interface RawUserLite { id?: string; nickname?: string; avatar?: string | null }
interface RawRecommend { id?: string | number; recommendType?: string; targetId?: string | number; title?: string | null; cover?: string | null }
interface RawRelated { id?: string | number; title?: string; cover?: string | null; likeCount?: number; likes?: number }
interface RawArticleCircle { id?: string; name?: string; cover?: string | null; memberCount?: number }
/** 后端文章详情原始响应（GET /articles/:id） */
interface RawArticleDetail {
  id?: string | number
  title?: string
  cover?: string | null
  tags?: string[]
  user?: RawUserLite | null
  userId?: string
  circleId?: string
  circle?: RawArticleCircle | null
  createdAt?: string
  viewCount?: number
  likeCount?: number
  collectCount?: number
  commentCount?: number
  content?: string
  recommends?: RawRecommend[]
  related?: RawRelated[]
}
/** 后端评论回复原始响应 */
interface RawReply {
  id?: string | number
  content?: string
  user?: RawUserLite | null
  userId?: string
  createdAt?: string
  likeCount?: number
  likes?: number
  isLiked?: boolean
}
/** 后端评论原始响应（含楼中楼 replies） */
interface RawComment extends RawReply { replies?: RawReply[] }
/** 我的收藏列表项（checkInteraction 比对用） */
interface RawCollectItem { targetId?: string | number }
/** GET /shop/products/:id 精简形状（文章带货商品充实用·仅声明访问到的字段·与短视频同款） */
interface RawShopProductLite { id?: string; title?: string; price?: number | string; originalPrice?: number | string | null; effectivePrice?: number | string; images?: string[]; cover?: string | null; salesCount?: number }
/** GET /videos/products 商品库原始项（作者端挂品选品用·与 video-data.RawVideoProduct 同源字段） */
interface RawProductLibItem { id?: string | number; productId?: string; title?: string; name?: string; price?: number | string; images?: string[]; image?: string; cover?: string }

/** 作者端选品项（挂品抽屉展示用：图+名+价） */
export interface ProductLibraryItem {
  id: string
  name: string
  cover: string
  price: number
}

function adaptArticleDetail(a: RawArticleDetail): ArticleDetail {
  const recs: ArticleRecommendCard[] = (Array.isArray(a?.recommends) ? a.recommends : [])
    .filter((r: RawRecommend) => (REC_TYPES as readonly string[]).includes(r?.recommendType || ''))
    .map((r: RawRecommend) => ({
      id: String(r.id || ''),
      // 已由上面 filter 保证 recommendType 落在 REC_TYPES 内，断言为视图模型枚举
      recommendType: (r.recommendType || '') as ArticleRecommendCard['recommendType'],
      targetId: String(r.targetId || ''),
      title: r.title || undefined,
      cover: r.cover || undefined,
    }))
  const related: RelatedArticleCard[] = (Array.isArray(a?.related) ? a.related : []).map((r: RawRelated) => ({
    id: String(r.id || ''),
    title: r.title || '',
    cover: r.cover ?? null,
    likes: Number(r.likeCount ?? r.likes ?? 0),
  }))
  // 带货商品：从 recommends 里抽出 PRODUCT 类型（ArticleRecommend 无价格 → 详情页加载后 enrichProducts 逐件充实）
  const products: ArticleProductCard[] = (Array.isArray(a?.recommends) ? a.recommends : [])
    .filter((r: RawRecommend) => r?.recommendType === 'PRODUCT' && r?.targetId != null && r?.targetId !== '')
    .map((r: RawRecommend) => ({
      id: String(r.targetId || ''),
      name: r.title || '相关商品',
      cover: r.cover || '',
      price: 0,
      originalPrice: 0,
    }))
  const circle = a?.circle
  return {
    id: String(a?.id || ''),
    title: a?.title || '',
    cover: a?.cover ?? null,
    tags: Array.isArray(a?.tags) ? a.tags : [],
    author: {
      id: String(a?.user?.id || a?.userId || ''),
      name: a?.user?.nickname || '佚名',
      avatar: a?.user?.avatar || '',
    },
    circleId: String(a?.circleId || circle?.id || ''),
    publishedAt: a?.createdAt ? String(a.createdAt).slice(0, 10) : '',
    views: Number(a?.viewCount ?? 0),
    likes: Number(a?.likeCount ?? 0),
    collects: Number(a?.collectCount ?? 0),
    comments: Number(a?.commentCount ?? 0),
    // 文章排版归一：纯文本切段防糊 + 反转义 + 图片无缝圆角 + 公众号级标签排版注入（见 normalizeArticleContent）
    content: normalizeArticleContent(a?.content || ''),
    recommends: recs,
    products,
    sourceCircle: circle ? {
      id: String(circle.id || ''),
      name: circle.name || '',
      cover: circle.cover ?? null,
      members: Number(circle.memberCount ?? 0),
    } : undefined,
    related,
  }
}

/** 后端评论项 → 前端 ArticleComment（含楼中楼 replies） */
function adaptArticleComment(c: RawComment): ArticleComment {
  const replies: CommentReply[] = (Array.isArray(c?.replies) ? c.replies : []).map((r: RawReply) => ({
    id: String(r.id || ''),
    content: r.content || '',
    author: { id: String(r.user?.id || r.userId || ''), name: r.user?.nickname || '匿名用户', avatar: r.user?.avatar || '' },
    createdAt: r.createdAt ? String(r.createdAt).slice(0, 16).replace('T', ' ') : '',
    likes: Number(r.likeCount ?? r.likes ?? 0),
    isLiked: !!r.isLiked,
  }))
  return {
    id: String(c?.id || ''),
    content: c?.content || '',
    author: { id: String(c?.user?.id || c?.userId || ''), name: c?.user?.nickname || '匿名用户', avatar: c?.user?.avatar || '' },
    createdAt: c?.createdAt ? String(c.createdAt).slice(0, 16).replace('T', ' ') : '',
    likes: Number(c?.likeCount ?? c?.likes ?? 0),
    isLiked: !!c?.isLiked,
    replies: replies.length ? replies : undefined,
    replyCount: replies.length || undefined,
  }
}

export const articleApi = {
  /** 文章列表 GET /articles?circleId=&tag=&page=&pageSize= */
  async list(params: { page?: number; pageSize?: number; circleId?: string; tag?: string } = {}): Promise<{ items: ArticleListItem[]; total: number }> {
    const qs: string[] = []
    if (params.page) qs.push(`page=${params.page}`)
    if (params.pageSize) qs.push(`pageSize=${params.pageSize}`)
    if (params.circleId) qs.push(`circleId=${encodeURIComponent(params.circleId)}`)
    if (params.tag) qs.push(`tag=${encodeURIComponent(params.tag)}`)
    const res = await apiGet<unknown>(`/articles${qs.length ? '?' + qs.join('&') : ''}`)
    return parseList<ArticleListItem>(res)
  },

  /** 创建文章（圈子内） POST /articles/circles/:circleId（visibility 开放范围：CIRCLE_ONLY 默认/PLATFORM 全平台需平台审核·文章是圈子对外窗口，全平台为推荐引导项） */
  create: (circleId: string, body: { title: string; content: string; cover?: string; excerpt?: string; tags: string[]; isPushHome?: boolean; visibility?: 'CIRCLE_ONLY' | 'PLATFORM' }) =>
    apiPost<{ id: string }>(`/articles/circles/${circleId}`, body),

  /** 保存草稿 POST /articles/drafts */
  saveDraft: (body: { title: string; content: string; cover?: string; excerpt?: string; tags: string[]; circleId?: string }) =>
    apiPost<{ id: string }>('/articles/drafts', body),

  /** 我的草稿列表 GET /articles/drafts?page=&pageSize=（后端 auditStatus=DRAFT 且归属当前用户） */
  async getDrafts(page = 1, pageSize = 20): Promise<{ items: DraftListItem[]; total: number }> {
    const res = await apiGet<unknown>(`/articles/drafts?page=${page}&pageSize=${pageSize}`)
    return parseList<DraftListItem>(res)
  },

  /** 更新草稿 PUT /articles/drafts/:id（续编保存回写，避免每次续编生成新草稿） */
  updateDraft: (id: string, body: { title?: string; content?: string; cover?: string; excerpt?: string; tags?: string[] }) =>
    apiPut<{ id: string }>(`/articles/drafts/${id}`, body),

  /** 删除草稿 DELETE /articles/drafts/:id */
  deleteDraft: (id: string) =>
    apiDelete<{ success: boolean }>(`/articles/drafts/${id}`),

  /** 发布草稿（DRAFT→PENDING 进审核）POST /articles/drafts/:id/publish */
  publishDraft: (id: string) =>
    apiPost<{ id: string }>(`/articles/drafts/${id}/publish`, {}),

  /** 发动态/帖子 POST /circles/:circleId/posts（attachments=文件卡附件·后端 Post.attachments JSONB） */
  createPost: (circleId: string, body: { type: string; title?: string; content: string; images?: string[]; attachments?: { name: string; size: number; url: string }[]; status?: string }) =>
    apiPost<{ id: string }>(`/circles/${circleId}/posts`, body),

  // ───────── 详情 / 评论（读） ─────────

  /** 文章详情 GET /articles/:id（含 recommends 内联卡 + related 相关文章 + products 带货商品） */
  async detail(id: string): Promise<ArticleDetail> {
    return adaptArticleDetail(await apiGet<RawArticleDetail>(`/articles/${id}`))
  },

  /**
   * 带货商品充实 — ArticleRecommend(PRODUCT) 仅存 targetId+title+cover 无价格 →
   * 逐件拉 /shop/products/:id 补 price/originalPrice/cover（与短视频带货抽屉同款·失败保留原卡不阻断）。
   */
  async enrichProducts(products: ArticleProductCard[]): Promise<ArticleProductCard[]> {
    if (!products.length) return products
    return Promise.all(products.map(async (p) => {
      try {
        const d = await apiGet<RawShopProductLite>(`/shop/products/${p.id}`)
        return {
          ...p,
          name: d?.title || p.name,
          cover: (Array.isArray(d?.images) && d.images[0]) || d?.cover || p.cover,
          price: Number(d?.effectivePrice ?? d?.price) || 0,
          originalPrice: Number(d?.originalPrice) || 0,
        }
      } catch { return p }
    }))
  },

  // ───────── 文章带货 · 作者端挂品（消费端「文中好物」抽屉已闭环，此处补作者侧断链） ─────────

  /**
   * 挂载推荐商品 POST /articles/:id/recommends（后端 AddRecommendDto：recommendType/targetId 必填 + title/cover/sortOrder 可选）。
   * 需文章作者本人（后端校验 article.userId===userId）；title/cover 一并落库供详情页商品卡直显。
   */
  addRecommend: (articleId: string, productId: string, extra?: { title?: string; cover?: string; sortOrder?: number }) =>
    apiPost<{ id: string }>(`/articles/${articleId}/recommends`, {
      recommendType: 'PRODUCT',
      targetId: productId,
      ...(extra?.title ? { title: extra.title } : {}),
      ...(extra?.cover ? { cover: extra.cover } : {}),
      ...(extra?.sortOrder != null ? { sortOrder: extra.sortOrder } : {}),
    }),

  /** 商品库列表 GET /videos/products（全平台 ON_SALE 商品·与短视频带货选品同源） */
  async getProductLibrary(): Promise<ProductLibraryItem[]> {
    const res = await apiGet<RawProductLibItem[] | { items?: RawProductLibItem[]; data?: RawProductLibItem[] }>('/videos/products')
    const arr = Array.isArray(res) ? res : (res?.items ?? res?.data ?? [])
    return arr
      .map((p: RawProductLibItem) => ({
        id: String(p.productId ?? p.id ?? ''),
        name: p.title || p.name || '',
        cover: (Array.isArray(p.images) && p.images[0]) || p.image || p.cover || '',
        price: Number(p.price) || 0,
      }))
      .filter((p) => p.id)
  },

  /** 文章评论列表 GET /comment?targetType=ARTICLE&targetId=（无评论返回 []，走空态） */
  async getComments(id: string): Promise<ArticleComment[]> {
    const r = await apiGet<unknown>(`/comment?targetType=ARTICLE&targetId=${id}`)
    const ro = (r ?? {}) as { data?: RawComment[]; comments?: RawComment[]; items?: RawComment[]; rows?: RawComment[] }
    const arr: RawComment[] = Array.isArray(r) ? (r as RawComment[]) : (ro.data ?? ro.comments ?? ro.items ?? ro.rows ?? [])
    return arr.map(adaptArticleComment)
  },

  // ───────── 互动（写操作，需登录；apiPost 自动加 token + 剥信封） ─────────

  /** 点赞/取消（toggle）— POST /interaction/like */
  toggleLike: (id: string) => apiPost<unknown>('/interaction/like', { targetType: 'ARTICLE', targetId: id }),
  /** 收藏/取消（toggle）— POST /interaction/collect */
  toggleCollect: (id: string) => apiPost<unknown>('/interaction/collect', { targetType: 'ARTICLE', targetId: id }),
  /** 关注/取消关注作者 — POST /interaction/follow（FollowDto.followedUserId） */
  toggleFollow: (userId: string) => apiPost<unknown>('/interaction/follow', { followedUserId: userId }),
  /** 评论点赞/取消 — POST /interaction/like（targetType=COMMENT） */
  toggleCommentLike: (commentId: string) => apiPost<unknown>('/interaction/like', { targetType: 'COMMENT', targetId: commentId }),
  /** 发表评论 — POST /interaction/comment（parentId 用于楼中楼回复） */
  createComment: (id: string, content: string, parentId?: string) =>
    apiPost<unknown>('/interaction/comment', { targetType: 'ARTICLE', targetId: id, content, ...(parentId ? { parentId } : {}) }),
  /**
   * 预查我对文章的点赞/收藏态（避免 toggle 语义反向）。
   * like/check 返回「已点赞的 targetId 数组」；collect 无单查端点 → 拉我的收藏首页比对（>100 时降级漏判，可接受）。
   */
  async checkInteraction(id: string): Promise<{ liked: boolean; collected: boolean }> {
    const [likedIds, collects] = await Promise.all([
      apiGetOptionalAuth<unknown>(`/interaction/like/check?targetType=ARTICLE&targetIds=${id}`).catch(() => null),
      apiGetOptionalAuth<unknown>(`/interaction/collect?page=1&pageSize=100`).catch(() => null),
    ])
    const likedObj = (likedIds ?? {}) as { data?: unknown[]; items?: unknown[] }
    const likedArr: unknown[] = Array.isArray(likedIds) ? likedIds : (likedObj.data ?? likedObj.items ?? [])
    const collectsObj = (collects ?? {}) as { items?: RawCollectItem[] }
    const collectItems: RawCollectItem[] = Array.isArray(collectsObj.items) ? collectsObj.items : (Array.isArray(collects) ? (collects as RawCollectItem[]) : [])
    return {
      liked: likedArr.map(String).includes(String(id)),
      collected: collectItems.some((c: RawCollectItem) => String(c?.targetId) === String(id)),
    }
  },
}

/** 挂载文章推荐商品（具名导出·等价 articleApi.addRecommend，供编辑器发布后循环挂品） */
export const addArticleRecommend = articleApi.addRecommend

/** 标签下的内容聚合项（对齐后端 GET /tags/:name/posts 的 select 字段，Content 表） */
export interface TagContentItem {
  id: string
  title: string
  type: string // ARTICLE / POEM / CLASSIC
  author?: string | null
  dynasty?: string | null
  excerpt?: string | null
  cover?: string | null
  tags: string[]
  viewCount: number
  likeCount: number
  createdAt: string
}

export const tagApi = {
  /** 热门标签 GET /tags/hot?limit= */
  async hot(limit = 20): Promise<HotTag[]> {
    const res = await apiGet<unknown>(`/tags/hot?limit=${limit}`)
    const ro = (res ?? {}) as { rows?: HotTag[]; items?: HotTag[] }
    return Array.isArray(res) ? (res as HotTag[]) : (ro.rows ?? ro.items ?? [])
  },

  /** 标签下内容聚合 GET /tags/:name/posts?page=&pageSize=（分页，返回真实 total） */
  posts(name: string, page = 1, pageSize = 20) {
    return apiGetPaged<TagContentItem>(`/tags/${encodeURIComponent(name)}/posts?page=${page}&pageSize=${pageSize}`)
  },

  /** 搜索标签 GET /tags/search?q= */
  async search(q: string): Promise<HotTag[]> {
    const res = await apiGet<unknown>(`/tags/search?q=${encodeURIComponent(q)}`)
    const ro = (res ?? {}) as { rows?: HotTag[]; items?: HotTag[] }
    return Array.isArray(res) ? (res as HotTag[]) : (ro.rows ?? ro.items ?? [])
  },
}

// @data-needs: 文章评论, 参数 {id}, 返回 [{ArticleComment}]
export const mockComments: ArticleComment[] = [
  {
    id: 'c1', content: '写得很好，对初学者很友好，期待更多入门教程！',
    author: { id: 'u1', name: '国学爱好者', avatar: DICE('u1') },
    createdAt: '2小时前', likes: 56, isLiked: false,
    replies: [{ id: 'c1-r1', content: '同感！终于找到一篇能看懂的入门文章', author: { id: 'u2', name: '命理新手', avatar: DICE('u2') }, createdAt: '1小时前', likes: 12, isLiked: false }],
    replyCount: 3,
  },
  {
    id: 'c2', content: '五行相生相克那部分讲得特别清楚，以前总是记不住',
    author: { id: 'u3', name: '学习中', avatar: DICE('u3') },
    createdAt: '5小时前', likes: 34, isLiked: true,
  },
]
