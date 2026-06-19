import type { CoverColor } from '@/lib/classics-cover'

// ===================== 首页 classics/home =====================
export const libraryStats = [
  { value: '12,860', label: '部典籍' },
  { value: '48', label: '门类' },
  { value: '1,200+', label: '白话译注' },
]

export interface CategoryTile {
  id: string
  name: string
  desc: string
  count: string
  icon: string
  from: string
  to: string
}
export const categories: CategoryTile[] = [
  { id: 'jing', name: '经部', desc: '儒家经典', count: '3,210 部', icon: 'scroll-text', from: '#a06a38', to: '#7a4d22' },
  { id: 'shi', name: '史部', desc: '历史典籍', count: '2,680 部', icon: 'book-open', from: '#3a6196', to: '#243f63' },
  { id: 'zi', name: '子部', desc: '诸子百家', count: '4,150 部', icon: 'lightbulb', from: '#3f8560', to: '#27543b' },
  { id: 'ji', name: '集部', desc: '诗词文集', count: '2,820 部', icon: 'pen-line', from: '#9a4f6b', to: '#6e3147' },
]

export const todayFeature = {
  id: '2',
  title: '道德经',
  author: '老子 · 春秋',
  tagline: '今日导读',
  quote: '道可道，非常道；名可名，非常名。',
  desc: '五千言道尽天地至理，读懂中国人的处世智慧。',
}

export const lastReading = { id: '2', title: '道德经', author: '老子', progress: 68 }
export const weeklyMinutes = 127

export interface BookListItem {
  id: string
  title: string
  desc: string
  count: number
  books: { title: string }[]
}
export const bookLists: BookListItem[] = [
  { id: '1', title: '国学经典必读', desc: '入门必备，经典永流传', count: 12, books: [{ title: '周易' }, { title: '论语' }, { title: '道德经' }] },
  { id: '2', title: '命理入门书单', desc: '八字命理学习路径', count: 8, books: [{ title: '滴天髓' }, { title: '子平真诠' }, { title: '穷通宝鉴' }] },
  { id: '3', title: '道家养生典籍', desc: '修身养性，道法自然', count: 10, books: [{ title: '道德经' }, { title: '庄子' }, { title: '抱朴子' }] },
]

export interface RankItem {
  id: string
  title: string
  author: string
  dynasty: string
  desc: string
  reads: number
}
export const rankingData: RankItem[] = [
  { id: '1', title: '周易', author: '伏羲', dynasty: '周', desc: '群经之首，大道之源', reads: 128600 },
  { id: '2', title: '道德经', author: '老子', dynasty: '春秋', desc: '道法自然，无为而治', reads: 145600 },
  { id: '3', title: '黄帝内经', author: '佚名', dynasty: '战国', desc: '中医奠基，养生之本', reads: 98500 },
  { id: '4', title: '论语', author: '孔门', dynasty: '春秋', desc: '仁义礼智，修身齐家', reads: 156800 },
  { id: '5', title: '鬼谷子', author: '鬼谷子', dynasty: '战国', desc: '纵横捭阖，谋略奇书', reads: 76200 },
]

export interface AudioItem {
  id: string
  title: string
  narrator: string
  desc: string
}
export const audioBooks: AudioItem[] = [
  { id: '1', title: '金瓶梅', narrator: '专业主播', desc: '明代四大奇书之首' },
  { id: '2', title: '山海经', narrator: '古籍朗读', desc: '上古奇书，神话之源' },
  { id: '3', title: '聊斋志异', narrator: '学术讲解', desc: '鬼狐有性格，笑骂成文' },
]

export interface FeaturedItem {
  id: string
  title: string
  author: string
  desc: string
  isFree: boolean
}
export const featuredBooks: FeaturedItem[] = [
  { id: '1', title: '周易', author: '伏羲 · 周', desc: '群经之首，大道之源', isFree: true },
  { id: '5', title: '黄帝内经', author: '佚名 · 战国', desc: '中医学奠基之作', isFree: true },
  { id: '3', title: '滴天髓', author: '刘基 · 明', desc: '八字命理经典', isFree: false },
  { id: '6', title: '论语', author: '孔门 · 春秋', desc: '儒家经典核心', isFree: true },
]

