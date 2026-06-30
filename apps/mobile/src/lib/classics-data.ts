import type { CoverColor } from '@/lib/classics-cover'
import { apiGet, apiGetPaged, apiPost, apiPut, apiDelete } from '@/utils/request'

// ===================== 首页 classics/home =====================
const _mockLibraryStats = [
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
const _mockCategories: CategoryTile[] = [
  { id: 'jing', name: '经部', desc: '儒家经典', count: '3,210 部', icon: 'scroll-text', from: '#a06a38', to: '#7a4d22' },
  { id: 'shi', name: '史部', desc: '历史典籍', count: '2,680 部', icon: 'book-open', from: '#3a6196', to: '#243f63' },
  { id: 'zi', name: '子部', desc: '诸子百家', count: '4,150 部', icon: 'lightbulb', from: '#3f8560', to: '#27543b' },
  { id: 'ji', name: '集部', desc: '诗词文集', count: '2,820 部', icon: 'pen-line', from: '#9a4f6b', to: '#6e3147' },
]

const _mockTodayFeature = {
  id: '2',
  title: '道德经',
  author: '老子 · 春秋',
  tagline: '今日导读',
  quote: '道可道，非常道；名可名，非常名。',
  desc: '五千言道尽天地至理，读懂中国人的处世智慧。',
}

const _mockLastReading = { id: '2', title: '道德经', author: '老子', progress: 68 }
const _mockWeeklyMinutes = 127

export interface BookListItem {
  id: string
  title: string
  desc: string
  count: number
  books: { title: string }[]
}
const _mockBookLists: BookListItem[] = [
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
const _mockRankingData: RankItem[] = [
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
const _mockAudioBooks: AudioItem[] = [
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
const _mockFeaturedBooks: FeaturedItem[] = [
  { id: '1', title: '周易', author: '伏羲 · 周', desc: '群经之首，大道之源', isFree: true },
  { id: '5', title: '黄帝内经', author: '佚名 · 战国', desc: '中医学奠基之作', isFree: true },
  { id: '3', title: '滴天髓', author: '刘基 · 明', desc: '八字命理经典', isFree: false },
  { id: '6', title: '论语', author: '孔门 · 春秋', desc: '儒家经典核心', isFree: true },
]

// ===================== 类型筛选 TypeFilter =====================
export const _mockFilterTypes = [
  { id: 'all', name: '全部' }, { id: 'lishi', name: '历史' }, { id: 'foxue', name: '佛学' },
  { id: 'zhongyi', name: '中医' }, { id: 'shushu', name: '术数' }, { id: 'xiaoshuo', name: '小说' },
  { id: 'shici', name: '诗词' }, { id: 'wenxue', name: '文学' }, { id: 'zhexue', name: '哲学' },
  { id: 'yixue', name: '易学' }, { id: 'bingfa', name: '兵法' }, { id: 'keji', name: '科技' },
  { id: 'daojiao', name: '道教' }, { id: 'dili', name: '地理' },
]

export function fmtReads(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : `${n}`
}

/** 拼接「作者 · 朝代 · X人读」元信息，自动跳过空字段与 0 阅读（避免出现「佚名 · · 0人读」） */
export function bookMetaLine(author?: string, dynasty?: string, reads?: number): string {
  const segs: string[] = []
  if (author) segs.push(author)
  if (dynasty) segs.push(dynasty)
  if (reads && reads > 0) segs.push(`${fmtReads(reads)}人读`)
  return segs.join(' · ')
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
const _mockCAT_CONFIG: Record<CatId, CatConfig> = {
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
const _mockCAT_BOOKS: Record<CatId, CatBook[]> = {
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
const _mockSearchHistoryData = ['周易', '道德经', '黄帝内经', '论语', '孙子兵法']
const _mockHotSearchData = [
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
const _mockSearchResultsData: SearchResultItem[] = [
  { id: '1', title: '周易', author: '伏羲', dynasty: '周', description: '群经之首，大道之源', reads: 128600, rating: 4.9, isFree: true, color: 'cream' },
  { id: '2', title: '周易正义', author: '孔颖达', dynasty: '唐', description: '疏解周易，阐明义理', reads: 45600, rating: 4.8, isFree: false, color: 'brown' },
  { id: '3', title: '周易集解', author: '李鼎祚', dynasty: '唐', description: '汇集汉魏诸家易说', reads: 32100, rating: 4.7, isFree: false, color: 'blue' },
  { id: '4', title: '周易本义', author: '朱熹', dynasty: '宋', description: '理学大师注解周易', reads: 58900, rating: 4.9, isFree: true, color: 'green' },
  { id: '5', title: '周易参同契', author: '魏伯阳', dynasty: '汉', description: '丹道修炼之祖书', reads: 28700, rating: 4.6, isFree: false, color: 'red' },
]
const _mockSearchSuggestionsData = ['周易', '周易正义', '周易本义', '周易集解', '周易参同契']

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
const _mockBookData: Record<string, BookInfo> = {
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

export const _mockAI_FEATURES = [
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
const _mockBookDiscussions: BookDiscussion[] = [
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
const _mockBookshelfData: ShelfBook[] = [
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
const _mockGroupsData: ShelfGroup[] = [
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
const _mockReadingHistoryData: HistoryItem[] = [
  { id: '1', title: '周易', author: '伏羲', dynasty: '周', chapter: '乾卦', readAt: '今天 14:30' },
  { id: '2', title: '道德经', author: '老子', dynasty: '春秋', chapter: '第四十二章', readAt: '昨天 20:15' },
  { id: '3', title: '论语', author: '孔子门人', dynasty: '春秋', chapter: '学而篇', readAt: '3天前' },
]

// ===================== 听书列表 classics/audiobooks =====================
export interface AudioBookFull {
  id: string
  title: string
  shortTitle: string
  author: string
  duration: string
  narrator: string
  plays: number
  likes: number
  quality: string
  size: string
  desc: string
  color: CoverColor
}
const _mockMockAudioBooks: AudioBookFull[] = [
  { id: '1', title: '《道德经》完整版朗读', shortTitle: '道德经', author: '王教授', duration: '4小时32分', narrator: '张三', plays: 12850, likes: 1250, quality: '高保真', size: '450MB', desc: '五千言道尽天地至理，名家逐句精讲。', color: 'brown' },
  { id: '2', title: '《易经》上下经讲解', shortTitle: '易经', author: '李明星', duration: '6小时15分', narrator: '李四', plays: 9850, likes: 850, quality: '高保真', size: '520MB', desc: '六十四卦层层拆解，听懂群经之首。', color: 'cream' },
  { id: '3', title: '《四书五经》核心讲座', shortTitle: '四书五经', author: '孔子研究院', duration: '8小时20分', narrator: '王五', plays: 7420, likes: 620, quality: '高保真', size: '650MB', desc: '儒学经典系统串讲，通识入门首选。', color: 'red' },
  { id: '4', title: '《黄帝内经》全文诵读', shortTitle: '黄帝内经', author: '中医学院', duration: '5小时45分', narrator: '赵六', plays: 5840, likes: 480, quality: '标清', size: '380MB', desc: '中医奠基之作，养生智慧娓娓道来。', color: 'green' },
]
export function fmtPlays(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : `${n}`
}

// ===================== 听书播放器 classics/audiobooks/[id] =====================
export interface AudioChapter {
  id: number
  title: string
  duration: string
}
export interface AudioBookDetail {
  title: string
  author: string
  narrator: string
  dynasty: string
  chapters: AudioChapter[]
}
const _mockAudioBookPlayerData: Record<string, AudioBookDetail> = {
  default: {
    title: '道德经',
    author: '老子',
    narrator: '青山先生',
    dynasty: '春秋',
    chapters: [
      { id: 1, title: '第一章·道可道', duration: '08:15' },
      { id: 2, title: '第二章·天下皆知', duration: '07:42' },
      { id: 3, title: '第三章·不尚贤', duration: '06:58' },
      { id: 4, title: '第四章·道冲', duration: '05:30' },
      { id: 5, title: '第五章·天地不仁', duration: '06:12' },
      { id: 6, title: '第六章·谷神不死', duration: '04:48' },
    ],
  },
}

// ===================== 推荐榜 classics/ranking =====================
export interface RankBook {
  id: string
  rank: number
  title: string
  author: string
  dynasty: string
  views: string
  rating: number
  category: string
}
const _mockRankingPageBooks: RankBook[] = [
  { id: '1', rank: 1, title: '周易', author: '伏羲、周文王', dynasty: '先秦', views: '128.5万', rating: 4.9, category: '易经' },
  { id: '3', rank: 2, title: '滴天髓', author: '任铁樵注', dynasty: '明', views: '86.3万', rating: 4.8, category: '命理' },
  { id: '20', rank: 3, title: '三命通会', author: '万民英', dynasty: '明', views: '72.1万', rating: 4.8, category: '命理' },
  { id: '21', rank: 4, title: '紫微斗数全书', author: '陈希夷', dynasty: '宋', views: '65.4万', rating: 4.7, category: '紫微' },
  { id: '22', rank: 5, title: '葬经', author: '郭璞', dynasty: '晋', views: '54.8万', rating: 4.7, category: '风水' },
  { id: '23', rank: 6, title: '奇门遁甲大全', author: '刘伯温', dynasty: '明', views: '48.2万', rating: 4.6, category: '奇门' },
  { id: '24', rank: 7, title: '渊海子平', author: '徐大升', dynasty: '宋', views: '43.6万', rating: 4.6, category: '命理' },
  { id: '25', rank: 8, title: '梅花易数', author: '邵雍', dynasty: '宋', views: '38.9万', rating: 4.5, category: '预测' },
  { id: '26', rank: 9, title: '阳宅三要', author: '赵九峰', dynasty: '清', views: '34.2万', rating: 4.5, category: '风水' },
  { id: '27', rank: 10, title: '地理五诀', author: '赵九峰', dynasty: '清', views: '29.8万', rating: 4.4, category: '风水' },
]
// 评分维度暂无后端数据，移除「评分」tab（古籍不做星级评分）
export const _mockRankTabs = [
  { key: 'hot', label: '热门' },
  { key: 'new', label: '最新' },
] as const

// ===================== 精选书单 classics/lists =====================
export interface ListBookCover {
  title: string
  color: CoverColor
}
export interface BookListFull {
  id: string
  title: string
  author: string
  bookCount: number
  likes: number
  desc: string
  tags: string[]
  liked: boolean
  color: CoverColor
  books: ListBookCover[]
}
const _mockListsPageData: BookListFull[] = [
  {
    id: '1', title: '命理入门必读书单', author: '周易大师', bookCount: 12, likes: 3420,
    desc: '从零开始学命理，精选入门到进阶书目', tags: ['命理', '八字', '入门'], liked: true, color: 'brown',
    books: [{ title: '滴天髓', color: 'gray' }, { title: '子平真诠', color: 'blue' }, { title: '穷通宝鉴', color: 'brown' }],
  },
  {
    id: '2', title: '风水经典传世之作', author: '王德华', bookCount: 8, likes: 2156,
    desc: '风水学不可不读的经典著作精选', tags: ['风水', '堪舆'], liked: false, color: 'green',
    books: [{ title: '葬经', color: 'green' }, { title: '阳宅三要', color: 'cream' }, { title: '地理五诀', color: 'blue' }],
  },
  {
    id: '3', title: '易经原典研读书单', author: '李玄机', bookCount: 6, likes: 1843,
    desc: '系统研读易经原典的推荐书目', tags: ['易经', '原典'], liked: false, color: 'cream',
    books: [{ title: '周易', color: 'cream' }, { title: '易传', color: 'brown' }, { title: '梅花易数', color: 'red' }],
  },
  {
    id: '4', title: '国学文化综合推荐', author: '儒布官方', bookCount: 20, likes: 5678,
    desc: '国学文化爱好者必读的综合书单', tags: ['国学', '文化'], liked: true, color: 'red',
    books: [{ title: '论语', color: 'red' }, { title: '道德经', color: 'green' }, { title: '庄子', color: 'cream' }],
  },
  {
    id: '5', title: '诗词古籍鉴赏入门', author: '陈梅花', bookCount: 10, likes: 1320,
    desc: '诗词古籍赏析与学习的推荐阅读路径', tags: ['诗词', '古籍'], liked: false, color: 'blue',
    books: [{ title: '楚辞', color: 'red' }, { title: '李太白集', color: 'blue' }, { title: '漱玉词', color: 'brown' }],
  },
]

// ===================== 我的收藏 classics/collections =====================
export type MediaType = 'audiobook' | 'article' | 'video' | 'course'
export interface CollectionItem {
  id: string
  title: string
  type: MediaType
  author: string
  addedDate: string
  plays: number
  color: CoverColor
}
const _mockMockCollections: CollectionItem[] = [
  { id: '1', title: '《道德经》完整版朗读', type: 'audiobook', author: '王教授', addedDate: '2024-01-18', plays: 45, color: 'brown' },
  { id: '2', title: '易经入门必读', type: 'article', author: '易学研究院', addedDate: '2024-01-17', plays: 0, color: 'cream' },
  { id: '3', title: '四书五经核心讲座', type: 'video', author: '孔子学堂', addedDate: '2024-01-16', plays: 28, color: 'red' },
  { id: '4', title: '黄帝内经养生秘诀', type: 'article', author: '中医学院', addedDate: '2024-01-15', plays: 12, color: 'green' },
  { id: '5', title: '奇门遁甲应用指南', type: 'course', author: '命理大师', addedDate: '2024-01-14', plays: 0, color: 'blue' },
]
export const _mockCollectionTypeMeta: Record<MediaType, { label: string; icon: string }> = {
  audiobook: { label: '有声书', icon: 'headphones' },
  article: { label: '文章', icon: 'book-open' },
  video: { label: '视频', icon: 'video' },
  course: { label: '课程', icon: 'graduation-cap' },
}
export const _mockCollectionFilters = [
  { id: 'all', label: '全部' },
  { id: 'article', label: '文章' },
  { id: 'audiobook', label: '有声书' },
  { id: 'video', label: '视频' },
  { id: 'course', label: '课程' },
] as const

// ===================== 合集详情 classics/collection/[id] =====================
export interface CollectionBook {
  id: string
  title: string
  author: string
  dynasty: string
  description: string
  hasAI: boolean
  hasTranslation: boolean
  coverColor: CoverColor
}
export interface CollectionDetail {
  id: string
  title: string
  description: string
  cover: string
  curator: string
  bookCount: number
  viewCount: number
  tags: string[]
  books: CollectionBook[]
}
const _mockCollectionsDetailData: Record<string, CollectionDetail> = {
  '1': {
    id: '1',
    title: '国学经典必读',
    description: '入门必备，经典永流传。精选中华文化精髓，从周易到论语，带你走进国学的大门。',
    cover: 'amber',
    curator: '热卜国学编辑部',
    bookCount: 12,
    viewCount: 28600,
    tags: ['入门', '经典', '推荐'],
    books: [
      { id: '1', title: '周易', author: '伏羲', dynasty: '周', description: '群经之首，大道之源', hasAI: true, hasTranslation: true, coverColor: 'cream' },
      { id: '2', title: '道德经', author: '老子', dynasty: '春秋', description: '道法自然，无为而治', hasAI: true, hasTranslation: true, coverColor: 'brown' },
      { id: '3', title: '论语', author: '孔子门人', dynasty: '春秋', description: '仁义礼智，修身齐家', hasAI: true, hasTranslation: true, coverColor: 'blue' },
      { id: '4', title: '孟子', author: '孟轲', dynasty: '战国', description: '性善之论，王道仁政', hasAI: true, hasTranslation: true, coverColor: 'green' },
      { id: '5', title: '大学', author: '曾子', dynasty: '战国', description: '修身治国，格物致知', hasAI: true, hasTranslation: true, coverColor: 'gray' },
      { id: '6', title: '中庸', author: '子思', dynasty: '战国', description: '天命之谓性，中和之道', hasAI: true, hasTranslation: true, coverColor: 'cream' },
    ],
  },
  '2': {
    id: '2',
    title: '命理入门书单',
    description: '八字命理学习路径，从入门到精通。精选历代命理经典，系统学习命理之道。',
    cover: 'purple',
    curator: '命理研究室',
    bookCount: 8,
    viewCount: 15800,
    tags: ['命理', '八字', '进阶'],
    books: [
      { id: '10', title: '滴天髓', author: '刘基', dynasty: '明', description: '八字命理经典，字字珠玑', hasAI: true, hasTranslation: true, coverColor: 'cream' },
      { id: '11', title: '子平真诠', author: '沈孝瞻', dynasty: '清', description: '格局用神，系统阐述', hasAI: true, hasTranslation: true, coverColor: 'brown' },
      { id: '12', title: '穷通宝鉴', author: '余春台', dynasty: '清', description: '调候用神，实用参考', hasAI: true, hasTranslation: true, coverColor: 'blue' },
      { id: '13', title: '三命通会', author: '万民英', dynasty: '明', description: '命理大全，包罗万象', hasAI: true, hasTranslation: true, coverColor: 'green' },
    ],
  },
}

// ===================== 我的书签 classics/bookmarks =====================
export interface BookmarkItem {
  id: string
  bookId: string
  bookTitle: string
  bookAuthor: string
  dynasty: string
  chapter: string
  content: string
  page: number
  createdAt: string
  color: 'amber' | 'blue' | 'green' | 'purple'
}
const _mockBookmarksData: BookmarkItem[] = [
  { id: '1', bookId: '1', bookTitle: '周易', bookAuthor: '伏羲', dynasty: '周', chapter: '乾卦', content: '天行健，君子以自强不息。', page: 12, createdAt: '2024-01-15 14:30', color: 'amber' },
  { id: '2', bookId: '1', bookTitle: '周易', bookAuthor: '伏羲', dynasty: '周', chapter: '坤卦', content: '地势坤，君子以厚德载物。', page: 28, createdAt: '2024-01-15 15:20', color: 'blue' },
  { id: '3', bookId: '2', bookTitle: '道德经', bookAuthor: '老子', dynasty: '春秋', chapter: '第一章', content: '道可道，非常道。名可名，非常名。', page: 1, createdAt: '2024-01-14 10:15', color: 'green' },
  { id: '4', bookId: '3', bookTitle: '论语', bookAuthor: '孔子门人', dynasty: '春秋', chapter: '学而篇', content: '学而时习之，不亦说乎？有朋自远方来，不亦乐乎？', page: 5, createdAt: '2024-01-13 09:00', color: 'purple' },
]

// ===================== 我的笔记 classics/notes =====================
export interface NoteItem {
  id: string
  bookId: string
  bookTitle: string
  bookAuthor: string
  dynasty: string
  chapter: string
  originalText: string
  noteContent: string
  tags: string[]
  page: number
  createdAt: string
  updatedAt: string
}
const _mockNotesData: NoteItem[] = [
  { id: '1', bookId: '1', bookTitle: '周易', bookAuthor: '伏羲', dynasty: '周', chapter: '乾卦', originalText: '天行健，君子以自强不息。', noteContent: '这句话强调的是效法天道的刚健运行，君子应当自强进取，永不停歇。在现代社会，这种精神依然有重要的指导意义。', tags: ['人生哲理', '自强'], page: 12, createdAt: '2024-01-15 14:30', updatedAt: '2024-01-15 16:20' },
  { id: '2', bookId: '2', bookTitle: '道德经', bookAuthor: '老子', dynasty: '春秋', chapter: '第一章', originalText: '道可道，非常道。名可名，非常名。', noteContent: "老子开篇即点明'道'的不可言说性。真正的大道是超越语言文字的，任何试图用语言定义的'道'都不是永恒的道。这与佛教'不可说'的理念相通。", tags: ['道家', '哲学'], page: 1, createdAt: '2024-01-14 10:15', updatedAt: '2024-01-14 10:15' },
  { id: '3', bookId: '3', bookTitle: '论语', bookAuthor: '孔子门人', dynasty: '春秋', chapter: '学而篇', originalText: '学而时习之，不亦说乎？', noteContent: "学习不仅是获取知识，更重要的是'时习'——在合适的时机反复实践。'说'通'悦'，是内心深处的喜悦。", tags: ['学习方法', '儒家'], page: 5, createdAt: '2024-01-13 09:00', updatedAt: '2024-01-13 11:30' },
]

// ===================== API 层 =====================
// 铁律：所有方法真连后端，错误向上抛由页面走「错误态」，空数据走「空态」，
// 绝不回退假 mock 掩盖。浏览主干(home/category/detail/ranking/search)连 /classics BFF；
// 阅读器/进度/书签/笔记/AI 连 /classic(单数) 真实端点（多数需登录）。
export const classicsApi = {
  /** 首页聚合（真连，失败抛错走错误态） */
  async home() {
    const data = await apiGet<any>('/classics/home')
    return {
      libraryStats: Array.isArray(data.libraryStats) ? data.libraryStats : [],
      categories: Array.isArray(data.categories) ? data.categories : [],
      todayFeature: data.todayFeature ?? null,
      lastReading: data.lastReading ?? null,
      weeklyMinutes: data.weeklyMinutes ?? 0,
      bookLists: Array.isArray(data.bookLists) ? data.bookLists : [],
      rankingData: Array.isArray(data.rankingData) ? data.rankingData : [],
      audioBooks: Array.isArray(data.audioBooks) ? data.audioBooks : [],
      featuredBooks: Array.isArray(data.featuredBooks) ? data.featuredBooks : [],
    }
  },

  /** 分类书籍（sort: hot=最热 / new=最新） */
  async category(cat: string, sort: 'hot' | 'new' = 'hot') {
    const data = await apiGet<any>(`/classics/category/${cat}?sort=${sort}`)
    return { config: data.config ?? null, books: Array.isArray(data.books) ? data.books : [] }
  },

  /** 图书详情 */
  async detail(id: string) {
    const data = await apiGet<any>(`/classics/${id}`)
    return {
      book: data.book ?? null,
      discussions: Array.isArray(data.discussions) ? data.discussions : [],
      aiFeatures: Array.isArray(data.aiFeatures) ? data.aiFeatures : [],
    }
  },

  /** 排行榜（sort: hot=热门 / new=最新） */
  async ranking(sort: 'hot' | 'new' = 'hot') {
    const data = await apiGet<any>(`/classics/ranking?sort=${sort}`)
    return { books: Array.isArray(data.books) ? data.books : [], tabs: Array.isArray(data.tabs) ? data.tabs : [] }
  },

  /** 搜索 */
  async search(query: string) {
    const data = await apiGet<any>(`/classics/search?q=${encodeURIComponent(query)}`)
    return {
      results: Array.isArray(data.results) ? data.results : [],
      suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
      hotSearch: Array.isArray(data.hotSearch) ? data.hotSearch : [],
      history: Array.isArray(data.history) ? data.history : [],
    }
  },

  /** 精选书单（后端暂无数据源→空态隐藏） */
  async lists() {
    const data = await apiGet<any>('/classics/lists')
    return Array.isArray(data) ? data : []
  },

  /** 我的收藏（真连 /classic/favorites，需登录） */
  async collections(): Promise<CollectionItem[]> {
    const data = await apiGet<any>('/classic/favorites')
    const items: any[] = Array.isArray(data?.items) ? data.items : []
    const colors: CoverColor[] = ['cream', 'brown', 'blue', 'green', 'red']
    return items.map((b, i) => ({
      id: b.id, title: b.title, type: 'article' as MediaType,
      author: b.author || '佚名', addedDate: (b.addedAt || '').slice(0, 10),
      plays: b.plays || 0, color: colors[i % colors.length],
    }))
  },
  async addFavorite(bookId: string) {
    return await apiPost<any>(`/classic/favorites/${bookId}`)
  },
  async removeFavorite(bookId: string) {
    return await apiDelete<any>(`/classic/favorites/${bookId}`)
  },
  async favoriteStatus(bookId: string): Promise<{ favorited: boolean }> {
    return await apiGet<{ favorited: boolean }>(`/classic/favorites/${bookId}/status`)
  },

  /** 合集详情（后端暂无数据源→null 走空态） */
  async collectionDetail(id: string) {
    return await apiGet<any>(`/classics/collections/${id}`)
  },

  /** 有声书列表（第二阶段 TTS→当前空态隐藏） */
  async audiobooks() {
    const data = await apiGet<any>('/classics/audiobooks')
    return Array.isArray(data) ? data : []
  },

  /** 有声书播放器（第二阶段 TTS→当前 null 走空态） */
  async audiobookPlayer(id: string) {
    return await apiGet<any>(`/classics/audiobooks/${id}`)
  },

  // ── 阅读器：章节正文（公开） ──
  /** 章节正文 + 所属书 { id, bookId, title, content, translation, annotation, sortOrder, book } */
  async chapter(id: string) {
    return await apiGet<any>(`/classic/chapters/${id}`)
  },

  // ── AI 赋能（需登录） ──
  /** 文白翻译：{ original, translation, notes[], source } */
  async translate(text: string, context?: string) {
    return await apiPost<any>('/classic/translate', { text, context })
  },
  /** 古汉语查词：{ word, pinyin, radicals, meanings[], classicalUsages[], commonPhrases[], explanation } */
  async lookupWord(word: string) {
    return await apiPost<any>('/classic/dictionary/lookup', { word })
  },
  /** 古籍AI问答：{ answer } */
  async askAI(question: string) {
    return await apiPost<{ answer: string }>('/classic/ask', { question })
  },

  // ── 古籍伴读智能体（识典伴读·注入当前章节正文·需登录） ──
  /** 伴读开场引导问题：{ bookTitle, chapterTitle, prompts[] } */
  async companionPrompts(chapterId: string): Promise<{ bookTitle: string; chapterTitle: string; prompts: string[] }> {
    return await apiGet<any>(`/classic/companion/prompts?chapterId=${chapterId}`)
  },
  /** 伴读多轮对话（带当前章节上下文）：{ answer, disclaimer } */
  async companionChat(
    chapterId: string,
    question: string,
    history?: { role: string; content: string }[],
  ): Promise<{ answer: string; disclaimer: string }> {
    return await apiPost<{ answer: string; disclaimer: string }>('/classic/companion/chat', { chapterId, question, history })
  },

  // ── 阅读进度（需登录） ──
  async getProgress(bookId: string) {
    return await apiGet<any>(`/classic/progress/${bookId}`)
  },
  async saveProgress(bookId: string, chapterId: string, progress: number) {
    return await apiPut<any>(`/classic/progress/${bookId}`, { chapterId, progress })
  },
  async continueReading(limit = 20) {
    return await apiGet<any>(`/classic/continue-reading?limit=${limit}`)
  },
  async readingStats() {
    return await apiGet<any>('/classic/reading-stats')
  },

  // ── 书架（基于真实阅读进度，需登录） ──
  async bookshelf() {
    const data = await apiGet<any>('/classic/continue-reading?limit=100')
    const items: any[] = Array.isArray(data?.items) ? data.items : []
    const books: ShelfBook[] = items.map((r) => ({
      id: r.book?.id, title: r.book?.title, author: r.book?.author || '佚名',
      dynasty: r.book?.dynasty || '', progress: Math.round(r.progress || 0),
      hasAI: true, hasTranslation: true,
      lastReadAt: (r.updatedAt || '').slice(0, 10),
    }))
    const history: HistoryItem[] = items.map((r) => ({
      id: r.book?.id, title: r.book?.title, author: r.book?.author || '佚名',
      dynasty: r.book?.dynasty || '', chapter: r.chapter?.title || '',
      readAt: (r.updatedAt || '').slice(0, 10),
    }))
    return { books, groups: [] as ShelfGroup[], history }
  },
  /** 移出书架（删除阅读进度） */
  async removeFromShelf(bookId: string) {
    return await apiDelete<any>(`/classic/progress/${bookId}`)
  },

  // ── 书签（真实 CRUD，需登录） ──
  async bookmarks(bookId?: string): Promise<BookmarkItem[]> {
    const path = bookId
      ? `/classic/bookmarks?bookId=${bookId}&pageSize=100`
      : '/classic/bookmarks?pageSize=100'
    const res = await apiGetPaged<any>(path)
    const colors = ['amber', 'blue', 'green', 'purple'] as const
    return res.items.map((b, i) => ({
      id: b.id, bookId: b.bookId, bookTitle: b.book?.title || '', bookAuthor: '',
      dynasty: '', chapter: b.chapter?.title || '', content: b.note || '',
      page: b.position || 0, createdAt: (b.createdAt || '').slice(0, 10),
      color: colors[i % colors.length],
    }))
  },
  async addBookmark(bookId: string, payload: { chapterId: string; position: number; note?: string }) {
    return await apiPost<any>(`/classic/bookmarks/${bookId}`, payload)
  },
  async removeBookmark(id: string) {
    return await apiDelete<any>(`/classic/bookmarks/${id}`)
  },

  // ── 读书笔记（真实 CRUD，需登录） ──
  async notes(bookId?: string): Promise<NoteItem[]> {
    const path = bookId
      ? `/classic/notes?bookId=${bookId}&pageSize=100`
      : '/classic/notes?pageSize=100'
    const res = await apiGetPaged<any>(path)
    return res.items.map((n) => ({
      id: n.id, bookId: n.bookId, bookTitle: n.book?.title || '', bookAuthor: '',
      dynasty: '', chapter: n.chapter?.title || '', originalText: '',
      noteContent: n.content || '', tags: [], page: 0,
      createdAt: (n.createdAt || '').slice(0, 16).replace('T', ' '),
      updatedAt: (n.updatedAt || '').slice(0, 16).replace('T', ' '),
    }))
  },
  async addNote(bookId: string, payload: { chapterId: string; content: string }) {
    return await apiPost<any>(`/classic/notes/${bookId}`, payload)
  },
  async updateNote(id: string, content: string) {
    return await apiPut<any>(`/classic/notes/${id}`, { content })
  },
  async removeNote(id: string) {
    return await apiDelete<any>(`/classic/notes/${id}`)
  },
}
