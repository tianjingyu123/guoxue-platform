/**
 * 帖子详情页数据 + API
 * 真连后端 GET /circles/:id/posts/:postId + GET /comment?targetType=POST。
 * 富页面字段（音频/打赏/作者等级粉丝/阅读量/收藏/分享）后端无 → 适配为空，页面对应板块降级隐藏。
 */
import { apiGet, apiGetOptionalAuth, apiPost } from '@/utils/request'

export interface PostAuthor {
  id: string
  name: string
  avatar: string
  title?: string
  level?: number
  levelName?: string
  isFollowed?: boolean
  followers?: number
  posts?: number
}

export interface PostImage {
  url: string
  caption?: string
}

export interface PostAudio {
  url: string
  duration: number // 秒
  title: string
}

/** 帖子附件（文件卡：文件名+大小+下载·后端 Post.attachments JSONB） */
export interface PostAttachment {
  name: string
  size: number
  url: string
}

export interface PostDetail {
  id: string
  type: 'normal' | 'article' | 'audio' | 'qa'
  circleId: string
  circleName: string
  title: string
  content: string
  images?: PostImage[]
  audio?: PostAudio
  attachments?: PostAttachment[]
  author: PostAuthor
  createdAt: string
  readTime: number
  views: number
  likes: number
  collects: number
  comments: number
  shares: number
  isLiked: boolean
  isCollected: boolean
  isPinned: boolean
  isEssence: boolean
  reward: number
  rewardCount: number
}

export interface CommentReply {
  id: string
  content: string
  author: PostAuthor
  createdAt: string
  likes: number
  isLiked: boolean
}

export interface Comment {
  id: string
  content: string
  author: PostAuthor
  createdAt: string
  likes: number
  isLiked: boolean
  isPinned?: boolean
  replies: CommentReply[]
}

// 🔴 2026-07-14 删除 postDetail / comments 两个 mock 常量：导出后无任何页面 import（死常量）。
//    pkg-circle/circles/post.vue 走的是下方 postDetailApi 真后端。
//    这俩 mock 里塞着 picsum 假图和一条本地不存在的假音频路径（被接线扫描器扫成死链）。

/** 简易 Markdown 解析为块数组，供模板渲染（替代原型 dangerouslySetInnerHTML） */
export interface MdBlock {
  type: 'h2' | 'bold' | 'quote' | 'li' | 'oli' | 'hr' | 'em' | 'p'
  text?: string
  // p 类型：行内加粗分段
  segments?: { text: string; bold: boolean }[]
}

export function parseMarkdown(content: string): MdBlock[] {
  const lines = content.trim().split('\n')
  const blocks: MdBlock[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('## ')) blocks.push({ type: 'h2', text: line.slice(3) })
    else if (line.startsWith('> ')) blocks.push({ type: 'quote', text: line.slice(2) })
    else if (line.startsWith('- ')) blocks.push({ type: 'li', text: line.slice(2) })
    else if (/^\d+\.\s/.test(line)) blocks.push({ type: 'oli', text: line.replace(/^\d+\.\s/, '') })
    else if (line.startsWith('---')) blocks.push({ type: 'hr' })
    else if (line.startsWith('**') && line.endsWith('**')) blocks.push({ type: 'bold', text: line.slice(2, -2) })
    else if (line.startsWith('*') && line.endsWith('*')) blocks.push({ type: 'em', text: line.slice(1, -1) })
    else {
      // 行内加粗分段
      const segments: { text: string; bold: boolean }[] = []
      const parts = line.split(/(\*\*.+?\*\*)/g)
      for (const part of parts) {
        if (!part) continue
        if (part.startsWith('**') && part.endsWith('**')) segments.push({ text: part.slice(2, -2), bold: true })
        else segments.push({ text: part, bold: false })
      }
      blocks.push({ type: 'p', segments })
    }
  }
  return blocks
}

export const REWARD_QUICK = [5, 10, 20, 50]
export const REWARD_ALL = [5, 10, 20, 50, 100, 200, 500, 1000]

// ─────────────────────────── API ───────────────────────────

