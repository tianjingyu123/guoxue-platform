/**
 * 诗词雅集数据层（V0 原型迁移 + API 对接）
 */
import { apiGet, useMock } from '@/utils/request'

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
}

// ============================================
// Mock 数据
// ============================================

const todayPoem: TodayPoem = {
  id: '1',
  title: '静夜思',
  author: '李白',
  dynasty: '唐',
  lines: ['床前明月光，', '疑是地上霜。', '举头望明月，', '低头思故乡。'],
  tags: ['思乡', '月亮'],
  likes: 12800,
}

const poems: PoemItem[] = [
  { id: '2', title: '登鹳雀楼', author: '王之涣', dynasty: '唐', form: '五言绝句', preview: '白日依山尽，黄河入海流', likes: 8900 },
  { id: '3', title: '春晓', author: '孟浩然', dynasty: '唐', form: '五言绝句', preview: '春眠不觉晓，处处闻啼鸟', likes: 7600 },
  { id: '4', title: '相思', author: '王维', dynasty: '唐', form: '五言绝句', preview: '红豆生南国，春来发几枝', likes: 9200 },
  { id: '5', title: '悯农', author: '李绅', dynasty: '唐', form: '五言绝句', preview: '锄禾日当午，汗滴禾下土', likes: 6800 },
  { id: '6', title: '江雪', author: '柳宗元', dynasty: '唐', form: '五言绝句', preview: '千山鸟飞绝，万径人踪灭', likes: 5400 },
  { id: '7', title: '水调歌头', author: '苏轼', dynasty: '宋', form: '词', preview: '明月几时有，把酒问青天', likes: 11200 },
  { id: '8', title: '声声慢', author: '李清照', dynasty: '宋', form: '词', preview: '寻寻觅觅，冷冷清清', likes: 8300 },
]

const poets: PoetItem[] = [
  { id: '1', name: '李白', dynasty: '唐', poemCount: 1184, avatar: '李' },
  { id: '2', name: '杜甫', dynasty: '唐', poemCount: 1455, avatar: '杜' },
  { id: '3', name: '白居易', dynasty: '唐', poemCount: 3840, avatar: '白' },
  { id: '4', name: '苏轼', dynasty: '宋', poemCount: 3459, avatar: '苏' },
  { id: '5', name: '李清照', dynasty: '宋', poemCount: 84, avatar: '李' },
]

const categories: PoemCategory[] = [
  { id: '1', name: '古典诗词', icon: '📜', desc: '唐诗宋词元曲，品读千年文学之美', count: 12840, subCategories: ['唐诗', '宋词', '元曲', '明清诗词'] },
  { id: '2', name: '易经诗歌', icon: '☯️', desc: '以易经为题材的古今诗词创作', count: 3260, subCategories: ['六十四卦吟', '易理诗', '现代易诗'] },
  { id: '3', name: '命理赋文', icon: '✨', desc: '命理学经典赋文，文字优美意蕴深远', count: 1480, subCategories: ['命赋', '星赋', '格局赋'] },
  { id: '4', name: '风水诗歌', icon: '🏔️', desc: '以山川地理为题材的风水诗词', count: 980, subCategories: ['山水诗', '地理赋', '堪舆歌诀'] },
  { id: '5', name: '节气民俗', icon: '🌸', desc: '二十四节气及民俗文化相关诗词', count: 2160, subCategories: ['节气诗', '民俗词', '时令歌'] },
  { id: '6', name: '星象天文', icon: '🌟', desc: '古代天文星象相关诗词', count: 760, subCategories: ['星宿诗', '天象赋', '历法歌'] },
  { id: '7', name: '道家玄学', icon: '🌀', desc: '道家哲学与玄学思想诗词', count: 1840, subCategories: ['老庄诗', '玄学词', '丹道诗'] },
  { id: '8', name: '现代创作', icon: '✍️', desc: '当代作者以传统文化为题的现代诗词', count: 5680, subCategories: ['现代诗', '新古风', '仿古词'] },
]

