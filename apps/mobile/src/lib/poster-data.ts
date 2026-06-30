// 分享海报数据层（迁移自原型 lib/types/poster + lib/poster/templates + lib/brand + lib/api/poster）
// @data-needs: 海报数据, 参数 type(invite|circle|post|article|live) + targetId, 返回 PosterData

export type PosterType = 'invite' | 'circle' | 'post' | 'article' | 'live'

export interface PosterData {
  type: PosterType
  title: string
  subtitle: string
  desc: string
  author: string
  authorAvatar: string
  qrcode: string
  qrLabel: string
  tag: string
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
  live: '分享直播',
}

export function getPosterTypeTitle(type: PosterType): string {
  return TYPE_TITLE[type] || '分享海报'
}

// mock 海报内容
const MOCK_POSTER: Record<PosterType, PosterData> = {
  invite: {
    type: 'invite',
    title: '热卜国学',
    subtitle: '观天之道，执天之行',
    desc: '汇聚易学、命理、风水名师，与万千同好一同探寻传统智慧。',
    author: '张明远',
    authorAvatar: '/static/images/circles/circle-1.jpg',
    qrcode: '/static/images/poster-qrcode.webp',
    qrLabel: '长按识别，加入热卜',
    tag: '邀请函',
  },
  circle: {
    type: 'circle',
    title: '周易研习社',
    subtitle: '群贤毕至，共参易理',
    desc: '一个专注《周易》六十四卦研习的圈子，已有 12,800 位同好相聚于此。',
    author: '张明远',
    authorAvatar: '/static/images/circles/circle-1.jpg',
    qrcode: '/static/images/poster-qrcode.webp',
    qrLabel: '长按识别，加入圈子',
    tag: '圈子',
  },
  post: {
    type: 'post',
    title: '五行调和与日常养生',
    subtitle: '顺四时而适寒暑',
    desc: '从五行生克之理出发，谈谈起居饮食中的养生智慧，愿与诸位共参。',
    author: '清风道长',
    authorAvatar: '/static/images/circles/circle-2.jpg',
    qrcode: '/static/images/poster-qrcode.webp',
    qrLabel: '长按识别，查看全文',
    tag: '动态',
  },
  article: {
    type: 'article',
    title: '紫微斗数命盘入门',
    subtitle: '星耀十二宫，命运一图明',
    desc: '系统梳理紫微斗数的排盘方法与十二宫含义，适合初学者按图索骥。',
    author: '紫微星君',
    authorAvatar: '/static/images/circles/circle-3.jpg',
    qrcode: '/static/images/poster-qrcode.webp',
    qrLabel: '长按识别，阅读文章',
    tag: '文章',
  },
  live: {
    type: 'live',
    title: '《周易》六十四卦精讲',
    subtitle: '名师直播，在线解卦',
    desc: '张明远老师在线精讲六十四卦，实时互动答疑，错过不再有。',
    author: '张明远',
    authorAvatar: '/static/images/circles/circle-1.jpg',
    qrcode: '/static/images/poster-qrcode.webp',
    qrLabel: '长按识别，进入直播',
    tag: '直播',
  },
}

export interface PosterRes {
  code: number
  data: PosterData | null
}

export function getPosterData(type: PosterType, _targetId?: number): Promise<PosterRes> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ code: 200, data: MOCK_POSTER[type] || MOCK_POSTER.invite })
    }, 400)
  })
}

export function recordPosterShare(_type: PosterType, _targetId: number | undefined, _action: string): Promise<{ code: number }> {
  return Promise.resolve({ code: 200 })
}
