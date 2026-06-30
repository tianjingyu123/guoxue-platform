import type { DiscussionItem as DiscussionItemType } from './discussion-types'
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/request'

export interface EbookShelfBook {
  id: string
  title: string
  author: string
  coverColor: string
  progress: number
  currentChapter: number
  totalChapters: number
  lastReadAt: string
  isDownloaded: boolean
  category: string
}

/** 电子书书架数据（与原型 app/ebook/bookshelf 一致） */
const _mockEbookShelfBooks: EbookShelfBook[] = [
  {
    id: '1',
    title: '八字命理精解',
    author: '李明华',
    coverColor: '#1e3a5f',
    progress: 45,
    currentChapter: 3,
    totalChapters: 7,
    lastReadAt: '刚刚',
    isDownloaded: true,
    category: '命理',
  },
  {
    id: '5',
    title: '紫微斗数全书',
    author: '紫微居士',
    coverColor: '#1e3a5f',
    progress: 12,
    currentChapter: 1,
    totalChapters: 9,
    lastReadAt: '昨天',
    isDownloaded: false,
    category: '命理',
  },
  {
    id: '3',
    title: '风水学基础教程',
    author: '张天师',
    coverColor: '#4a1942',
    progress: 78,
    currentChapter: 6,
    totalChapters: 8,
    lastReadAt: '3天前',
    isDownloaded: true,
    category: '风水',
  },
  {
    id: '2',
    title: '易经入门与实践',
    author: '王道玄',
    coverColor: '#1a4731',
    progress: 100,
    currentChapter: 5,
    totalChapters: 5,
    lastReadAt: '1周前',
    isDownloaded: false,
    category: '经典',
  },
  {
    id: '4',
    title: '六爻预测学',
    author: '陈易卦',
    coverColor: '#3d1f00',
    progress: 0,
    currentChapter: 0,
    totalChapters: 6,
    lastReadAt: '未读',
    isDownloaded: false,
    category: '术数',
  },
]

export type EbookFilterType = 'all' | 'reading' | 'finished' | 'unread'

export const ebookShelfFilters: { id: EbookFilterType; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'reading', label: '阅读中' },
  { id: 'finished', label: '已读完' },
  { id: 'unread', label: '未读' },
]

// ===================== 电子书城配色 =====================
export type EbookCoverColor = 'blue' | 'green' | 'purple' | 'brown' | 'red' | 'teal'
/** 色名 -> 渐变两端 hex（照抄原型 components/ebook COVER 表） */
export const EBOOK_COVER: Record<EbookCoverColor, { from: string; to: string }> = {
  blue: { from: '#3b6fd4', to: '#27488f' },
  green: { from: '#3f8560', to: '#27543b' },
  purple: { from: '#6d5bb0', to: '#473a85' },
  brown: { from: '#a06a38', to: '#6f4521' },
  red: { from: '#c8324c', to: '#9e1b30' },
  teal: { from: '#2f8a8a', to: '#1d5c5c' },
}
/** 详情页用的十六进制底色 -> 色名（照抄原型 ebookColorFromHex） */
export function ebookColorFromHex(hex?: string): EbookCoverColor {
  switch (hex) {
    case '#1e3a5f': return 'blue'
    case '#1a4731': return 'green'
    case '#4a1942': return 'purple'
    case '#3d1f00': return 'brown'
    default: return 'blue'
  }
}

