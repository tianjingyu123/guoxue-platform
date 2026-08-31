/**
 * 分享海报数据层
 *
 * 🔴 2026-07-14 真连改造：原 getPosterData() 忽略 targetId、直接返回写死的 MOCK_POSTER ——
 *    不管分享哪个圈子/哪篇文章，海报永远显示「周易研习社 · 张明远 · 已有12,800位同好」，
 *    二维码还是一张扫不出来的静态占位图。**用户发一次朋友圈就是一次对外事故**（传播错误信息 + 死码）。
 *    现改为按 type 真连各自的详情端点，并生成指向真实内容的分享链接（二维码由页面用
 *    utils/qrcode 的 drawQrToCanvas 现画，不再用静态图）。
 */
import { BRAND } from '@/lib/brand'
import { circleDetailApi } from '@/lib/circle-detail-data'
import { articleApi } from '@/lib/article-data'
import { liveApi } from '@/lib/live-data'
import { shopApi } from '@/lib/shop-data'
import { courseApi } from '@/lib/course-data'
import { classicsApi } from '@/lib/classics-data'
import { videoApi } from '@/lib/video-data'
import { apiGet } from '@/utils/request'
import { getStorage } from '@/utils/storage'
import { formatPrice } from '@/utils/format'
import { buildH5Url } from '@/utils/share'

export type PosterType = 'invite' | 'circle' | 'post' | 'article' | 'video' | 'live' | 'product' | 'course' | 'classic'

export interface PosterData {
  type: PosterType
  title: string
  subtitle: string
  desc: string
  author: string
  authorAvatar: string
  /** 静态兜底图（仅 invite 无链接时用）。真二维码由页面按 link 现画 */
  qrcode: string
  qrLabel: string
  tag: string
  /** 二维码承载的真实分享链接（扫码直达该内容）。空则不画码 */
  link: string
}

/** 拼真实 H5 分享链接（生产 H5 是 history 模式，无 # 前缀） */
function h5Link(path: string): string {
  return buildH5Url(path)
}