// ===================== 类型筛选 TypeFilter =====================
export const filterTypes = [
  { id: 'all', name: '全部' }, { id: 'lishi', name: '历史' }, { id: 'foxue', name: '佛学' },
  { id: 'zhongyi', name: '中医' }, { id: 'shushu', name: '术数' }, { id: 'xiaoshuo', name: '小说' },
  { id: 'shici', name: '诗词' }, { id: 'wenxue', name: '文学' }, { id: 'zhexue', name: '哲学' },
  { id: 'yixue', name: '易学' }, { id: 'bingfa', name: '兵法' }, { id: 'keji', name: '科技' },
  { id: 'daojiao', name: '道教' }, { id: 'dili', name: '地理' },
]

export function fmtReads(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : `${n}`
}

// ===================== 分类列表 classics/category/[cat] =====================
export type CatId = 'jing' | 'shi' | 'zi' | 'ji'
export interface CatConfig {
  name: string
  desc: string
  intro: string
  count: string
  from: string
  to: string
  cover: CoverColor
  icon: string
  subCats: string[]
}
export const CAT_CONFIG: Record<CatId, CatConfig> = {
  jing: { name: '经部', desc: '儒家经典', intro: '四书五经，儒学根本，立身处世之道尽在其中。', count: '3,210', from: '#a06a38', to: '#6f4521', cover: 'brown', icon: 'scroll-text', subCats: ['全部', '易类', '书类', '诗类', '礼类', '春秋', '四书', '小学'] },
  shi: { name: '史部', desc: '历史典籍', intro: '二十四史，编年纪传，鉴往知来通古今之变。', count: '2,680', from: '#3a6196', to: '#243f63', cover: 'blue', icon: 'book-open', subCats: ['全部', '正史', '编年', '纪事本末', '别史', '杂史', '传记', '地理'] },
  zi: { name: '子部', desc: '诸子百家', intro: '百家争鸣，术数医方，思想智慧的浩瀚星河。', count: '4,150', from: '#3f8560', to: '#27543b', cover: 'green', icon: 'lightbulb', subCats: ['全部', '儒家', '道家', '法家', '兵家', '医家', '术数', '杂家', '小说'] },
  ji: { name: '集部', desc: '诗词文集', intro: '楚辞汉赋，唐诗宋词，千古文心的风雅传承。', count: '2,820', from: '#9a4f6b', to: '#6e3147', cover: 'red', icon: 'pen-line', subCats: ['全部', '楚辞', '别集', '总集', '诗文评', '词曲'] },
}

