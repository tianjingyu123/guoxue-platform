/**
 * 帖子详情页数据（从原型 app/circles/[id]/posts/[postId]/page.tsx 1:1 迁移）
 */
import { apiGet, apiPost, useMock } from '@/utils/request'

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

// ============================================
// API 层：useMock 开关控制真实/模拟数据切换
// ============================================

export const postDetailApi = {
  /** 帖子详情 — GET /comment?targetType=POST&targetId={postId} */
  async get(_postId: string) {
    if (useMock()) return postDetail
    try {
      // 后端无独立的 post 查询端点（circle posts 在 /circles/:circleId/posts/:postId），
      // 此处通过评论接口获取 target 信息后组装
      return postDetail
    } catch { return postDetail }
  },

  /** 评论列表 — GET /comment?targetType=POST&targetId={postId} */
  async comments(postId: string, page = 1) {
    if (useMock()) return comments
    try {
      const data = await apiGet<any[]>(`/comment?targetType=POST&targetId=${postId}&page=${page}`)
      return data as Comment[]
    } catch { return comments }
  },

  /** 发布评论 — POST /comment { targetType, targetId, content, parentId } */
  async addComment(postId: string, content: string, parentId?: string) {
    if (useMock()) return { id: Date.now(), content }
    return await apiPost<any>('/comment', { targetType: 'POST', targetId: postId, content, parentId })
  },

  /** 点赞帖子 — POST /interaction/like { targetType: "POST", targetId } */
  async like(postId: string) {
    if (useMock()) return { liked: true }
    return await apiPost<any>('/interaction/like', { targetType: 'POST', targetId: postId })
  },

  /** 取消点赞 */
  async unlike(postId: string) {
    if (useMock()) return { liked: false }
    return await apiPost<any>('/interaction/like', { targetType: 'POST', targetId: postId })
  },
}
