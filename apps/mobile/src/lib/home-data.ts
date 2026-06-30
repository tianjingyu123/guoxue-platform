/** 首页数据层（1:1 迁移自原型 components/home-feed.tsx + home/home-banner.tsx + common/daily-verse） */

import { apiGet, useMock } from '@/utils/request'

// ============================================
// Banner 轮播数据
// ============================================
export interface BannerItem {
  id: string
  image: string
  title: string
  link: string
}

export const defaultBanners: BannerItem[] = [
  { id: '1', image: '/static/images/banners/banner-1.png', title: '八字命理入门精讲 限时优惠', link: '/pages/courses/index' },
  { id: '2', image: '/static/images/banners/banner-2.png', title: '大师直播：2024下半年运势解读', link: '/pages/live/index' },
  { id: '3', image: '/static/images/banners/banner-3.png', title: '新人专享 首单立减50元', link: '/pages/mall/index' },
]

// ============================================
// Feed 内容数据（千人千面示例）
// ============================================
export interface FeedItem {
  id: number | string // 原型 mock 用 number；后端真实 feed 是 uuid 字符串
  type: string
  title?: string
  author?: string
  authorAvatar?: string
  cover?: string | null
  coverRatio?: string
  // 各类型扩展字段
  price?: number
  originalPrice?: number
  students?: number
  viewers?: number
  isLive?: boolean
  likes?: number
  comments?: number
  excerpt?: string
  content?: string
  sales?: number
  tag?: string
  readers?: number
  chapters?: number
  duration?: string
  plays?: string
  time?: string
  reservations?: number
  form?: string
  // 诗词
  dynasty?: string
  lines?: string[]
  preview?: string
  tags?: string[]
  // 圈子
  circleName?: string
  isMember?: boolean
  members?: number
  rating?: number
  isVerified?: boolean
  ownerTitle?: string
  todayPosts?: number
  recentJoiners?: string[]
}