/** ISO → 相对时间 */
function relTime(iso?: string | null): string {
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

/** 后端 PostType → 前端 type */
function mapPostType(t?: string): PostDetail['type'] {
  const u = String(t || '').toUpperCase()
  if (u === 'ARTICLE') return 'article'
  if (u === 'AUDIO') return 'audio'
  if (u === 'QA' || u === 'QUESTION') return 'qa'
  return 'normal'
}

/* —— 后端原始响应类型（容错适配用，字段宽松全 optional，仅声明 adapter 实际访问到的字段） —— */
/** 后端用户精简信息（帖子/评论作者） */
interface RawUserLite {
  id?: string
  nickname?: string
  avatar?: string
  title?: string
}
/** 后端帖子详情原始响应 */
interface RawPost {
  id?: string
  type?: string
  circleId?: string
  circle?: { id?: string; name?: string } | null
  title?: string
  content?: string
  images?: string[]
  attachments?: Array<{ name?: string; size?: number; url?: string }>
  user?: RawUserLite | null
  userId?: string
  createdAt?: string | null
  likeCount?: number
  likes?: number
  isTop?: boolean
  isEssence?: boolean
}
/** 后端评论回复原始响应 */
interface RawReply {
  id?: string
  content?: string
  user?: RawUserLite | null
  userId?: string
  createdAt?: string | null
  likeCount?: number
  likes?: number
}
/** 后端评论原始响应（含回复数组） */
interface RawComment {
  id?: string
  content?: string
  user?: RawUserLite | null
  userId?: string
  createdAt?: string | null
  likeCount?: number
  likes?: number
  isPinned?: boolean
  replies?: RawReply[]
}

/** 后端帖子详情 → 前端 PostDetail（后端无的富字段留空，页面隐藏） */
function adaptPostDetail(p: RawPost, commentsCount = 0): PostDetail {
  return {
    id: p.id || '',
    type: mapPostType(p.type),
    circleId: p.circleId ?? p.circle?.id ?? '',
    circleName: p.circle?.name ?? '',
    title: p.title ?? '',
    content: p.content ?? '',
    images: Array.isArray(p.images) ? p.images.map((u: string) => ({ url: u })) : [],
    audio: undefined, // 后端无音频
    // 附件文件卡（后端原生 SQL 列·仅收合法 http(s) url）
    attachments: Array.isArray(p.attachments)
      ? p.attachments
          .filter((a) => a && typeof a.url === 'string' && /^https?:\/\//i.test(a.url))
          .map((a) => ({ name: String(a.name || '文件'), size: Number(a.size) || 0, url: String(a.url) }))
      : [],
    author: {
      id: p.user?.id ?? p.userId ?? '',
      name: p.user?.nickname ?? '匿名',
      avatar: p.user?.avatar ?? '',
      title: p.user?.title, // 以下后端无 → undefined，页面隐藏
      level: undefined,
      levelName: undefined,
      isFollowed: false,
      followers: undefined,
      posts: undefined,
    },
    createdAt: relTime(p.createdAt),
    readTime: 0, // 后端无 → 隐藏
    views: 0,
    likes: p.likeCount ?? p.likes ?? 0,
    collects: 0,
    comments: commentsCount,
    shares: 0,
    isLiked: false,
    isCollected: false,
    isPinned: p.isTop ?? false,
    isEssence: p.isEssence ?? false,
    reward: 0, // 后端无打赏统计 → 隐藏
    rewardCount: 0,
  }
}

/** 后端评论回复 → 前端 CommentReply */
function adaptReply(r: RawReply): CommentReply {
  return {
    id: r.id || '',
    content: r.content ?? '',
    author: { id: r.user?.id ?? r.userId ?? '', name: r.user?.nickname ?? '匿名', avatar: r.user?.avatar ?? '' },
    createdAt: relTime(r.createdAt),
    likes: r.likeCount ?? r.likes ?? 0,
    isLiked: false,
  }
}

/** 后端评论 → 前端 Comment */
function adaptComment(c: RawComment): Comment {
  return {
    id: c.id || '',
    content: c.content ?? '',
    author: { id: c.user?.id ?? c.userId ?? '', name: c.user?.nickname ?? '匿名', avatar: c.user?.avatar ?? '', title: c.user?.title },
    createdAt: relTime(c.createdAt),
    likes: c.likeCount ?? c.likes ?? 0,
    isLiked: false,
    isPinned: c.isPinned ?? false,
    replies: Array.isArray(c.replies) ? c.replies.map(adaptReply) : [],
  }
}

export const postDetailApi = {
  /** 帖子详情（含评论数）— GET /circles/:id/posts/:postId + /comment/count。
   *  缺 circleId 的入口（分享/搜索只带帖子 id）走无圈反查端点 GET /circles/posts/:postId，
   *  避免拼出 /circles//posts/ 双斜杠 404；circleId 可从返回的 PostDetail.circleId 回填。 */
  getDetail: async (circleId: string, postId: string): Promise<PostDetail> => {
    const url = circleId ? `/circles/${circleId}/posts/${postId}` : `/circles/posts/${postId}`
    const [p, cnt] = await Promise.all([
      apiGet<RawPost>(url),
      apiGet<number | { count?: number }>(`/comment/count?targetType=POST&targetId=${postId}`).catch(() => 0),
    ])
    const count = typeof cnt === 'number' ? cnt : (cnt?.count ?? 0)
    return adaptPostDetail(p, count)
  },
  /** 帖子评论列表 — GET /comment?targetType=POST&targetId=（无评论时返回 []，页面空态） */
  getComments: async (postId: string): Promise<Comment[]> => {
    try {
      const r = await apiGet<RawComment[] | { data?: RawComment[]; comments?: RawComment[]; items?: RawComment[] }>(`/comment?targetType=POST&targetId=${postId}`)
      const arr: RawComment[] = Array.isArray(r) ? r : (r?.data ?? r?.comments ?? r?.items ?? [])
      return arr.map(adaptComment)
    } catch { return [] }
  },

  // ───────── 互动（写操作，需登录；apiPost 自动加 token + 剥信封） ─────────

  /** 帖子点赞/取消（toggle）— POST /interaction/like。返回结构后端不定，页面仅 await 不取值 → unknown */
  toggleLike: (postId: string): Promise<unknown> =>
    apiPost<unknown>('/interaction/like', { targetType: 'POST', targetId: postId }),

  /** 帖子收藏/取消（toggle）— POST /interaction/collect */
  toggleCollect: (postId: string): Promise<unknown> =>
    apiPost<unknown>('/interaction/collect', { targetType: 'POST', targetId: postId }),

  /** 关注/取消关注作者 — POST /interaction/follow */
  toggleFollow: (userId: string): Promise<unknown> =>
    apiPost<unknown>('/interaction/follow', { followedUserId: userId }),

  /** 发评论/回复 — POST /interaction/comment（parentId 用于回复）。读评论仍走 /comment */
  createComment: (postId: string, content: string, parentId?: string): Promise<unknown> =>
    apiPost<unknown>('/interaction/comment', {
      targetType: 'POST',
      targetId: postId,
      content,
      ...(parentId ? { parentId } : {}),
    }),

  /** 评论点赞/取消（toggle）— POST /interaction/like，targetType=COMMENT */
  toggleCommentLike: (commentId: string): Promise<unknown> =>
    apiPost<unknown>('/interaction/like', { targetType: 'COMMENT', targetId: commentId }),

  /** 检查当前用户对帖子的点赞状态 — GET /interaction/like/check（详情不返回点赞态） */
  checkPostLiked: async (postId: string): Promise<boolean> => {
    try {
      // 后端返回已点赞的 targetId 字符串数组；兼容对象数组 / 字典等其他形态
      const r = await apiGetOptionalAuth<unknown>(`/interaction/like/check?targetType=POST&targetIds=${postId}`)
      const data = (r && typeof r === 'object' && 'data' in r) ? (r as { data?: unknown }).data : r
      if (Array.isArray(data)) {
        return data.some((x) => {
          const o = x as { targetId?: string; id?: string } | string
          return String((o as { targetId?: string })?.targetId ?? (o as { id?: string })?.id ?? o) === String(postId)
        })
      }
      if (data && typeof data === 'object') {
        const dict = data as Record<string, unknown>
        const v = dict[postId] ?? dict[String(postId)]
        return !!(typeof v === 'object' && v !== null ? ((v as { liked?: unknown; isLiked?: unknown }).liked ?? (v as { isLiked?: unknown }).isLiked) : v)
      }
      return !!data
    } catch { return false }
  },
}
