/**
 * 统一讨论 / 评价数据类型（母版系统）
 *
 * 统一原型中分散的三套评论实现（classics/comment-sheet、content/comment-list、
 * course/course-reviews）。一套类型同时支撑「评论」与「带星评价」两种形态，
 * 并定义国风差异化能力：认证标识、精选置顶、划线引用。
 */

// 讨论可挂载的业务场景
export type DiscussionScene =
  | 'classic' // 古籍
  | 'course' // 课程
  | 'article' // 文章
  | 'circle' // 圈子
  | 'product' // 商品
  | 'live' // 直播

// 面板形态：纯评论 / 带星级评价
export type DiscussionMode = 'comment' | 'review'

// 用户认证类型（决定认证标识样式）
export type AuthorBadge =
  | 'none'
  | 'teacher' // 讲师/导师
  | 'official' // 官方
  | 'master' // 名家/认证大师
  | 'vip' // 会员

// 作者信息
export interface DiscussionAuthor {
  id: number | string
  name: string
  avatar?: string
  badge?: AuthorBadge
  /** 等级（如学员等级），可选展示 */
  level?: number
}

// 划线引用（讨论某段原文 / 某节课 / 某章）
export interface DiscussionQuote {
  /** 引用的原文片段 */
  text: string
  /** 来源标签，如「第三章·乾卦」「第 5 节」 */
  source?: string
}

// 一条回复
export interface DiscussionReply {
  id: number | string
  author: DiscussionAuthor
  content: string
  time: string
  likeCount: number
  liked?: boolean
  /** 回复给某人 */
  replyToName?: string
}

// 一条讨论 / 评价
export interface DiscussionItem {
  id: number | string
  author: DiscussionAuthor
  content: string
  time: string
  likeCount: number
  liked?: boolean
  /** 评价模式下的星级 1-5 */
  rating?: number
  /** 精选置顶 */
  featured?: boolean
  /** 划线引用 */
  quote?: DiscussionQuote
  /** 楼中楼回复 */
  replies: DiscussionReply[]
  /** 回复总数（可能多于已加载 replies） */
  replyCount?: number
}

// 面板配置
export interface DiscussionConfig {
  scene: DiscussionScene
  mode: DiscussionMode
  /** 面板标题，如「书友讨论」「学员评价」 */
  title: string
  /** 强调色，默认故宫红；电子书可传蓝、诗词传金 */
  accentColor?: string
  /** 评价模式：平均分 */
  averageRating?: number
  /** 输入框占位文案 */
  placeholder?: string
}

// 列表响应
export interface DiscussionListResponse {
  list: DiscussionItem[]
  total: number
  hasMore: boolean
  averageRating?: number
}