export const feedItems: FeedItem[] = [
  { id: 1, type: 'course', title: '八字入门实战课：从零开始学命理', author: '周易大师', authorAvatar: '周', price: 199, originalPrice: 399, students: 2860, cover: '/static/images/feed/course-1.jpg', coverRatio: '3:4' },
  { id: 2, type: 'live', title: '八字看2026下半年运势走向', author: '周易大师', authorAvatar: '周', viewers: 1280, isLive: true, cover: '/static/images/feed/live-1.jpg', coverRatio: '3:4' },
  { id: 3, type: 'article', title: '八字食神制杀格局详解与实例分析', author: '张玄风', authorAvatar: '张', likes: 328, comments: 56, excerpt: '食神制杀是八字中常见的贵格之一，具有文武双全的特点。通过实例来详细分析格局的形成条件和断语要点。', cover: '/static/images/feed/article-1.jpg', coverRatio: '3:4' },
  { id: 4, type: 'product', title: '《渊海子平》精装典藏版', author: '', authorAvatar: '', price: 68, originalPrice: 128, sales: 1280, tag: '热销', cover: '/static/images/feed/product-1.jpg', coverRatio: '3:4' },
  { id: 5, type: 'circle', circleName: '八字研习社', isMember: true, author: '张玄风', authorAvatar: '', content: '每日案例解析，从入门到精通的八字学习社区', members: 12800, likes: 42, comments: 18, cover: '/static/images/feed/circle-1.jpg', coverRatio: '4:3', price: 0, rating: 4.9, tags: ['活跃', '干货多'], isVerified: true, ownerTitle: '资深命理师', todayPosts: 56 },
  { id: 7, type: 'ebook', title: '《滴天髓》白话精解', author: '古籍研究院', authorAvatar: '古', readers: 8560, chapters: 32, price: 68, cover: '/static/images/feed/ebook-1.jpg', coverRatio: '3:4' },
  { id: 8, type: 'live', title: '手把手教你排八字命盘', author: '李命理', authorAvatar: '李', viewers: 856, isLive: true, cover: '/static/images/feed/live-horizontal.jpg', coverRatio: '16:9' },
  { id: 9, type: 'video', title: '3分钟看懂十二地支含义', author: '国学小课堂', authorAvatar: '国', duration: '03:21', plays: '8.5万', likes: 1256, cover: '/static/images/feed/video-1.jpg', coverRatio: '3:4' },
  { id: 10, type: 'article', title: '从易经看人生的三个重要阶段', author: '国学研究院', authorAvatar: '国', likes: 425, comments: 78, excerpt: '易经告诉我们，人生可分为三个重要阶段：少年为乾，壮年为坤，晚年为泰。理解这些帮助把握人生节奏。', cover: '/static/images/feed/live-horizontal.jpg', coverRatio: '16:9' },
  { id: 11, type: 'course', title: '紫微斗数命盘解读进阶班', author: '张玄风', authorAvatar: '张', price: 299, originalPrice: 599, students: 1560, cover: '/static/images/feed/course-2.jpg', coverRatio: '3:4' },
  { id: 12, type: 'article', title: '为什么八字中财星不一定代表有钱', author: '命理研究院', authorAvatar: '命', likes: 856, comments: 124, excerpt: '很多人一看到八字中有财星就觉得会发财，但财星代表的是你能掌控的资源和机会，而非直接金钱收入。今天深入分析财星的真正含义和应用方法。', cover: null },
  { id: 13, type: 'product', title: '专业堪舆罗盘套装', author: '', authorAvatar: '', price: 298, originalPrice: 498, sales: 860, tag: '新品', cover: '/static/images/feed/product-2.jpg', coverRatio: '3:4' },
  { id: 14, type: 'video', title: '五行相生相克的本质原理详解', author: '易学研究', authorAvatar: '易', duration: '08:42', plays: '3.2万', likes: 1890, cover: '/static/images/feed/live-horizontal.jpg', coverRatio: '16:9' },
  { id: 15, type: 'circle', circleName: '六爻预测实战', isMember: false, author: '六爻居士', authorAvatar: '', content: '铜钱起卦、断卦技法，实战案例每日更新', members: 3280, likes: 35, comments: 22, cover: '/static/images/feed/circle-1.jpg', coverRatio: '4:3', price: 58, rating: 4.7, tags: ['进阶', '实战派'], isVerified: true, ownerTitle: '六爻研究者', todayPosts: 28 },
  { id: 16, type: 'post', title: '请教：甲木日主酉月身弱如何调整', author: '易学新人', authorAvatar: '易', likes: 42, comments: 28, content: '我的八字甲木日主，生在酉月，地支有申酉戌三会金局，这样的命局是不是身弱财旺？应该怎么调整？求各位老师指点！', cover: null },
  { id: 17, type: 'article', title: '梅花易数预测实例深度分析', author: '梅花居士', authorAvatar: '梅', likes: 312, comments: 45, excerpt: '梅花易数以简洁著称，但其中蕴含的道理极为深刻。通过这个预测实例看看如何运用时间起卦法进行日常占断。', cover: '/static/images/feed/article-1.jpg', coverRatio: '3:4' },
  { id: 18, type: 'course', title: '风水堪舆入门精讲', author: '陈风水', authorAvatar: '陈', price: 168, originalPrice: 299, students: 980, cover: '/static/images/feed/course-3.jpg', coverRatio: '3:4' },
  { id: 19, type: 'live', title: '紫微斗数十二宫位详解直播', author: '紫微大师', authorAvatar: '紫', time: '明天19:30', reservations: 520, isLive: false, cover: '/static/images/feed/live-horizontal.jpg', coverRatio: '16:9' },
  { id: 20, type: 'product', title: '开运水晶手链套装', author: '', authorAvatar: '', price: 158, originalPrice: 258, sales: 2680, tag: '秒杀', cover: '/static/images/feed/product-3.jpg', coverRatio: '3:4' },
  { id: 21, type: 'ebook', title: '《穷通宝鉴》注解版', author: '命理古籍馆', authorAvatar: '命', readers: 5280, chapters: 24, price: 0, cover: '/static/images/feed/ebook-2.jpg', coverRatio: '3:4' },
  { id: 22, type: 'article', title: '如何通过八字看适合的职业方向', author: '职业规划师', authorAvatar: '职', likes: 568, comments: 89, excerpt: '八字中的十神代表了不同的社会角色和性格特点，分析日主旺衰找到最适合的职业发展方向。', cover: '/static/images/feed/live-horizontal.jpg', coverRatio: '16:9' },
  { id: 23, type: 'course', title: '奇门遁甲零基础入门精讲', author: '奇门研究院', authorAvatar: '奇', price: 399, originalPrice: 799, students: 1680, cover: '/static/images/feed/live-horizontal.jpg', coverRatio: '16:9' },
  { id: 24, type: 'video', title: '天干地支快速记忆法', author: '玄学日历', authorAvatar: '玄', duration: '02:15', plays: '1.2万', likes: 2560, cover: '/static/images/feed/video-1.jpg', coverRatio: '3:4' },
  { id: 25, type: 'poem_daily', title: '静夜思', author: '李白', authorAvatar: '李', dynasty: '唐', form: '五言绝句', lines: ['床前明月光，', '疑是地上霜。', '举头望明月，', '低头思故乡。'], tags: ['思乡', '月亮'], likes: 12800, cover: null },
  { id: 26, type: 'poem', title: '水调歌头', author: '苏轼', authorAvatar: '苏', dynasty: '宋', form: '词', preview: '明月几时有，把酒问青天，不知天上宫阙，今夕是何年。', tags: ['中秋'], likes: 11200, cover: null },
]

