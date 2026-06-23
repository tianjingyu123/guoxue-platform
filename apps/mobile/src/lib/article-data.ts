/**
 * 文章详情页数据（从原型 app/articles/[id]/page.tsx 1:1 迁移）
 * 内容块模型支持正文内联嵌入推荐卡（圈子/课程/商品/排盘/智能体）
 */
import { apiGet, useMock } from '@/utils/request'

export type EmbedType = 'circle' | 'course' | 'product' | 'paipan' | 'agent'

export type ContentBlock =
  | { type: 'text'; content: string }
  | { type: 'heading'; content: string }
  | { type: 'quote'; content: string }
  | { type: 'list'; items: string[] }
  | { type: 'image'; src: string; caption?: string }
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

// ── API ──
export const articleApi = {
  /** 获取文章列表 GET /articles */
  async getList(params?: Record<string, any>): Promise<ArticleData[]> {
    if (useMock()) return [mockArticle]
    try { return await apiGet<ArticleData[]>('/articles', params) } catch { return [mockArticle] }
  },
  /** 获取文章详情 GET /articles/:id */
  async getDetail(id: string): Promise<ArticleData> {
    if (useMock()) return mockArticle
    try { return await apiGet<ArticleData>(`/articles/${id}`) } catch { return mockArticle }
  },
  /** 获取文章评论 GET /articles/:id/comments */
  async getComments(_id: string): Promise<ArticleComment[]> {
    if (useMock()) return mockComments
    try { return await apiGet<ArticleComment[]>(`/articles/${_id}/comments`) } catch { return mockComments }
  },
}
