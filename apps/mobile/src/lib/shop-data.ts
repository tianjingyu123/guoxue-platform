/**
 * 商城数据层 - 从原型 app/mall/page.tsx、app/shop/page.tsx、components/mall/marketing-zone.tsx 1:1 迁移
 * mock 数据 + 类型 + 装配函数。图片走 /static（跨端约定）。
 */
import type { ProductCardData } from '@/lib/card-utils'
import { apiGet, apiPost, useMock } from '@/utils/request'

const P = '/static/images/products'

/* ============================================================
   一、mall 首页（商城首页 · 卡片库驱动）
   ============================================================ */

/** 核心功能快捷入口（含秒杀/拼团/订单/优惠券） */
export interface MallQuickEntry {
  id: string
  label: string
  icon: string
  href: string
  state?: string
  badge?: number
}
export const mallQuickEntries: MallQuickEntry[] = [
  { id: 'seckill', label: '限时秒杀', icon: 'zap', href: '/shop/flash-sale', state: '进行中' },
  { id: 'group', label: '超值拼团', icon: 'users', href: '/shop/group-buy', state: '进行中' },
  { id: 'orders', label: '我的订单', icon: 'file-text', href: '/orders' },
  { id: 'coupons', label: '优惠券', icon: 'ticket', href: '/shop/coupons', badge: 2 },
]

/** Banner（渐变色块文字横幅） */
export interface MallBanner {
  id: number
  title: string
  subtitle: string
  /** 渐变起止色（自左向右） */
  from: string
  to: string
  href: string
}
export const mallBanners: MallBanner[] = [
  { id: 1, title: '新人专享', subtitle: '首单立减20元', from: '#d0405a', to: '#c41e3a', href: '/shop/coupons' },
  { id: 2, title: '国学典籍', subtitle: '周易全系列8折', from: '#d4b87d', to: '#c9a96e', href: '/mall/category?cat=books' },
  { id: 3, title: '开运饰品', subtitle: '买二赠一', from: '#3b82f6', to: '#2563eb', href: '/mall/category?cat=jewelry' },
]

/** 电商直播（rail 横滑） */
export interface MallLive {
  id: number
  title: string
  host: string
  viewers?: number
  reservations?: number
  status: 'live' | 'upcoming'
  scheduledTime?: string
}
export const mallCommerceLives: MallLive[] = [
  { id: 1, title: '开光吉祥物专场', host: '福缘阁主', viewers: 8920, status: 'live' },
  { id: 2, title: '周易古籍珍藏版专场', host: '古籍书阁', viewers: 4150, status: 'live' },
  { id: 3, title: '手工罗盘制作与售卖', host: '匠心堂', reservations: 526, status: 'upcoming', scheduledTime: '明天14:00' },
]

/** 商品分类（emoji 图标，1:1 还原原型） */
export interface MallCategory {
  id: string
  name: string
  icon: string
}
export const mallCategories: MallCategory[] = [
  { id: 'books', name: '书籍', icon: '📚' },
  { id: 'culture', name: '文创', icon: '🎨' },
  { id: 'jewelry', name: '饰品', icon: '📿' },
  { id: 'peripheral', name: '周边', icon: '🎁' },
  { id: 'tools', name: '工具', icon: '🧭' },
  { id: 'incense', name: '香道', icon: '🕯️' },
  { id: 'tea', name: '茶器', icon: '🍵' },
  { id: 'all', name: '全部', icon: '⋯' },
]

/** 猜你喜欢（统一卡片库 feed 变体） */
export const mallProducts: ProductCardData[] = [
  { id: 1, title: '周易正义·十三经注疏本', cover: `${P}/book1.jpg`, price: 68, originalPrice: 128, sales: 2341, tag: '热销' },
  { id: 2, title: '紫微斗数全书（精装版）', cover: `${P}/book2.jpg`, price: 98, originalPrice: 168, sales: 1856, tag: '新品' },
  { id: 3, title: '太极八卦铜摆件', cover: `${P}/item1.jpg`, price: 168, originalPrice: 298, sales: 892 },
  { id: 4, title: '天然黑曜石貔貅手链', cover: `${P}/item2.jpg`, price: 128, originalPrice: 258, sales: 1523, tag: '热销' },
  { id: 5, title: '檀香木罗盘摆件', cover: `${P}/item3.jpg`, price: 388, originalPrice: 588, sales: 456 },
  { id: 6, title: '梅花易数入门', cover: `${P}/book3.jpg`, price: 45, originalPrice: 78, sales: 3201, tag: '秒杀' },
  { id: 7, title: '六爻铜钱套装（古法铸造）', cover: `${P}/item4.jpg`, price: 88, originalPrice: 128, sales: 2156 },
  { id: 8, title: '沉香线香礼盒', cover: `${P}/item5.jpg`, price: 168, originalPrice: 268, sales: 678, tag: '新品' },
  { id: 9, title: '奇门遁甲精义', cover: `${P}/book4.jpg`, price: 88, originalPrice: 148, sales: 1234 },
  { id: 10, title: '紫水晶七星阵', cover: `${P}/item6.jpg`, price: 298, originalPrice: 498, sales: 345, tag: '热销' },
  { id: 11, title: '风水罗盘专业版', cover: `${P}/item7.jpg`, price: 688, originalPrice: 988, sales: 234 },
  { id: 12, title: '四库全书·术数类', cover: `${P}/book5.jpg`, price: 268, originalPrice: 398, sales: 567 },
]

/* ============================================================
   二、营销活动区（MarketingZone：限时秒杀 + 超值拼团）
   ============================================================ */

export interface SeckillItem {
  id: number
  title: string
  cover: string
  price: number
  originalPrice: number
}
export const seckillItems: SeckillItem[] = [
  { id: 6, title: '梅花易数入门', cover: `${P}/book3.jpg`, price: 45, originalPrice: 78 },
  { id: 1, title: '周易正义注疏本', cover: `${P}/book1.jpg`, price: 68, originalPrice: 128 },
  { id: 4, title: '黑曜石貔貅手链', cover: `${P}/item2.jpg`, price: 128, originalPrice: 258 },
]

export interface GroupItem {
  id: number
  title: string
  cover: string
  groupPrice: number
  originalPrice: number
  joined: number
  need: number
}
export const groupItems: GroupItem[] = [
  { id: 2, title: '紫微斗数全书（精装版）', cover: `${P}/book2.jpg`, groupPrice: 78, originalPrice: 168, joined: 2, need: 3 },
]

/* ============================================================
   三、shop 首页（深度购物板块入口页）
   ============================================================ */

/** 快捷活动入口（渐变方块） */
export interface ShopQuickAction {
  id: string
  name: string
  icon: string
  /** 渐变起止色 */
  from: string
  to: string
  link: string
}
export const shopQuickActions: ShopQuickAction[] = [
  { id: 'flash', name: '限时秒杀', icon: 'zap', from: '#ef4444', to: '#f97316', link: '/shop/flash-sale' },
  { id: 'group', name: '拼团特惠', icon: 'users', from: '#f97316', to: '#f59e0b', link: '/shop/group-buy' },
  { id: 'coupon', name: '领券中心', icon: 'ticket', from: '#ec4899', to: '#f43f5e', link: '/shop/coupons' },
  { id: 'points', name: '积分兑换', icon: 'gift', from: '#a855f7', to: '#6366f1', link: '/shop/exchange' },
]

/** shop banner（纯色块标题，红色渐变背景） */
export interface ShopBanner {
  id: string
  title: string
  link: string
}
export const shopBanners: ShopBanner[] = [
  { id: '1', title: '国学典籍大促', link: '/shop/activity/1' },
  { id: '2', title: '新品上市', link: '/shop/products?tag=new' },
  { id: '3', title: '会员专享', link: '/shop/vip' },
]

/** shop 分类圆形图标网格 */
export const shopCategories: MallCategory[] = [
  { id: '1', name: '古籍善本', icon: '📚' },
  { id: '2', name: '文房四宝', icon: '🖌️' },
  { id: '3', name: '香道用品', icon: '🪷' },
  { id: '4', name: '茶道器具', icon: '🍵' },
  { id: '5', name: '命理工具', icon: '🧭' },
  { id: '6', name: '风水摆件', icon: '🏺' },
  { id: '7', name: '养生食品', icon: '🌿' },
  { id: '8', name: '更多分类', icon: '📋' },
]

/** shop 秒杀专区（红色大卡，含倒计时，结束时间=当前+2小时） */
export interface ShopFlashProduct {
  id: string
  name: string
  cover: string
  price: number
  originalPrice: number
  stock: number
  sold: number
}
export const shopFlashSale = {
  id: '1',
  title: '限时秒杀',
  /** 距结束秒数（2 小时） */
  durationSec: 3600 * 2,
  products: [
    { id: '1', name: '渊海子平精装版', cover: `${P}/book1.jpg`, price: 68, originalPrice: 128, stock: 100, sold: 78 },
    { id: '2', name: '罗盘专业款', cover: `${P}/item7.jpg`, price: 199, originalPrice: 399, stock: 50, sold: 45 },
    { id: '3', name: '紫檀木签筒', cover: `${P}/item4.jpg`, price: 88, originalPrice: 168, stock: 200, sold: 156 },
  ] as ShopFlashProduct[],
}

/** shop 拼团专区 */
export const shopGroupBuy = {
  id: '1',
  title: '3人成团',
  cover: `${P}/book2.jpg`,
  price: 299,
  originalPrice: 599,
  minMembers: 3,
  currentMembers: 2,
  productName: '周易全集精装套装',
}

/** shop 为你推荐（自带评分/热销/新品角标，与 mall feed 卡略不同，故单独建型） */
export interface ShopRecProduct {
  id: string
  name: string
  cover: string
  price: number
  originalPrice: number
  sales: number
  rating: number
  category: string
  isHot?: boolean
  isNew?: boolean
}
export const shopRecProducts: ShopRecProduct[] = [
  { id: '1', name: '渊海子平（精装典藏版）', cover: `${P}/book1.jpg`, price: 128, originalPrice: 168, sales: 2860, rating: 4.9, category: '古籍', isHot: true },
  { id: '2', name: '专业风水罗盘', cover: `${P}/item7.jpg`, price: 399, originalPrice: 599, sales: 1250, rating: 4.8, category: '工具', isNew: true },
  { id: '3', name: '紫檀木文房套装', cover: `${P}/item4.jpg`, price: 688, originalPrice: 888, sales: 560, rating: 4.9, category: '文房' },
  { id: '4', name: '沉香线香礼盒', cover: `${P}/item5.jpg`, price: 168, originalPrice: 238, sales: 3200, rating: 4.7, category: '香道', isHot: true },
  { id: '5', name: '紫砂茶具套装', cover: `${P}/item3.jpg`, price: 458, originalPrice: 658, sales: 890, rating: 4.8, category: '茶道' },
  { id: '6', name: '黄铜貔貅摆件', cover: `${P}/item2.jpg`, price: 299, originalPrice: 399, sales: 1560, rating: 4.6, category: '摆件', isNew: true },
]