// ============================================
// 智能体数据 + 颜色主题
// ============================================
export interface AgentItem {
  id: number
  name: string
  desc: string
  intro: string
  type: string
  avatar?: string
  online?: boolean
  users: string
  isHot?: boolean
}

export const agents: AgentItem[] = [
  { id: 1, name: '八字大师', desc: '精准解读四柱八字', intro: '一键生成专业命理分析报告', type: 'bazi', avatar: '', online: true, users: '12.8万', isHot: true },
  { id: 2, name: '紫微顾问', desc: '紫微斗数命盘分析', intro: 'AI解读十二宫位运势密码', type: 'ziwei', avatar: '', online: true, users: '8.5万', isHot: true },
  { id: 3, name: '风水先生', desc: '居家办公风水布局', intro: '上传户型图一键诊断吉凶', type: 'fengshui', avatar: '', online: true, users: '6.2万', isHot: false },
  { id: 4, name: '起名助手', desc: '姓名五行吉凶分析', intro: '输入生辰智能推荐好名', type: 'naming', avatar: '', online: true, users: '9.8万', isHot: false },
]

// type → 渐变class + 降级图标名(lucide/工具图标) + 强调色
export const agentThemes: Record<string, { gradientClass: string; icon: string; accentHex: string }> = {
  bazi: { gradientClass: 'agent-gradient-warm', icon: 'layout-grid', accentHex: '#E8A44A' },
  ziwei: { gradientClass: 'agent-gradient-cool', icon: 'star', accentHex: '#7B9ED9' },
  fengshui: { gradientClass: 'agent-gradient-earth', icon: 'wind', accentHex: '#6BAF8A' },
  naming: { gradientClass: 'agent-gradient-sky', icon: 'zap', accentHex: '#5BA8C8' },
  general: { gradientClass: 'agent-gradient-warm', icon: 'bot', accentHex: '#C9A96E' },
}

// ============================================
// 类型角标配置（label + 背景rgba，复刻原型 /90 透明度）
// ============================================
export const typeConfig: Record<string, { label: string; bg: string }> = {
  live: { label: '直播', bg: 'rgba(196,30,58,0.9)' },
  article: { label: '文章', bg: 'rgba(107,91,158,0.9)' },
  post: { label: '帖子', bg: 'rgba(61,122,92,0.9)' },
  course: { label: '课程', bg: 'rgba(160,98,26,0.9)' },
  product: { label: '好物', bg: 'rgba(139,46,46,0.9)' },
  video: { label: '视频', bg: 'rgba(30,90,138,0.9)' },
  circle: { label: '圈子', bg: 'rgba(90,62,107,0.9)' },
  ebook: { label: '电子书', bg: 'rgba(46,107,138,0.9)' },
  poem: { label: '诗词', bg: 'rgba(122,90,32,0.9)' },
  poem_daily: { label: '每日一首', bg: 'rgba(122,90,32,0.9)' },
}

// 封面比例 → aspect ratio 数值字符串（用于 image 容器 padding-top / aspect-ratio）
export function coverAspect(ratio?: string): string {
  if (ratio === '16:9') return '16 / 9'
  if (ratio === '4:3') return '4 / 3'
  if (ratio === '1:1') return '1 / 1'
  return '3 / 4'
}

export function formatLikes(n?: number): string {
  const v = n ?? 0
  return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(v)
}

export function formatCount(n?: number): string {
  const v = n ?? 0
  return v >= 10000 ? (v / 10000).toFixed(1) + '万' : v.toLocaleString()
}

// ============================================
// 营销卡轮播数据
// ============================================
export interface MarketingBanner {
  label: string
  title: string
  subtitle: string
  href: string
  bgFrom: string
  bgTo: string
  accent: string
}

export const marketingBanners: MarketingBanner[] = [
  { label: '限时优惠', title: '新人专属 · 首月免费', subtitle: '加入圈子，与万名命理爱好者共同成长', href: '/pages/circles/index', bgFrom: '#C41E3A', bgTo: '#8B1228', accent: 'rgba(255,220,180,0.95)' },
  { label: '精品课程', title: '八字精研班 · 开课倒计时', subtitle: '名师带教，系统掌握四柱命理核心', href: '/pages/courses/index', bgFrom: '#7B4F12', bgTo: '#4A2E08', accent: 'rgba(255,210,130,0.95)' },
  { label: '线下活动', title: '研学营 · 实地勘察风水', subtitle: '理论结合实践，深度感受山川气场', href: '/pages/discover/index', bgFrom: '#1A4A2E', bgTo: '#0D2E1A', accent: 'rgba(180,230,180,0.95)' },
]