const collections: CollectionItem[] = [
  { id: '1', title: '乾卦·象辞', author: '文王', authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40', dynasty: '西周', excerpt: '天行健，君子以自强不息。', category: '易经', likes: 8640, liked: true, collectedAt: '2024-01-20' },
  { id: '2', title: '测字诗', author: '邵雍', authorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=40', dynasty: '宋', excerpt: '一阴一阳之谓道，继之者善也，成之者性也。', category: '易理', likes: 5280, liked: true, collectedAt: '2024-01-18' },
  { id: '3', title: '清平乐·命理感怀', author: '陈抟', authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40', dynasty: '五代', excerpt: '无极生太极，太极动而生阳，静而生阴…', category: '道学', likes: 3960, liked: false, collectedAt: '2024-01-15' },
  { id: '4', title: '堪舆赋', author: '郭璞', authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40', dynasty: '晋', excerpt: '气乘风则散，界水则止。古人聚之使不散，行之使有止，故谓之风水。', category: '风水', likes: 2840, liked: true, collectedAt: '2024-01-12' },
  { id: '5', title: '八字论命赋', author: '徐子平', authorAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=40', dynasty: '宋', excerpt: '五行者，金木水火土是也，各有生克制化之理。', category: '八字', likes: 2160, liked: false, collectedAt: '2024-01-10' },
]

const poemDetail: PoemDetail = {
  id: '1',
  title: '静夜思',
  author: '李白',
  authorId: '1',
  dynasty: '唐',
  form: '五言绝句',
  content: [
    { line: '床前明月光，', pinyin: 'chuáng qián míng yuè guāng，' },
    { line: '疑是地上霜。', pinyin: 'yí shì dì shàng shuāng。' },
    { line: '举头望明月，', pinyin: 'jǔ tóu wàng míng yuè，' },
    { line: '低头思故乡。', pinyin: 'dī tóu sī gù xiāng。' },
  ],
  appreciation: `这首诗写的是在寂静的月夜思念家乡的感受。

诗的前两句，是写诗人在作客他乡的特定环境中一刹那间所产生的错觉。一个独处他乡的人，白天奔波忙碌，倒还能冲淡离愁，然而一到夜深人静的时候，心头就难免泛起阵阵思念故乡的波澜。何况是在月明之夜，更何况是月色如霜的秋夜。

"疑"字生动地表达了诗人睡梦初醒，迷离恍惚中将照射在床前的清冷月光误作铺在地面的浓霜。"霜"字用得更妙，既形容了月光的皎洁，又表达了季节的寒冷，还烘托出诗人飘泊他乡的孤寂凄凉之情。

后两句通过动作神态的刻画，深化思乡之情。"举头望明月"把诗人的思绪由地上引向天上，由近处引向远处。"低头思故乡"是诗人完成从疑到望再到思这一系列心理活动的终点。`,
  aiAppreciation: `**创作背景**

此诗当作于唐玄宗开元十四年（726年），李白二十六岁时。是年秋，诗人离故乡赴长安求仕途，旅宿扬州旅舍，月夜难眠，感怀乡愁而作。

**意象分析**

- **月光如霜**：以"疑"字将月光与白霜并置，形成触觉（冷）与视觉（白）的通感，将静夜的凄清具象化
- **举头 / 低头**：两组对仗动作构成完整的心理弧线——由外物（月）引发内情（乡愁），以行为外化情感
- **故乡**：全诗至此才点出主旨，是蓄势后的情感爆发，留白与克制是李白绝句的典型风格

**情感解读**

全诗20字，无一字言"愁"，却字字含愁。李白用最简洁的笔墨完成了从"疑"到"望"再到"思"的完整情感旅程，是唐诗中"以少总多"手法的极致体现。`,
  notes: [
    { word: '床', note: '此指井栏，或作井边的围栏解。一说为窗的通假字。' },
    { word: '疑', note: '好像、似乎。' },
    { word: '举头', note: '抬头。' },
    { word: '思', note: '思念。' },
  ],
  authorInfo: {
    name: '李白',
    dynasty: '唐',
    years: '701-762',
    title: '诗仙',
    intro: '李白（701年—762年），字太白，号青莲居士，唐代伟大的浪漫主义诗人，被后人誉为"诗仙"。',
    poemCount: 1184,
  },
  relatedPoems: [
    { id: '2', title: '月下独酌', author: '李白', preview: '花间一壶酒，独酌无相亲...' },
    { id: '3', title: '望庐山瀑布', author: '李白', preview: '日照香炉生紫烟...' },
    { id: '4', title: '早发白帝城', author: '李白', preview: '朝辞白帝彩云间...' },
  ],
  tags: ['思乡', '月亮', '夜晚', '五言绝句'],
  likes: 12800,
  collections: 8900,
}

const poemTranslations = ['明亮的月光洒在床前，', '好像地上泛起了一层霜。', '抬头望着天上的明月，', '低下头思念起远方的故乡。']

// ============================================
// API 层：useMock 开关控制真实/模拟数据切换
// ============================================

export const poetryApi = {
  /** 首页 — 每日一首 + 热门列表 + 诗人列表 */
  async home() {
    if (true) return { todayPoem, poems, poets }
    try {
      const data = await apiGet<any>('/poetry/home')
      return {
        todayPoem: data.todayPoem || todayPoem,
        poems: data.poems?.length ? data.poems : poems,
        poets: data.poets?.length ? data.poets : poets,
      }
    } catch { return { todayPoem, poems, poets } }
  },

  /** 分类列表 */
  async categories() {
    if (true) return categories
    try {
      const data = await apiGet<PoemCategory[]>('/poetry/categories')
      return data?.length ? data : categories
    } catch { return categories }
  },

  /** 收藏列表 */
  async collections() {
    if (true) return collections
    try {
      const data = await apiGet<CollectionItem[]>('/poetry/collections')
      return data?.length ? data : collections
    } catch { return collections }
  },

  /** 诗词详情 */
  async detail(id: string) {
    if (true) return { poem: poemDetail, translations: poemTranslations }
    try {
      const data = await apiGet<any>(`/poetry/${id}`)
      return {
        poem: data.poem || poemDetail,
        translations: data.translations || poemTranslations,
      }
    } catch { return { poem: poemDetail, translations: poemTranslations } }
  },
}
