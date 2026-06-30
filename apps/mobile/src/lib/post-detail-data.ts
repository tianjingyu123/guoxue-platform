/**
 * 帖子详情页数据 + API
 * 真连后端 GET /circles/:id/posts/:postId + GET /comment?targetType=POST。
 * 富页面字段（音频/打赏/作者等级粉丝/阅读量/收藏/分享）后端无 → 适配为空，页面对应板块降级隐藏。
 */
import { apiGet, apiPost } from '@/utils/request'

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

export interface PostDetail {
  id: string
  type: 'normal' | 'article' | 'audio' | 'qa'
  circleId: string
  circleName: string
  title: string
  content: string
  images?: PostImage[]
  audio?: PostAudio
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

export const postDetail: PostDetail = {
  id: '1',
  type: 'article',
  circleId: '1',
  circleName: '八字命理研习社',
  title: '八字命理中的十神关系详解 - 正财与偏财的本质区别',
  content: `
在八字命理学中，十神是分析命局的核心概念之一。今天我们重点探讨**正财**与**偏财**的区别，这对于理解一个人的财运特质至关重要。

## 一、正财的定义与特性

正财，是指日干所克之物，且阴阳相异者。比如甲木日主见己土、乙木日主见戊土，这都是正财。

**正财的核心特质：**
1. 代表正当、稳定的收入来源
2. 体现务实、保守的理财观念
3. 象征妻财（男命）、俸禄、工薪
4. 为人勤俭、重视积累

> 《滴天髓》云："财为养命之源，不可无，亦不可过旺。"

## 二、偏财的定义与特性

偏财，同样是日干所克之物，但阴阳相同。如甲木日主见戊土、乙木日主见己土。

**偏财的核心特质：**
1. 代表意外之财、投机收入
2. 体现慷慨、大方的用财态度
3. 象征父亲、情人（男命）、横财
4. 为人豪爽、不拘小节

## 三、实战案例分析

让我们看一个具体的八字案例：

**八字：甲子、丙寅、戊辰、壬戌**

此八字日主戊土，生于寅月木旺之时。年干甲木、月令寅木均为七杀（偏官），时干壬水为偏财。

从财运角度分析：
- 时柱见偏财壬水，主中晚年财运较好
- 偏财坐戌土（日主之根），财有根基
- 但财星被年月木克，需注意投资风险

## 四、总结与建议

正财与偏财各有特点，在实际批命中需要结合整体格局来判断。

**实践建议：**
- 正财旺者适合稳定职业，如公务员、企业职员
- 偏财旺者可尝试投资理财，但需控制风险
- 财星太弱需补财运，可从方位、颜色等方面调理

---

*本文为原创内容，欢迎讨论交流。如需转载请注明出处。*
  `,
  images: [
    { url: 'https://picsum.photos/800/400?random=101', caption: '图1：十神关系图解' },
    { url: 'https://picsum.photos/800/400?random=102', caption: '图2：八字排盘示例' },
  ],
  audio: {
    url: '/audio/lesson-01.mp3',
    duration: 856,
    title: '音频讲解版',
  },
  author: {
    id: '1',
    name: '周易大师',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=master',
    title: '资深命理师',
    level: 8,
    levelName: '一代宗师',
    isFollowed: false,
    followers: 12800,
    posts: 256,
  },
  createdAt: '2024-01-15 10:30',
  readTime: 8,
  views: 3256,
  likes: 328,
  collects: 156,
  comments: 89,
  shares: 45,
  isLiked: false,
  isCollected: false,
  isPinned: true,
  isEssence: true,
  reward: 128,
  rewardCount: 23,
}

export const comments: Comment[] = [
  {
    id: 'c1',
    content: '老师讲得太好了！正财偏财的区别一直困扰我很久，看完这篇文章豁然开朗。',
    author: { id: 'u1', name: '命理新手', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=u1', level: 3 },
    createdAt: '1小时前',
    likes: 28,
    isLiked: false,
    isPinned: true,
    replies: [
      { id: 'c1-r1', content: '同感！收藏了', author: { id: 'u2', name: '学习中', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=u2' }, createdAt: '45分钟前', likes: 5, isLiked: false },
      { id: 'c1-r2', content: '感谢支持，有问题随时讨论', author: { id: '1', name: '周易大师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=master', title: '作者' }, createdAt: '30分钟前', likes: 12, isLiked: false },
    ],
  },
  {
    id: 'c2',
    content: '请问老师，如果八字中正财偏财都有，而且力量差不多，应该怎么分析呢？',
    author: { id: 'u3', name: '易学爱好者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=u3', level: 4 },
    createdAt: '30分钟前',
    likes: 15,
    isLiked: true,
    replies: [],
  },
]

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

/** 后端 PostType → 前端 type */
function mapPostType(t?: string): PostDetail['type'] {
  const u = String(t || '').toUpperCase()
  if (u === 'ARTICLE') return 'article'
  if (u === 'AUDIO') return 'audio'
  if (u === 'QA' || u === 'QUESTION') return 'qa'
  return 'normal'
}

/** 后端帖子详情 → 前端 PostDetail（后端无的富字段留空，页面隐藏） */
function adaptPostDetail(p: any, commentsCount = 0): PostDetail {
  return {
    id: p.id,
    type: mapPostType(p.type),
    circleId: p.circleId ?? p.circle?.id ?? '',
    circleName: p.circle?.name ?? '',
    title: p.title ?? '',
    content: p.content ?? '',
    images: Array.isArray(p.images) ? p.images.map((u: string) => ({ url: u })) : [],
    audio: undefined, // 后端无音频
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
function adaptReply(r: any): CommentReply {
  return {
    id: r.id,
    content: r.content ?? '',
    author: { id: r.user?.id ?? r.userId ?? '', name: r.user?.nickname ?? '匿名', avatar: r.user?.avatar ?? '' },
    createdAt: relTime(r.createdAt),
    likes: r.likeCount ?? r.likes ?? 0,
    isLiked: false,
  }
}

/** 后端评论 → 前端 Comment */
function adaptComment(c: any): Comment {
  return {
    id: c.id,
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
  /** 帖子详情（含评论数）— GET /circles/:id/posts/:postId + /comment/count */
  getDetail: async (circleId: string, postId: string): Promise<PostDetail> => {
    const [p, cnt] = await Promise.all([
      apiGet<any>(`/circles/${circleId}/posts/${postId}`),
      apiGet<any>(`/comment/count?targetType=POST&targetId=${postId}`).catch(() => 0),
    ])
    const count = typeof cnt === 'number' ? cnt : (cnt?.count ?? 0)
    return adaptPostDetail(p, count)
  },
  /** 帖子评论列表 — GET /comment?targetType=POST&targetId=（无评论时返回 []，页面空态） */
  getComments: async (postId: string): Promise<Comment[]> => {
    try {
      const r = await apiGet<any>(`/comment?targetType=POST&targetId=${postId}`)
      const arr = Array.isArray(r) ? r : (r?.data ?? r?.comments ?? r?.items ?? [])
      return arr.map(adaptComment)
    } catch { return [] }
  },

  // ───────── 互动（写操作，需登录；apiPost 自动加 token + 剥信封） ─────────

  /** 帖子点赞/取消（toggle）— POST /interaction/like */
  toggleLike: (postId: string): Promise<any> =>
    apiPost<any>('/interaction/like', { targetType: 'POST', targetId: postId }),

  /** 帖子收藏/取消（toggle）— POST /interaction/collect */
  toggleCollect: (postId: string): Promise<any> =>
    apiPost<any>('/interaction/collect', { targetType: 'POST', targetId: postId }),

  /** 关注/取消关注作者 — POST /interaction/follow */
  toggleFollow: (userId: string): Promise<any> =>
    apiPost<any>('/interaction/follow', { followedUserId: userId }),

  /** 发评论/回复 — POST /interaction/comment（parentId 用于回复）。读评论仍走 /comment */
  createComment: (postId: string, content: string, parentId?: string): Promise<any> =>
    apiPost<any>('/interaction/comment', {
      targetType: 'POST',
      targetId: postId,
      content,
      ...(parentId ? { parentId } : {}),
    }),

  /** 评论点赞/取消（toggle）— POST /interaction/like，targetType=COMMENT */
  toggleCommentLike: (commentId: string): Promise<any> =>
    apiPost<any>('/interaction/like', { targetType: 'COMMENT', targetId: commentId }),

  /** 检查当前用户对帖子的点赞状态 — GET /interaction/like/check（详情不返回点赞态） */
  checkPostLiked: async (postId: string): Promise<boolean> => {
    try {
      const r = await apiGet<any>(`/interaction/like/check?targetType=POST&targetIds=${postId}`)
      // 后端返回已点赞的 targetId 字符串数组；兼容对象数组 / 字典等其他形态
      const data = r?.data ?? r
      if (Array.isArray(data)) {
        return data.some((x: any) => String(x?.targetId ?? x?.id ?? x) === String(postId))
      }
      if (data && typeof data === 'object') {
        const v = data[postId] ?? data[String(postId)]
        return !!(typeof v === 'object' ? (v?.liked ?? v?.isLiked) : v)
      }
      return !!data
    } catch { return false }
  },
}