// ===================== 电子书城首页 ebook/index =====================
export interface EbookStoreBook {
  id: string
  title: string
  author: string
  color: EbookCoverColor
  price: number
  originalPrice: number
  rating: number
  reviewCount: number
  salesCount: number
  category: string
  isHot: boolean
  isNew: boolean
  isMemberFree: boolean
  isFree: boolean
}
const _mockEbookStoreBooks: EbookStoreBook[] = [
  { id: '1', title: '八字命理精解', author: '李明华', color: 'brown', price: 68, originalPrice: 128, rating: 4.8, reviewCount: 2340, salesCount: 12800, category: '命理', isHot: true, isNew: false, isMemberFree: false, isFree: false },
  { id: '2', title: '易经入门与实践', author: '王道玄', color: 'blue', price: 0, originalPrice: 0, rating: 4.9, reviewCount: 5680, salesCount: 45000, category: '经典', isHot: true, isNew: false, isMemberFree: false, isFree: true },
  { id: '3', title: '风水学基础教程', author: '张天师', color: 'green', price: 88, originalPrice: 168, rating: 4.7, reviewCount: 1890, salesCount: 8900, category: '风水', isHot: false, isNew: true, isMemberFree: true, isFree: false },
  { id: '4', title: '六爻预测学完全指南', author: '陈易卦', color: 'red', price: 58, originalPrice: 98, rating: 4.6, reviewCount: 1230, salesCount: 5600, category: '术数', isHot: false, isNew: false, isMemberFree: false, isFree: false },
  { id: '5', title: '紫微斗数全书', author: '紫微居士', color: 'purple', price: 128, originalPrice: 258, rating: 4.9, reviewCount: 3450, salesCount: 18900, category: '命理', isHot: true, isNew: false, isMemberFree: true, isFree: false },
  { id: '6', title: '道德经白话详解', author: '老庄书院', color: 'teal', price: 0, originalPrice: 0, rating: 4.8, reviewCount: 8900, salesCount: 68000, category: '经典', isHot: true, isNew: false, isMemberFree: false, isFree: true },
]
export const ebookStoreCategories = [
  { id: 'all', name: '全部' },
  { id: 'mingli', name: '命理' },
  { id: 'classic', name: '经典' },
  { id: 'fengshui', name: '风水' },
  { id: 'shushu', name: '术数' },
  { id: 'health', name: '养生' },
]
export const ebookStoreSorts = [
  { id: 'hot', name: '热门', icon: 'flame' },
  { id: 'new', name: '最新', icon: 'clock' },
  { id: 'top', name: '好评', icon: 'trending-up' },
]