export interface CatBook {
  id: string
  title: string
  author: string
  dynasty: string
  desc: string
  reads: number
  isFree: boolean
}
export const CAT_BOOKS: Record<CatId, CatBook[]> = {
  jing: [
    { id: '1', title: '周易', author: '伏羲', dynasty: '周', desc: '群经之首，大道之源', reads: 128600, isFree: true },
    { id: '6', title: '论语', author: '孔门弟子', dynasty: '春秋', desc: '仁义礼智，修身齐家', reads: 156800, isFree: true },
    { id: '2', title: '道德经', author: '老子', dynasty: '春秋', desc: '道法自然，无为而治', reads: 145600, isFree: true },
    { id: '10', title: '大学', author: '曾子', dynasty: '春秋', desc: '修齐治平，儒门纲领', reads: 67200, isFree: true },
    { id: '11', title: '中庸', author: '子思', dynasty: '战国', desc: '致中和，天地位焉', reads: 54300, isFree: true },
    { id: '12', title: '尚书', author: '佚名', dynasty: '上古', desc: '上古之书，政事典谟', reads: 43800, isFree: false },
  ],
  shi: [
    { id: '20', title: '史记', author: '司马迁', dynasty: '汉', desc: '史家之绝唱，无韵之离骚', reads: 198600, isFree: true },
    { id: '21', title: '资治通鉴', author: '司马光', dynasty: '宋', desc: '鉴于往事，资于治道', reads: 142300, isFree: true },
    { id: '22', title: '汉书', author: '班固', dynasty: '汉', desc: '断代为史，体例严整', reads: 78900, isFree: false },
    { id: '23', title: '战国策', author: '刘向', dynasty: '汉', desc: '纵横捭阖，谋士风云', reads: 65400, isFree: true },
    { id: '24', title: '三国志', author: '陈寿', dynasty: '晋', desc: '魏蜀吴史，简而有要', reads: 112700, isFree: true },
    { id: '25', title: '左传', author: '左丘明', dynasty: '春秋', desc: '编年叙事，文采斐然', reads: 58200, isFree: false },
  ],
  zi: [
    { id: '5', title: '黄帝内经', author: '佚名', dynasty: '战国', desc: '中医奠基，养生之本', reads: 98500, isFree: true },
    { id: '4', title: '鬼谷子', author: '鬼谷子', dynasty: '战国', desc: '纵横捭阖，谋略奇书', reads: 76200, isFree: true },
    { id: '30', title: '庄子', author: '庄周', dynasty: '战国', desc: '逍遥齐物，汪洋恣肆', reads: 89400, isFree: true },
    { id: '31', title: '孙子兵法', author: '孙武', dynasty: '春秋', desc: '兵学圣典，谋攻为上', reads: 167300, isFree: true },
    { id: '32', title: '韩非子', author: '韩非', dynasty: '战国', desc: '法术势合，集法家大成', reads: 52100, isFree: false },
    { id: '33', title: '墨子', author: '墨翟', dynasty: '战国', desc: '兼爱非攻，尚贤尚同', reads: 41600, isFree: false },
  ],
  ji: [
    { id: '40', title: '楚辞', author: '屈原 等', dynasty: '战国', desc: '香草美人，浪漫之源', reads: 87600, isFree: true },
    { id: '41', title: '李太白集', author: '李白', dynasty: '唐', desc: '诗仙绝唱，飘逸豪放', reads: 134500, isFree: true },
    { id: '42', title: '杜工部集', author: '杜甫', dynasty: '唐', desc: '诗史沉郁，忧国忧民', reads: 121800, isFree: true },
    { id: '43', title: '东坡乐府', author: '苏轼', dynasty: '宋', desc: '豪放词宗，旷达超然', reads: 98300, isFree: true },
    { id: '44', title: '漱玉词', author: '李清照', dynasty: '宋', desc: '婉约正宗，情致深婉', reads: 76900, isFree: false },
    { id: '45', title: '文心雕龙', author: '刘勰', dynasty: '南朝', desc: '文论巨著，体大思精', reads: 38200, isFree: false },
  ],
}

// ===================== 搜索 classics/search =====================
export const searchHistoryData = ['周易', '道德经', '黄帝内经', '论语', '孙子兵法']
export const hotSearchData = [
  { keyword: '周易', isHot: true }, { keyword: '道德经', isHot: true }, { keyword: '滴天髓', isHot: false },
  { keyword: '子平真诠', isHot: false }, { keyword: '黄帝内经', isHot: true }, { keyword: '伤寒论', isHot: false },
  { keyword: '论语', isHot: true }, { keyword: '庄子', isHot: false },
]
export interface SearchResultItem {
  id: string
  title: string
  author: string
  dynasty: string
  description: string
  reads: number
  rating: number
  isFree: boolean
  color: CoverColor
}
export const searchResultsData: SearchResultItem[] = [
  { id: '1', title: '周易', author: '伏羲', dynasty: '周', description: '群经之首，大道之源', reads: 128600, rating: 4.9, isFree: true, color: 'cream' },
  { id: '2', title: '周易正义', author: '孔颖达', dynasty: '唐', description: '疏解周易，阐明义理', reads: 45600, rating: 4.8, isFree: false, color: 'brown' },
  { id: '3', title: '周易集解', author: '李鼎祚', dynasty: '唐', description: '汇集汉魏诸家易说', reads: 32100, rating: 4.7, isFree: false, color: 'blue' },
  { id: '4', title: '周易本义', author: '朱熹', dynasty: '宋', description: '理学大师注解周易', reads: 58900, rating: 4.9, isFree: true, color: 'green' },
  { id: '5', title: '周易参同契', author: '魏伯阳', dynasty: '汉', description: '丹道修炼之祖书', reads: 28700, rating: 4.6, isFree: false, color: 'red' },
]
export const searchSuggestionsData = ['周易', '周易正义', '周易本义', '周易集解', '周易参同契']