/** 富文本/长文取摘要（海报 desc 位有限） */
function excerpt(html: string, max = 54): string {
  const text = (html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  return text.length > max ? text.slice(0, max) + '…' : text
}

export interface PosterTheme {
  id: string
  name: string
  bg: string // 卡片主背景色
  gold: string // 金色/高亮文字
  ink: string // 主文字色
  sub: string // 次要文字色
  accent: string // 装饰线/标签色
  headerStyle: 'dark' | 'light'
}

// 国学风海报主题（原型 POSTER_THEMES）
export const POSTER_THEMES: PosterTheme[] = [
  {
    id: 'classic-gold',
    name: '经典金',
    bg: '#1c1714',
    gold: '#d4af37',
    ink: '#f5efe6',
    sub: '#bdae97',
    accent: '#d4af37',
    headerStyle: 'dark',
  },
  {
    id: 'ink-wash',
    name: '水墨',
    bg: '#f5f2ea',
    gold: '#8a6d3b',
    ink: '#2c2c2c',
    sub: '#6b6258',
    accent: '#3a3a3a',
    headerStyle: 'light',
  },
  {
    id: 'cinnabar',
    name: '朱砂',
    bg: '#7a1f1a',
    gold: '#f0d9a8',
    ink: '#fdf6ec',
    sub: '#e6c9b8',
    accent: '#f0d9a8',
    headerStyle: 'dark',
  },
  {
    id: 'celadon',
    name: '青瓷',
    bg: '#e8efe9',
    gold: '#3f6b5a',
    ink: '#26352e',
    sub: '#5c7468',
    accent: '#3f6b5a',
    headerStyle: 'light',
  },
]

// 分享文案风格（原型 SHARE_TONES：文化感、非诱导式）
export interface ShareTone {
  tone: string
  label: string
  build: (title: string) => string
}

export const SHARE_TONES: ShareTone[] = [
  {
    tone: 'elegant',
    label: '雅致',
    build: (t) => `观「${t}」有感，与君共参玄机，静待有缘人。`,
  },
  {
    tone: 'sincere',
    label: '诚挚',
    build: (t) => `偶得「${t}」，受益良多，愿与同好之人一同精进。`,
  },
  {
    tone: 'inspiring',
    label: '启发',
    build: (t) => `天地之道，藏于细微。一篇「${t}」，或可点亮心中所惑。`,
  },
]

const TYPE_TITLE: Record<PosterType, string> = {
  invite: '邀请好友',
  circle: '分享圈子',
  post: '分享动态',
  article: '分享文章',
  video: '分享视频',
  live: '分享直播',
  product: '分享商品',
  course: '分享课程',
  classic: '分享古籍',
}

export function getPosterTypeTitle(type: PosterType): string {
  return TYPE_TITLE[type] || '分享海报'
}

export interface PosterRes {
  code: number
  data: PosterData | null
}

/** 帖子详情（海报用·后端 GET /circles/:circleId/posts/:postId） */
interface RawPostForPoster {
  id?: string
  title?: string
  content?: string
  author?: { nickname?: string; avatar?: string } | null
  circle?: { id?: string; name?: string } | null
}

/**
 * 真连海报数据。
 * @param targetId 内容 id（uuid 字符串 —— 注意不是 number，圈子/文章 id 都是 uuid）
 * @param circleId 仅 type=post 需要（后端帖子详情端点要 circleId + postId 两个参数）
 * 任一步失败上抛，由页面走错误态 —— 绝不回退成假数据（错误的海报会被发到朋友圈）。
 */
export async function getPosterData(type: PosterType, targetId?: string, circleId?: string): Promise<PosterRes> {
  // 邀请海报：平台自我介绍，本就是静态品牌文案（非假数据）；链接指向平台首页
  if (type === 'invite' || !targetId) {
    const me = getStorage<{ nickname?: string; avatar?: string }>('userInfo')
    return {
      code: 200,
      data: {
        type: 'invite',
        title: BRAND.name,
        subtitle: BRAND.slogan || '观天之道，执天之行',
        desc: '汇聚易学、命理文化、堪舆名师，与万千同好一同探寻传统智慧。',
        author: me?.nickname || '',
        authorAvatar: me?.avatar || '',
        qrcode: '',
        qrLabel: `长按识别，加入${BRAND.nameShort}`,
        tag: '邀请函',
        link: h5Link('pages/index/index'),
      },
    }
  }

  if (type === 'circle') {
    const c = await circleDetailApi.detail(targetId)
    return {
      code: 200,
      data: {
        type: 'circle',
        title: c.name,
        subtitle: c.category || '',
        desc: excerpt(c.description),
        author: c.owner?.name || '',
        authorAvatar: c.owner?.avatar || '',
        qrcode: '',
        qrLabel: '长按识别，加入圈子',
        tag: '圈子',
        link: h5Link(`pkg-circle/circles/detail?id=${targetId}`),
      },
    }
  }

  if (type === 'article') {
    const a = await articleApi.detail(targetId)
    return {
      code: 200,
      data: {
        type: 'article',
        title: a.title,
        subtitle: (a.tags && a.tags[0]) || '',
        desc: excerpt(a.content),
        author: a.author?.name || '',
        authorAvatar: a.author?.avatar || '',
        qrcode: '',
        qrLabel: '长按识别，阅读全文',
        tag: '文章',
        link: h5Link(`pkg-circle/articles/detail?id=${targetId}`),
      },
    }
  }

  if (type === 'video') {
    const v = await videoApi.getById(targetId)
    if (!v) throw new Error('视频不存在或已下架')
    return {
      code: 200,
      data: {
        type: 'video',
        title: v.title,
        subtitle: v.circle?.name || '精选短视频',
        desc: v.author?.name ? `${v.author.name} 分享的精彩视频` : '',
        author: v.author?.name || '',
        authorAvatar: v.author?.avatar || '',
        qrcode: '',
        qrLabel: '长按识别，观看视频',
        tag: '视频',
        link: h5Link(`pkg-video/detail/index?id=${targetId}`),
      },
    }
  }

  if (type === 'post') {
    // 帖子详情端点需要 circleId；调用方（circles/post.vue）已带上
    const p = await apiGet<RawPostForPoster>(`/circles/${circleId}/posts/${targetId}`)
    return {
      code: 200,
      data: {
        type: 'post',
        title: p?.title || excerpt(p?.content || '', 20) || '圈内动态',
        subtitle: p?.circle?.name || '',
        desc: excerpt(p?.content || ''),
        author: p?.author?.nickname || '',
        authorAvatar: p?.author?.avatar || '',
        qrcode: '',
        qrLabel: '长按识别，查看全文',
        tag: '动态',
        link: h5Link(`pkg-circle/circles/post?id=${targetId}&circleId=${circleId || ''}`),
      },
    }
  }

  if (type === 'product') {
    const p = await shopApi.getProduct(targetId)
    return {
      code: 200,
      data: {
        type: 'product',
        title: p.title,
        subtitle: `¥${formatPrice(p.price)}`,
        desc: p.subtitle || excerpt(p.description),
        author: p.merchant?.shopName || BRAND.name,
        authorAvatar: p.merchant?.shopLogo || '',
        qrcode: '',
        qrLabel: '长按识别，查看商品',
        tag: '商品',
        link: h5Link(`pkg-mall/product/detail?id=${targetId}`),
      },
    }
  }

  if (type === 'course') {
    const c = await courseApi.getDetail(targetId)
    return {
      code: 200,
      data: {
        type: 'course',
        title: c.title,
        subtitle: c.isFree ? '免费课程' : `¥${formatPrice(c.price)}`,
        desc: excerpt(c.description),
        author: c.instructor?.name || '',
        authorAvatar: c.instructor?.avatar || '',
        qrcode: '',
        qrLabel: '长按识别，查看课程',
        tag: '课程',
        link: h5Link(`pkg-course/detail/index?id=${targetId}`),
      },
    }
  }

  if (type === 'classic') {
    const result = await classicsApi.detail(targetId)
    const b = result.book
    if (!b) throw new Error('古籍内容不存在或已下架')
    return {
      code: 200,
      data: {
        type: 'classic',
        title: b.title,
        subtitle: [b.dynasty, b.author].filter(Boolean).join(' · '),
        desc: excerpt(b.aiSummary || `${b.totalChapters} 篇章节，支持原文阅读与 AI 智能伴读。`),
        author: b.author || '',
        authorAvatar: '',
        qrcode: '',
        qrLabel: '长按识别，打开古籍',
        tag: '古籍',
        link: h5Link(`pkg-classics/detail/index?id=${targetId}`),
      },
    }
  }

  if (type === 'live') {
    // live —— 后端 LiveItem 无简介字段，不编（数据流铁律），desc 只陈述真实信息
    const r = await liveApi.getWatch(targetId)
    return {
      code: 200,
      data: {
        type: 'live',
        title: r?.title || '直播',
        subtitle: '名师直播 · 在线互动',
        desc: r?.hostName ? `${r.hostName} 主讲，实时互动答疑。` : '',
        author: r?.hostName || '',
        authorAvatar: r?.hostAvatar || '',
        qrcode: '',
        qrLabel: '长按识别，进入直播',
        tag: '直播',
        link: h5Link(`pkg-live/watch/index?id=${targetId}`),
      },
    }
  }

  /* 🔴 原来这里是「未匹配一律按直播兜底」—— openPoster('product'/'course') 传进来的新类型
   * 全被画成直播海报（标题/主播/二维码全指向别人的直播间），用户发出去就是对外事故。
   * 未支持类型必须显式报错，由页面走错误态，绝不生成张冠李戴的海报。 */
  throw new Error('暂不支持该内容的分享海报')
}

export function recordPosterShare(_type: PosterType, _targetId: string | undefined, _action: string): Promise<{ code: number }> {
  return Promise.resolve({ code: 200 })
}