// ===================== 电子书详情 ebook/[id] =====================
export interface EbookChapter {
  id: string
  title: string
  pageCount: number
  isFree: boolean
}
export interface EbookRelated {
  id: string
  title: string
  author: string
  price: number
  coverColor: string
}
export interface EbookDetail {
  id: string
  title: string
  subtitle: string
  author: string
  authorTitle: string
  coverColor: string
  price: number
  originalPrice: number
  rating: number
  reviewCount: number
  salesCount: number
  wordCount: number
  pageCount: number
  category: string
  isHot: boolean
  isFree: boolean
  isMemberFree: boolean
  hasPreview: boolean
  isPurchased: boolean
  isFavorite: boolean
  description: string
  chapters: EbookChapter[]
  relatedBooks: EbookRelated[]
}
const _mockEbookDetailData: EbookDetail = {
  id: '1',
  title: '八字命理精解',
  subtitle: '从入门到精通的命理学习指南',
  author: '李明华',
  authorTitle: '资深命理师 · 从业22年',
  coverColor: '#1e3a5f',
  price: 68,
  originalPrice: 128,
  rating: 4.8,
  reviewCount: 2340,
  salesCount: 12800,
  wordCount: 186000,
  pageCount: 320,
  category: '命理',
  isHot: true,
  isFree: false,
  isMemberFree: true,
  hasPreview: true,
  isPurchased: false,
  isFavorite: false,
  description: `《八字命理精解》是一本系统讲解八字命理学的专业书籍。本书从基础理论讲起，循序渐进地介绍了天干地支、五行生克、十神定位、大运流年等核心概念。

书中配有大量实例分析，帮助读者理解命理学的实际应用。无论是命理学入门者还是有一定基础的学习者，都能从本书中获得启发。

本书特点：
• 理论与实践相结合
• 大量真实案例分析
• 配套练习题
• 作者答疑互动`,
  chapters: [
    { id: '1', title: '第一章 八字基础概论', pageCount: 28, isFree: true },
    { id: '2', title: '第二章 天干地支详解', pageCount: 35, isFree: true },
    { id: '3', title: '第三章 五行生克制化', pageCount: 42, isFree: false },
    { id: '4', title: '第四章 十神定位与作用', pageCount: 48, isFree: false },
    { id: '5', title: '第五章 格局取用神', pageCount: 38, isFree: false },
    { id: '6', title: '第六章 大运流年断法', pageCount: 52, isFree: false },
    { id: '7', title: '第七章 实例精解', pageCount: 77, isFree: false },
  ],
  relatedBooks: [
    { id: '2', title: '紫微斗数入门', author: '紫微居士', price: 58, coverColor: '#4a1942' },
    { id: '3', title: '六爻预测实战', author: '陈易卦', price: 68, coverColor: '#1a4731' },
    { id: '4', title: '风水学基础', author: '张天师', price: 88, coverColor: '#3d1f00' },
  ],
}
const _mockEbookDiscussions: DiscussionItemType[] = [
  {
    id: 'e1', author: { id: 'u1', name: '易学爱好者' }, time: '3天前', likeCount: 128, liked: false,
    content: '这本书讲解得非常清晰，案例丰富，对于入门者来说是非常好的学习资料。尤其是天干地支那章，配图很到位。',
    replies: [
      { id: 'e1r1', author: { id: 'u2', name: '命理研究生' }, content: '同意，作者功底深厚，深入浅出。', time: '2天前', likeCount: 14 },
      { id: 'e1r2', author: { id: 'u3', name: '初学小王' }, content: '请问需要先看哪本打基础？', time: '2天前', likeCount: 3 },
    ],
  },
  {
    id: 'e2', author: { id: 'u2', name: '命理研究生' }, time: '5天前', likeCount: 89, liked: false,
    content: '第七章的实例分析非常有价值，把前面的理论全部串起来了，反复看了三遍。',
    replies: [],
  },
  {
    id: 'e3', author: { id: 'u4', name: '学习中的小白' }, time: '1周前', likeCount: 45, liked: false,
    content: '内容很好，就是有些地方稍显深奥，需要反复阅读理解。建议配合作者的答疑一起学。',
    replies: [
      { id: 'e3r1', author: { id: 'u1', name: '易学爱好者' }, content: '可以加入读者群，作者会定期答疑。', time: '6天前', likeCount: 7 },
    ],
  },
]

// ===================== 电子书书签 ebook/bookmarks =====================
export interface EbookBookmark {
  id: string
  bookId: string
  bookTitle: string
  bookCoverColor: string
  chapterId: string
  chapterTitle: string
  text: string
  pageNum: number
  createdAt: string
}
const _mockEbookBookmarks: EbookBookmark[] = [
  { id: 'bm1', bookId: '1', bookTitle: '八字命理精解', bookCoverColor: '#1e3a5f', chapterId: '2', chapterTitle: '第二章 天干地支详解', text: '天干共有十个，分别是：甲、乙、丙、丁、戊、己、庚、辛、壬、癸。', pageNum: 45, createdAt: '今天 14:32' },
  { id: 'bm2', bookId: '1', bookTitle: '八字命理精解', bookCoverColor: '#1e3a5f', chapterId: '3', chapterTitle: '第三章 五行生克制化', text: '五行之间存在着相生相克的关系，理解这一原理是学习八字命理的第一步。', pageNum: 78, createdAt: '昨天 09:15' },
  { id: 'bm3', bookId: '3', bookTitle: '风水学基础教程', bookCoverColor: '#4a1942', chapterId: '1', chapterTitle: '第一章 风水学概论', text: '风水学是中国传统文化中的重要组成部分，讲究天地人三才合一。', pageNum: 12, createdAt: '3天前' },
  { id: 'bm4', bookId: '5', bookTitle: '紫微斗数全书', bookCoverColor: '#1e3a5f', chapterId: '2', chapterTitle: '第二章 十四主星详解', text: '紫微星是斗数之首，入命宫主贵气，其人多有才华，气宇不凡。', pageNum: 56, createdAt: '1周前' },
]

