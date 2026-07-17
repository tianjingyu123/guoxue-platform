/**
 * 商城数据层 - 从原型 app/mall/page.tsx、app/shop/page.tsx、components/mall/marketing-zone.tsx 1:1 迁移
 * mock 数据 + 类型 + 装配函数。图片走 /static（跨端约定）。
 */
import type { ProductCardData } from '@/lib/card-utils'
import { apiGet, apiGetPaged, apiPost, apiPut, apiDelete, useMock } from '@/utils/request'
import { getTempReferrer } from '@/utils/referral'
import { couponApi } from '@/lib/coupon-data'
import { unescapeEntities, normalizeRichContent } from '@/utils/rich-content'

const P = 'https://api.rebugx.cn/assets/images/products'

/* ============================================================
   内容来源暂存（佣-V2-P3）：文章/内容页 → 商品详情 → 结算的间接购买链路
   无法在中间页 URL 逐层透传，改为会话内暂存（30 分钟窗·绑定具体商品防误归因）。
   直播/视频直跳结算走 URL 参数显式透传，不依赖本暂存。
   ============================================================ */
const ORDER_SOURCE_TTL_MS = 30 * 60 * 1000
let pendingOrderSource: { type: 'LIVE' | 'ARTICLE' | 'VIDEO'; id: string; productId: string; at: number } | null = null

/** 记录内容场景购买意图（在内容页跳商品详情时调用）：type=来源类型·id=内容ID·productId=目标商品（仅该商品下单时生效） */
export function setOrderSource(type: 'LIVE' | 'ARTICLE' | 'VIDEO', id: string, productId: string): void {
  if (!type || !id || !productId) return
  pendingOrderSource = { type, id, productId, at: Date.now() }
}

/** 读取匹配目标商品且未过期的暂存来源（不清除：同场景多次下单同归因·last-set 覆盖） */
function peekOrderSource(targetId: string): { type: string; id: string } | null {
  const s = pendingOrderSource
  if (!s) return null
  if (Date.now() - s.at > ORDER_SOURCE_TTL_MS) { pendingOrderSource = null; return null }
  if (s.productId !== targetId) return null
  return { type: s.type, id: s.id }
}

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
  // seckill/group 的 state（"进行中"角标）由 getMallHome 按真实场次动态注入，不写死避免空场次仍显"进行中"
  { id: 'seckill', label: '限时秒杀', icon: 'zap', href: '/shop/flash-sale' },
  { id: 'group', label: '超值拼团', icon: 'users', href: '/shop/group-buy' },
  { id: 'orders', label: '我的订单', icon: 'file-text', href: '/orders' },
  { id: 'coupons', label: '优惠券', icon: 'ticket', href: '/shop/coupons' }, // badge 由 getMallHome 按真实可领券数量动态注入
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

/** 商品分类（统一使用项目图标系统，禁用 emoji） */
export interface MallCategory {
  id: string
  name: string
  icon: string
}
export const mallCategories: MallCategory[] = [
  { id: 'books', name: '书籍', icon: 'book-open' },
  { id: 'culture', name: '文创', icon: 'palette' },
  { id: 'jewelry', name: '饰品', icon: 'sparkles' },
  { id: 'peripheral', name: '周边', icon: 'gift' },
  { id: 'tools', name: '工具', icon: 'compass' },
  { id: 'incense', name: '香道', icon: 'flame' },
  { id: 'tea', name: '茶器', icon: 'leaf' },
  { id: 'all', name: '全部', icon: 'layout-grid' },
]

/** 猜你喜欢（统一卡片库 feed 变体） */
export const mallProducts: ProductCardData[] = [
  { id: 1, title: '周易正义·十三经注疏本', cover: `.webp`, price: 68, originalPrice: 128, sales: 2341, tag: '热销' },
  { id: 2, title: '紫微斗数全书（精装版）', cover: `.webp`, price: 98, originalPrice: 168, sales: 1856, tag: '新品' },
  { id: 3, title: '太极八卦铜摆件', cover: `.webp`, price: 168, originalPrice: 298, sales: 892 },
  { id: 4, title: '天然黑曜石貔貅手链', cover: `.webp`, price: 128, originalPrice: 258, sales: 1523, tag: '热销' },
  { id: 5, title: '檀香木罗盘摆件', cover: `.webp`, price: 388, originalPrice: 588, sales: 456 },
  { id: 6, title: '梅花易数入门', cover: `.webp`, price: 45, originalPrice: 78, sales: 3201, tag: '秒杀' },
  { id: 7, title: '六爻铜钱套装（古法铸造）', cover: `.webp`, price: 88, originalPrice: 128, sales: 2156 },
  { id: 8, title: '沉香线香礼盒', cover: `.webp`, price: 168, originalPrice: 268, sales: 678, tag: '新品' },
  { id: 9, title: '奇门遁甲精义', cover: `.webp`, price: 88, originalPrice: 148, sales: 1234 },
  { id: 10, title: '紫水晶七星阵', cover: `.webp`, price: 298, originalPrice: 498, sales: 345, tag: '热销' },
  { id: 11, title: '风水罗盘专业版', cover: `.webp`, price: 688, originalPrice: 988, sales: 234 },
  { id: 12, title: '四库全书·术数类', cover: `.webp`, price: 268, originalPrice: 398, sales: 567 },
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
  { id: 6, title: '梅花易数入门', cover: `.webp`, price: 45, originalPrice: 78 },
  { id: 1, title: '周易正义注疏本', cover: `.webp`, price: 68, originalPrice: 128 },
  { id: 4, title: '黑曜石貔貅手链', cover: `.webp`, price: 128, originalPrice: 258 },
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
  { id: 2, title: '紫微斗数全书（精装版）', cover: `.webp`, groupPrice: 78, originalPrice: 168, joined: 2, need: 3 },
]

/* ============================================================
   三、shop 首页已删（商城收敛 2026-07-11 砍孤岛：pkg-shop/home → pkg-mall/home）
   —— 金刚区(含"积分兑换"入口)/banner/分类网格等运营配置随页一并清理；
   shopFlashSale 保留：仅作 getFlashSale() 返回类型的来源（营销组件在用）。
   ============================================================ */

/** shop 秒杀专区（红色大卡，含倒计时，结束时间=当前+2小时） */
export interface ShopFlashProduct {
  id: string
  name: string
  cover: string
  price: number
  originalPrice: number
}
export const shopFlashSale = {
  id: '1',
  title: '限时秒杀',
  /** 距结束秒数（2 小时） */
  durationSec: 3600 * 2,
  products: [
    { id: '1', name: '渊海子平精装版', cover: `.webp`, price: 68, originalPrice: 128 },
    { id: '2', name: '罗盘专业款', cover: `.webp`, price: 199, originalPrice: 399 },
    { id: '3', name: '紫檀木签筒', cover: `.webp`, price: 88, originalPrice: 168 },
  ] as ShopFlashProduct[],
}

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
  id: number | string
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
  /** 所属商家（自营/未开通则 null，详情页据此显示「进店」入口） */
  merchant?: { id: string; shopName: string; shopLogo?: string } | null
  /** 官方自营（归属官方旗舰店）→ 详情页显示「官方自营」标识 */
  isOfficialSelfOwned?: boolean
}

/** C 端店铺主页 — 商家公开信息 */
export interface StoreInfo {
  id: string
  shopName: string
  shopLogo?: string
  shopIntro?: string
  rating: number
  totalSales: number
  totalOrders: number
  productCount: number
}
/** C 端店铺商品卡 */
export interface StoreProduct {
  id: string
  title: string
  cover?: string
  price: number
  sales: number
}
export interface StoreData {
  merchant: StoreInfo
  products: StoreProduct[]
  total: number
}