/** 全局购物车角标数（mock） */
export const cartCount = 3

/* ============================================================
   四、商品详情页（app/mall/product/[id]）
   ============================================================ */

export interface SpecOption { id: string; label: string; price: number; stock: number }
export interface SpecGroup { name: string; options: SpecOption[] }
export interface ProductReview {
  id: number
  user: { name: string; avatar: string }
  rating: number
  content: string
  images: string[]
  date: string
  likes: number
  spec: string
}
export interface ProductDetail {
  id: number
  title: string
  subtitle: string
  images: string[]
  hasVideo: boolean
  price: number
  originalPrice: number
  coupon: { value: number; threshold: number }
  sales: number
  stock: number
  specs: SpecGroup[]
  rating: number
  reviewCount: number
  tags: string[]
  reviews: ProductReview[]
  description: string
}

/** 头像走 dicebear（与 circle-bots-data 约定一致） */
const AVATAR = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`

export const productDetail: ProductDetail = {
  id: 1,
  title: '周易正义·十三经注疏本（全四册）',
  subtitle: '唐·孔颖达 疏',
  images: [`${P}/book1.jpg`, `${P}/book2.jpg`, `${P}/book4.jpg`, `${P}/book5.jpg`],
  hasVideo: true,
  price: 68,
  originalPrice: 128,
  coupon: { value: 10, threshold: 99 },
  sales: 2341,
  stock: 856,
  specs: [
    {
      name: '版本',
      options: [
        { id: 'standard', label: '标准版', price: 68, stock: 500 },
        { id: 'deluxe', label: '精装版', price: 128, stock: 200 },
        { id: 'collector', label: '收藏版', price: 268, stock: 50 },
      ],
    },
    {
      name: '数量',
      options: [
        { id: '1', label: '1套', price: 0, stock: 999 },
        { id: '2', label: '2套', price: 0, stock: 999 },
        { id: '3', label: '3套', price: 0, stock: 999 },
      ],
    },
  ],
  rating: 4.9,
  reviewCount: 1256,
  tags: ['质量好', '包装精美', '内容详实', '印刷清晰'],
  reviews: [
    {
      id: 1,
      user: { name: '易学爱好者', avatar: AVATAR('yixue') },
      rating: 5,
      content: '非常好的版本，注疏详尽，印刷质量很高，纸张也很好。作为入门和进阶学习周易的必备书籍。',
      images: [`${P}/book1.jpg`, `${P}/book2.jpg`],
      date: '2024-03-15',
      likes: 128,
      spec: '精装版',
    },
    {
      id: 2,
      user: { name: '国学传承', avatar: AVATAR('guoxue') },
      rating: 5,
      content: '孔颖达的正义注疏是研究周易的权威版本，这个出版质量很好，值得收藏。',
      images: [],
      date: '2024-03-10',
      likes: 86,
      spec: '收藏版',
    },
    {
      id: 3,
      user: { name: '命理研究', avatar: AVATAR('mingli') },
      rating: 4,
      content: '书的内容没话说，就是物流有点慢，等了好几天。整体还是很满意的。',
      images: [`${P}/book4.jpg`],
      date: '2024-03-08',
      likes: 45,
      spec: '标准版',
    },
  ],
  description:
    '《周易正义》是唐代孔颖达等奉敕编撰的儒家经典注疏，是"十三经注疏"之一，也是现存最早、最权威的《周易》注疏本。\n\n本书特点：\n• 原文+注释+疏解三位一体\n• 采用宋刻底本，校勘精审\n• 繁体竖排，古籍原貌\n• 全四册精装，便于翻阅收藏\n\n适合人群：\n• 周易研究者、国学爱好者\n• 命理学、风水学从业者\n• 高校古典文献学专业师生\n• 传统文化收藏爱好者',
}

export function getProductDetail(_id?: string | number): ProductDetail {
  return productDetail
}

/* ============================================================
   五、商品分类页（app/mall/category）
   ============================================================ */

export interface CategoryTab { id: string; name: string; count: number }
export const categoryTabs: CategoryTab[] = [
  { id: 'all', name: '全部', count: 256 },
  { id: 'books', name: '书籍', count: 86 },
  { id: 'creative', name: '文创', count: 42 },
  { id: 'jewelry', name: '饰品', count: 38 },
  { id: 'course', name: '课程周边', count: 24 },
  { id: 'tea', name: '茶具香道', count: 32 },
  { id: 'stationery', name: '文房四宝', count: 28 },
  { id: 'clothing', name: '国风服饰', count: 18 },
]

export interface CategorySortOption { id: string; name: string }
export const categorySortOptions: CategorySortOption[] = [
  { id: 'default', name: '综合排序' },
  { id: 'sales', name: '销量优先' },
  { id: 'price_asc', name: '价格升序' },
  { id: 'price_desc', name: '价格降序' },
  { id: 'newest', name: '最新上架' },
]

export interface CategoryProduct {
  id: number
  name: string
  price: number
  originalPrice: number
  sales: number
  category: string
  cover: string
  isMemberFree: boolean
}
export const categoryProducts: CategoryProduct[] = [
  { id: 1, name: '《渊海子平》精装典藏版', price: 128, originalPrice: 168, sales: 2856, category: 'books', cover: `${P}/book1.jpg`, isMemberFree: false },
  { id: 2, name: '八卦太极挂件纯铜', price: 68, originalPrice: 98, sales: 1256, category: 'jewelry', cover: `${P}/item1.jpg`, isMemberFree: false },
  { id: 3, name: '国学书签套装礼盒', price: 39, originalPrice: 59, sales: 3680, category: 'creative', cover: `${P}/item5.jpg`, isMemberFree: true },
  { id: 4, name: '《滴天髓》白话详解', price: 88, originalPrice: 118, sales: 1892, category: 'books', cover: `${P}/book2.jpg`, isMemberFree: false },
  { id: 5, name: '紫砂茶壶 手工刻绘', price: 368, originalPrice: 468, sales: 568, category: 'tea', cover: `${P}/item3.jpg`, isMemberFree: false },
  { id: 6, name: '湖笔套装 书法入门', price: 158, originalPrice: 198, sales: 892, category: 'stationery', cover: `${P}/item4.jpg`, isMemberFree: false },
  { id: 7, name: '罗盘模型 风水摆件', price: 199, originalPrice: 299, sales: 1456, category: 'jewelry', cover: `${P}/item7.jpg`, isMemberFree: false },
  { id: 8, name: '《三命通会》全译本', price: 148, originalPrice: 188, sales: 1128, category: 'books', cover: `${P}/book4.jpg`, isMemberFree: false },
  { id: 9, name: '沉香线香 养生助眠', price: 89, originalPrice: 128, sales: 2156, category: 'tea', cover: `${P}/item5.jpg`, isMemberFree: false },
  { id: 10, name: '课程笔记本 手账本', price: 29, originalPrice: 49, sales: 4562, category: 'course', cover: `${P}/book3.jpg`, isMemberFree: true },
  { id: 11, name: '五帝钱挂饰 开光铜钱', price: 58, originalPrice: 88, sales: 3256, category: 'jewelry', cover: `${P}/item2.jpg`, isMemberFree: false },
  { id: 12, name: '端砚 文房珍品', price: 688, originalPrice: 888, sales: 286, category: 'stationery', cover: `${P}/item6.jpg`, isMemberFree: false },
]

/* ============================================================
   六、商品评价页（app/mall/product/[id]/reviews）
   ============================================================ */

export interface ReviewTag { id: string; label: string; count: number }
export const reviewTags: ReviewTag[] = [
  { id: 'all', label: '全部', count: 328 },
  { id: 'quality', label: '质量好', count: 128 },
  { id: 'texture', label: '有质感', count: 86 },
  { id: 'value', label: '性价比高', count: 72 },
  { id: 'packaging', label: '包装精美', count: 56 },
  { id: 'delivery', label: '物流快', count: 42 },
  { id: 'authentic', label: '正品保证', count: 38 },
]

export interface ReviewSortOption { id: string; label: string }
export const reviewSortOptions: ReviewSortOption[] = [
  { id: 'default', label: '默认排序' },
  { id: 'newest', label: '最新评价' },
  { id: 'withImages', label: '有图优先' },
  { id: 'mostLikes', label: '最多点赞' },
]

export interface FullReview {
  id: number
  user: { name: string; avatar: string; level: string }
  rating: number
  content: string
  images: string[]
  spec: string
  time: string
  likes: number
  tags: string[]
  reply: { content: string; time: string } | null
}
export const fullReviews: FullReview[] = [
  { id: 1, user: { name: '易学爱好者', avatar: AVATAR('yixue'), level: 'VIP会员' }, rating: 5, content: '这本书内容非常详实，从基础到进阶都有涉及，适合各个阶段的学习者。印刷质量很好，纸张厚实，字迹清晰。配合排盘工具学习效果更佳！', images: [`${P}/book1.jpg`, `${P}/book2.jpg`, `${P}/book4.jpg`], spec: '精装版', time: '2024-01-15', likes: 56, tags: ['quality', 'texture', 'value'], reply: { content: '感谢您的认可！我们精选优质纸张，确保阅读体验。祝您学习愉快！', time: '2024-01-16' } },
  { id: 2, user: { name: '命理研究者', avatar: AVATAR('mingli'), level: '圈主' }, rating: 5, content: '作为从业多年的命理师，这本书的内容让我眼前一亮。理论扎实，案例丰富，是难得的好书。已经推荐给圈子里的学员了。', images: [`${P}/book5.jpg`], spec: '典藏版', time: '2024-01-12', likes: 42, tags: ['quality', 'authentic'], reply: null },
  { id: 3, user: { name: '国学新手', avatar: AVATAR('xinshou'), level: '' }, rating: 4, content: '书的内容很好，就是对于完全零基础的人来说有点难度，需要配合入门课程一起学习。物流很快，包装完好。', images: [], spec: '平装版', time: '2024-01-10', likes: 18, tags: ['delivery', 'packaging'], reply: { content: '感谢您的反馈！建议搭配我们的《八字入门课》一起学习，效果更佳哦~', time: '2024-01-11' } },
  { id: 4, user: { name: '传统文化爱好者', avatar: AVATAR('chuantong'), level: 'VIP会员' }, rating: 5, content: '包装很精美，书籍质量上乘，内容深入浅出，值得收藏！', images: [`${P}/book3.jpg`, `${P}/item5.jpg`], spec: '精装版', time: '2024-01-08', likes: 35, tags: ['packaging', 'quality', 'texture'], reply: null },
  { id: 5, user: { name: '风水师小李', avatar: AVATAR('fengshui'), level: '讲师' }, rating: 5, content: '专业书籍，内容考究，引经据典，是学习八字的必备参考书。强烈推荐！', images: [], spec: '典藏版', time: '2024-01-05', likes: 28, tags: ['quality', 'authentic'], reply: null },
]
export const reviewSummary = { goodRatePercent: 98, rating: 4.9, total: 328 }

/* ============================================================
   七、商品对比页（app/shop/compare）
   ============================================================ */

export interface CompareSpec { name: string; value: string }
export interface CompareProduct {
  id: string
  name: string
  cover: string
  price: number
  originalPrice: number
  sales: number
  rating: number
  category: string
  specs: CompareSpec[]
}
export const compareProducts: Record<string, CompareProduct> = {
  p1: { id: 'p1', name: '八字命理精研课', cover: `${P}/book1.jpg`, price: 299, originalPrice: 499, sales: 2341, rating: 4.8, category: '命理', specs: [{ name: '课时', value: '48节' }, { name: '有效期', value: '永久' }, { name: '讲师', value: '王命理' }, { name: '学员数', value: '2341人' }, { name: '证书', value: '含结课证书' }, { name: '答疑', value: '7天内' }, { name: '格式', value: '视频' }, { name: '难度', value: '中级' }] },
  p2: { id: 'p2', name: '紫微斗数入门', cover: `${P}/book2.jpg`, price: 199, originalPrice: 299, sales: 1823, rating: 4.6, category: '命理', specs: [{ name: '课时', value: '32节' }, { name: '有效期', value: '365天' }, { name: '讲师', value: '李斗数' }, { name: '学员数', value: '1823人' }, { name: '证书', value: '不含证书' }, { name: '答疑', value: '3天内' }, { name: '格式', value: '视频+图文' }, { name: '难度', value: '入门' }] },
  p3: { id: 'p3', name: '六爻预测实战课', cover: `${P}/book4.jpg`, price: 399, originalPrice: 599, sales: 987, rating: 4.9, category: '命理', specs: [{ name: '课时', value: '60节' }, { name: '有效期', value: '永久' }, { name: '讲师', value: '张六爻' }, { name: '学员数', value: '987人' }, { name: '证书', value: '含结课证书' }, { name: '答疑', value: '24小时内' }, { name: '格式', value: '视频' }, { name: '难度', value: '高级' }] },
  p4: { id: 'p4', name: '奇门遁甲核心', cover: `${P}/book5.jpg`, price: 499, originalPrice: 799, sales: 654, rating: 4.7, category: '命理', specs: [{ name: '课时', value: '72节' }, { name: '有效期', value: '永久' }, { name: '讲师', value: '刘奇门' }, { name: '学员数', value: '654人' }, { name: '证书', value: '含结课证书' }, { name: '答疑', value: '7天内' }, { name: '格式', value: '视频' }, { name: '难度', value: '高级' }] },
  p5: { id: 'p5', name: '风水堪舆基础', cover: `${P}/item7.jpg`, price: 159, originalPrice: 259, sales: 1120, rating: 4.5, category: '命理', specs: [{ name: '课时', value: '24节' }, { name: '有效期', value: '365天' }, { name: '讲师', value: '陈风水' }, { name: '学员数', value: '1120人' }, { name: '证书', value: '不含证书' }, { name: '答疑', value: '3天内' }, { name: '格式', value: '视频' }, { name: '难度', value: '入门' }] },
}
export const comparePickList = ['p1', 'p2', 'p3', 'p4', 'p5']

/* ============================================================
   八、限时秒杀（app/shop/flash-sale）
   ============================================================ */

export interface FlashTimeSlot { id: string; label: string; time: string }
export const flashTimeSlots: FlashTimeSlot[] = [
  { id: '10', label: '10:00', time: '10:00:00' },
  { id: '14', label: '14:00', time: '14:00:00' },
  { id: '18', label: '18:00', time: '18:00:00' },
  { id: '20', label: '20:00', time: '20:00:00' },
  { id: '22', label: '22:00', time: '22:00:00' },
]

export interface FlashProduct {
  id: string
  name: string
  cover: string
  price: number
  originalPrice: number
  stock: number
  sold: number
}
export const flashProducts: FlashProduct[] = [
  { id: 'p1', name: '周易六十四卦详解', cover: `${P}/book1.jpg`, price: 68, originalPrice: 168, stock: 100, sold: 78 },
  { id: 'p2', name: '紫微斗数入门', cover: `${P}/book2.jpg`, price: 38, originalPrice: 98, stock: 50, sold: 45 },
  { id: 'p3', name: '风水入门指南', cover: `${P}/book4.jpg`, price: 28, originalPrice: 88, stock: 200, sold: 156 },
  { id: 'p4', name: '八字命理基础', cover: `${P}/book5.jpg`, price: 48, originalPrice: 128, stock: 80, sold: 62 },
]
/** 滚动通知 */
export const flashNotices = [
  '用户 138****8888 刚刚抢到了「周易六十四卦详解」',
  '用户 156****6666 抢购成功',
  '限时秒杀，手慢无！',
]
/** 秒杀结束时间（now + 2h），运行时计算倒计时 */
export const flashEndOffsetMs = 2 * 60 * 60 * 1000

/* ============================================================
   九、拼团（app/shop/group-buy 列表/详情/成功/失败）
   ============================================================ */

export interface GroupBuyItem {
  id: string
  title: string
  cover: string
  price: number
  originalPrice: number
  minMembers: number
  currentMembers: number
  endOffsetMs: number
  status: 'ongoing' | 'success'
}
export const groupBuyList: GroupBuyItem[] = [
  { id: '1', title: '周易六十四卦详解', cover: `${P}/book1.jpg`, price: 99, originalPrice: 168, minMembers: 3, currentMembers: 2, endOffsetMs: 8 * 3600000, status: 'ongoing' },
  { id: '2', title: '紫微斗数入门精讲', cover: `${P}/book2.jpg`, price: 128, originalPrice: 238, minMembers: 5, currentMembers: 3, endOffsetMs: 12 * 3600000, status: 'ongoing' },
  { id: '3', title: '风水学基础教程', cover: `${P}/book4.jpg`, price: 68, originalPrice: 128, minMembers: 3, currentMembers: 3, endOffsetMs: -3600000, status: 'success' },
]

export interface MyGroupBuyItem {
  id: string
  productId: string
  productName: string
  productCover: string
  price: number
  status: 'pending' | 'success' | 'failed'
  memberCount: number
  minMembers: number
  currentMembers: number
  endOffsetMs: number
  isOwner: boolean
}
export const myGroupBuyList: MyGroupBuyItem[] = [
  { id: 'g1', productId: '1', productName: '周易六十四卦详解', productCover: `${P}/book1.jpg`, price: 99, status: 'pending', memberCount: 2, minMembers: 3, currentMembers: 2, endOffsetMs: 6 * 3600000, isOwner: true },
]

export interface GroupBuyDetailData {
  id: string
  title: string
  cover: string
  price: number
  originalPrice: number
  minMembers: number
  description: string
  rules: string[]
}
export const groupBuyDetail: GroupBuyDetailData = {
  id: '1',
  title: '周易六十四卦详解',
  cover: `${P}/book1.jpg`,
  price: 99,
  originalPrice: 199,
  minMembers: 3,
  description: '精装典藏版，收录完整六十四卦卦辞、爻辞及历代名家注解。',
  rules: ['拼团有效期24小时', '成团后不可退款', '未成团自动退款'],
}

export interface ActiveGroup {
  id: string
  owner: { name: string; avatar: string }
  members: { name: string; avatar: string }[]
  currentMembers: number
  minMembers: number
  endOffsetMs: number
}
export const activeGroups: ActiveGroup[] = [
  { id: 'ag1', owner: { name: '张三', avatar: AVATAR('zhangsan') }, members: [{ name: '李四', avatar: AVATAR('lisi') }], currentMembers: 2, minMembers: 3, endOffsetMs: 2 * 3600000 },
  { id: 'ag2', owner: { name: '王五', avatar: AVATAR('wangwu') }, members: [], currentMembers: 1, minMembers: 3, endOffsetMs: 5 * 3600000 },
]

/** 拼团成功页 */
export const groupBuySuccess = {
  productName: '周易六十四卦详解（精装典藏版）',
  productCover: `${P}/book1.jpg`,
  price: 128,
  originalPrice: 298,
  members: [
    { name: '张三', avatar: AVATAR('zhangsan') },
    { name: '李四', avatar: AVATAR('lisi') },
    { name: '王五', avatar: AVATAR('wangwu') },
  ],
  completedAt: '2024-01-15 14:30:00',
  orderId: 'GB202401150001',
  estimatedShipDate: '2024-01-17',
}

/** 拼团失败页 */
export const groupBuyFail = {
  groupId: 'g123',
  orderId: '2024010100001',
  productName: '紫微斗数入门教程（精装版）',
  productCover: `${P}/book2.jpg`,
  price: 128,
  reason: 'timeout' as 'timeout' | 'stock' | 'other',
  members: [{ name: '张三', avatar: AVATAR('zhangsan') }],
  minMembers: 3,
  currentMembers: 1,
  failedAt: '2024-01-15 18:00:00',
  refundStatus: 'processing' as 'pending' | 'processing' | 'completed',
  refundAmount: 128,
  estimatedRefundTime: '2024-01-18',
}

/* ============================================================
   十、优惠券（app/shop/coupons 领券中心 / coupon-detail）
   ============================================================ */

export type CouponType = 'amount' | 'percent' | 'discount'
export type CouponStatus = 'unused' | 'used' | 'expired'
export interface MyCoupon {
  id: string
  name: string
  type: CouponType
  value: number
  minAmount: number
  expireAt: string
  scope: string[]
  status: CouponStatus
}
export const myCoupons: MyCoupon[] = [
  { id: '1', name: '新人专享券', type: 'amount', value: 50, minAmount: 200, expireAt: '2024-12-31', scope: ['全场通用'], status: 'unused' },
  { id: '2', name: '满减优惠券', type: 'amount', value: 30, minAmount: 300, expireAt: '2024-12-31', scope: ['课程'], status: 'unused' },
  { id: '3', name: '八折券', type: 'percent', value: 80, minAmount: 100, expireAt: '2024-11-30', scope: ['商城'], status: 'unused' },
  { id: '4', name: '满100减20', type: 'amount', value: 20, minAmount: 100, expireAt: '2024-10-15', scope: ['全场通用'], status: 'used' },
  { id: '5', name: '限时折扣', type: 'discount', value: 10, minAmount: 50, expireAt: '2024-09-01', scope: ['直播'], status: 'expired' },
]

export interface CenterCoupon {
  id: string
  name: string
  type: CouponType
  value: number
  minAmount: number
  expireAt: string
  scope: string[]
  stock: number
  claimed: number
  isClaimed: boolean
}
export const centerCoupons: CenterCoupon[] = [
  { id: 'c1', name: '限时新人礼', type: 'amount', value: 100, minAmount: 500, expireAt: '2024-12-31', scope: ['全场通用'], stock: 100, claimed: 45, isClaimed: false },
  { id: 'c2', name: '课程专享', type: 'percent', value: 85, minAmount: 200, expireAt: '2024-12-31', scope: ['课程'], stock: 200, claimed: 180, isClaimed: false },
  { id: 'c3', name: '商城满减', type: 'amount', value: 20, minAmount: 100, expireAt: '2024-12-31', scope: ['商城'], stock: 500, claimed: 320, isClaimed: true },
]

export const couponTabs = [
  { key: 'unused', label: '未使用' },
  { key: 'used', label: '已使用' },
  { key: 'expired', label: '已过期' },
  { key: 'center', label: '领券中心' },
]

/** 优惠券面值展示 */
export function formatCouponValue(c: { type: CouponType; value: number }): string {
  if (c.type === 'amount') return `¥${c.value}`
  if (c.type === 'percent') return `${c.value / 10}折`
  return `减¥${c.value}`
}

/** 券详情页 */
export interface CouponApplicableItem { id: string; type: 'product' | 'course'; name: string; image: string; price: number }
export const couponDetail = {
  id: '1',
  name: '新人立减50元',
  value: 50,
  minAmount: 200,
  expireAt: '2024-12-31',
  description: '新用户首次下单享受优惠，满200元减50元',
  rules: ['新用户首次购物订单享受', '单笔订单满200元可使用', '不与其他优惠叠加使用', '仅限商品购买，不适用课程'],
  applicableItems: [
    { id: '1', type: 'product', name: '周易六十四卦详解（精装典藏版）', image: `${P}/book1.jpg`, price: 298 },
    { id: '2', type: 'product', name: '紫微斗数入门教程', image: `${P}/book2.jpg`, price: 128 },
    { id: '3', type: 'course', name: '八字基础入门课', image: `${P}/book4.jpg`, price: 299 },
    { id: '4', type: 'product', name: '易经风水运势解读', image: `${P}/book5.jpg`, price: 188 },
  ] as CouponApplicableItem[],
}

/** 倒计时格式化：传入剩余毫秒 → {h,m,s,expired} */
export function formatCountdown(diffMs: number) {
  if (diffMs <= 0) return { h: '00', m: '00', s: '00', expired: true }
  const h = Math.floor(diffMs / 3600000)
  const m = Math.floor((diffMs % 3600000) / 60000)
  const s = Math.floor((diffMs % 60000) / 1000)
  return {
    h: String(h).padStart(2, '0'),
    m: String(m).padStart(2, '0'),
    s: String(s).padStart(2, '0'),
    expired: false,
  }
}

/* ============================================================
   十一、购物车（按卖家分组 - 原型 app/cart）
   ============================================================ */

export interface GroupCartItem {
  id: number
  name: string
  spec: string
  price: number
  originalPrice: number
  quantity: number
  image: string
  type: 'product' | 'course'
}
export interface CartSellerGroup {
  id: number
  sellerName: string
  sellerAvatar: string
  sellerType: 'circle' | 'store'
  freeShippingThreshold: number
  items: GroupCartItem[]
}
export const cartGroups: CartSellerGroup[] = [
  {
    id: 1,
    sellerName: '易道书院',
    sellerAvatar: AVATAR('yidao'),
    sellerType: 'circle',
    freeShippingThreshold: 199,
    items: [
      { id: 1, name: '《渊海子平》精装典藏版', spec: '精装版 / 全三册', price: 168, originalPrice: 298, quantity: 1, image: `${P}/book1.jpg`, type: 'product' },
      { id: 2, name: '八字命理入门到精通', spec: '视频课程 / 共36节', price: 299, originalPrice: 599, quantity: 1, image: `${P}/book2.jpg`, type: 'course' },
    ],
  },
  {
    id: 2,
    sellerName: '玄学文创旗舰店',
    sellerAvatar: AVATAR('xuanxue'),
    sellerType: 'store',
    freeShippingThreshold: 99,
    items: [
      { id: 3, name: '天然黑曜石貔貅手链', spec: '14mm / 男款', price: 128, originalPrice: 199, quantity: 2, image: `${P}/item1.jpg`, type: 'product' },
    ],
  },
]
export interface InvalidCartItem { id: number; name: string; spec: string; price: number; image: string; reason: string }
export const cartInvalidItems: InvalidCartItem[] = [
  { id: 101, name: '限量版紫水晶摆件', spec: '已下架', price: 388, image: `${P}/item6.jpg`, reason: '商品已下架' },
]
export interface CartRecommendItem { id: number; name: string; price: number; image: string }
export const cartRecommendProducts: CartRecommendItem[] = [
  { id: 1, name: '紫微斗数全书', price: 88, image: `${P}/book4.jpg` },
  { id: 2, name: '开光铜钱挂件', price: 68, image: `${P}/item2.jpg` },
  { id: 3, name: '风水罗盘专业版', price: 268, image: `${P}/item7.jpg` },
  { id: 4, name: '命理学基础课', price: 199, image: `${P}/book5.jpg` },
]

/* ============================================================
   十二、购物车（SKU维度 - 原型 app/shop/cart）
   ============================================================ */

export interface SkuCartItem {
  id: string
  productId: string
  productName: string
  productCover: string
  skuId: string
  skuName: string
  price: number
  originalPrice: number
  quantity: number
  stock: number
  selected: boolean
  isValid: boolean
  invalidReason?: string
}
export const skuCartItems: SkuCartItem[] = [
  { id: '1', productId: 'p1', productName: '《易经》精装典藏版', productCover: `${P}/book1.jpg`, skuId: 's1', skuName: '精装版', price: 128, originalPrice: 168, quantity: 1, stock: 99, selected: true, isValid: true },
  { id: '2', productId: 'p2', productName: '紫檀木八卦罗盘', productCover: `${P}/item7.jpg`, skuId: 's2', skuName: '标准款', price: 388, originalPrice: 488, quantity: 2, stock: 50, selected: true, isValid: true },
  { id: '3', productId: 'p3', productName: '国学启蒙套装礼盒', productCover: `${P}/book3.jpg`, skuId: 's3', skuName: '完整版', price: 268, originalPrice: 358, quantity: 1, stock: 30, selected: false, isValid: true },
  { id: '4', productId: 'p4', productName: '【已下架】古籍善本·四库全书', productCover: `${P}/book5.jpg`, skuId: 's4', skuName: '精装版', price: 1280, originalPrice: 1680, quantity: 1, stock: 0, selected: false, isValid: false, invalidReason: '商品已下架' },
]

/* ============================================================
   十三、结算（地址 / 支付方式 / 发票）
   ============================================================ */

export interface ShippingAddress {
  id: string
  name: string
  phone: string
  province: string
  city: string
  district: string
  address: string
  isDefault: boolean
}
export const checkoutAddresses: ShippingAddress[] = [
  { id: '1', name: '张三', phone: '138****8888', province: '北京市', city: '北京市', district: '朝阳区', address: '建国路88号SOHO现代城A座1201', isDefault: true },
  { id: '2', name: '李四', phone: '139****9999', province: '上海市', city: '上海市', district: '浦东新区', address: '张江高科技园区博云路2号', isDefault: false },
]

export interface PayMethodOption { id: string; name: string; badge: string; badgeColor: string }
export const payMethods: PayMethodOption[] = [
  { id: 'wechat', name: '微信支付', badge: '微', badgeColor: '#07C160' },
  { id: 'alipay', name: '支付宝', badge: '支', badgeColor: '#1677FF' },
  { id: 'unionpay', name: '云闪付', badge: '云', badgeColor: '#C41E3A' },
  { id: 'huifu', name: '汇付天下', badge: '汇', badgeColor: '#FF8800' },
]

export interface CheckoutItem { id: string; productId: string; productName: string; productCover: string; skuName: string; price: number; originalPrice: number; quantity: number }
export const checkoutItems: CheckoutItem[] = [
  { id: '1', productId: 'p1', productName: '周易六十四卦详解（精装典藏版）', productCover: `${P}/book1.jpg`, skuName: '精装版', price: 168, originalPrice: 298, quantity: 1 },
  { id: '2', productId: 'p2', productName: '紫微斗数入门教程', productCover: `${P}/book2.jpg`, skuName: '平装版', price: 88, originalPrice: 128, quantity: 2 },
]
export interface CheckoutCoupon { id: string; name: string; value: number; minAmount: number }
export const checkoutCoupons: CheckoutCoupon[] = [
  { id: '1', name: '新人专享', value: 50, minAmount: 200 },
  { id: '2', name: '满300减30', value: 30, minAmount: 300 },
]
export const invoiceOptions = [
  { value: 'none', label: '不开发票', desc: '无需发票' },
  { value: 'personal', label: '个人发票', desc: '电子发票，购买后发送至邮箱' },
  { value: 'company', label: '企业发票', desc: '需要填写企业税号' },
]

/* ============================================================
   十四、支付方式管理（app/shop/payment-methods）
   ============================================================ */

export interface BoundPaymentMethod {
  id: string
  type: 'wechat' | 'alipay' | 'bank_card'
  name: string
  account: string
  isDefault: boolean
  bindTime: string
  bankName?: string
  cardType?: 'debit' | 'credit'
}
export const boundPaymentMethods: BoundPaymentMethod[] = [
  { id: '1', type: 'wechat', name: '微信支付', account: 'wei***@example.com', isDefault: true, bindTime: '2024-01-15' },
  { id: '2', type: 'alipay', name: '支付宝', account: '138****8888', isDefault: false, bindTime: '2024-02-20' },
  { id: '3', type: 'bank_card', name: '招商银行', account: '**** **** **** 6789', isDefault: false, bindTime: '2024-03-10', bankName: '招商银行', cardType: 'debit' },
]
export const addPaymentOptions = [
  { type: 'wechat', name: '微信支付', desc: '绑定微信账号快捷支付' },
  { type: 'alipay', name: '支付宝', desc: '绑定支付宝账号快捷支付' },
  { type: 'bank_card', name: '银行卡', desc: '添加储蓄卡或信用卡' },
]

/** 支付失败原因映射 */
export const payFailReasons: Record<string, { title: string; desc: string; icon: string }> = {
  insufficient_balance: { title: '余额不足', desc: '您的账户余额不足以完成本次支付', icon: 'wallet' },
  timeout: { title: '支付超时', desc: '支付时间已超过限制，请重新发起支付', icon: 'clock' },
  cancelled: { title: '支付已取消', desc: '您已取消本次支付', icon: 'ban' },
  network_error: { title: '网络异常', desc: '网络连接出现问题，请检查网络后重试', icon: 'alert-circle' },
  default: { title: '支付失败', desc: '支付过程中出现问题，请稍后重试', icon: 'alert-circle' },
}

/** 支付超时可能原因 */
export const payTimeoutReasons = [
  { icon: 'wifi', text: '网络连接不稳定，请检查网络后重试' },
  { icon: 'credit-card', text: '银行卡单笔/单日限额，请尝试换卡支付' },
  { icon: 'smartphone', text: '支付App未响应，请确保支付App正常运行' },
]

/* ============================================================
   十五、订单中心（app/orders 系列：列表/详情/物流/评价/发票/退款/纠纷）
   从 app/orders/* 1:1 迁移。状态语义保留，配色统一为商城主题（#9A2D2D）。
   ============================================================ */

export interface OrderProductLine {
  id: string
  name: string
  cover: string
  skuName: string
  price: number
  quantity: number
}
export interface ShopOrder {
  id: string
  orderNo: string
  status: 'pending_pay' | 'pending_ship' | 'pending_receive' | 'completed' | 'cancelled' | 'after_sale'
  totalAmount: number
  payAmount: number
  createdAt: string
  products: OrderProductLine[]
  canCancel: boolean
  canConfirm: boolean
  canReview: boolean
  hasAfterSale: boolean
}

/** 订单状态 Tab */
export const orderStatusTabs = [
  { key: '', label: '全部' },
  { key: 'pending_pay', label: '待付款' },
  { key: 'pending_ship', label: '待发货' },
  { key: 'pending_receive', label: '待收货' },
  { key: 'completed', label: '已完成' },
  { key: 'after_sale', label: '售后' },
]

/** 订单状态配置：标签/色值/图标 */
export const orderStatusConfig: Record<string, { label: string; color: string; icon: string }> = {
  pending_pay: { label: '待付款', color: '#9A2D2D', icon: 'clock' },
  pending_ship: { label: '待发货', color: '#B8860B', icon: 'package' },
  pending_receive: { label: '待收货', color: '#3B82F6', icon: 'truck' },
  completed: { label: '已完成', color: '#2E7D32', icon: 'check-circle' },
  cancelled: { label: '已取消', color: '#999999', icon: 'x' },
  after_sale: { label: '售后中', color: '#F59E0B', icon: 'alert-circle' },
}

export const shopOrders: ShopOrder[] = [
  {
    id: '1', orderNo: '202401150001', status: 'pending_pay', totalAmount: 256, payAmount: 256,
    createdAt: '2024-01-15 14:30',
    products: [
      { id: 'p1', name: '周易六十四卦详解（精装典藏版）', cover: `${P}/book1.jpg`, skuName: '精装版', price: 168, quantity: 1 },
      { id: 'p2', name: '紫微斗数入门教程', cover: `${P}/book2.jpg`, skuName: '平装版', price: 88, quantity: 1 },
    ],
    canCancel: true, canConfirm: false, canReview: false, hasAfterSale: false,
  },
  {
    id: '2', orderNo: '202401140002', status: 'pending_ship', totalAmount: 168, payAmount: 158,
    createdAt: '2024-01-14 10:20',
    products: [{ id: 'p3', name: '八字命理学基础', cover: `${P}/book3.jpg`, skuName: '标准版', price: 168, quantity: 1 }],
    canCancel: true, canConfirm: false, canReview: false, hasAfterSale: false,
  },
  {
    id: '3', orderNo: '202401130003', status: 'pending_receive', totalAmount: 299, payAmount: 279,
    createdAt: '2024-01-13 09:15',
    products: [{ id: 'p4', name: '风水布局实战指南', cover: `${P}/book4.jpg`, skuName: '精装版', price: 299, quantity: 1 }],
    canCancel: false, canConfirm: true, canReview: false, hasAfterSale: false,
  },
  {
    id: '4', orderNo: '202401100004', status: 'completed', totalAmount: 128, payAmount: 128,
    createdAt: '2024-01-10 16:40',
    products: [{ id: 'p5', name: '梅花易数速成', cover: `${P}/book5.jpg`, skuName: '电子版', price: 128, quantity: 1 }],
    canCancel: false, canConfirm: false, canReview: true, hasAfterSale: false,
  },
]

/* —— 订单详情（app/orders/[id]） —— */
export interface OrderDetailData {
  id: string
  orderNo: string
  status: ShopOrder['status']
  totalAmount: number
  payAmount: number
  createdAt: string
  paidAt?: string
  shippedAt?: string
  products: OrderProductLine[]
  canReview: boolean
  address: { name: string; phone: string; province: string; city: string; district: string; address: string }
  payMethod?: string
  logistics?: { company: string; trackingNo: string; status: string; latest: { time: string; content: string } }
  coupon?: { name: string; discount: number }
  remark?: string
}

/** 订单详情进度步骤 */
export const orderSteps = [
  { key: 'created', label: '提交订单' },
  { key: 'paid', label: '付款成功' },
  { key: 'shipped', label: '商家发货' },
  { key: 'completed', label: '交易完成' },
]
/** 订单详情状态 → 步骤序号/色值/图标 */
export const orderDetailStatusConfig: Record<string, { icon: string; color: string; text: string; step: number }> = {
  pending_pay: { icon: 'clock', color: '#9A2D2D', text: '待付款', step: 1 },
  pending_ship: { icon: 'package', color: '#F59E0B', text: '待发货', step: 2 },
  pending_receive: { icon: 'truck', color: '#3B82F6', text: '待收货', step: 3 },
  completed: { icon: 'check-circle', color: '#2E7D32', text: '已完成', step: 4 },
  cancelled: { icon: 'x-circle', color: '#6B7280', text: '已取消', step: 0 },
  after_sale: { icon: 'refresh-cw', color: '#F59E0B', text: '售后中', step: 3 },
}

export const orderDetail: OrderDetailData = {
  id: '1', orderNo: 'GX202401150001', status: 'pending_receive', totalAmount: 344, payAmount: 294,
  createdAt: '2024-01-15 14:30:00', paidAt: '2024-01-15 14:32:15', shippedAt: '2024-01-16 09:00:00',
  products: [
    { id: '1', name: '《渊海子平》精装典藏版', cover: `${P}/book1.jpg`, skuName: '精装版', price: 168, quantity: 1 },
    { id: '2', name: '紫微斗数入门教程', cover: `${P}/book2.jpg`, skuName: '平装版', price: 88, quantity: 2 },
  ],
  canReview: false,
  address: { name: '张三', phone: '138****8888', province: '北京市', city: '北京市', district: '朝阳区', address: '建国路88号SOHO现代城A座1201' },
  payMethod: '微信支付',
  logistics: { company: '顺丰速运', trackingNo: 'SF1234567890', status: '派送中', latest: { time: '01-17 08:30', content: '快递员正在派送中，预计12:00前送达' } },
  coupon: { name: '新人专享券', discount: 50 },
  remark: '请放门口快递柜',
}

/* —— 物流详情（app/orders/logistics） —— */
export interface LogisticsTrack { status: string; description: string; time: string; location: string; isCurrent: boolean }
export interface LogisticsData {
  orderId: string
  orderNo: string
  company: string
  companyPhone: string
  trackingNo: string
  status: string
  estimatedDelivery: string
  courierName?: string
  courierPhone?: string
  receiver: { name: string; phone: string; address: string }
  tracks: LogisticsTrack[]
}
/** 物流状态映射 */
export const logisticsStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待揽收', color: '#999999' },
  picked: { label: '已揽收', color: '#3B82F6' },
  in_transit: { label: '运输中', color: '#9A2D2D' },
  delivering: { label: '派送中', color: '#F59E0B' },
  delivered: { label: '已送达', color: '#2E7D32' },
  signed: { label: '已签收', color: '#2E7D32' },
}
export const logisticsDetail: LogisticsData = {
  orderId: '1', orderNo: '202412010001', company: '顺丰速运', companyPhone: '95338',
  trackingNo: 'SF1234567890123', status: 'in_transit', estimatedDelivery: '2024-12-03 18:00',
  courierName: '张师傅', courierPhone: '13800138000',
  receiver: { name: '张三', phone: '138****8888', address: '北京市朝阳区建国路88号SOHO现代城A座1201' },
  tracks: [
    { status: 'in_transit', description: '快件已到达【北京朝阳营业点】，正在派送中', time: '2024-12-02 14:30', location: '北京市朝阳区', isCurrent: true },
    { status: 'in_transit', description: '快件已到达【北京转运中心】', time: '2024-12-02 08:15', location: '北京市顺义区', isCurrent: false },
    { status: 'in_transit', description: '快件已从���上海转运中心】发出', time: '2024-12-01 22:00', location: '上海市青浦区', isCurrent: false },
    { status: 'picked', description: '快件已到达【上海转运中心】', time: '2024-12-01 18:30', location: '上海市青浦区', isCurrent: false },
    { status: 'picked', description: '已揽收，快递员：李师傅 13900139000', time: '2024-12-01 15:20', location: '上海市浦东新区', isCurrent: false },
    { status: 'pending', description: '商家已发货，等待揽收', time: '2024-12-01 14:00', location: '上海市浦东新区', isCurrent: false },
  ],
}

/* —— 订单评价（app/orders/[id]/review） —— */
export const orderReviewItems = [
  { id: '1', name: '《渊海子平》精装典藏版', cover: `${P}/book1.jpg` },
  { id: '2', name: '紫微斗数入门教程', cover: `${P}/book2.jpg` },
]
export const reviewTagsByRating: Record<number, string[]> = {
  5: ['正品保证', '包装精美', '物流很快', '与描述一致', '非常满意', '强烈推荐'],
  4: ['商品不错', '物流及时', '整体满意'],
  3: ['一般般', '与描述基本一致'],
  2: ['质量较差', '与描述不符'],
  1: ['质量很差', '货不对板', '不推荐'],
}
export const reviewRatingLabels = ['', '很差', '较差', '一般', '不错', '非常好']

/* —— 发票管理（app/orders/invoice） —— */
export interface InvoiceApplicableOrder { orderId: string; orderNo: string; amount: number; createdAt: string; productName: string }
export interface InvoiceRecord {
  id: string
  type: 'company' | 'personal'
  title: string
  taxNumber?: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  email: string
  createdAt: string
  completedAt?: string
  rejectReason?: string
}
export const invoiceApplicableOrders: InvoiceApplicableOrder[] = [
  { orderId: 'o1', orderNo: '202412150001', amount: 299, createdAt: '2024-12-15 10:30', productName: '周易六十四卦详解' },
  { orderId: 'o2', orderNo: '202412140002', amount: 168, createdAt: '2024-12-14 15:20', productName: '紫微斗数入门课程' },
  { orderId: 'o3', orderNo: '202412130003', amount: 88, createdAt: '2024-12-13 09:15', productName: '风水基础教程' },
]
export const invoiceRecords: InvoiceRecord[] = [
  { id: 'i1', type: 'company', title: '北京某某科技有限公司', taxNumber: '91110108MA01XXXXX', amount: 467, status: 'completed', email: 'finance@example.com', createdAt: '2024-12-10 14:30', completedAt: '2024-12-11 10:00' },
  { id: 'i2', type: 'personal', title: '张*三', amount: 168, status: 'processing', email: 'zhang***@163.com', createdAt: '2024-12-14 16:00' },
  { id: 'i3', type: 'company', title: '上海某某文化传媒', taxNumber: '91310115MA1HXXXX', amount: 299, status: 'rejected', email: 'acc@example.com', createdAt: '2024-12-08 11:20', rejectReason: '税号格式不正确' },
]
export const invoiceStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '待处理', color: '#B8860B', bg: 'rgba(212,160,23,0.12)' },
  processing: { label: '开票中', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  completed: { label: '已开具', color: '#2E7D32', bg: 'rgba(46,125,50,0.12)' },
  rejected: { label: '已驳回', color: '#E74C3C', bg: 'rgba(231,76,60,0.12)' },
}

/* —— 退款进度（app/orders/refund-progress） —— */
export interface RefundTimelineNode { status: string; title: string; description: string; time: string; isCurrent: boolean }
export interface RefundProgressData {
  id: string
  orderId: string
  orderNo: string
  type: 'refund_only' | 'return_refund'
  status: 'submitted' | 'refunding' | 'completed'
  reason: string
  amount: number
  product: OrderProductLine
  timeline: RefundTimelineNode[]
  createdAt: string
  refundMethod: string
  estimatedDate: string
}
export const refundProgress: RefundProgressData = {
  id: 'RF202401150001', orderId: 'order1', orderNo: 'GX20240115001', type: 'refund_only', status: 'refunding',
  reason: '不想要了', amount: 168,
  product: { id: 'p1', name: '周易六十四卦详解（精装典藏版）', cover: `${P}/book1.jpg`, skuName: '精装版', price: 168, quantity: 1 },
  timeline: [
    { status: 'submitted', title: '申请提交', description: '您已提交退款申请', time: '2024-01-15 10:30', isCurrent: false },
    { status: 'merchant_review', title: '商家审核', description: '商家已同意退款', time: '2024-01-15 14:20', isCurrent: false },
    { status: 'platform_review', title: '平台审核', description: '平台审核通过', time: '2024-01-15 15:00', isCurrent: false },
    { status: 'refunding', title: '退款处理', description: '正在处理退款...', time: '2024-01-15 15:30', isCurrent: true },
    { status: 'completed', title: '退款到账', description: '预计1-3个工作日到账', time: '', isCurrent: false },
  ],
  createdAt: '2024-01-15 10:30', refundMethod: '微信支付', estimatedDate: '2024年1月18日',
}

/* —— 纠纷申诉（app/orders/dispute） —— */
export interface DisputeTypeOption { value: string; label: string; icon: string; desc: string }
export const disputeTypes: DisputeTypeOption[] = [
  { value: 'not_received', label: '未收到货', icon: 'package', desc: '已付款但未收到商品' },
  { value: 'not_as_described', label: '商品不符', icon: 'file-text', desc: '收到的商品与描述不符' },
  { value: 'quality_issue', label: '质量问题', icon: 'alert-triangle', desc: '商品存在质量缺陷' },
  { value: 'other', label: '其他问题', icon: 'help-circle', desc: '其他交易纠纷' },
]
export const disputeStatusConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: '待处理', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'clock' },
  processing: { label: '处理中', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', icon: 'clock' },
  resolved: { label: '已解决', color: '#2E7D32', bg: 'rgba(46,125,50,0.12)', icon: 'check' },
  rejected: { label: '已驳回', color: '#E74C3C', bg: 'rgba(231,76,60,0.12)', icon: 'x-circle' },
  cancelled: { label: '已取消', color: '#999999', bg: 'rgba(153,153,153,0.12)', icon: 'x-circle' },
}
export interface DisputeListItemData { id: string; orderId: string; orderNo: string; type: string; status: string; productName: string; productCover: string; createdAt: string }
export const disputeOrder = {
  orderId: 'order_001', orderNo: 'RB2024010100001', productName: '周易六十四卦详解（精装典藏版）',
  productCover: `${P}/book1.jpg`, amount: 168, createdAt: '2024-01-01 12:00:00',
}
export const myDisputes: DisputeListItemData[] = [
  { id: '1', orderId: 'o1', orderNo: 'RB2024010100002', type: 'quality_issue', status: 'processing', productName: '紫微斗数入门', productCover: `${P}/book2.jpg`, createdAt: '2024-01-05 10:00:00' },
]
export interface DisputeDetailData {
  id: string
  orderId: string
  orderNo: string
  type: string
  status: string
  description: string
  images: string[]
  expectation: string
  order: { productName: string; productCover: string; amount: number }
  timeline: { status: string; title: string; description: string; time: string; isCurrent: boolean }[]
  createdAt: string
  canCancel: boolean
}
export const disputeDetail: DisputeDetailData = {
  id: '1', orderId: 'o1', orderNo: 'RB2024010100001', type: 'quality_issue', status: 'processing',
  description: '收到的书籍有破损，封面有明显折痕', images: [`${P}/book1.jpg`], expectation: '��望能够换货或退款',
  order: { productName: '周易六十四卦详解（精装典藏版）', productCover: `${P}/book1.jpg`, amount: 168 },
  timeline: [
    { status: 'submitted', title: '提交申诉', description: '您已成功提交申诉', time: '2024-01-05 10:00', isCurrent: false },
    { status: 'processing', title: '处理中', description: '客服正在处理您的申诉', time: '2024-01-05 14:00', isCurrent: true },
  ],
  createdAt: '2024-01-05 10:00:00', canCancel: true,
}

/* —— 统一订单中心（app/orders/center，跨品类） —— */
export interface OrderCenterCategory { key: string; label: string; icon: string }
export const orderCenterCategories: OrderCenterCategory[] = [
  { key: 'all', label: '全部', icon: 'package' },
  { key: 'product', label: '商品', icon: 'shopping-bag' },
  { key: 'course', label: '课程', icon: 'book-open' },
  { key: 'circle', label: '圈子', icon: 'users' },
  { key: 'live', label: '直播', icon: 'radio' },
  { key: 'activity', label: '活动', icon: 'ticket' },
  { key: 'qa', label: '问答', icon: 'message-circle' },
  { key: 'membership', label: '会员', icon: 'gift' },
  { key: 'station', label: '分站', icon: 'building-2' },
  { key: 'institute', label: '研究院', icon: 'graduation-cap' },
]
export const orderCenterStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: '待付款', color: '#B8860B' },
  paid: { label: '已付款', color: '#3B82F6' },
  completed: { label: '已完成', color: '#2E7D32' },
  cancelled: { label: '已取消', color: '#999999' },
  refunding: { label: '退款中', color: '#F59E0B' },
  expired: { label: '已过期', color: '#E74C3C' },
}
export interface OrderCenterItem {
  id: string
  orderNo: string
  category: string
  title: string
  cover?: string
  price: number
  originalPrice?: number
  status: string
  createdAt: string
  expiredAt?: string
  extra?: { circleName?: string; teacherName?: string; duration?: string; quantity?: number }
}
export const orderCenterItems: OrderCenterItem[] = [
  { id: '1', orderNo: 'C202401150001', category: 'course', title: '八字入门实战精讲课', cover: `${P}/book1.jpg`, price: 299, originalPrice: 599, status: 'completed', createdAt: '2024-01-15 14:30', extra: { teacherName: '张玄风', duration: '36课时' } },
  { id: '2', orderNo: 'R202401140002', category: 'circle', title: '八字命理研习社', cover: `${P}/book2.jpg`, price: 199, status: 'completed', createdAt: '2024-01-14 10:20', expiredAt: '2025-01-14', extra: { circleName: '八字命理研习社' } },
  { id: '3', orderNo: 'P202401130003', category: 'product', title: '周易六十四卦详解（精装典藏版）', cover: `${P}/book3.jpg`, price: 168, status: 'paid', createdAt: '2024-01-13 09:15', extra: { quantity: 1 } },
  { id: '4', orderNo: 'L202401120004', category: 'live', title: '紫微斗数实战直播课', cover: `${P}/book4.jpg`, price: 49.9, status: 'completed', createdAt: '2024-01-12 18:00', extra: { teacherName: '李命理' } },
  { id: '5', orderNo: 'Q202401100005', category: 'qa', title: '八字婚姻分析咨询', cover: `${P}/book5.jpg`, price: 88, status: 'completed', createdAt: '2024-01-10 16:40', extra: { teacherName: '王大师' } },
  { id: '6', orderNo: 'M202401080006', category: 'membership', title: '热卜国学VIP年卡', price: 365, originalPrice: 588, status: 'completed', createdAt: '2024-01-08 12:00', expiredAt: '2025-01-08' },
  { id: '7', orderNo: 'A202401050007', category: 'activity', title: '新春开运讲座', cover: `${P}/item1.jpg`, price: 0, status: 'completed', createdAt: '2024-01-05 20:00', extra: { duration: '2小时' } },
  { id: '8', orderNo: 'S202312200008', category: 'station', title: '分站站长资格', price: 999, status: 'completed', createdAt: '2023-12-20 10:00', expiredAt: '2024-12-20' },
  { id: '9', orderNo: 'I202312150009', category: 'institute', title: '研究院保证金', price: 10000, status: 'completed', createdAt: '2023-12-15 14:00', expiredAt: '2024-12-15', extra: { circleName: '热卜国学研究院' } },
  { id: '10', orderNo: 'C202401160010', category: 'course', title: '风水堪舆高级班', cover: `${P}/item2.jpg`, price: 1299, status: 'pending', createdAt: '2024-01-16 09:00', extra: { teacherName: '风水大师', duration: '60课时' } },
]

/* ============================================================
   十六、shop 商品板块（app/shop/[id] 详情 / categories 分类 / reviews 评价 / exchange 换货）
   —— 与 mall 板块为两套独立设计，数据单独建型，主题色沿用原型 #C41E3A
   ============================================================ */

/* —— shop 商品详情（app/shop/[id]） —— */
export interface ShopProductSku {
  id: string
  name: string
  price: number
  originalPrice: number
  stock: number
  image: string
}
export interface ShopProductReview {
  id: string
  userName: string
  avatar: string
  rating: number
  content: string
  skuName?: string
  createdAt: string
  likes: number
  images?: string[]
}
export interface ShopProductDetail {
  id: string
  name: string
  price: number
  originalPrice: number
  sales: number
  rating: number
  category: string
  tags: string[]
  isHot: boolean
  images: string[]
  description: string
  specs: { name: string; value: string }[]
  stock: number
  shipping: string
  reviewCount: number
  skus: ShopProductSku[]
}
export const shopProductDetail: ShopProductDetail = {
  id: '1',
  name: '精装《周易全解》典藏版 - 王弼注释本',
  price: 168,
  originalPrice: 298,
  sales: 2580,
  rating: 4.9,
  category: '国学书籍',
  tags: ['精装', '典藏'],
  isHot: true,
  images: [`${P}/book1.jpg`, `${P}/book2.jpg`, `${P}/book3.jpg`, `${P}/item4.jpg`],
  description:
    '本书为《周易》经典注释本，由三国时期著名学者王弼注释。全书系统阐释六十四卦卦象、卦辞与爻辞，融汇象数与义理，是研习易学的权威典籍。精装典藏版采用优质纸张，装帧考究，便于收藏与研读。',
  specs: [
    { name: '出版社', value: '中华书局' },
    { name: '页数', value: '568页' },
    { name: '装帧', value: '精装' },
    { name: '开本', value: '16开' },
  ],
  stock: 99,
  shipping: '包邮',
  reviewCount: 368,
  skus: [
    { id: 'sku1', name: '精装版', price: 168, originalPrice: 298, stock: 50, image: `${P}/book1.jpg` },
    { id: 'sku2', name: '平装版', price: 98, originalPrice: 168, stock: 80, image: `${P}/book2.jpg` },
    { id: 'sku3', name: '典藏礼盒版', price: 368, originalPrice: 498, stock: 20, image: `${P}/book3.jpg` },
  ],
}
export const shopProductReviews: ShopProductReview[] = [
  { id: '1', userName: '国学爱好者', avatar: AVATAR('shop-r1'), rating: 5, content: '印刷精美，注释详尽，非常满意！', skuName: '精装版', createdAt: '2024-01-15', likes: 28, images: [`${P}/book1.jpg`] },
  { id: '2', userName: '易学研究者', avatar: AVATAR('shop-r2'), rating: 5, content: '王弼注释很有深度，适合深入研究。', skuName: '典藏礼盒版', createdAt: '2024-01-10', likes: 15 },
  { id: '3', userName: '读书人', avatar: AVATAR('shop-r3'), rating: 4, content: '纸张质量很好，物流也很快。', skuName: '平装版', createdAt: '2024-01-08', likes: 8 },
]
export function getShopProductDetail(_id?: string | number): ShopProductDetail {
  return shopProductDetail
}

/* —— shop 商品分类（app/shop/categories，左右双栏） —— */
export interface ShopCategoryNode {
  id: string
  name: string
  icon: string
  children: { id: string; name: string }[]
}
export const shopCategoryTree: ShopCategoryNode[] = [
  { id: '1', name: '国学书籍', icon: '📚', children: [{ id: '1-1', name: '经典原著' }, { id: '1-2', name: '注解版本' }, { id: '1-3', name: '入门读物' }] },
  { id: '2', name: '文房用品', icon: '✒️', children: [{ id: '2-1', name: '毛笔' }, { id: '2-2', name: '宣纸' }, { id: '2-3', name: '墨砚' }] },
  { id: '3', name: '香道用品', icon: '🪔', children: [{ id: '3-1', name: '线香' }, { id: '3-2', name: '香炉' }, { id: '3-3', name: '沉香' }] },
  { id: '4', name: '茶道用品', icon: '🍵', children: [{ id: '4-1', name: '茶具套装' }, { id: '4-2', name: '茶叶' }, { id: '4-3', name: '茶盘' }] },
  { id: '5', name: '养生保健', icon: '🌿', children: [{ id: '5-1', name: '艾灸用品' }, { id: '5-2', name: '按摩器具' }, { id: '5-3', name: '养生食材' }] },
  { id: '6', name: '风水摆件', icon: '🏺', children: [{ id: '6-1', name: '招财摆件' }, { id: '6-2', name: '化煞物品' }, { id: '6-3', name: '水晶' }] },
  { id: '7', name: '佛道用品', icon: '🙏', children: [{ id: '7-1', name: '佛像' }, { id: '7-2', name: '念珠' }, { id: '7-3', name: '供品' }] },
  { id: '8', name: '乐器', icon: '🎶', children: [{ id: '8-1', name: '古琴' }, { id: '8-2', name: '箫笛' }, { id: '8-3', name: '古筝' }] },
]
export interface ShopCategoryProduct {
  id: string
  name: string
  cover: string
  price: number
  originalPrice: number
  sales: number
}
const shopCatGoodsNames = ['易经全解', '毛笔套装', '沉香线香', '紫砂茶壶', '艾灸盒', '招财貔貅', '小叶紫檀念珠', '古琴入门']
const shopCatGoodsCovers = [`${P}/book1.jpg`, `${P}/item4.jpg`, `${P}/item5.jpg`, `${P}/item3.jpg`, `${P}/item6.jpg`, `${P}/item2.jpg`, `${P}/item1.jpg`, `${P}/item7.jpg`]
const shopCatPrices = [128, 89, 168, 299, 68, 388, 258, 1999]
const shopCatOriginals = [168, 128, 218, 399, 98, 488, 328, 2599]
export const shopCategoryProducts: ShopCategoryProduct[] = Array.from({ length: 8 }, (_, i) => ({
  id: `cp${i + 1}`,
  name: shopCatGoodsNames[i % 8],
  cover: shopCatGoodsCovers[i % 8],
  price: shopCatPrices[i % 8],
  originalPrice: shopCatOriginals[i % 8],
  sales: 100 + i * 137,
}))

/* —— shop 商品评价列表（app/shop/reviews） —— */
export interface ShopReviewStatItem { stars: number; count: number; percent: number }
export const shopReviewStats = {
  average: 4.8,
  total: 1256,
  withImages: 368,
  distribution: [
    { stars: 5, count: 980, percent: 78 },
    { stars: 4, count: 188, percent: 15 },
    { stars: 3, count: 50, percent: 4 },
    { stars: 2, count: 25, percent: 2 },
    { stars: 1, count: 13, percent: 1 },
  ] as ShopReviewStatItem[],
}
export const shopReviewList: ShopProductReview[] = [
  { id: '1', userName: '张**', avatar: AVATAR('shop-l1'), rating: 5, content: '这本书讲解非常详细，从基础到进阶都有涉及，特别适合入门学习。印刷质量很好，纸张手感不错，物流也很快，非常满意的一次购物体验！', images: [`${P}/book1.jpg`, `${P}/book2.jpg`, `${P}/book3.jpg`], skuName: '精装典藏版', createdAt: '2024-01-15', likes: 128 },
  { id: '2', userName: '李**', avatar: AVATAR('shop-l2'), rating: 5, content: '内容很好，讲解清晰易懂，推荐购买！', skuName: '平装版', createdAt: '2024-01-14', likes: 56 },
  { id: '3', userName: '王**', avatar: AVATAR('shop-l3'), rating: 4, content: '整体还不错，就是有些章节感觉可以再详细一点。', images: [`${P}/item4.jpg`], skuName: '精装典藏版', createdAt: '2024-01-13', likes: 23 },
  { id: '4', userName: '赵**', avatar: AVATAR('shop-l4'), rating: 3, content: '内容一般，和预期有差距。', skuName: '平装版', createdAt: '2024-01-12', likes: 5 },
]

/* —— shop 申请换货（app/shop/exchange） —— */
export interface ShopExchangeReason { value: string; label: string }
export const shopExchangeReasons: ShopExchangeReason[] = [
  { value: 'quality', label: '质量问题' },
  { value: 'size', label: '尺寸不符' },
  { value: 'wrong', label: '发错货' },
  { value: 'dislike', label: '不喜欢/不想要' },
  { value: 'other', label: '其他原因' },
]
export interface ShopExchangeProduct {
  id: string
  name: string
  cover: string
  skuId: string
  skuName: string
  price: number
  quantity: number
  skus: { id: string; name: string; price: number }[]
}
export const shopExchangeProducts: ShopExchangeProduct[] = [
  { id: '1', name: '周易六十四卦详解（精装典藏版）', cover: `${P}/book1.jpg`, skuId: 's1', skuName: '精装版', price: 168, quantity: 1, skus: [{ id: 's1', name: '精装版', price: 168 }, { id: 's2', name: '平装版', price: 98 }] },
  { id: '2', name: '紫微斗数入门教程', cover: `${P}/book2.jpg`, skuId: 's3', skuName: '标准版', price: 88, quantity: 2, skus: [{ id: 's3', name: '标准版', price: 88 }] },
]
export interface ShopExchangeAddress {
  id: string
  name: string
  phone: string
  province: string
  city: string
  district: string
  address: string
  isDefault: boolean
}
export const shopExchangeAddresses: ShopExchangeAddress[] = [
  { id: '1', name: '张三', phone: '138****8888', province: '北京市', city: '北京市', district: '朝阳区', address: '建国路88号SOHO现代城A座1201', isDefault: true },
]

// ============================================
// API 层：useMock 开关控制真实/模拟数据切换
// ============================================

export const shopApi = {
  /** 商品列表 */
  async getProducts(params?: { page?: number; pageSize?: number; keyword?: string; categoryId?: string }) {
    if (useMock()) {
      const all = [...mallProducts, ...shopRecProducts as any[]]
      return { items: all, total: all.length, page: 1, pageSize: 20 }
    }
    try {
      const qs = new URLSearchParams()
      if (params?.page) qs.set('page', String(params.page))
      if (params?.pageSize) qs.set('pageSize', String(params.pageSize))
      if (params?.keyword) qs.set('keyword', params.keyword)
      if (params?.categoryId) qs.set('categoryId', params.categoryId)
      return await apiGet<any>(`/shop/products?${qs.toString()}`)
    } catch {
      return { items: [...mallProducts, ...shopRecProducts as any[]], total: 0, page: 1, pageSize: 20 }
    }
  },

  /** 商品详情 */
  async getProductDetail(id: string) {
    if (useMock()) {
      const all = [...mallProducts, ...shopRecProducts as any[]]
      const p = all.find((x: any) => x.id === id || x.skuId === id)
      return p || shopProductDetail
    }
    try {
      return await apiGet<any>(`/shop/products/${id}`)
    } catch { return shopProductDetail }
  },

  /** 商品评价 */
  async getProductReviews(productId: string, params?: { page?: number; pageSize?: number }) {
    if (useMock()) return { items: shopProductReviews, total: shopProductReviews.length }
    try {
      return await apiGet<any>(`/shop/products/${productId}/reviews?page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`)
    } catch { return { items: shopProductReviews, total: shopProductReviews.length } }
  },

  /** 店铺评价（聚合所有商品评价） */
  async getShopReviews(params?: { page?: number; pageSize?: number }) {
    if (useMock()) return { stats: shopReviewStats, items: shopReviewList, total: shopReviewList.length }
    try {
      const data = await apiGet<any>(`/shop/reviews?page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`)
      return { stats: shopReviewStats, items: data.reviews || [], total: data.total || 0 }
    } catch { return { stats: shopReviewStats, items: shopReviewList, total: shopReviewList.length } }
  },

  /** 分类树 */
  async getCategoryTree() {
    if (useMock()) return shopCategories
    try {
      return await apiGet<any>('/shop/categories/tree')
    } catch { return shopCategories }
  },

  /** 分类商品 */
  async getCategoryProducts(categoryId: string, params?: { page?: number; pageSize?: number }) {
    if (useMock()) {
      return { items: mallProducts, total: mallProducts.length, page: 1, pageSize: 20 }
    }
    try {
      return await apiGet<any>(`/shop/categories/${categoryId}/products?page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`)
    } catch {
      return { items: mallProducts, total: mallProducts.length, page: 1, pageSize: 20 }
    }
  },

  /** 购物车 */
  async getCart() {
    if (useMock()) return { items: cartGroups, totalAmount: 308, totalCount: 3 }
    try {
      return await apiGet<any>('/shop/cart')
    } catch {
      return { items: cartGroups, totalAmount: 308, totalCount: 3 }
    }
  },

  /** 订单列表 */
  async getOrders(params?: { page?: number; pageSize?: number; status?: string }) {
    if (useMock()) return { items: shopOrders, total: shopOrders.length }
    try {
      const qs = `page=${params?.page || 1}&pageSize=${params?.pageSize || 20}${params?.status ? `&status=${params.status}` : ''}`
      return await apiGet<any>(`/shop/orders/my?${qs}`)
    } catch {
      return { items: shopOrders, total: shopOrders.length }
    }
  },

  /** 创建订单 */
  async createOrder(data: { addressId: string; couponId?: string; payMethod: string; note?: string }) {
    if (useMock()) return { id: 'order-new', orderNo: 'OR' + Date.now(), payAmount: 308, status: 'pending' }
    return apiPost<any>('/shop/orders', data)
  },

  /** 订单详情 */
  async getOrderDetail(orderId: string) {
    if (useMock()) {
      const order = shopOrders.find((o: any) => o.id === orderId)
      return order || shopOrders[0]
    }
    try {
      return await apiGet<any>(`/shop/orders/${orderId}`)
    } catch { return shopOrders[0] }
  },

  /** 优惠券详情 */
  async getCouponDetail(id: string) {
    if (useMock()) return couponDetail
    try { return await apiGet<any>(`/shop/coupons/${id}`) } catch { return couponDetail }
  },

  /** 优惠券列表 */
  async getCoupons() {
    if (useMock()) return { items: myCoupons, total: myCoupons.length }
    try {
      return await apiGet<any>('/shop/coupons')
    } catch { return { items: myCoupons, total: myCoupons.length } }
  },

  /** 我的优惠券 */
  async getMyCoupons() {
    if (useMock()) return { items: myCoupons.filter((c: any) => !c.locked), total: myCoupons.length }
    try {
      return await apiGet<any>('/shop/coupons/my')
    } catch { return { items: myCoupons.filter((c: any) => !c.locked), total: myCoupons.length } }
  },

  /** 收货地址列表 */
  async getAddresses() {
    if (useMock()) return checkoutAddresses
    try {
      return await apiGet<any>('/shop/addresses')
    } catch { return checkoutAddresses }
  },

  /** 物流跟踪 */
  async getLogistics(orderId: string) {
    if (useMock()) return logisticsDetail
    try {
      return await apiGet<any>(`/shop/orders/${orderId}/logistics`)
    } catch { return logisticsDetail }
  },

  /** 售后列表 */
  async getAfterSales(params?: { page?: number; pageSize?: number }) {
    if (useMock()) return { items: (myDisputes as any[]), total: (myDisputes as any[]).length }
    try {
      return await apiGet<any>(`/shop/after-sales?page=${params?.page || 1}&pageSize=${params?.pageSize || 20}`)
    } catch { return { items: (myDisputes as any[]), total: (myDisputes as any[]).length } }
  },

  /** 售后详情 */
  async getAfterSaleDetail(id: string) {
    if (useMock()) return (myDisputes as any[]).find((r: any) => r.id === id) || (myDisputes as any[])[0]
    try {
      return await apiGet<any>(`/shop/after-sales/${id}`)
    } catch { return (myDisputes as any[])[0] }
  },

  /** 提交售后 */
  async submitAfterSale(data: any) {
    if (useMock()) return { id: 'as-new', status: 'processing' }
    return apiPost<any>('/shop/after-sales', data)
  },

  /** 秒杀 — 进行中列表 */
  async getFlashSales() {
    if (useMock()) return { items: shopFlashSale.products, total: shopFlashSale.products.length }
    try {
      const res = await apiGet<any>('/marketing/flash-sales/active')
      return { items: res.items || res || [], total: res.total || 0 }
    } catch { return { items: shopFlashSale.products, total: shopFlashSale.products.length } }
  },

  /** 拼团 — 进行中列表 */
  async getGroupBuys() {
    if (useMock()) return { items: groupBuyList, total: groupBuyList.length }
    try {
      const res = await apiGet<any>('/marketing/group-buys/active')
      return { items: res.items || res || [], total: res.total || 0 }
    } catch { return { items: groupBuyList, total: groupBuyList.length } }
  },

  /** 拼团 — 详情 */
  async getGroupBuyDetail(id: string) {
    if (useMock()) return groupBuyList.find((g: any) => g.id === id) || groupBuyList[0]
    try { return await apiGet<any>(`/marketing/group-buys/${id}`) } catch { return groupBuyList[0] }
  },

  /** 拼团 — 我的拼团 */
  async getMyGroupBuys() {
    if (useMock()) return { items: myGroupBuyList, total: myGroupBuyList.length }
    try {
      const res = await apiGet<any>('/marketing/group-buys/my')
      return { items: res.items || res || [], total: res.total || 0 }
    } catch { return { items: myGroupBuyList, total: myGroupBuyList.length } }
  },

  /** 拼团 — 参与 */
  async joinGroupBuy(id: string) {
    if (useMock()) return { success: true }
    return apiPost<any>(`/marketing/group-buys/${id}/join`)
  },

  /** 营销区秒杀商品 */
  async getSeckillItems() {
    if (useMock()) return { items: seckillItems, total: seckillItems.length }
    try { return await apiGet<any>('/marketing/seckill/items') }
    catch { return { items: seckillItems, total: seckillItems.length } }
  },

  /** 营销区拼团商品 */
  async getGroupItems() {
    if (useMock()) return { items: groupItems, total: groupItems.length }
    try { return await apiGet<any>('/marketing/group/items') }
    catch { return { items: groupItems, total: groupItems.length } }
  },

  /** 商品对比数据 */
  async getCompareProducts() {
    if (useMock()) return { products: compareProducts, pickList: comparePickList }
    try { return await apiGet<any>('/shop/products/compare') }
    catch { return { products: compareProducts, pickList: comparePickList } }
  },

  /** 拼团失败详情 */
  async getGroupBuyFailDetail(id: string) {
    if (useMock()) return groupBuyFail
    try { return await apiGet<any>(`/marketing/group-buys/${id}/fail`) }
    catch { return groupBuyFail }
  },

  /** 拼团成功详情 */
  async getGroupBuySuccessDetail(id: string) {
    if (useMock()) return groupBuySuccess
    try { return await apiGet<any>(`/marketing/group-buys/${id}/success`) }
    catch { return groupBuySuccess }
  },

  /** 支付失败原因 */
  async getPayFailReasons() {
    if (useMock()) return payFailReasons
    try { return await apiGet<any>('/shop/pay/fail-reasons') }
    catch { return payFailReasons }
  },

  /** 支付超时原因 */
  async getPayTimeoutReasons() {
    if (useMock()) return payTimeoutReasons
    try { return await apiGet<any>('/shop/pay/timeout-reasons') }
    catch { return payTimeoutReasons }
  },

  /** 已绑定的支付方式 */
  async getPaymentMethods() {
    if (useMock()) return boundPaymentMethods
    try { return await apiGet<any>('/shop/payment-methods') }
    catch { return boundPaymentMethods }
  },

  /** 领券中心列表 */
  async getCenterCoupons() {
    if (useMock()) return { items: centerCoupons, total: centerCoupons.length }
    try { return await apiGet<any>('/shop/coupons/center') }
    catch { return { items: centerCoupons, total: centerCoupons.length } }
  },
}