// ===================== 电子书笔记&划线 ebook/notes =====================
export type EbookNoteType = 'highlight' | 'note'
export interface EbookNote {
  id: string
  type: EbookNoteType
  bookId: string
  bookTitle: string
  bookCoverColor: string
  chapterId: string
  chapterTitle: string
  selectedText: string
  noteContent?: string
  highlightColor?: string
  createdAt: string
}
const _mockEbookNotes: EbookNote[] = [
  { id: 'n1', type: 'note', bookId: '1', bookTitle: '八字命理精解', bookCoverColor: '#1e3a5f', chapterId: '2', chapterTitle: '第二章 天干地支详解', selectedText: '天干共有十个，分别是：甲、乙、丙、丁、戊、己、庚、辛、壬、癸。', noteContent: '这十个天干需要熟记，并对应五行属性：甲乙木、丙丁火、戊己土、庚辛金、壬癸水', createdAt: '今天 14:32' },
  { id: 'n2', type: 'highlight', bookId: '1', bookTitle: '八字命理精解', bookCoverColor: '#1e3a5f', chapterId: '3', chapterTitle: '第三章 五行生克制化', selectedText: '五行之间存在着相生相克的关系：相生：木生火，火生土，土生金，金生水，水生木', highlightColor: '#fef08a', createdAt: '昨天 09:15' },
  { id: 'n3', type: 'highlight', bookId: '1', bookTitle: '八字命理精解', bookCoverColor: '#1e3a5f', chapterId: '3', chapterTitle: '第三章 五行生克制化', selectedText: '相克：木克土，土克水，水克火，火克金，金克木', highlightColor: '#bbf7d0', createdAt: '昨天 09:18' },
  { id: 'n4', type: 'note', bookId: '3', bookTitle: '风水学基础教程', bookCoverColor: '#4a1942', chapterId: '1', chapterTitle: '第一章 风水学概论', selectedText: '风水学是中国传统文化中的重要组成部分，讲究天地人三才合一。', noteContent: '风水的核心思想：「气」的流动与聚散决定了居住环境的吉凶', createdAt: '3天前' },
]

// ===================== 电子书下单/支付 ebook/checkout =====================
export interface EbookCheckoutBook {
  id: string
  title: string
  author: string
  coverColor: string
  price: number
  originalPrice: number
  isMemberFree: boolean
}
const _mockEbookCheckoutBook: EbookCheckoutBook = {
  id: '1', title: '八字命理精解', author: '李明华', coverColor: '#1e3a5f', price: 68, originalPrice: 128, isMemberFree: true,
}
export interface EbookPayMethod { id: string; label: string; iconColor: string; icon: string }
export const ebookPayMethods: EbookPayMethod[] = [
  { id: 'wechat', label: '微信支付', icon: 'smartphone', iconColor: '#07c160' },
  { id: 'alipay', label: '支付宝', icon: 'wallet', iconColor: '#1677ff' },
  { id: 'unionpay', label: '云闪付', icon: 'landmark', iconColor: '#e60012' },
  { id: 'huifu', label: '汇付天下', icon: 'building-2', iconColor: '#f97316' },
  { id: 'apple', label: 'Apple Pay', icon: 'credit-card', iconColor: '#374151' },
]
const _mockEbookOrderInfo = {
  orderNo: '#EB2024031501', payLabel: '微信支付', amount: 68, payTime: '2024-03-15 14:32',
  successBookTitle: '八字命理精解',
}
const _mockEbookRelatedBuy: EbookRelated[] = [
  { id: '2', title: '紫微斗数入门', author: '紫微居士', price: 58, coverColor: '#1a4731' },
  { id: '3', title: '六爻预测实战', author: '陈易卦', price: 68, coverColor: '#4a1942' },
  { id: '4', title: '风水学基础', author: '张天师', price: 88, coverColor: '#3d1f00' },
]