/** 头像走 dicebear（与 circle-bots-data 约定一致） */
const AVATAR = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`

export const productDetail: ProductDetail = {
  id: 1,
  title: '周易正义·十三经注疏本（全四册）',
  subtitle: '唐·孔颖达 疏',
  images: [`.webp`, `.webp`, `.webp`, `.webp`],
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
      images: [`.webp`, `.webp`],
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
      images: [`.webp`],
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
  id: string | number
  name: string
  price: number
  originalPrice: number
  sales: number
  category: string
  cover: string
  isMemberFree: boolean
  createdAt?: string
}
export const categoryProducts: CategoryProduct[] = [
  { id: 1, name: '《渊海子平》精装典藏版', price: 128, originalPrice: 168, sales: 2856, category: 'books', cover: `.webp`, isMemberFree: false },
  { id: 2, name: '八卦太极挂件纯铜', price: 68, originalPrice: 98, sales: 1256, category: 'jewelry', cover: `.webp`, isMemberFree: false },
  { id: 3, name: '国学书签套装礼盒', price: 39, originalPrice: 59, sales: 3680, category: 'creative', cover: `.webp`, isMemberFree: true },
  { id: 4, name: '《滴天髓》白话详解', price: 88, originalPrice: 118, sales: 1892, category: 'books', cover: `.webp`, isMemberFree: false },
  { id: 5, name: '紫砂茶壶 手工刻绘', price: 368, originalPrice: 468, sales: 568, category: 'tea', cover: `.webp`, isMemberFree: false },
  { id: 6, name: '湖笔套装 书法入门', price: 158, originalPrice: 198, sales: 892, category: 'stationery', cover: `.webp`, isMemberFree: false },
  { id: 7, name: '罗盘模型 风水摆件', price: 199, originalPrice: 299, sales: 1456, category: 'jewelry', cover: `.webp`, isMemberFree: false },
  { id: 8, name: '《三命通会》全译本', price: 148, originalPrice: 188, sales: 1128, category: 'books', cover: `.webp`, isMemberFree: false },
  { id: 9, name: '沉香线香 养生助眠', price: 89, originalPrice: 128, sales: 2156, category: 'tea', cover: `.webp`, isMemberFree: false },
  { id: 10, name: '课程笔记本 手账本', price: 29, originalPrice: 49, sales: 4562, category: 'course', cover: `.webp`, isMemberFree: true },
  { id: 11, name: '五帝钱挂饰 开光铜钱', price: 58, originalPrice: 88, sales: 3256, category: 'jewelry', cover: `.webp`, isMemberFree: false },
  { id: 12, name: '端砚 文房珍品', price: 688, originalPrice: 888, sales: 286, category: 'stationery', cover: `.webp`, isMemberFree: false },
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
  id: string | number
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
  { id: 1, user: { name: '易学爱好者', avatar: AVATAR('yixue'), level: 'VIP会员' }, rating: 5, content: '这本书内容非常详实，从基础到进阶都有涉及，适合各个阶段的学习者。印刷质量很好，纸张厚实，字迹清晰。配合排盘工具学习效果更佳！', images: [`.webp`, `.webp`, `.webp`], spec: '精装版', time: '2024-01-15', likes: 56, tags: ['quality', 'texture', 'value'], reply: { content: '感谢您的认可！我们精选优质纸张，确保阅读体验。祝您学习愉快！', time: '2024-01-16' } },
  { id: 2, user: { name: '命理研究者', avatar: AVATAR('mingli'), level: '圈主' }, rating: 5, content: '作为从业多年的命理师，这本书的内容让我眼前一亮。理论扎实，案例丰富，是难得的好书。已经推荐给圈子里的学员了。', images: [`.webp`], spec: '典藏版', time: '2024-01-12', likes: 42, tags: ['quality', 'authentic'], reply: null },
  { id: 3, user: { name: '国学新手', avatar: AVATAR('xinshou'), level: '' }, rating: 4, content: '书的内容很好，就是对于完全零基础的人来说有点难度，需要配合入门课程一起学习。物流很快，包装完好。', images: [], spec: '平装版', time: '2024-01-10', likes: 18, tags: ['delivery', 'packaging'], reply: { content: '感谢您的反馈！建议搭配我们的《八字入门课》一起学习，效果更佳哦~', time: '2024-01-11' } },
  { id: 4, user: { name: '传统文化爱好者', avatar: AVATAR('chuantong'), level: 'VIP会员' }, rating: 5, content: '包装很精美，书籍质量上乘，内容深入浅出，值得收藏！', images: [`.webp`, `.webp`], spec: '精装版', time: '2024-01-08', likes: 35, tags: ['packaging', 'quality', 'texture'], reply: null },
  { id: 5, user: { name: '风水师小李', avatar: AVATAR('fengshui'), level: '讲师' }, rating: 5, content: '专业书籍，内容考究，引经据典，是学习八字的必备参考书。强烈推荐！', images: [], spec: '典藏版', time: '2024-01-05', likes: 28, tags: ['quality', 'authentic'], reply: null },
]
export const reviewSummary = { goodRatePercent: 98, rating: 4.9, total: 328 }

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
  { id: 'p1', name: '周易六十四卦详解', cover: `.webp`, price: 68, originalPrice: 168, stock: 100, sold: 78 },
  { id: 'p2', name: '紫微斗数入门', cover: `.webp`, price: 38, originalPrice: 98, stock: 50, sold: 45 },
  { id: 'p3', name: '风水入门指南', cover: `.webp`, price: 28, originalPrice: 88, stock: 200, sold: 156 },
  { id: 'p4', name: '八字命理基础', cover: `.webp`, price: 48, originalPrice: 128, stock: 80, sold: 62 },
]
/** 滚动通知 */
export const flashNotices = [
  '用户 138****8888 刚刚抢到了「周易六十四卦详解」',
  '用户 156****6666 抢购成功',
  '限时秒杀，手慢无！',
]
/** 秒杀结束时间（now + 2h），运行时计算倒计时 */
export const flashEndOffsetMs = 2 * 60 * 60 * 1000

/** 取首个进行中秒杀场次（后端 /marketing/flash-sales/active 返回数组） */
async function fetchActiveFlashSale(): Promise<RawFlashSale | null> {
  const list = await apiGet<RawFlashSale[]>('/marketing/flash-sales/active')
  return list && list.length > 0 ? list[0] : null
}

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
  { id: '1', title: '周易六十四卦详解', cover: `.webp`, price: 99, originalPrice: 168, minMembers: 3, currentMembers: 2, endOffsetMs: 8 * 3600000, status: 'ongoing' },
  { id: '2', title: '紫微斗数入门精讲', cover: `.webp`, price: 128, originalPrice: 238, minMembers: 5, currentMembers: 3, endOffsetMs: 12 * 3600000, status: 'ongoing' },
  { id: '3', title: '风水学基础教程', cover: `.webp`, price: 68, originalPrice: 128, minMembers: 3, currentMembers: 3, endOffsetMs: -3600000, status: 'success' },
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
  { id: 'g1', productId: '1', productName: '周易六十四卦详解', productCover: `.webp`, price: 99, status: 'pending', memberCount: 2, minMembers: 3, currentMembers: 2, endOffsetMs: 6 * 3600000, isOwner: true },
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
  /** 拼团有效期（分钟）：后端活动配置，用于详情页"有效期"展示；缺省/0 表示后端未配 */
  expireMinutes?: number
}
export const groupBuyDetail: GroupBuyDetailData = {
  id: '1',
  title: '周易六十四卦详解',
  cover: `.webp`,
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
  productCover: `.webp`,
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
  productCover: `.webp`,
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

/* ── 后端优惠券适配（Coupon/UserCoupon → 前端 MyCoupon/CenterCoupon） ── */
const COUPON_SCOPE_LABELS: Record<string, string> = {
  ALL: '全场通用', PRODUCT: '商城', COURSE: '课程', CIRCLE: '圈子', MEMBER: '会员',
}
/** 后端 CouponType(NO_THRESHOLD/FULL_REDUCE/DISCOUNT) → 前端展示类型 */
function adaptCouponType(t: string): CouponType {
  return t === 'DISCOUNT' ? 'percent' : 'amount'
}
/** 后端 value(满减为元，折扣为 0.90) → 前端 value(满减元 / 折扣 90 即 9 折) */
function adaptCouponValue(t: string, value: number): number {
  return t === 'DISCOUNT' ? Math.round(value * 100) : value
}
function fmtCouponDate(s?: string): string {
  return s ? String(s).slice(0, 10) : ''
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
    { id: '1', type: 'product', name: '周易六十四卦详解（精装典藏版）', image: `.webp`, price: 298 },
    { id: '2', type: 'product', name: '紫微斗数入门教程', image: `.webp`, price: 128 },
    { id: '3', type: 'course', name: '八字基础入门课', image: `.webp`, price: 299 },
    { id: '4', type: 'product', name: '易经风水运势解读', image: `.webp`, price: 188 },
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

// 平铺购物车数据（对齐原型 app/shop/cart：无店铺分组）
export interface FlatCartItem {
  id: string
  productId: string
  productName: string
  productCover: string
  skuName: string
  price: number
  originalPrice: number
  quantity: number
  stock: number
  selected: boolean
  isValid: boolean
  invalidReason?: string
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
      { id: 1, name: '《渊海子平》精装典藏版', spec: '精装版 / 全三册', price: 168, originalPrice: 298, quantity: 1, image: `.webp`, type: 'product' },
      { id: 2, name: '八字命理入门到精通', spec: '视频课程 / 共36节', price: 299, originalPrice: 599, quantity: 1, image: `.webp`, type: 'course' },
    ],
  },
  {
    id: 2,
    sellerName: '玄学文创旗舰店',
    sellerAvatar: AVATAR('xuanxue'),
    sellerType: 'store',
    freeShippingThreshold: 99,
    items: [
      { id: 3, name: '天然黑曜石貔貅手链', spec: '14mm / 男款', price: 128, originalPrice: 199, quantity: 2, image: `.webp`, type: 'product' },
    ],
  },
]
/** 后端 Redis 购物车项 → 前端 FlatCartItem（规格 Json 转可读字符串） */
function formatSkuSpecs(specs: unknown): string {
  if (!specs) return ''
  if (typeof specs === 'string') return specs
  if (Array.isArray(specs)) return specs.join(' / ')
  if (typeof specs === 'object') return Object.values(specs).join(' / ')
  return ''
}
function adaptCartItem(it: RawCartItem): FlatCartItem {
  return {
    id: it.id || '',
    productId: it.productId || '',
    productName: it.product?.title || '商品已失效',
    productCover: it.product?.image || '',
    skuName: formatSkuSpecs(it.sku?.specs),
    price: Number(it.unitPrice ?? 0),
    originalPrice: Number(it.originalPrice ?? it.unitPrice ?? 0),
    quantity: it.quantity ?? 1,
    stock: it.stock ?? 0,
    selected: !!it.isValid, // 有效商品默认勾选（后端无 selected，结算前端管理）
    isValid: !!it.isValid,
    invalidReason: it.invalidReason || undefined,
  }
}

export interface InvalidCartItem { id: number; name: string; spec: string; price: number; image: string; reason: string }
export const cartInvalidItems: InvalidCartItem[] = [
  { id: 101, name: '限量版紫水晶摆件', spec: '已下架', price: 388, image: `.webp`, reason: '商品已下架' },
]
export interface CartRecommendItem { id: number; name: string; price: number; image: string }
export const cartRecommendProducts: CartRecommendItem[] = [
  { id: 1, name: '紫微斗数全书', price: 88, image: `.webp` },
  { id: 2, name: '开光铜钱挂件', price: 68, image: `.webp` },
  { id: 3, name: '风水罗盘专业版', price: 268, image: `.webp` },
  { id: 4, name: '命理学基础课', price: 199, image: `.webp` },
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
  { id: '1', productId: 'p1', productName: '《易经》精装典藏版', productCover: `.webp`, skuId: 's1', skuName: '精装版', price: 128, originalPrice: 168, quantity: 1, stock: 99, selected: true, isValid: true },
  { id: '2', productId: 'p2', productName: '紫檀木八卦罗盘', productCover: `.webp`, skuId: 's2', skuName: '标准款', price: 388, originalPrice: 488, quantity: 2, stock: 50, selected: true, isValid: true },
  { id: '3', productId: 'p3', productName: '国学启蒙套装礼盒', productCover: `.webp`, skuId: 's3', skuName: '完整版', price: 268, originalPrice: 358, quantity: 1, stock: 30, selected: false, isValid: true },
  { id: '4', productId: 'p4', productName: '【已下架】古籍善本·四库全书', productCover: `.webp`, skuId: 's4', skuName: '精装版', price: 1280, originalPrice: 1680, quantity: 1, stock: 0, selected: false, isValid: false, invalidReason: '商品已下架' },
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

/** 微信 JSAPI 支付参数（uni.requestPayment 所需，后端 signJsapiConfig 生成） */
export interface WechatJsapiPayParams {
  appId: string
  timeStamp: string
  nonceStr: string
  package: string
  signType: string
  paySign: string
}

export interface PayMethodOption { id: string; name: string; badge: string; badgeColor: string }
export const payMethods: PayMethodOption[] = [
  { id: 'wechat', name: '微信支付', badge: '微', badgeColor: '#07C160' },
  { id: 'alipay', name: '支付宝', badge: '支', badgeColor: '#1677FF' },
  { id: 'unionpay', name: '云闪付', badge: '云', badgeColor: '#C41E3A' },
  { id: 'huifu', name: '汇付天下', badge: '汇', badgeColor: '#FF8800' },
]

/**
 * 结算页真实可用支付方式：后端订单仅提供微信支付创建端点（pay/jsapi 小程序、pay/native PC扫码），
 * 支付宝/银联仅有回调与管理端点、无「创建支付」端点 → 诚实只展示微信，避免点了报错。
 * 后续后端补支付宝/银联创建支付后再扩充。
 */
export const checkoutPayMethods: PayMethodOption[] = [
  { id: 'wechat', name: '微信支付', badge: '微', badgeColor: '#07C160' },
]

export interface CheckoutItem { id: string; productId: string; skuId?: string; productName: string; productCover: string; skuName: string; price: number; originalPrice: number; quantity: number }
export const checkoutItems: CheckoutItem[] = [
  { id: '1', productId: 'p1', productName: '周易六十四卦详解（精装典藏版）', productCover: `.webp`, skuName: '精装版', price: 168, originalPrice: 298, quantity: 1 },
  { id: '2', productId: 'p2', productName: '紫微斗数入门教程', productCover: `.webp`, skuName: '平装版', price: 88, originalPrice: 128, quantity: 2 },
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
      { id: 'p1', name: '周易六十四卦详解（精装典藏版）', cover: `.webp`, skuName: '精装版', price: 168, quantity: 1 },
      { id: 'p2', name: '紫微斗数入门教程', cover: `.webp`, skuName: '平装版', price: 88, quantity: 1 },
    ],
    canCancel: true, canConfirm: false, canReview: false, hasAfterSale: false,
  },
  {
    id: '2', orderNo: '202401140002', status: 'pending_ship', totalAmount: 168, payAmount: 158,
    createdAt: '2024-01-14 10:20',
    products: [{ id: 'p3', name: '八字命理学基础', cover: `.webp`, skuName: '标准版', price: 168, quantity: 1 }],
    canCancel: true, canConfirm: false, canReview: false, hasAfterSale: false,
  },
  {
    id: '3', orderNo: '202401130003', status: 'pending_receive', totalAmount: 299, payAmount: 279,
    createdAt: '2024-01-13 09:15',
    products: [{ id: 'p4', name: '风水布局实战指南', cover: `.webp`, skuName: '精装版', price: 299, quantity: 1 }],
    canCancel: false, canConfirm: true, canReview: false, hasAfterSale: false,
  },
  {
    id: '4', orderNo: '202401100004', status: 'completed', totalAmount: 128, payAmount: 128,
    createdAt: '2024-01-10 16:40',
    products: [{ id: 'p5', name: '梅花易数速成', cover: `.webp`, skuName: '电子版', price: 128, quantity: 1 }],
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
    { id: '1', name: '《渊海子平》精装典藏版', cover: `.webp`, skuName: '精装版', price: 168, quantity: 1 },
    { id: '2', name: '紫微斗数入门教程', cover: `.webp`, skuName: '平装版', price: 88, quantity: 2 },
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
    { status: 'in_transit', description: '快件已从【上海转运中心】发出', time: '2024-12-01 22:00', location: '上海市青浦区', isCurrent: false },
    { status: 'picked', description: '快件已到达【上海转运中心】', time: '2024-12-01 18:30', location: '上海市青浦区', isCurrent: false },
    { status: 'picked', description: '已揽收，快递员：李师傅 13900139000', time: '2024-12-01 15:20', location: '上海市浦东新区', isCurrent: false },
    { status: 'pending', description: '商家已发货，等待揽收', time: '2024-12-01 14:00', location: '上海市浦东新区', isCurrent: false },
  ],
}

/* —— 订单评价（app/orders/[id]/review） —— */
export const orderReviewItems = [
  { id: '1', name: '《渊海子平》精装典藏版', cover: `.webp` },
  { id: '2', name: '紫微斗数入门教程', cover: `.webp` },
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
  product: { id: 'p1', name: '周易六十四卦详解（精装典藏版）', cover: `.webp`, skuName: '精装版', price: 168, quantity: 1 },
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
  productCover: `.webp`, amount: 168, createdAt: '2024-01-01 12:00:00',
}
export const myDisputes: DisputeListItemData[] = [
  { id: '1', orderId: 'o1', orderNo: 'RB2024010100002', type: 'quality_issue', status: 'processing', productName: '紫微斗数入门', productCover: `.webp`, createdAt: '2024-01-05 10:00:00' },
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
  description: '收到的书籍有破损，封面有明显折痕', images: [`.webp`], expectation: '希望能够换货或退款',
  order: { productName: '周易六十四卦详解（精装典藏版）', productCover: `.webp`, amount: 168 },
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
  { id: '1', orderNo: 'C202401150001', category: 'course', title: '八字入门实战精讲课', cover: `.webp`, price: 299, originalPrice: 599, status: 'completed', createdAt: '2024-01-15 14:30', extra: { teacherName: '张玄风', duration: '36课时' } },
  { id: '2', orderNo: 'R202401140002', category: 'circle', title: '八字命理研习社', cover: `.webp`, price: 199, status: 'completed', createdAt: '2024-01-14 10:20', expiredAt: '2025-01-14', extra: { circleName: '八字命理研习社' } },
  { id: '3', orderNo: 'P202401130003', category: 'product', title: '周易六十四卦详解（精装典藏版）', cover: `.webp`, price: 168, status: 'paid', createdAt: '2024-01-13 09:15', extra: { quantity: 1 } },
  { id: '4', orderNo: 'L202401120004', category: 'live', title: '紫微斗数实战直播课', cover: `.webp`, price: 49.9, status: 'completed', createdAt: '2024-01-12 18:00', extra: { teacherName: '李命理' } },
  { id: '5', orderNo: 'Q202401100005', category: 'qa', title: '八字婚姻分析咨询', cover: `.webp`, price: 88, status: 'completed', createdAt: '2024-01-10 16:40', extra: { teacherName: '王大师' } },
  { id: '6', orderNo: 'M202401080006', category: 'membership', title: '热卜国学VIP年卡', price: 365, originalPrice: 588, status: 'completed', createdAt: '2024-01-08 12:00', expiredAt: '2025-01-08' },
  { id: '7', orderNo: 'A202401050007', category: 'activity', title: '新春开运讲座', cover: `.webp`, price: 0, status: 'completed', createdAt: '2024-01-05 20:00', extra: { duration: '2小时' } },
  { id: '8', orderNo: 'S202312200008', category: 'station', title: '分站站长资格', price: 999, status: 'completed', createdAt: '2023-12-20 10:00', expiredAt: '2024-12-20' },
  { id: '9', orderNo: 'I202312150009', category: 'institute', title: '研究院保证金', price: 10000, status: 'completed', createdAt: '2023-12-15 14:00', expiredAt: '2024-12-15', extra: { circleName: '热卜国学研究院' } },
  { id: '10', orderNo: 'C202401160010', category: 'course', title: '风水堪舆高级班', cover: `.webp`, price: 1299, status: 'pending', createdAt: '2024-01-16 09:00', extra: { teacherName: '风水大师', duration: '60课时' } },
]

/* ============================================================
   十六、shop 申请换货（pkg-shop/exchange·挂订单售后，从订单详情带 orderId 进入）
   —— 旧 shop 详情/分类/评价孤岛页已删（商城收敛 2026-07-11），其数据模型随页清理
   ============================================================ */

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

// ============ API 层 ============

/* ─── 后端原始响应类型（容错适配用，字段全 optional，仅声明 adapter 实际访问到的，宽松类型） ─── */
interface RawShopSku { id?: string; specs?: unknown; skuCode?: string; price?: number | string; stock?: number | string }
interface RawShopMerchant { id?: string; shopName?: string; shopLogo?: string | null; shopIntro?: string | null; rating?: number | string; totalSales?: number | string; totalOrders?: number | string; productCount?: number | string }
interface RawShopProduct {
  id?: string; title?: string; intro?: string; detail?: string
  images?: string[]; cover?: string; videoUrl?: string
  price?: number | string; effectivePrice?: number; originalPrice?: number | string
  salesCount?: number; stock?: number | string; tags?: string[]
  categoryLevel1?: string; hasPromotion?: boolean; promotionTag?: string
  createdAt?: string
  merchant?: RawShopMerchant | null
  skus?: RawShopSku[]
  isOfficialSelfOwned?: boolean
}
interface RawShopReview { id?: string; user?: { nickname?: string; avatar?: string } | null; rating?: number; content?: string; images?: string[]; reply?: string | null; repliedAt?: string | null; createdAt?: string }
interface RawReviewStats { average?: number; count?: number; withImages?: number; distribution?: Record<string, number> }
interface RawGroupBuyProduct { title?: string; image?: string; originalPrice?: number | string; price?: number | string; intro?: string }
interface RawGroupBuyMember { avatar?: string; nickname?: string; isLeader?: boolean; joinedAt?: string }
interface RawGroupBuyGroup { groupId?: string; members?: RawGroupBuyMember[]; currentMembers?: number; minMembers?: number }
interface RawGroupBuy { id?: string; product?: RawGroupBuyProduct | null; groupPrice?: number | string; minMembers?: number; joinedCount?: number; _count?: { participants?: number }; expireMinutes?: number; groups?: RawGroupBuyGroup[] }
interface RawMyGroupBuy { groupBuyId?: string; groupBuy?: { productId?: string; groupPrice?: number | string; minMembers?: number; expireMinutes?: number } | null; joinedCount?: number; product?: RawGroupBuyProduct | null; status?: string; isLeader?: boolean }
interface RawGroupResult { product?: RawGroupBuyProduct | null; members?: RawGroupBuyMember[]; paidAt?: string; orderId?: string; refundedAt?: string; refundAmount?: number | string; minMembers?: number; currentMembers?: number; groupId?: string }
interface RawCartItem { id?: string; productId?: string; product?: { title?: string; image?: string } | null; sku?: { specs?: unknown } | null; skuId?: string; unitPrice?: number | string; originalPrice?: number | string; quantity?: number; stock?: number; isValid?: boolean; invalidReason?: string }
interface RawAddress { id?: string; name?: string; contactName?: string; phone?: string; contactPhone?: string; province?: string; city?: string; district?: string; address?: string; detail?: string; isDefault?: boolean }
interface RawCoupon { id?: string; name?: string; type?: string; value?: number | string; minAmount?: number | string; validEnd?: string; scope?: string; discountRate?: number | string; discountAmount?: number | string; totalCount?: number; usedCount?: number }
interface RawUserCoupon { id?: string; couponId?: string; used?: boolean; coupon?: RawCoupon | null }
interface RawCategoryNode { id?: string; name?: string; children?: { id?: string; name?: string }[] }
interface RawFlashItem { productId?: string; product?: { title?: string; image?: string; originalPrice?: number | string; price?: number | string } | null; flashPrice?: number | string; stock?: number; sold?: number }
interface RawFlashSale { id?: string; name?: string; startTime?: string; endTime?: string; items?: RawFlashItem[] }
interface RawShopOrder { id?: string; targetId?: string; skuId?: string; status?: string; amount?: number | string; payAmount?: number | string; payMethod?: string; paidAt?: string; quantity?: number; product?: { id?: string; title?: string; cover?: string } | null; sku?: { skuName?: string } | null }

/* —— 订单试算（结算页价格明细预估·与后端定价引擎同口径） —— */
interface RawOrderEstimate { goodsAmount?: number | string; couponDiscount?: number | string; selfDiscount?: number | string; payableAmount?: number | string }
export interface OrderEstimate {
  /** 商品金额（活动单价×数量） */
  goodsAmount: number
  /** 优惠券抵扣 */
  couponDiscount: number
  /** 分销自购立减（非分销身份为 0） */
  selfDiscount: number
  /** 应付金额（与下单实付一致） */
  payableAmount: number
}

// ───────── 后端商品适配（前端 /shop 单数 → 后端 /shop/products）─────────
function shopNum(v: unknown): number { const x = Number(v); return Number.isFinite(x) ? x : 0 }

/** 图片 URL 防御性修复：生产库存量 Product.images 曾被 SanitizePipe 转义（/ → &#x2F;）导致 <image src> 加载失败 */
function fixImgUrl(u: unknown): string {
  const s = String(u ?? '')
  return s.includes('&#x2F;') || s.includes('&amp;') ? unescapeEntities(s) : s
}
function fixImgUrls(arr: unknown): string[] {
  return Array.isArray(arr) ? arr.map(fixImgUrl) : []
}
/**
 * 商品详情富文本归一化 —— 已抽到 @/utils/rich-content 全端共用（normalizeRichContent）：
 * 反转义存量转义脏数据 + <img> 注入 display:block;width:100% 无缝通栏 + 纯图片 <p> 去 margin（详情多图拼接无缝）。
 */
const normalizeRichDetail = normalizeRichContent
/** 后端商品详情 → 前端 ProductDetail（specs/reviews/coupon 后端结构不同→默认空，页面降级） */
function adaptProductDetail(p: RawShopProduct): ProductDetail {
  const price = p.effectivePrice ?? shopNum(p.price)
  return {
    id: p.id || '',
    title: p.title || '',
    subtitle: p.intro || '',
    // 有 images 用 images(轮播)，否则退回单张 cover，避免顶部封面空白（fixImgUrls：存量转义 URL 反转义）
    images: (Array.isArray(p.images) && p.images.length) ? fixImgUrls(p.images) : (p.cover ? [fixImgUrl(p.cover)] : []),
    hasVideo: !!p.videoUrl,
    price,
    originalPrice: shopNum(p.originalPrice) || price,
    coupon: { value: 0, threshold: 0 },
    sales: shopNum(p.salesCount),
    stock: shopNum(p.stock),
    specs: [],
    rating: 0,
    reviewCount: 0,
    tags: Array.isArray(p.tags) ? p.tags : [],
    reviews: [],
    description: normalizeRichDetail(p.detail || p.intro || ''),
    merchant: p.merchant
      ? { id: p.merchant.id || '', shopName: p.merchant.shopName || '', shopLogo: p.merchant.shopLogo || undefined }
      : null,
    isOfficialSelfOwned: !!p.isOfficialSelfOwned,
  }
}

/** ISO → 'YYYY-MM-DD'（评价展示日期，多端无 dayjs） */
function shopFmtDate(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 拼团规则（UI 文案配置，非后端数据） */
const GROUP_BUY_RULES = [
  '邀请好友参团，达到成团人数即拼团成功',
  '拼团成功后商家统一发货',
  '在有效期内未达成团人数，拼团失败，已付款项原路退回',
  '同一拼团活动每人限参与一次',
]

/** 后端进行中拼团活动 → 前端 GroupBuyItem */
function adaptGroupBuyItem(g: RawGroupBuy): GroupBuyItem {
  const joined = g.joinedCount ?? g._count?.participants ?? 0
  const minMembers = g.minMembers ?? 2
  return {
    id: g.id || '',
    title: g.product?.title || '拼团商品',
    cover: g.product?.image || '',
    price: shopNum(g.groupPrice),
    originalPrice: shopNum(g.product?.originalPrice ?? g.product?.price ?? g.groupPrice),
    minMembers,
    currentMembers: joined,
    endOffsetMs: (g.expireMinutes ?? 0) * 60000, // 后端为活动配置时长（无逐团截止时间）
    status: joined >= minMembers ? 'success' : 'ongoing',
  }
}

/** 后端我的拼团参与记录 → 前端 MyGroupBuyItem */
function adaptMyGroupBuy(r: RawMyGroupBuy): MyGroupBuyItem {
  const gb: NonNullable<RawMyGroupBuy['groupBuy']> = r.groupBuy || {}
  const joined = r.joinedCount ?? 0
  const statusMap: Record<string, MyGroupBuyItem['status']> = { WAITING: 'pending', SUCCESS: 'success', REFUNDED: 'failed' }
  return {
    id: r.groupBuyId || '',
    productId: gb.productId || '',
    productName: r.product?.title || '拼团商品',
    productCover: r.product?.image || '',
    price: shopNum(gb.groupPrice),
    status: statusMap[r.status || ''] || 'pending',
    memberCount: joined,
    minMembers: gb.minMembers ?? 2,
    currentMembers: joined,
    endOffsetMs: (gb.expireMinutes ?? 0) * 60000,
    isOwner: !!r.isLeader,
  }
}

/** 格式化日期时间（YYYY-MM-DD HH:mm） */
function fmtDateTime(s?: string | null): string {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return String(s).slice(0, 16).replace('T', ' ')
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
/** 后端拼团结果(my-result) → 成功结果页（成团时间取支付时间·后端无单独成团时间；发货预估为业务承诺文案） */
function adaptGroupBuySuccess(r: RawGroupResult) {
  const price = shopNum(r?.product?.price)
  const originalPrice = shopNum(r?.product?.originalPrice)
  return {
    productCover: r?.product?.image || '',
    productName: r?.product?.title || '',
    price,
    originalPrice,
    savedAmount: Math.round((originalPrice - price) * 100) / 100,
    members: (r?.members || []).map((m: RawGroupBuyMember) => ({ avatar: m.avatar || '' })),
    completedAt: fmtDateTime(r?.paidAt),
    orderId: r?.orderId || '',
    estimatedShipDate: '付款后 3 个工作日内',
  }
}
/** 后端拼团结果(my-result) → 失败结果页（reason 统一 timeout·后端仅超时未成团一种失败；退款状态由 refundedAt 派生） */
function adaptGroupBuyFail(r: RawGroupResult) {
  return {
    productCover: r?.product?.image || '',
    productName: r?.product?.title || '',
    price: shopNum(r?.product?.price),
    minMembers: r?.minMembers || 2,
    currentMembers: r?.currentMembers || 0,
    members: (r?.members || []).map((m: RawGroupBuyMember) => ({ avatar: m.avatar || '' })),
    reason: 'timeout',
    failedAt: fmtDateTime(r?.refundedAt || r?.paidAt),
    refundAmount: shopNum(r?.refundAmount),
    estimatedRefundTime: '1-3 个工作日',
    refundStatus: r?.refundedAt ? 'completed' : 'processing',
    orderId: r?.orderId || '',
    groupId: r?.groupId || '',
  }
}

/** 后端拼团详情 → 前端 GroupBuyDetailData（rules 为静态配置，description 取商品简介） */
function adaptGroupBuyDetailData(gb: RawGroupBuy): GroupBuyDetailData {
  return {
    id: gb.id || '',
    title: gb.product?.title || '拼团商品',
    cover: gb.product?.image || '',
    price: shopNum(gb.groupPrice),
    originalPrice: shopNum(gb.product?.originalPrice ?? gb.product?.price ?? gb.groupPrice),
    minMembers: gb.minMembers ?? 2,
    description: gb.product?.intro || '',
    rules: GROUP_BUY_RULES,
    expireMinutes: gb.expireMinutes ?? 0, // 真实有效期（分钟），详情页据此展示"X小时有效"
  }
}

/** 后端进行中的团（按 groupId 聚合）→ 前端 ActiveGroup[]（团长 joinedAt + 活动时长 推算剩余时间） */
function adaptActiveGroups(groups: RawGroupBuyGroup[], expireMinutes?: number): ActiveGroup[] {
  const winMs = (expireMinutes ?? 0) * 60000
  const now = Date.now()
  return (groups || []).map((g) => {
    const members: RawGroupBuyMember[] = g.members || []
    const leader = members.find((m: RawGroupBuyMember) => m.isLeader) || members[0]
    const others = members.filter((m: RawGroupBuyMember) => m !== leader)
    const startMs = leader?.joinedAt ? new Date(leader.joinedAt).getTime() : now
    return {
      id: g.groupId || '',
      owner: { name: leader?.nickname || '团长', avatar: leader?.avatar || '' },
      members: others.map((m: RawGroupBuyMember) => ({ name: m.nickname || '团员', avatar: m.avatar || '' })),
      currentMembers: g.currentMembers ?? members.length,
      minMembers: g.minMembers ?? 2,
      endOffsetMs: Math.max(0, startMs + winMs - now),
    }
  })
}

/** 后端商品 → 前端 ProductCardData（mall 首页推荐卡片） */
function adaptProductCard(p: RawShopProduct): ProductCardData {
  return {
    id: p.id || '',
    title: p.title || '',
    cover: fixImgUrl(p.images?.[0] || p.cover || ''), // 兼容只传 cover 未传 images 的商品，避免封面空白
    price: shopNum(p.effectivePrice ?? p.price),
    originalPrice: shopNum(p.originalPrice ?? p.price),
    sales: p.salesCount ?? 0,
    tag: p.hasPromotion ? (p.promotionTag || '促销') : undefined,
    isOfficialSelfOwned: !!p.isOfficialSelfOwned,
    coverRatio: '1:1', // 商城商品主图规范=1:1（电商通用 800×800）；此处仅商城板块数据源，不影响发现页 feed 的 3:4 容器
  }
}

/** mall 分类排序选项（UI 配置） */
const MALL_CATEGORY_SORT_OPTIONS = [
  { id: 'default', name: '综合排序' },
  { id: 'sales', name: '销量优先' },
  { id: 'price_asc', name: '价格升序' },
  { id: 'price_desc', name: '价格降序' },
  { id: 'newest', name: '最新上架' },
]

/** 后端商品 → 前端 CategoryProduct（mall 分类页·category 取 categoryLevel1 真实标签） */
function adaptCategoryProduct(p: RawShopProduct): CategoryProduct {
  return {
    id: p.id || '',
    name: p.title || '',
    price: shopNum(p.effectivePrice ?? p.price),
    originalPrice: shopNum(p.originalPrice ?? p.price),
    sales: p.salesCount ?? 0,
    category: p.categoryLevel1 || '',
    cover: fixImgUrl(p.images?.[0] || ''),
    isMemberFree: false, // 后端无会员免费标记
    createdAt: p.createdAt || '',
  }
}

/** mall 评价排序选项（UI 配置） */
// mostLikes 已移除：后端评价无点赞体系(ProductReview 无 likeCount，likes 恒 0)，排序无意义
const MALL_REVIEW_SORT_OPTIONS = [
  { id: 'default', label: '默认排序' },
  { id: 'newest', label: '最新评价' },
  { id: 'withImages', label: '有图优先' },
]

/** 后端商品评价 → 前端 FullReview（后端无 level/spec/tags/likes，诚实降级；reply 取后端回复） */
function adaptMallReview(r: RawShopReview): FullReview {
  return {
    id: r.id || '',
    user: { name: r.user?.nickname || '匿名用户', avatar: r.user?.avatar || '', level: '' },
    rating: r.rating ?? 5,
    content: r.content || '',
    images: Array.isArray(r.images) ? r.images : [],
    spec: '', // 后端评价未关联 SKU 规格
    time: shopFmtDate(r.createdAt),
    likes: 0, // 后端评价无点赞体系
    tags: [], // 后端评价无标签维度
    reply: r.reply ? { content: r.reply, time: shopFmtDate(r.repliedAt) } : null,
  }
}

export const shopApi = {
  /** 商品详情 — GET /shop/products/:id */
  async getProduct(id: string): Promise<ProductDetail> {
    try {
      return adaptProductDetail(await apiGet<RawShopProduct>(`/shop/products/${id}`))
    } catch {
      return getProductDetail(id)
    }
  },

  /** C 端店铺主页 — 商家信息 + 在售商品（GET /shop/store/:merchantId）。失败抛给页面走三态，不回退假数据 */
  async getStore(merchantId: string, page = 1, pageSize = 20): Promise<StoreData> {
    const res = await apiGet<{ merchant?: RawShopMerchant; products?: RawShopProduct[]; total?: number | string }>(`/shop/store/${merchantId}?page=${page}&pageSize=${pageSize}`)
    const m: RawShopMerchant = res?.merchant || {}
    return {
      merchant: {
        id: m.id || '',
        shopName: m.shopName || '',
        shopLogo: m.shopLogo || undefined,
        shopIntro: m.shopIntro || undefined,
        rating: shopNum(m.rating),
        totalSales: shopNum(m.totalSales),
        totalOrders: shopNum(m.totalOrders),
        productCount: shopNum(m.productCount),
      },
      products: Array.isArray(res?.products)
        ? res.products.map((p: RawShopProduct): StoreProduct => ({
            id: p.id || '',
            title: p.title || '',
            cover: Array.isArray(p.images) ? fixImgUrl(p.images[0]) : undefined,
            price: p.effectivePrice ?? shopNum(p.price),
            sales: shopNum(p.salesCount),
          }))
        : [],
      total: shopNum(res?.total),
    }
  },

  /** 获取限时秒杀（首页秒杀专区） — GET /marketing/flash-sales/active 取首个进行中场次 */
  async getFlashSale(): Promise<typeof shopFlashSale> {
    const sale = await fetchActiveFlashSale()
    if (!sale) return { id: '', title: '限时秒杀', durationSec: 0, products: [] }
    const endOffsetMs = Math.max(0, new Date(sale.endTime ?? '').getTime() - Date.now())
    return {
      id: sale.id || '',
      title: sale.name || '限时秒杀',
      durationSec: Math.floor(endOffsetMs / 1000),
      products: (sale.items || []).map((it: RawFlashItem) => ({
        id: it.productId,
        name: it.product?.title || '商品',
        cover: it.product?.image || '',
        price: Number(it.flashPrice),
        originalPrice: Number(it.product?.originalPrice ?? it.product?.price ?? it.flashPrice),
      })) as ShopFlashProduct[],
    }
  },

  /** 获取进行中拼团（首页拼团专区/营销区） — GET /marketing/group-buys/active */
  async getActiveGroupBuys(): Promise<Array<{ id: string; cover: string; title: string; need: number; joined: number; groupPrice: number; originalPrice: number }>> {
    const list = await apiGet<RawGroupBuy[]>('/marketing/group-buys/active')
    return (list || []).map((g) => ({
      id: g.id || '',
      cover: g.product?.image || '',
      title: g.product?.title || '拼团商品',
      need: g.minMembers ?? 2,
      joined: g.joinedCount ?? g._count?.participants ?? 0,
      groupPrice: Number(g.groupPrice),
      originalPrice: Number(g.product?.originalPrice ?? g.product?.price ?? g.groupPrice),
    }))
  },

  /** 获取秒杀页完整数据 — GET /marketing/flash-sales/active（单场进行中 → 时段/商品/倒计时） */
  async getFlashSaleFull(): Promise<{ timeSlots: FlashTimeSlot[]; products: FlashProduct[]; notices: string[]; endOffsetMs: number }> {
    const sale = await fetchActiveFlashSale()
    if (!sale) return { timeSlots: [], products: [], notices: [], endOffsetMs: 0 }
    const products: FlashProduct[] = (sale.items || []).map((it: RawFlashItem) => ({
      id: it.productId || '',
      name: it.product?.title || '商品',
      cover: it.product?.image || '',
      price: Number(it.flashPrice),
      originalPrice: Number(it.product?.originalPrice ?? it.product?.price ?? it.flashPrice),
      stock: it.stock ?? 0,
      sold: it.sold ?? 0,
    }))
    const startHour = new Date(sale.startTime ?? '').getHours()
    const hh = String(startHour).padStart(2, '0')
    const timeSlots: FlashTimeSlot[] = [{ id: String(startHour), label: `${hh}:00`, time: `${hh}:00:00` }]
    const notices = products.slice(0, 3).map((p) => `「${p.name}」秒杀价 ¥${p.price}，限时抢购`)
    const endOffsetMs = Math.max(0, new Date(sale.endTime ?? '').getTime() - Date.now())
    return { timeSlots, products, notices, endOffsetMs }
  },

  /** 加入购物车 — POST /shop/cart，返回最新购物车 */
  async addToCart(productId: string, quantity = 1, skuId?: string): Promise<{ items: FlatCartItem[] }> {
    const res = await apiPost<{ items?: RawCartItem[] }>('/shop/cart', { productId, skuId, quantity })
    return { items: (res?.items || []).map(adaptCartItem) }
  },

  /** 更新购物车商品数量 — PUT /shop/cart/:itemId，返回最新购物车 */
  async updateCartItem(itemId: string, quantity: number): Promise<{ items: FlatCartItem[] }> {
    const res = await apiPut<{ items?: RawCartItem[] }>(`/shop/cart/${itemId}`, { quantity })
    return { items: (res?.items || []).map(adaptCartItem) }
  },

  /** 移除购物车商品 — DELETE /shop/cart/:itemId，返回最新购物车 */
  async removeCartItem(itemId: string): Promise<{ items: FlatCartItem[] }> {
    const res = await apiDelete<{ items?: RawCartItem[] }>(`/shop/cart/${itemId}`)
    return { items: (res?.items || []).map(adaptCartItem) }
  },

  /** 清空购物车 — DELETE /shop/cart */
  async clearCart(): Promise<void> {
    await apiDelete('/shop/cart')
  },

  /** 是否已收藏商品 — GET /interaction/collect（匹配 PRODUCT·未登录静默 false，与课程收藏同范式） */
  async isProductFavorited(id: string): Promise<boolean> {
    try {
      const res = await apiGet<{ items?: { targetType?: string; targetId?: string }[] }>('/interaction/collect?pageSize=200')
      return (res?.items ?? []).some((it) => it.targetType === 'PRODUCT' && it.targetId === id)
    } catch {
      return false
    }
  },

  /** 收藏/取消收藏商品 — POST /interaction/collect（后端 toggle，返回最新收藏态 collected） */
  async toggleProductFavorite(id: string): Promise<boolean> {
    const res = await apiPost<{ collected?: boolean }>('/interaction/collect', { targetType: 'PRODUCT', targetId: id })
    return !!res?.collected
  },

  /** 获取购物车（{items} 信封形态·商城首页/商品详情角标用） — GET /shop/cart */
  async getCart(): Promise<{ items: SkuCartItem[] }> {
    return { items: await this.getSkuCart() }
  },

  /** 获取 SKU 维度购物车 — GET /shop/cart（后端购物车本就含 skuId） */
  async getSkuCart(): Promise<SkuCartItem[]> {
    const res = await apiGet<{ items?: RawCartItem[] }>('/shop/cart')
    return (res?.items || []).map((it: RawCartItem) => ({
      id: it.id,
      productId: it.productId,
      productName: it.product?.title || '商品已失效',
      productCover: it.product?.image || '',
      skuId: it.skuId || '',
      skuName: formatSkuSpecs(it.sku?.specs),
      price: Number(it.unitPrice ?? 0),
      originalPrice: Number(it.originalPrice ?? it.unitPrice ?? 0),
      quantity: it.quantity ?? 1,
      stock: it.stock ?? 0,
      selected: !!it.isValid,
      isValid: !!it.isValid,
      invalidReason: it.invalidReason || undefined,
    })) as SkuCartItem[]
  },

  /**
   * 获取结算数据（真连组装：后端无 /shop/checkout 聚合端点，前端按来源拼装）。
   * 来源二选一：立即购买(productId+skuId+quantity) 或 购物车结算(itemIds=购物车项ID)。
   * 地址 GET /shop/addresses、可用券 GET /shop/coupons/my；支付方式诚实仅微信；发票后端未实现仅 UI 选项。
   */
  async getCheckout(opts?: { productId?: string; skuId?: string; quantity?: number; itemIds?: string[] }): Promise<{
    items: CheckoutItem[]; addresses: ShippingAddress[]; coupons: CheckoutCoupon[]
    payMethods: PayMethodOption[]; invoiceOptions: typeof invoiceOptions
  }> {
    // 1) 商品清单
    let items: CheckoutItem[] = []
    if (opts?.productId) {
      // 立即购买（单品）：拉商品详情，可选 SKU
      const p = await apiGet<RawShopProduct>(`/shop/products/${opts.productId}`)
      const sku = opts.skuId && Array.isArray(p?.skus) ? p.skus.find((s: RawShopSku) => s.id === opts.skuId) : null
      const price = sku ? shopNum(sku.price) : shopNum(p?.effectivePrice ?? p?.price)
      items = [{
        id: opts.skuId || p?.id || opts.productId,
        productId: p?.id || opts.productId,
        skuId: opts.skuId || undefined,
        productName: p?.title || '商品',
        productCover: fixImgUrl((Array.isArray(p?.images) && p.images[0]) || ''),
        skuName: sku ? formatSkuSpecs(sku.specs) : '',
        price,
        originalPrice: shopNum(p?.originalPrice ?? p?.price) || price,
        quantity: Math.max(1, Number(opts.quantity) || 1),
      }]
    } else if (opts?.itemIds?.length) {
      // 购物车结算（多品）：用 SKU 维度购物车（含 skuId），按选中项过滤，仅有效项
      const cart = await this.getSkuCart()
      const idSet = new Set(opts.itemIds.map(String))
      items = cart.filter((it) => idSet.has(String(it.id)) && it.isValid).map((it) => ({
        id: it.id, productId: it.productId, skuId: it.skuId || undefined,
        productName: it.productName, productCover: it.productCover,
        skuName: it.skuName, price: it.price, originalPrice: it.originalPrice, quantity: it.quantity,
      }))
    }
    // 2) 收货地址（后端 detail → 前端 address）
    const addrRes = await apiGet<RawAddress[] | { items?: RawAddress[] }>('/shop/addresses').catch(() => [])
    const addresses: ShippingAddress[] = (Array.isArray(addrRes) ? addrRes : addrRes?.items || []).map((a: RawAddress) => ({
      id: a.id || '', name: a.name || '', phone: a.phone || '',
      province: a.province || '', city: a.city || '', district: a.district || '',
      address: a.detail || a.address || '', isDefault: !!a.isDefault,
    }))
    // 3) 可用券（未用 + 未过期 + 满足门槛），按当前金额预估抵扣（最终以后端 createOrder 重算为准）
    const goodsTotal = Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100
    const myRes = await apiGet<RawUserCoupon[]>('/shop/coupons/my').catch(() => [])
    const now = Date.now()
    const coupons: CheckoutCoupon[] = (myRes || [])
      .filter((uc: RawUserCoupon) => !uc.used && (!uc.coupon?.validEnd || new Date(uc.coupon.validEnd).getTime() > now))
      .map((uc: RawUserCoupon) => {
        const c: RawCoupon = uc.coupon || {}
        const minAmount = Number(c.minAmount ?? 0)
        let value = 0
        if (c.type === 'DISCOUNT') {
          const rate = Number(c.discountRate ?? (c.value ? Number(c.value) / 100 : 1))
          value = Math.round(goodsTotal * (1 - rate) * 100) / 100
        } else {
          value = Number(c.discountAmount ?? c.value ?? 0)
        }
        return { id: uc.id || '', name: c.name || '优惠券', value, minAmount }
      })
      .filter((c: CheckoutCoupon) => c.minAmount <= goodsTotal)
    return { items, addresses, coupons, payMethods: checkoutPayMethods, invoiceOptions }
  },

  /**
   * 创建订单 — POST /shop/orders（单商品；服务端重算金额防篡改、按数量计价、扣库存、绑定收货地址快照）。
   * 注意 amount 字段语义=购买数量（后端约定），金额由后端依统一定价引擎计算。
   * 内容来源（佣-V2-P3）：显式传入 sourceContentType/Id 优先（直播/视频直跳结算 URL 透传）；
   * 未显式传入时回落会话内暂存来源（文章→商品详情→结算的间接链路），仅当商品匹配才带上。
   */
  async createOrder(payload: { type?: string; targetId: string; skuId?: string; quantity?: number; couponId?: string; addressId?: string; sourceContentType?: string; sourceContentId?: string }): Promise<{ id: string; amount: number; status: string }> {
    const source = (payload.sourceContentType && payload.sourceContentId)
      ? { type: payload.sourceContentType, id: payload.sourceContentId }
      : peekOrderSource(payload.targetId)
    const res = await apiPost<{ id?: string; amount?: number | string; status?: string }>('/shop/orders', {
      type: payload.type || 'PRODUCT',
      targetId: payload.targetId,
      skuId: payload.skuId || undefined,
      amount: Math.max(1, Number(payload.quantity) || 1),
      couponId: payload.couponId || undefined,
      addressId: payload.addressId || undefined,
      // 推荐归因：携带最近分享链接的临时推荐人（7天窗口·临时优先于永久归属，永久归属由后端回填）
      tempReferrerId: getTempReferrer(),
      // 内容来源（佣-V2-P3·纯记录）：LIVE/ARTICLE/VIDEO 场景下单归因
      sourceContentType: source?.type,
      sourceContentId: source?.id,
    })
    return { id: res.id || '', amount: shopNum(res.amount), status: res.status || 'PENDING' }
  },

  /**
   * 发起微信 JSAPI 支付（小程序内）— POST /shop/orders/:id/pay/jsapi。
   * openid 由后端从用户已绑定的微信授权记录中查取（无需前端传），返回 uni.requestPayment 所需参数。
   */
  async payOrderJsapi(orderId: string, opts?: { openid?: string; channel?: 'MINI' | 'OFFICIAL' }): Promise<WechatJsapiPayParams> {
    return await apiPost<WechatJsapiPayParams>(`/shop/orders/${orderId}/pay/jsapi`, { ...(opts?.openid ? { openid: opts.openid } : {}), ...(opts?.channel ? { channel: opts.channel } : {}) })
  },

  /** 发起微信 Native 扫码支付 — POST /shop/orders/:id/pay/native（返回 code_url 二维码；本地无商户证书会失败，走错误态） */
  async payOrderNative(orderId: string): Promise<{ codeUrl?: string; raw: unknown }> {
    const res = await apiPost<{ code_url?: string; codeUrl?: string }>(`/shop/orders/${orderId}/pay/native`, {})
    return { codeUrl: res?.code_url || res?.codeUrl, raw: res }
  },

  /**
   * 发起微信 H5 支付（外部浏览器）— POST /shop/pay/h5。
   * 返回 mwebUrl（微信收银台中间页），前端跳转并携带 redirect_url 回跳；
   * 无商户证书/未配置 H5 支付域名时后端返回结构化 400（非 500），错误信息透给页面。
   */
  async payOrderH5(orderId: string): Promise<{ mwebUrl?: string }> {
    const res = await apiPost<{ mwebUrl?: string; mweb_url?: string; h5Url?: string }>('/shop/pay/h5', { orderId })
    return { mwebUrl: res?.mwebUrl || res?.mweb_url || res?.h5Url }
  },

  /**
   * 订单试算 — POST /shop/orders/estimate（服务端定价引擎同口径预演，不落库不占券）。
   * 结算页价格明细用它展示券后/分销自购立减后的应付金额，保证展示价与下单实付一致。
   */
  async estimateOrder(payload: { targetId: string; skuId?: string; quantity?: number; couponId?: string }): Promise<OrderEstimate> {
    const res = await apiPost<RawOrderEstimate>('/shop/orders/estimate', {
      targetId: payload.targetId,
      skuId: payload.skuId || undefined,
      quantity: Math.max(1, Number(payload.quantity) || 1),
      couponId: payload.couponId || undefined,
      // 与 createOrder 同源：带临时推荐人，保证归因判定（自购立减是否生效）一致
      tempReferrerId: getTempReferrer(),
    })
    return {
      goodsAmount: shopNum(res?.goodsAmount),
      couponDiscount: shopNum(res?.couponDiscount),
      selfDiscount: shopNum(res?.selfDiscount),
      payableAmount: shopNum(res?.payableAmount),
    }
  },

  /**
   * 查询订单支付状态（轮询用）— GET /shop/orders/:id 读 status。
   * 不用 /payment-status（依赖微信查单·本地不通），改读订单 status：微信回调或管理员确认支付后置 PAID，本地可验证闭环。
   */
  async getOrderPayState(orderId: string): Promise<{ status: string; paid: boolean; type?: string; targetId?: string }> {
    const res = await apiGet<{ status?: string; type?: string; targetId?: string }>(`/shop/orders/${orderId}`)
    const status = res?.status || 'PENDING'
    // type/targetId 供支付页做业务兑现（圈子入圈/续费是双段模式，支付后需 confirm 建成员关系）
    return { status, paid: ['PAID', 'SHIPPED', 'COMPLETED'].includes(status), type: res?.type, targetId: res?.targetId }
  },

  /** 支付成功页订单摘要 — GET /shop/orders/:id（真查金额/支付方式/支付时间/件数，替代硬编码展示） */
  async getOrderSummary(orderId: string): Promise<{ orderId: string; amount: number; payMethod: string; paidAt: string; itemCount: number }> {
    const o = await apiGet<RawShopOrder>(`/shop/orders/${orderId}`)
    const methodMap: Record<string, string> = { WECHAT: '微信支付', ALIPAY: '支付宝', UNIONPAY: '银联支付', HUIFU: '汇付支付', COIN: '国学币' }
    const paidAt = o?.paidAt ? new Date(o.paidAt) : null
    const fmt = (d: Date) => `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    return {
      orderId: o?.id || orderId,
      amount: shopNum(o?.payAmount ?? o?.amount),
      payMethod: methodMap[String(o?.payMethod || '').toUpperCase()] || '在线支付',
      paidAt: paidAt ? fmt(paidAt) : '',
      itemCount: Math.max(1, Number(o?.quantity) || 1),
    }
  },

  /** 获取优惠券详情 — GET /shop/coupons/:id（后端无规则/适用商品，页面 v-if 降级） */
  async getCouponDetail(id: string) {
    const c = await apiGet<RawCoupon>(`/shop/coupons/${id}`)
    return {
      id: c.id || '',
      name: c.name || '优惠券',
      type: adaptCouponType(c.type || ''),
      value: adaptCouponValue(c.type || '', Number(c.value)),
      minAmount: Number(c.minAmount ?? 0),
      expireAt: fmtCouponDate(c.validEnd),
      scope: [COUPON_SCOPE_LABELS[c.scope || ''] || '全场通用'],
      description: c.name || '',
      rules: [] as string[],
      applicableItems: [] as CouponApplicableItem[],
    }
  },

  /** 获取我的优惠券 — GET /shop/coupons/my（UserCoupon[] include coupon） */
  async getMyCoupons(): Promise<{ coupons: MyCoupon[]; tabs: typeof couponTabs }> {
    const list = await apiGet<RawUserCoupon[]>('/shop/coupons/my')
    const now = Date.now()
    const coupons: MyCoupon[] = (list || []).map((uc) => {
      const c: RawCoupon = uc.coupon || {}
      const expired = c.validEnd ? new Date(c.validEnd).getTime() < now : false
      return {
        id: uc.id || '',
        name: c.name || '优惠券',
        type: adaptCouponType(c.type || ''),
        value: adaptCouponValue(c.type || '', Number(c.value)),
        minAmount: Number(c.minAmount ?? 0),
        expireAt: fmtCouponDate(c.validEnd),
        scope: [COUPON_SCOPE_LABELS[c.scope || ''] || '全场通用'],
        status: uc.used ? 'used' : expired ? 'expired' : 'unused',
      }
    })
    return { coupons, tabs: couponTabs }
  },

  /** 获取领券中心 — GET /shop/coupons（ACTIVE 券，叠加我的已领状态） */
  async getCenterCoupons(): Promise<CenterCoupon[]> {
    const [listRes, myList] = await Promise.all([
      apiGet<{ coupons?: RawCoupon[] }>('/shop/coupons?pageSize=50'),
      apiGet<RawUserCoupon[]>('/shop/coupons/my').catch(() => [] as RawUserCoupon[]),
    ])
    const claimedIds = new Set((myList || []).map((uc: RawUserCoupon) => uc.couponId))
    const coupons = listRes?.coupons || []
    return coupons.map((c: RawCoupon) => ({
      id: c.id,
      name: c.name || '优惠券',
      type: adaptCouponType(c.type || ''),
      value: adaptCouponValue(c.type || '', Number(c.value)),
      minAmount: Number(c.minAmount ?? 0),
      expireAt: fmtCouponDate(c.validEnd),
      scope: [COUPON_SCOPE_LABELS[c.scope || ''] || '全场通用'],
      stock: c.totalCount === -1 ? 9999 : c.totalCount,
      claimed: c.usedCount ?? 0,
      isClaimed: claimedIds.has(c.id),
    })) as CenterCoupon[]
  },

  /** 领取优惠券 — POST /shop/coupons/:id/claim */
  async claimCoupon(couponId: string): Promise<void> {
    await apiPost(`/shop/coupons/${couponId}/claim`)
  },

  /** 获取换货数据 — GET /shop/exchange */
  async getExchange(orderId?: string) {
    // 换货 = 售后(type=exchange)：商品来自订单、地址来自用户地址、原因为 UI 配置；提交走 after-sale
    const [order, addrRes] = await Promise.all([
      orderId ? apiGet<RawShopOrder>(`/shop/orders/${orderId}`).catch(() => null) : Promise.resolve(null),
      apiGet<RawAddress[] | { items?: RawAddress[] }>('/shop/addresses').catch(() => []),
    ])
    const addrArr = Array.isArray(addrRes) ? addrRes : (addrRes?.items || [])
    const addresses: ShopExchangeAddress[] = addrArr.map((a: RawAddress) => ({
      id: a.id || '',
      name: a.name || a.contactName || '',
      phone: a.phone || a.contactPhone || '',
      province: a.province || '',
      city: a.city || '',
      district: a.district || '',
      address: a.address || a.detail || '',
      isDefault: !!a.isDefault,
    }))
    const products: ShopExchangeProduct[] = []
    if (order?.product) {
      // 拉商品 SKU（换不同规格用；订单行未携带 SKU 列表）
      let skus: { id: string; name: string; price: number }[] = []
      try {
        const p = await apiGet<RawShopProduct>(`/shop/products/${order.product.id}`)
        skus = Array.isArray(p?.skus)
          ? p.skus.map((s: RawShopSku) => ({
              id: s.id || '',
              name: s.specs && typeof s.specs === 'object' && !Array.isArray(s.specs)
                ? Object.values(s.specs).filter(Boolean).join(' ') || (s.skuCode || '规格')
                : (s.skuCode || '规格'),
              price: shopNum(s.price),
            }))
          : []
      } catch { skus = [] }
      products.push({
        id: order.product.id || order.targetId || '',
        name: order.product.title || '商品',
        cover: order.product.cover || '',
        skuId: order.skuId || '',
        skuName: order.sku?.skuName || '',
        price: shopNum(order.payAmount ?? order.amount),
        quantity: 1,
        skus,
      })
    }
    return { reasons: shopExchangeReasons, products, addresses }
  },

  /** 提交换货申请 → 售后(type=exchange)；凭证图为已上传 COS 的真实 URL，后端并入售后记录 */
  async submitExchange(orderId: string, reason: string, images?: string[]): Promise<boolean> {
    if (!orderId) throw new Error('缺少订单信息')
    await apiPost(`/shop/orders/${orderId}/after-sale`, { type: 'exchange', reason, images: images?.length ? images : undefined })
    return true
  },

  /** 获取拼团列表 — GET /shop/group-buy */
  async getGroupBuyList(): Promise<{ list: GroupBuyItem[]; myList: MyGroupBuyItem[] }> {
    const [active, my] = await Promise.all([
      apiGet<RawGroupBuy[]>('/marketing/group-buys/active'),
      apiGet<RawMyGroupBuy[]>('/marketing/group-buys/my').catch(() => []), // 未登录/无记录降级空（非假数据）
    ])
    return {
      list: (active || []).map(adaptGroupBuyItem),
      myList: (my || []).map(adaptMyGroupBuy),
    }
  },

  /** 获取拼团详情 — GET /shop/group-buy/:id */
  async getGroupBuyDetail(_id: string): Promise<{ detail: GroupBuyDetailData; activeGroups: ActiveGroup[] }> {
    const gb = await apiGet<RawGroupBuy>(`/marketing/group-buys/${_id}/detail`)
    return {
      detail: adaptGroupBuyDetailData(gb),
      activeGroups: adaptActiveGroups(gb?.groups || [], gb?.expireMinutes),
    }
  },

  /** 参与拼团 — POST /marketing/group-buys/:id/join（返回拼团订单，走支付链路；groupId 传则加入已有团，否则开新团） */
  async joinGroupBuy(groupBuyId: string, groupId?: string): Promise<{ orderId: string; amount: number; groupId: string }> {
    const res = await apiPost<{ orderId?: string; amount?: number | string; groupId?: string }>(`/marketing/group-buys/${groupBuyId}/join`, groupId ? { groupId } : {})
    return { orderId: res.orderId || '', amount: shopNum(res.amount), groupId: res.groupId || '' }
  },

  /** 拼团成功结果页数据 — GET /marketing/group-buys/:id/my-result（按我的参与状态派生·SUCCESS） */
  async getGroupBuySuccess(groupBuyId: string) {
    const r = await apiGet<RawGroupResult>(`/marketing/group-buys/${groupBuyId}/my-result`)
    return adaptGroupBuySuccess(r)
  },

  /** 拼团失败结果页数据 — GET /marketing/group-buys/:id/my-result（按我的参与状态派生·REFUNDED/未成团） */
  async getGroupBuyFail(groupBuyId: string) {
    const r = await apiGet<RawGroupResult>(`/marketing/group-buys/${groupBuyId}/my-result`)
    return adaptGroupBuyFail(r)
  },

  /** 获取mall首页 — GET /mall */
  async getMallHome() {
    // 商品真连 /shop/products；banners/quickEntries/categories 为运营 UI 配置（后端无 banner CMS/聚合 BFF，同 getHome 约定）
    // 优惠券入口角标改真实"可领券数量"（原为硬编码 badge:2 → 出现"提示2个但没有券"）；拉取失败/为0则不显角标
    // 并行拉真实秒杀/拼团场次，用于给 seckill/group 入口注入真实"进行中"角标（无场次不显，避免恒真误导）
    const [res, availCount, hasFlash, hasGroup] = await Promise.all([
      apiGet<RawShopProduct[] | { products?: RawShopProduct[]; items?: RawShopProduct[] }>('/shop/products?pageSize=30'),
      couponApi.getAvailable().then((l) => l.length).catch(() => 0),
      shopApi.getFlashSale().then((f) => (f?.products?.length ?? 0) > 0).catch(() => false),
      shopApi.getActiveGroupBuys().then((l) => (l?.length ?? 0) > 0).catch(() => false),
    ])
    const arr = Array.isArray(res) ? res : (res?.products ?? res?.items ?? [])
    const products: ProductCardData[] = arr.map(adaptProductCard)
    const quickEntries = mallQuickEntries.map((e) => {
      if (e.id === 'coupons') return { ...e, badge: availCount > 0 ? availCount : undefined }
      if (e.id === 'seckill') return { ...e, state: hasFlash ? '进行中' : undefined }
      if (e.id === 'group') return { ...e, state: hasGroup ? '进行中' : undefined }
      return e
    })
    return {
      quickEntries,
      banners: mallBanners,
      lives: [], // 暂无实时电商直播聚合 → 空态降级（不展示假直播）
      categories: mallCategories,
      products,
      seckillItems: [],
      groupItems: [],
    }
  },

  /** 获取mall分类 — GET /mall/categories */
  /** 商城分类页 tab + 排序选项（分类从后端聚合端点取，不受分页影响） */
  async getMallCategoryTabs(): Promise<{ tabs: { id: string; name: string; count: number }[]; sortOptions: typeof MALL_CATEGORY_SORT_OPTIONS }> {
    const list = await apiGet<{ name?: string; count?: number }[]>('/shop/products/category-tabs')
    const arr = Array.isArray(list) ? list : []
    const total = arr.reduce((s, c) => s + (c.count || 0), 0)
    return {
      tabs: [
        { id: 'all', name: '全部', count: total },
        ...arr.map((c) => ({ id: c.name || '', name: c.name || '', count: c.count ?? 0 })),
      ],
      sortOptions: MALL_CATEGORY_SORT_OPTIONS,
    }
  },

  /** 商城分类页商品（分类/搜索/价格/排序全下沉后端，分页返回 {items,total}） */
  async getMallProducts(params: {
    category?: string; keyword?: string; priceMin?: number; priceMax?: number; sort?: string; page?: number; pageSize?: number
  }): Promise<{ items: CategoryProduct[]; total: number }> {
    const { category, keyword, priceMin, priceMax, sort, page = 1, pageSize = 20 } = params
    const qs: string[] = [`page=${page}`, `pageSize=${pageSize}`]
    if (category && category !== 'all') qs.push(`categoryLevel1=${encodeURIComponent(category)}`)
    if (keyword) qs.push(`keyword=${encodeURIComponent(keyword)}`)
    if (priceMin) qs.push(`priceMin=${priceMin}`)
    if (priceMax) qs.push(`priceMax=${priceMax}`)
    if (sort && sort !== 'default') qs.push(`sort=${sort}`)
    // listProducts 返回 {products,total,page,pageSize} 被拦截器转为 {data:数组,pagination}，用 apiGetPaged 保留 total
    const { items, total } = await apiGetPaged<RawShopProduct>(`/shop/products?${qs.join('&')}`)
    return { items: items.map(adaptCategoryProduct), total }
  },

  /** 获取mall评价 — GET /mall/product/:id/reviews */
  async getMallReviews(_id: string, page = 1, sort?: string, pageSize = 20) {
    const sortQs = sort && sort !== 'default' ? `&sort=${sort}` : ''
    const res = await apiGet<{ reviews?: RawShopReview[]; stats?: RawReviewStats }>(`/shop/products/${_id}/reviews?page=${page}&pageSize=${pageSize}${sortQs}`)
    const raw = res?.reviews || []
    const stats: RawReviewStats = res?.stats || {}
    const dist: Record<string, number> = stats.distribution || {}
    const total = stats.count ?? raw.length
    const good = (dist[5] ?? dist['5'] ?? 0) + (dist[4] ?? dist['4'] ?? 0)
    return {
      // 后端评价无标签维度 → 仅保留「全部」，标签筛选诚实降级
      tags: [{ id: 'all', label: '全部', count: total }],
      sortOptions: MALL_REVIEW_SORT_OPTIONS,
      reviews: raw.map(adaptMallReview),
      summary: {
        goodRatePercent: total > 0 ? Math.round((good / total) * 100) : 0,
        rating: Number(stats.average ?? 0),
        total,
      },
      total,
    }
  },
}