// ===================== 详情 classics/[id] =====================
export interface ChapterNode {
  id: string
  title: string
  hasChildren?: boolean
  children?: { id: string; title: string }[]
}
export interface BookInfo {
  id: string
  title: string
  author: string
  dynasty: string
  version: string
  description: string
  aiSummary: string
  reads: number
  rating: number
  totalChapters: number
  hasAI: boolean
  hasAudio: boolean
  hasTranslation: boolean
  isFree: boolean
  isInBookshelf: boolean
  color: CoverColor
  chapters: ChapterNode[]
  relatedBooks: { id: string; title: string; author: string; dynasty: string }[]
}
export const bookData: Record<string, BookInfo> = {
  '1': {
    id: '1', title: '周易', author: '伏羲/周文王/孔子', dynasty: '周', version: '通行本', color: 'cream',
    description: '《周易》即《易经》，是传统经典之一，相传系周文王姬昌所作，内容包括《经》和《传》两个部分。',
    aiSummary: '群经之首，大道之源。《周易》以六十四卦推演天地万物的变化之理，既是占筮之书，更是一部蕴含宇宙观与处世智慧的哲学经典，读懂它便读懂了中国人的思维底层。',
    reads: 128600, rating: 4.9, totalChapters: 64, hasAI: true, hasAudio: true, hasTranslation: true, isFree: true, isInBookshelf: false,
    chapters: [
      { id: 'c1', title: '扉页' },
      { id: 'c2', title: '序跋', hasChildren: true, children: [{ id: 'c2-1', title: '周易序' }, { id: 'c2-2', title: '周易正义序' }] },
      { id: 'c3', title: '周易卷首目次' },
      { id: 'c4', title: '周易卷首', hasChildren: true },
      { id: 'c5', title: '周易上经', hasChildren: true, children: [{ id: 'c5-1', title: '乾卦第一' }, { id: 'c5-2', title: '坤卦第二' }, { id: 'c5-3', title: '屯卦第三' }] },
      { id: 'c6', title: '周易下经', hasChildren: true },
      { id: 'c7', title: '系辞上传' },
      { id: 'c8', title: '系辞下传' },
      { id: 'c9', title: '说卦传' },
      { id: 'c10', title: '序卦传' },
      { id: 'c11', title: '杂卦传' },
      { id: 'c12', title: '结束页' },
    ],
    relatedBooks: [
      { id: '2', title: '道德经', author: '老子', dynasty: '春秋' },
      { id: '6', title: '论语', author: '孔子门人', dynasty: '春秋' },
      { id: '4', title: '易传', author: '孔子', dynasty: '春秋' },
    ],
  },
  '2': {
    id: '2', title: '道德经', author: '老子', dynasty: '春秋', version: '王弼注本', color: 'brown',
    description: '《道德经》又称《老子》，是道家学派的经典著作，分《道经》和《德经》上下两篇，共八十一章。',
    aiSummary: '道法自然，无为而治。老子用五千字道出宇宙至理，引领人们探寻生命本真，是道家思想的源头活水。',
    reads: 145600, rating: 4.9, totalChapters: 81, hasAI: true, hasAudio: true, hasTranslation: true, isFree: true, isInBookshelf: true,
    chapters: [
      { id: 'c1', title: '扉页' },
      { id: 'c2', title: '序跋' },
      { id: 'c3', title: '道经（第一至第三十七章）', hasChildren: true },
      { id: 'c4', title: '德经（第三十八至第八十一章）', hasChildren: true },
      { id: 'c5', title: '结束页' },
    ],
    relatedBooks: [
      { id: '1', title: '周易', author: '伏羲', dynasty: '周' },
      { id: '30', title: '庄子', author: '庄周', dynasty: '战国' },
    ],
  },
}