// ===================== 电子书阅读器 ebook/reader =====================
export interface EbookReaderChapter { id: string; title: string; current: boolean }
const _mockEbookReaderChapter = {
  id: '1',
  bookId: '1',
  title: '第一章 八字基础概论',
  totalChapters: 7,
  currentChapter: 1,
  content: `八字，又称四柱，是中国传统命理学的核心内容。它以一个人出生的年、月、日、时为基础，用天干地支组合成四柱八个字，故称"八字"。

一、什么是八字

八字命理学是一门古老的预测学，通过分析一个人出生时的年、月、日、时所对应的天干地支，来推断其一生的吉凶祸福、性格特点、事业发展等。

在中国传统文化中，八字命理学占有重要地位，它不仅是预测学的一种，更是一种认识自我、了解命运的工具。

二、天干与地支

天干共有十个，分别是：甲、乙、丙、丁、戊、己、庚、辛、壬、癸。

地支共有十二个，分别是：子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥。

天干与地支两两组合，形成六十甲子，循环往复，纪录时间的流逝。

三、五行基础

五行是八字命理学的基础理论，包括：木、火、土、金、水五种元素。

五行之间存在着相生相克的关系：
• 相生：木生火，火生土，土生金，金生水，水生木
• 相克：木克土，土克水，水克火，火克金，金克木

理解五行的生克关系，是学习八字命理的第一步。

四、八字的构成

八字由四柱组成，每柱包含一个天干和一个地支：

年柱：代表祖上、父母宫，也代表1-16岁的运程

月柱：代表父母、兄弟宫，也代表17-32岁的运程

日柱：代表自己和配偶，是八字的核心

时柱：代表子女宫，也代表48岁以后的运程

日干是八字的核心，代表命主本人，又称为"日主"或"日元"。

五、学习建议

学习八字命理需要循序渐进，建议按以下步骤进行：

熟记天干地支及其阴阳属性

理解五行生克制化的原理

掌握十神的定义和作用

学习格局的取用方法

通过实例不断练习

只有打好基础，才能在命理学的道路上走得更远。`,
}
const _mockEbookReaderChapters: EbookReaderChapter[] = [
  { id: '1', title: '第一章 八字基础概论', current: true },
  { id: '2', title: '第二章 天干地支详解', current: false },
  { id: '3', title: '第三章 五行生克制化', current: false },
  { id: '4', title: '第四章 十神定位与作用', current: false },
  { id: '5', title: '第五章 格局取用神', current: false },
  { id: '6', title: '第六章 大运流年断法', current: false },
  { id: '7', title: '第七章 实例精解', current: false },
]
const _mockEbookReaderDiscussions: DiscussionItemType[] = [
  {
    id: 'rc1', author: { id: 'ru1', name: '问道者' }, time: '1天前', likeCount: 42, liked: false,
    content: '天干地支这段讲得太清楚了，六十甲子循环的图配上文字一下就理解了。基础打牢很重要。',
    replies: [
      { id: 'rc1r1', author: { id: 'ru2', name: '五行客' }, content: '相生相克我是这样记的：生我者为印，克我者为官。', time: '20小时前', likeCount: 9 },
    ],
  },
  {
    id: 'rc2', author: { id: 'ru3', name: '青衫' }, time: '2天前', likeCount: 27, liked: false,
    content: '『日干是八字的核心，代表命主本人』这句是关键，后面所有推断都围绕日主展开。',
    replies: [],
  },
  {
    id: 'rc3', author: { id: 'ru4', name: '半卷闲书' }, time: '3天前', likeCount: 15, liked: false,
    content: '请教各位，年柱代表1-16岁运程，那如果年柱受克是不是说明童年运势不佳？',
    replies: [
      { id: 'rc3r1', author: { id: 'ru1', name: '问道者' }, content: '不能单看一柱，要结合整体格局综合判断。', time: '2天前', likeCount: 6 },
    ],
  },
]
/** 阅读器三主题配色（照抄原型 themeConfig） */
export const ebookReaderThemes = {
  light: { bg: '#ffffff', text: '#1f2937', secondary: '#6b7280', surface: '#ffffff', border: '#e5e7eb' },
  sepia: { bg: '#f5f0e5', text: '#5c4a3a', secondary: '#8b7355', surface: '#f5f0e5', border: '#d4c4a8' },
  dark: { bg: '#1a1815', text: '#c5c0b8', secondary: '#7a756d', surface: '#242220', border: '#3d3a37' },
}

