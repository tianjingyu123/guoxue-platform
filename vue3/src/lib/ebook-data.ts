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
export const ebookShelfBooks: EbookShelfBook[] = [
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