export const AI_FEATURES = [
  { icon: 'file-text', label: '文白翻译' },
  { icon: 'sparkles', label: '智能查词' },
  { icon: 'headphones', label: 'AI 听书' },
  { icon: 'network', label: '知识图谱' },
]

export interface BookDiscussion {
  id: string
  authorName: string
  badge?: string
  content: string
  time: string
  likeCount: number
  featured?: boolean
}
export const bookDiscussions: BookDiscussion[] = [
  { id: 'b1', authorName: '山间煮茶', badge: 'master', content: '读了三遍才慢慢咂摸出味道。古人讲『书读百遍其义自见』，诚不我欺。建议配合注疏一起看，单读原文容易囫囵吞枣。', time: '3天前', likeCount: 128, featured: true },
  { id: 'b2', authorName: '竹影清风', badge: 'teacher', content: '这个版本的排版和句读做得很用心，AI 译文也比较克制，没有过度发挥，对初学者很友好。', time: '5天前', likeCount: 86 },
  { id: 'b3', authorName: '归园田居', content: '开篇即是高峰。能把如此深奥的道理用这般简练的文字道出，足见先贤功力。每读一次都有新的体会。', time: '1周前', likeCount: 54 },
]

// ===================== 书架 classics/bookshelf =====================
export interface ShelfBook {
  id: string
  title: string
  author: string
  dynasty: string
  progress: number
  hasAI: boolean
  hasTranslation: boolean
  lastReadAt: string
}
export const bookshelfData: ShelfBook[] = [
  { id: '1', title: '周易', author: '伏羲', dynasty: '周', progress: 32, hasAI: true, hasTranslation: true, lastReadAt: '2024-01-15' },
  { id: '2', title: '道德经', author: '老子', dynasty: '春秋', progress: 68, hasAI: true, hasTranslation: true, lastReadAt: '2024-01-14' },
  { id: '3', title: '黄帝内经', author: '佚名', dynasty: '战国', progress: 15, hasAI: true, hasTranslation: true, lastReadAt: '2024-01-13' },
  { id: '4', title: '论语', author: '孔子门人', dynasty: '春秋', progress: 45, hasAI: true, hasTranslation: true, lastReadAt: '2024-01-12' },
  { id: '5', title: '滴天髓', author: '刘基', dynasty: '明', progress: 8, hasAI: true, hasTranslation: true, lastReadAt: '2024-01-10' },
  { id: '6', title: '大学', author: '曾子', dynasty: '战国', progress: 100, hasAI: true, hasTranslation: true, lastReadAt: '2024-01-09' },
]
export interface ShelfGroup {
  id: string
  name: string
  count: number
  color: string
}
export const groupsData: ShelfGroup[] = [
  { id: '1', name: '命理研究', count: 5, color: 'amber' },
  { id: '2', name: '道家经典', count: 3, color: 'emerald' },
  { id: '3', name: '养生必读', count: 4, color: 'blue' },
]
export interface HistoryItem {
  id: string
  title: string
  author: string
  dynasty: string
  chapter: string
  readAt: string
}
export const readingHistoryData: HistoryItem[] = [
  { id: '1', title: '周易', author: '伏羲', dynasty: '周', chapter: '乾卦', readAt: '今天 14:30' },
  { id: '2', title: '道德经', author: '老子', dynasty: '春秋', chapter: '第四十二章', readAt: '昨天 20:15' },
  { id: '3', title: '论语', author: '孔子门人', dynasty: '春秋', chapter: '学而篇', readAt: '3天前' },
]