// ===================== API 层（真连 /ebook，错误抛出走三态，不回退假 mock）=====================
const _EBOOK_COLOR_NAMES: EbookCoverColor[] = ['blue', 'green', 'purple', 'brown', 'red', 'teal']
/** 后端无封面色字段 → 由 id 稳定派生一个 CoverColor，跨页一致 */
function ebookColorName(seed: string): EbookCoverColor {
  let h = 0
  for (let i = 0; i < (seed || '').length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return _EBOOK_COLOR_NAMES[h % _EBOOK_COLOR_NAMES.length]
}
function ebookColorHex(seed: string): string {
  return EBOOK_COVER[ebookColorName(seed)].from
}

export const ebookApi = {
  /** 分类列表 */
  async categories() {
    const data = await apiGet<any>('/ebook/categories')
    return Array.isArray(data) ? data : []
  },

  /** 电子书城（真连 /ebook/books） */
  async store(opts?: { categoryId?: string; keyword?: string }): Promise<EbookStoreBook[]> {
    const p: string[] = ['pageSize=50']
    if (opts?.categoryId && opts.categoryId !== 'all') p.push(`categoryId=${opts.categoryId}`)
    if (opts?.keyword) p.push(`keyword=${encodeURIComponent(opts.keyword)}`)
    const data = await apiGet<any>(`/ebook/books?${p.join('&')}`)
    const books: any[] = Array.isArray(data?.books) ? data.books : []
    return books.map((b) => ({
      id: b.id, title: b.title, author: b.author || '佚名',
      color: ebookColorName(b.id),
      price: Number(b.price) || 0, originalPrice: Number(b.originalPrice) || 0,
      rating: 4.6 + ((b.id?.charCodeAt(0) || 0) % 4) / 10,
      reviewCount: Math.floor((b.purchaseCount || 0) / 8),
      salesCount: b.purchaseCount || 0,
      category: b.category?.name || b.categoryLevel1 || '',
      isHot: (b.purchaseCount || 0) > 300, isNew: false,
      isMemberFree: !!b.memberFree, isFree: Number(b.price) <= 0,
    }))
  },

  /** 电子书详情（真连 /ebook/books/:id，含 chapters + purchased） */
  async detail(id: string): Promise<{ book: EbookDetail; discussions: DiscussionItemType[] }> {
    const data = await apiGet<any>(`/ebook/books/${id}`)
    const chapters: any[] = Array.isArray(data?.chapters) ? data.chapters : []
    const book: EbookDetail = {
      id: data.id, title: data.title, subtitle: data.category?.name || '',
      author: data.author || '佚名', authorTitle: '',
      coverColor: ebookColorHex(data.id),
      price: Number(data.price) || 0, originalPrice: Number(data.originalPrice) || 0,
      rating: 4.7, reviewCount: 0, salesCount: data.purchaseCount || 0,
      wordCount: 0, pageCount: 0, category: data.category?.name || '',
      isHot: (data.purchaseCount || 0) > 300, isFree: Number(data.price) <= 0,
      isMemberFree: !!data.memberFree, hasPreview: chapters.some((c) => c.freeTrial),
      isPurchased: !!data.purchased, isFavorite: !!data.favorited, description: data.description || '',
      chapters: chapters.map((c) => ({
        id: c.id, title: c.title, pageCount: Math.max(0, (c.pageEnd || 0) - (c.pageStart || 0)), isFree: !!c.freeTrial,
      })),
      relatedBooks: [],
    }
    return { book, discussions: [] }
  },

  /** 我的书架（已购书 + 阅读进度合并，真连 /ebook/purchases + /ebook/my-progress） */
  async bookshelf(): Promise<EbookShelfBook[]> {
    const [data, progData] = await Promise.all([
      apiGet<any>('/ebook/purchases?pageSize=100'),
      apiGet<any>('/ebook/my-progress').catch(() => []),
    ])
    const purchases: any[] = Array.isArray(data?.purchases) ? data.purchases : []
    const progList: any[] = Array.isArray(progData) ? progData : []
    const progMap = new Map<string, any>(progList.map((p) => [p.ebookId, p]))
    return purchases.map((p) => {
      const bookId = p.ebook?.id || p.ebookId
      const prog = progMap.get(bookId)
      return {
        id: bookId, title: p.ebook?.title || '',
        author: p.ebook?.author || '佚名', coverColor: ebookColorHex(bookId),
        progress: prog?.progress || 0,
        currentChapter: prog?.currentChapter || 0,
        totalChapters: p.ebook?.totalChapters || 0,
        lastReadAt: prog?.updatedAt
          ? String(prog.updatedAt).slice(0, 10)
          : typeof p.paidAt === 'string' ? p.paidAt.slice(0, 10) : '',
        isDownloaded: false,
        category: p.ebook?.category?.name || '',
      }
    })
  },

  /** 书签（真连 /ebook/bookmarks） */
  async bookmarks(bookId?: string): Promise<EbookBookmark[]> {
    const data = await apiGet<any>(`/ebook/bookmarks${bookId ? `?ebookId=${bookId}` : ''}`)
    const items: any[] = Array.isArray(data?.bookmarks) ? data.bookmarks : []
    return items.map((b) => ({
      id: b.id, bookId: b.ebookId, bookTitle: b.ebook?.title || '',
      bookCoverColor: ebookColorHex(b.ebookId),
      chapterId: b.chapterId || '', chapterTitle: b.chapter?.title || '',
      text: b.note || '', pageNum: b.page || 0,
      createdAt: typeof b.createdAt === 'string' ? b.createdAt.slice(0, 10) : '',
    }))
  },
  async addBookmark(bookId: string, payload: { chapterId?: string; page: number; note?: string }) {
    return apiPost<any>(`/ebook/bookmarks/${bookId}`, payload)
  },
  async removeBookmark(id: string) {
    return apiDelete<any>(`/ebook/bookmarks/${id}`)
  },

  /** 笔记（真连 /ebook/notes） */
  async notes(bookId?: string): Promise<EbookNote[]> {
    const data = await apiGet<any>(`/ebook/notes${bookId ? `?ebookId=${bookId}` : ''}`)
    const items: any[] = Array.isArray(data?.notes) ? data.notes : []
    return items.map((n) => ({
      id: n.id, type: 'note' as EbookNoteType,
      bookId: n.ebookId, bookTitle: n.ebook?.title || '',
      bookCoverColor: ebookColorHex(n.ebookId),
      chapterId: n.chapterId || '', chapterTitle: n.chapter?.title || '',
      selectedText: '', noteContent: n.content || '',
      createdAt: typeof n.createdAt === 'string' ? n.createdAt.slice(0, 10) : '',
    }))
  },
  async addNote(bookId: string, payload: { chapterId?: string; content: string; page?: number }) {
    return apiPost<any>(`/ebook/notes/${bookId}`, payload)
  },
  async updateNote(id: string, payload: { content?: string }) {
    return apiPut<any>(`/ebook/notes/${id}`, payload)
  },
  async removeNote(id: string) {
    return apiDelete<any>(`/ebook/notes/${id}`)
  },

  /** 结算信息（真连 /ebook/books/:id） */
  async checkoutInfo(id: string): Promise<EbookCheckoutBook> {
    const data = await apiGet<any>(`/ebook/books/${id}`)
    return {
      id: data.id, title: data.title, author: data.author || '佚名',
      coverColor: ebookColorHex(data.id),
      price: Number(data.price) || 0, originalPrice: Number(data.originalPrice) || 0,
      isMemberFree: !!data.memberFree,
    }
  },

  /** 购买（真下单·后端直接记录已购→可读） */
  async purchase(bookId: string) {
    return apiPost<any>(`/ebook/purchase/${bookId}`, {})
  },

  /** 订单/支付成功信息（购买后展示，组合 book + 购买记录） */
  async orderInfo(bookId: string) {
    const [book, purData] = await Promise.all([
      apiGet<any>(`/ebook/books/${bookId}`),
      apiGet<any>('/ebook/purchases?pageSize=100').catch(() => null),
    ])
    const list: any[] = Array.isArray(purData?.purchases) ? purData.purchases : []
    const pur = list.find((p) => (p.ebook?.id || p.ebookId) === bookId)
    return {
      orderNo: pur?.id ? `EB${String(pur.id).slice(0, 10).toUpperCase()}` : '',
      payLabel: '微信支付',
      amount: pur ? Number(pur.amount) : Number(book?.price) || 0,
      payTime: typeof pur?.paidAt === 'string' ? pur.paidAt.slice(0, 16).replace('T', ' ') : '',
      successBookTitle: book?.title || '',
    }
  },

  /** 阅读器章节列表（来自 detail 的 chapters） */
  async readerChapters(bookId: string): Promise<EbookReaderChapter[]> {
    const data = await apiGet<any>(`/ebook/books/${bookId}`)
    const chapters: any[] = Array.isArray(data?.chapters) ? data.chapters : []
    return chapters.map((c) => ({ id: c.id, title: c.title, current: false }))
  },

  /** 阅读器章节内容（真连 /ebook/chapters/:id，需购买/会员或试读章） */
  async readerChapter(_bookId: string, chapterId: string) {
    const data = await apiGet<any>(`/ebook/chapters/${chapterId}`)
    return {
      id: data.id, bookId: data.ebookId, title: data.title,
      totalChapters: 0, currentChapter: 0, content: data.content || '',
    }
  },

  // ── 阅读进度 / AI / 阅读时长 ──
  async getProgress(bookId: string) {
    return apiGet<any>(`/ebook/progress/${bookId}`)
  },
  async saveProgress(bookId: string, payload: { chapterId?: string; progress?: number; currentPage?: number }) {
    return apiPut<any>(`/ebook/progress/${bookId}`, payload)
  },
  /** 段落 AI 翻译（古文→现代/外文） */
  async translate(text: string, targetLang?: string) {
    return apiPost<any>('/ebook/translate', { text, targetLang })
  },
  /** 古文查词 */
  async lookup(word: string) {
    return apiPost<any>('/ebook/lookup', { word })
  },
  async recordSession(bookId: string, duration: number, pages: number) {
    return apiPost<any>('/ebook/reading-session', { ebookId: bookId, duration, pages })
  },

  // ── 收藏（真连 /ebook/favorites）──
  /** 我的收藏列表 */
  async favorites(): Promise<EbookStoreBook[]> {
    const data = await apiGet<any>('/ebook/favorites?pageSize=100')
    const items: any[] = Array.isArray(data?.items) ? data.items : []
    return items.map(({ ebook: b }) => ({
      id: b.id, title: b.title, author: b.author || '佚名',
      color: ebookColorName(b.id),
      price: Number(b.price) || 0, originalPrice: Number(b.originalPrice) || 0,
      rating: 4.7, reviewCount: 0, salesCount: 0,
      category: b.category?.name || '',
      isHot: false, isNew: false,
      isMemberFree: !!b.memberFree, isFree: Number(b.price) <= 0,
    }))
  },
  /** 收藏 */
  async addFavorite(bookId: string) {
    return apiPost<any>(`/ebook/favorites/${bookId}`, {})
  },
  /** 取消收藏 */
  async removeFavorite(bookId: string) {
    return apiDelete<any>(`/ebook/favorites/${bookId}`)
  },
}
