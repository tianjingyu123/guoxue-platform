/**
 * 诗词雅集数据层（真连 /poetry，错误传播走三态，不回退假 mock）
 */
import { apiGet, apiPost, apiDelete } from '@/utils/request'

export interface PoemItem {
  id: string
  title: string
  author: string
  dynasty: string
  form: string
  preview: string
  likes: number
}

export interface PoetItem {
  id: string
  name: string
  dynasty: string
  poemCount: number
  avatar: string
}

export interface TodayPoem {
  id: string
  title: string
  author: string
  dynasty: string
  lines: string[]
  tags: string[]
  likes: number
}

export interface PoemCategory {
  id: string
  name: string
  icon: string
  desc: string
  count: number
  subCategories: string[]
}

export interface CollectionItem {
  id: string
  title: string
  author: string
  authorAvatar: string
  dynasty: string
  excerpt: string
  category: string
  likes: number
  liked: boolean
  collectedAt: string
}

export interface PoemLine {
  line: string
  pinyin: string
}

export interface PoemNote {
  word: string
  note: string
}

export interface AuthorInfo {
  name: string
  dynasty: string
  years: string
  title: string
  intro: string
  poemCount: number
}

export interface RelatedPoem {
  id: string
  title: string
  author: string
  preview: string
}

export interface PoemDetail {
  id: string
  title: string
  author: string
  authorId: string
  dynasty: string
  form: string
  content: PoemLine[]
  appreciation: string
  aiAppreciation: string
  notes: PoemNote[]
  authorInfo: AuthorInfo
  relatedPoems: RelatedPoem[]
  tags: string[]
  likes: number
  collections: number
  isLiked: boolean
  isBookmarked: boolean
}

export interface PoetProfile {
  name: string
  dynasty: string
  years: string
  title: string
  intro: string
  poemCount: number
  totalLikes: number
}

export interface PoetDetail {
  poet: PoetProfile
  poems: PoemItem[]
}

export interface PoemReply {
  id: string
  authorName: string
  authorAvatar: string
  content: string
  time: string
  likeCount: number
  liked: boolean
  replyToName: string
}

export interface PoemComment {
  id: string
  authorId: string
  authorName: string
  authorAvatar: string
  content: string
  time: string
  likeCount: number
  liked: boolean
  mine: boolean
  replies: PoemReply[]
}

// ============================================
// API 层：真连后端 /poetry，错误抛出由页面三态处理
// ============================================

export const poetryApi = {
  /** 首页 — 每日一首 + 热门列表 + 诗人列表 */
  async home(): Promise<{ todayPoem: TodayPoem; poems: PoemItem[]; poets: PoetItem[] }> {
    const data = await apiGet<any>('/poetry/home')
    return {
      todayPoem: data?.todayPoem ?? { id: '', title: '', author: '', dynasty: '', lines: [], tags: [], likes: 0 },
      poems: Array.isArray(data?.poems) ? data.poems : [],
      poets: Array.isArray(data?.poets) ? data.poets : [],
    }
  },

  /** 分类列表 */
  async categories(): Promise<PoemCategory[]> {
    const data = await apiGet<PoemCategory[]>('/poetry/categories')
    return Array.isArray(data) ? data : []
  },

  /** 诗词合集/诗单列表 */
  async collections(): Promise<CollectionItem[]> {
    const data = await apiGet<CollectionItem[]>('/poetry/collections')
    return Array.isArray(data) ? data : []
  },

  /** 诗词详情（登录时附带 isLiked/isBookmarked） */
  async detail(id: string): Promise<{ poem: PoemDetail; translations: string[] }> {
    const data = await apiGet<any>(`/poetry/${id}`)
    return {
      poem: data.poem,
      translations: Array.isArray(data?.translations) ? data.translations : [],
    }
  },

  /** 搜索诗词（标题/作者/正文） */
  async search(keyword: string): Promise<PoemItem[]> {
    const data = await apiGet<PoemItem[]>(`/poetry/search?keyword=${encodeURIComponent(keyword)}`)
    return Array.isArray(data) ? data : []
  },

  /** 诗人详情（按作者聚合作品+小传） */
  async poet(name: string): Promise<PoetDetail> {
    return await apiGet<PoetDetail>(`/poetry/poet/${encodeURIComponent(name)}`)
  },

  /** 点赞/取消点赞诗词（需登录） */
  async toggleLike(id: string): Promise<{ liked: boolean; likes: number }> {
    return await apiPost<{ liked: boolean; likes: number }>(`/poetry/${id}/like`)
  },

  /** 收藏/取消收藏诗词（需登录） */
  async toggleCollect(id: string): Promise<{ collected: boolean; collectCount: number }> {
    return await apiPost<{ collected: boolean; collectCount: number }>(`/poetry/${id}/collect`)
  },

  /** AI 实时深度赏析（需登录），question 留空则整首赏析 */
  async askAI(id: string, question?: string): Promise<{ appreciation: string }> {
    return await apiPost<{ appreciation: string }>(`/poetry/${id}/ai-appreciation`, { question })
  },

  /** 诗词品评列表 */
  async comments(id: string): Promise<PoemComment[]> {
    const data = await apiGet<PoemComment[]>(`/poetry/${id}/comments`)
    return Array.isArray(data) ? data : []
  },

  /** 发表品评/回复（需登录） */
  async addComment(id: string, content: string, parentId?: string): Promise<PoemComment> {
    return await apiPost<PoemComment>(`/poetry/${id}/comments`, { content, parentId })
  },

  /** 删除自己的品评（需登录） */
  async deleteComment(commentId: string): Promise<{ success: boolean }> {
    return await apiDelete<{ success: boolean }>(`/poetry/comments/${commentId}`)
  },

  /** 点赞/取消点赞品评（需登录） */
  async likeComment(commentId: string): Promise<{ liked: boolean; likeCount: number }> {
    return await apiPost<{ liked: boolean; likeCount: number }>(`/poetry/comments/${commentId}/like`)
  },
}