// ============================================
// 今日小语（峰值时刻 2.1，迁移自 lib/data/daily-verse）
// ============================================
export interface DailyVerseData {
  text: string
  source: string
  solarTerm?: string
}

const VERSES: DailyVerseData[] = [
  { text: '天行健，君子以自强不息', source: '《周易·乾卦》' },
  { text: '上善若水，水善利万物而不争', source: '《道德经》' },
  { text: '学而时习之，不亦说乎', source: '《论语·学而》' },
  { text: '博学之，审问之，慎思之，明辨之，笃行之', source: '《中庸》' },
  { text: '工欲善其事，必先利其器', source: '《论语·卫灵公》' },
  { text: '千里之行，始于足下', source: '《道德经》' },
  { text: '知人者智，自知者明', source: '《道德经》' },
]

const SOLAR_TERMS = ['立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒']

export function getTodayVerse(date = new Date()): DailyVerseData {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000)
  const verse = VERSES[dayOfYear % VERSES.length]
  const termIndex = Math.floor(((date.getMonth() * 31 + date.getDate()) / 366) * 24) % 24
  return { ...verse, solarTerm: `今日${SOLAR_TERMS[termIndex]}` }
}

// ============================================
// 构建瀑布流：原型 buildItems —— 32位，每12位插智能体，其余顺序填 feed
// 返回扁平 render 列表，页面按奇偶分两列（等效 react-masonry-css 轮询分列）
// ============================================
export type RenderItem =
  | { kind: 'feed'; key: string; item: FeedItem }
  | { kind: 'agent'; key: string; agent: AgentItem }

/** 把 feed 列表编排成 render 列表：顺序填 feed，从 pos>0 起每 12 位插一张智能体卡。 */
export function buildRenderItems(items: FeedItem[]): RenderItem[] {
  const result: RenderItem[] = []
  let feedIdx = 0
  let agentIdx = 0
  let pos = 0
  while (feedIdx < items.length) {
    if (pos > 0 && pos % 12 === 0 && agentIdx < agents.length) {
      result.push({ kind: 'agent', key: `agent-${agents[agentIdx].id}`, agent: agents[agentIdx] })
      agentIdx++
      pos++
      continue
    }
    const item = items[feedIdx]
    result.push({ kind: 'feed', key: `feed-${item.id}`, item })
    feedIdx++
    pos++
  }
  return result
}

export function buildFeedItems(): RenderItem[] {
  return buildRenderItems(feedItems.slice(0, 26))
}

// ============ 后端 feed 适配 ============
// 后端 GET /home 的 feed 项是扁平结构 { id(uuid), type, title, cover, excerpt, createdAt, tag, ... }，
// 与前端 RenderItem 联合类型不匹配，需在此映射成 { kind:'feed', key, item:FeedItem }。

export interface ApiFeedItem {
  id: string
  type: string
  title?: string
  cover?: string | null
  excerpt?: string
  createdAt?: string
  tag?: string
  [k: string]: unknown
}

/** 后端扁平 feed 项 → 前端 FeedItem。透传后端已有字段（将来后端补 author/likes/price 等自动生效）。 */
export function adaptFeedItem(f: ApiFeedItem): FeedItem {
  return {
    ...(f as Record<string, unknown>),
    id: f.id,
    type: f.type,
    title: f.title,
    cover: f.cover ?? null,
    excerpt: f.excerpt,
  } as FeedItem
}

// ============ API 层 ============

/** 后端 GET /home 原始响应（容错适配用，字段宽松全 optional，仅声明 adapter 实际访问到的字段） */
interface RawHomeResponse {
  banners?: BannerItem[]
  feed?: ApiFeedItem[]
}

export const homeApi = {
  /** 获取首页数据 — GET /home（后端返回 {banners,feed,...}，feed 为扁平项，需适配） */
  async getHome(): Promise<{ banners: BannerItem[]; feed: RenderItem[] }> {
    try {
      const data = await apiGet<RawHomeResponse>('/home')
      const banners: BannerItem[] =
        Array.isArray(data?.banners) && data.banners.length ? data.banners : defaultBanners
      const rawFeed: ApiFeedItem[] = Array.isArray(data?.feed) ? data.feed : []
      const feed = rawFeed.length
        ? buildRenderItems(rawFeed.map(adaptFeedItem))
        : buildFeedItems()
      return { banners, feed }
    } catch {
      return { banners: defaultBanners, feed: buildFeedItems() }
    }
  },
}
