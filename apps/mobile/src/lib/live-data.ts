// ============ 直播板块(live) mock 数据（从原型 app/live 迁移） ============
// 说明：原型封面/头像为 mock 配图，dev 下回退占位；此处统一用 /marketing 占位路径，比对时会被中和
import { apiGet, apiPost, useMock } from '@/utils/request'

export type LiveStatus = 'live' | 'upcoming' | 'replay'
export type LiveType = 'knowledge' | 'commerce'
export type LiveOrientation = 'vertical' | 'horizontal'
export type LivePriceType = 'free' | 'paid'

// @data-needs: 直播广场列表, 参数 tab(全部|知识授课|电商带货|关注的), 返回 LiveItem[]
export interface LiveItem {
  id: string
  title: string
  cover: string
  hostName: string
  hostAvatar: string
  viewerCount: number
  type: LiveType
  status: LiveStatus
  orientation: LiveOrientation
  priceType: LivePriceType
  scheduledTime?: string
  duration?: string
  price?: number
  circleFree?: boolean
  productCount?: number
}

export const liveTabs = ['全部', '知识授课', '电商带货', '关注的'] as const

export const liveList: LiveItem[] = [
  { id: '1', title: '八字命理入门：如何快速解读四柱八字', cover: '/marketing/course.png', hostName: '易道先生', hostAvatar: '/marketing/course.png', viewerCount: 12580, type: 'knowledge', status: 'live', orientation: 'horizontal', priceType: 'free' },
  { id: '2', title: '开光吉祥物专场：招财貔貅、转运葫芦', cover: '/marketing/course.png', hostName: '福缘阁主', hostAvatar: '/marketing/course.png', viewerCount: 8920, type: 'commerce', status: 'live', orientation: 'vertical', priceType: 'free', productCount: 12 },
  { id: '3', title: '天然水晶手链专场直播', cover: '/marketing/course.png', hostName: '晶缘坊', hostAvatar: '', viewerCount: 5630, type: 'commerce', status: 'live', orientation: 'vertical', priceType: 'free', productCount: 8 },
  { id: '4', title: '紫微斗数实战案例分析第三期', cover: '/marketing/course.png', hostName: '紫微大师', hostAvatar: '/marketing/course.png', viewerCount: 3280, type: 'knowledge', status: 'live', orientation: 'horizontal', priceType: 'paid', price: 99, circleFree: true },
  { id: '5', title: '今晚8点：风水布局与家居旺财秘诀', cover: '/marketing/course.png', hostName: '风水堂主', hostAvatar: '', viewerCount: 328, type: 'knowledge', status: 'upcoming', scheduledTime: '今晚 20:00', orientation: 'vertical', priceType: 'free' },
  { id: '6', title: '周易古籍珍藏版专场直播', cover: '/marketing/course.png', hostName: '古籍书阁', hostAvatar: '', viewerCount: 4150, type: 'commerce', status: 'live', orientation: 'vertical', priceType: 'free', productCount: 15 },
  { id: '7', title: '奇门遁甲：预测学的巅峰之术', cover: '/marketing/course.png', hostName: '奇门居士', hostAvatar: '', viewerCount: 186, type: 'knowledge', status: 'upcoming', scheduledTime: '明天 14:00', orientation: 'vertical', priceType: 'paid', price: 168 },
  { id: '8', title: '手把手教你排八字命盘', cover: '/marketing/course.png', hostName: '李命理', hostAvatar: '/marketing/course.png', viewerCount: 2860, type: 'knowledge', status: 'live', orientation: 'horizontal', priceType: 'free' },
  { id: '9', title: '手工罗盘制作工艺展示与售卖', cover: '/marketing/luopan.png', hostName: '匠心堂', hostAvatar: '', viewerCount: 1520, type: 'commerce', status: 'live', orientation: 'vertical', priceType: 'free', productCount: 6 },
  { id: '10', title: '道家符箓专场直播', cover: '/marketing/course.png', hostName: '玄真道人', hostAvatar: '', viewerCount: 980, type: 'commerce', status: 'live', orientation: 'vertical', priceType: 'free', productCount: 9 },
]

// ============ 主播列表(live/hosts) ============
// @data-needs: 主播列表, 参数 filter(all|live|followed)+search, 返回 LiveHost[]
export interface LiveHost {
  id: string
  name: string
  avatar: string
  cover: string
  specialty: string
  followers: number
  likes: number
  liveCount: number
  rating: number
  isLive: boolean
  viewerCount?: number
  tags: string[]
  verified: boolean
}

export const liveHosts: LiveHost[] = [
  { id: '1', name: '易道先生', avatar: '/marketing/course.png', cover: '/marketing/course.png', specialty: '八字命理知识直播', followers: 128000, likes: 960000, liveCount: 286, rating: 4.9, isLive: true, viewerCount: 12580, tags: ['八字', '流年', '命理'], verified: true },
  { id: '2', name: '福缘阁主', avatar: '/marketing/course.png', cover: '/marketing/course.png', specialty: '吉祥物电商直播', followers: 96400, likes: 780000, liveCount: 198, rating: 4.8, isLive: true, viewerCount: 8920, tags: ['吉祥物', '开光', '风水'], verified: true },
  { id: '3', name: '晶缘坊', avatar: '/marketing/course.png', cover: '/marketing/course.png', specialty: '天然水晶珠宝直播', followers: 74600, likes: 620000, liveCount: 156, rating: 4.7, isLive: true, viewerCount: 5630, tags: ['水晶', '珠宝', '开运'], verified: false },
  { id: '4', name: '玄学居士', avatar: '/marketing/course.png', cover: '/marketing/course.png', specialty: '紫微斗数授课直播', followers: 58200, likes: 486000, liveCount: 124, rating: 4.8, isLive: false, tags: ['紫微', '斗数', '命理'], verified: true },
  { id: '5', name: '王先生讲风水', avatar: '/marketing/course.png', cover: '/marketing/course.png', specialty: '风水堪舆讲解', followers: 42800, likes: 356000, liveCount: 98, rating: 4.6, isLive: false, tags: ['风水', '堪舆', '布局'], verified: false },
]

// ============ 直播回放列表(live/replays) ============
// @data-needs: 回放列表, 参数 sortBy(latest|popular|duration)+search, 返回 LiveReplay[]
export interface LiveReplay {
  id: string
  title: string
  cover: string
  hostName: string
  hostAvatar: string
  category: string
  viewers: number
  duration: number
  dateText: string
}

export const replaySortOptions = [
  { value: 'latest', label: '最新发布' },
  { value: 'popular', label: '最多播放' },
  { value: 'duration', label: '时长最长' },
] as const

export const liveReplays: LiveReplay[] = [
  { id: '1', title: '《周易》六十四卦详解 - 乾卦篇', cover: '/marketing/course.png', hostName: '张道长', hostAvatar: '/marketing/course.png', category: '易经', viewers: 8520, duration: 7200, dateText: '今天' },
  { id: '2', title: '紫微斗数入门：命盘基础解读', cover: '/marketing/course.png', hostName: '李命师', hostAvatar: '/marketing/course.png', category: '紫微斗数', viewers: 6230, duration: 5400, dateText: '昨天' },
  { id: '3', title: '八字命理：如何看流年运势', cover: '/marketing/course.png', hostName: '王半仙', hostAvatar: '/marketing/course.png', category: '八字命理', viewers: 12800, duration: 6800, dateText: '3天前' },
  { id: '4', title: '梅花易数：起卦与断卦技巧', cover: '/marketing/course.png', hostName: '赵易师', hostAvatar: '/marketing/course.png', category: '梅花易数', viewers: 4520, duration: 4800, dateText: '4天前' },
  { id: '5', title: '风水布局：家居风水入门', cover: '/marketing/course.png', hostName: '陈风水', hostAvatar: '/marketing/course.png', category: '风水', viewers: 9800, duration: 5600, dateText: '5天前' },
]

export function formatLiveDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`
}

export function formatLiveViews(num: number): string {
  return num >= 10000 ? (num / 10000).toFixed(1) + '万' : String(num)
}

// ============ 回放首页(live/replay-home) ============
// @data-needs: 回放分类, 返回 ReplayCategory[]
export interface ReplayCategory {
  id: string
  name: string
  icon: string
  count: number
}
// @data-needs: 回放条目(热门/列表), 参数 category, 返回 ReplayHomeItem[]
export interface ReplayHomeItem {
  id: string
  title: string
  cover: string
  hostName: string
  hostAvatar: string
  duration: number
  views: number
  category: string
  isHot?: boolean
}

export const replayCategories: ReplayCategory[] = [
  { id: 'all', name: '全部', icon: '📚', count: 128 },
  { id: 'yijing', name: '易经', icon: '☯️', count: 35 },
  { id: 'fengshui', name: '风水', icon: '🏠', count: 28 },
  { id: 'bazi', name: '八字', icon: '📅', count: 24 },
  { id: 'meihua', name: '梅花', icon: '🌸', count: 18 },
  { id: 'liuyao', name: '六爻', icon: '⚊', count: 15 },
  { id: 'qimen', name: '奇门', icon: '🚪', count: 8 },
]

export const replayHotItems: ReplayHomeItem[] = [
  { id: '1', title: '2024甲辰年运势全解析', cover: '/marketing/course.png', hostName: '玄真子', hostAvatar: '/marketing/course.png', duration: 7200, views: 58600, category: '易经', isHot: true },
  { id: '2', title: '家居风水布局实战课', cover: '/marketing/course.png', hostName: '明德居士', hostAvatar: '/marketing/course.png', duration: 5400, views: 42300, category: '风水', isHot: true },
]

export const replayHomeList: ReplayHomeItem[] = [
  { id: '3', title: '八字入门：如何排盘与看命', cover: '/marketing/course.png', hostName: '子平先生', hostAvatar: '/marketing/course.png', duration: 4800, views: 28500, category: '八字' },
  { id: '4', title: '梅花易数断卦技巧', cover: '/marketing/course.png', hostName: '易林', hostAvatar: '/marketing/course.png', duration: 3600, views: 19200, category: '梅花' },
  { id: '5', title: '六爻预测实战案例分析', cover: '/marketing/course.png', hostName: '卦象大师', hostAvatar: '/marketing/course.png', duration: 5100, views: 15800, category: '六爻' },
  { id: '6', title: '奇门遁甲入门指南', cover: '/marketing/course.png', hostName: '遁甲居士', hostAvatar: '/marketing/course.png', duration: 6000, views: 12400, category: '奇门' },
]

export const replayHotSearches = ['易经入门', '风水布局', '八字排盘', '梅花易数', '运势解析']

// ============ 主播数据中心(live/host-data) ============
// @data-needs: 主播直播统计, 返回 HostLiveStats
export interface HostLiveStats {
  totalViews: number
  totalRevenue: number
  avgDuration: number
  fansGrowth: number
  totalRooms: number
  totalGifts: number
  viewsGrowthRate: number
  revenueGrowthRate: number
}
// @data-needs: 主播直播记录, 返回 HostLiveRoom[]
export interface HostLiveRoom {
  id: string
  title: string
  cover: string
  status: 'ended' | 'preview'
  dateText: string
  duration: number
  views: number
  gifts: number
  revenue: number
}
export interface HostLiveTrend {
  dateLabel: string
  views: number
  revenue: number
}

export const hostLiveStats: HostLiveStats = {
  totalViews: 125680,
  totalRevenue: 8960,
  avgDuration: 125,
  fansGrowth: 1280,
  totalRooms: 48,
  totalGifts: 3250,
  viewsGrowthRate: 15.2,
  revenueGrowthRate: 8.5,
}

export const hostLiveRooms: HostLiveRoom[] = [
  { id: '1', title: '八字命理入门精讲（第12期）', cover: '/marketing/course.png', status: 'ended', dateText: '1/15 19:00', duration: 150, views: 3280, gifts: 280, revenue: 560 },
  { id: '2', title: '紫微斗数实战案例分析', cover: '/marketing/course.png', status: 'ended', dateText: '1/12 20:00', duration: 120, views: 2560, gifts: 180, revenue: 380 },
  { id: '3', title: '六爻占卜基础教学', cover: '/marketing/course.png', status: 'ended', dateText: '1/10 19:30', duration: 90, views: 1980, gifts: 120, revenue: 240 },
  { id: '4', title: '梅花易数快速入门', cover: '/marketing/course.png', status: 'preview', dateText: '1/20 19:00', duration: 0, views: 0, gifts: 0, revenue: 0 },
]

// 固定的30天趋势(避免随机数破坏比对稳定性)
const _viewsSeq = [1820, 2360, 1540, 2890, 2100, 1680, 3200, 2450, 1920, 2780, 1450, 3050, 2200, 1760, 2640, 1980, 3380, 2120, 1580, 2900, 2460, 1840, 3120, 2280, 1660, 2740, 2040, 3300, 2380, 2860]
const _revSeq = [220, 380, 160, 480, 320, 200, 560, 420, 260, 500, 140, 540, 360, 240, 460, 300, 580, 340, 180, 520, 400, 260, 540, 380, 220, 480, 320, 560, 420, 500]
export const hostLiveTrend: HostLiveTrend[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2024, 0, 1 + i)
  return {
    dateLabel: `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`,
    views: _viewsSeq[i],
    revenue: _revSeq[i],
  }
})

export function formatHostNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return String(num)
}

export function formatHostDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`
}

// ============ 推流配置(live/stream-config) ============
// @data-needs: 推流配置, 参数 roomId, 返回 StreamConfig
export interface StreamConfig {
  roomId: string
  roomTitle: string
  streamUrl: string
  streamKey: string
  playUrl: string
  recommendedSettings: { resolution: string; bitrate: string; fps: string; encoder: string }
}
export const streamConfig: StreamConfig = {
  roomId: 'room1',
  roomTitle: '周易六十四卦深度解读',
  streamUrl: 'rtmp://live.rebu.com/live',
  streamKey: 'stream_key_abc123xyz789',
  playUrl: 'https://live.rebu.com/play/room1.flv',
  recommendedSettings: { resolution: '1920x1080', bitrate: '4000-6000 Kbps', fps: '30', encoder: 'x264 / NVENC' },
}
export const obsConfigSteps = [
  { title: '打开OBS Studio', description: '下载并安装最新版OBS Studio，打开软件' },
  { title: '进入推流设置', description: '点击「设置」→「推流」，服务选择「自定义」' },
  { title: '填写推流信息', description: '将下方的「推流地址」填入服务器，「推流密钥」填入串流密钥' },
  { title: '配置视频参数', description: '点击「输出」→「流」，设置编码器和比特率；点击「视频」设置分辨率' },
  { title: '开始推流', description: '点击主界面的「开始推流」按钮，等待连接成功后即可开播' },
]
export const streamConfigFaq = [
  { q: '推流失败怎么办？', a: '请检查网络连接、推流地址和密钥是否正确，确保防火墙未阻止OBS' },
  { q: '画面卡顿怎么办？', a: '尝试降低比特率或分辨率，检查上行带宽是否足够' },
  { q: '可以使用其他推流软件吗？', a: '支持任何RTMP推流软件，如Streamlabs、XSplit等' },
]

// ============ OBS推流教程(live/obs-guide) ============
export const obsGuideSteps = [
  { step: 1, title: '下载并安装 OBS Studio', desc: 'OBS Studio 是免费开源的直播推流软件，支持 Windows / macOS / Linux。', action: '前往官网下载', icon: 'download' },
  { step: 2, title: '添加视频和音频来源', desc: '在 OBS「来源」面板中添加「显示器采集」或「视频采集设备」，再添加「音频输入采集」。', action: null, icon: 'video' },
  { step: 3, title: '配置推流设置', desc: '打开「设置」→「推流」，选择「自定义」，填写平台推流地址和推流码。', action: null, icon: 'settings' },
  { step: 4, title: '填写推流地址', desc: '在智玄平台「开始直播」页面获取您的专属推流地址和推流码，填入 OBS 对应字段。', action: '获取我的推流码', icon: 'wifi' },
  { step: 5, title: '调整编码参数（推荐设置）', desc: '「输出」→「视频编码器」选 x264，码率 2500-4000 Kbps，分辨率 1280×720，帧率 30fps。', action: null, icon: 'monitor' },
]
export const obsGuideRequirements = [
  { label: 'CPU', value: 'i5 / Ryzen 5 及以上' },
  { label: '内存', value: '8GB RAM 及以上' },
  { label: '上传网速', value: '≥ 6Mbps（推荐10Mbps）' },
  { label: '操作系统', value: 'Windows 10 / macOS 10.15+' },
]
export const obsGuideFaq = [
  { q: '推流码在哪里找？', a: '进入「开始直播」页面 → 点击「获取推流码」按钮即可查看和复制。' },
  { q: '直播卡顿怎么办？', a: '降低码率至 2000Kbps，关闭其他占用网络的程序，或联系运营商检查网络质量。' },
  { q: 'OBS 显示推流失败？', a: '检查推流地址是否正确，推流码是否已过期，防火墙是否阻止了 OBS 的网络请求。' },
]

// ============ 创建直播(live/create) ============
// @data-needs: 直播分类列表, 返回 LiveCategory[]
export interface LiveCategory {
  id: string
  name: string
}
export const liveCreateCategories: LiveCategory[] = [
  { id: '1', name: '易经国学' },
  { id: '2', name: '风水堪舆' },
  { id: '3', name: '命理八字' },
  { id: '4', name: '紫微斗数' },
  { id: '5', name: '面相手相' },
  { id: '6', name: '六爻占卜' },
  { id: '7', name: '奇门遁甲' },
  { id: '8', name: '其他' },
]

// ============ 竖屏直播间(live/vertical) ============
// @data-needs: 竖屏直播间数据, 返回 VerticalLiveRoom
export interface VerticalLiveComment {
  id: string
  userName: string
  content: string
  type: 'text' | 'gift' | 'system' | 'enter'
  isHost?: boolean
}
export interface VerticalLiveProduct {
  id: string
  name: string
  cover: string
  price: number
  originalPrice: number
  stock: number
  sold: number
  isExplaining?: boolean
}
export const verticalLiveRoom = {
  id: '1',
  title: '开光吉祥物专场：招财貔貅限时特惠',
  hostName: '福缘阁主',
  hostAvatar: '/marketing/course.png',
  hostLevel: 5,
  followers: 12800,
  viewerCount: 8920,
  likeCount: 32100,
  onlineAvatars: ['/marketing/course.png', '/marketing/course.png', '/marketing/course.png'],
}
export const verticalLiveComments: VerticalLiveComment[] = [
  { id: '1', userName: '系统', content: '欢迎来到直播间，请文明观看', type: 'system' },
  { id: '2', userName: '易学爱好者', content: '主播讲得太好了！', type: 'text' },
]
export const verticalLiveProducts: VerticalLiveProduct[] = [
  { id: '1', name: '开光招财貔貅摆件 天然黑曜石', cover: '/marketing/course.png', price: 299, originalPrice: 599, stock: 56, sold: 1280, isExplaining: true },
  { id: '2', name: '五帝钱挂件 真品铜钱招财镇宅', cover: '/marketing/course.png', price: 128, originalPrice: 268, stock: 128, sold: 2350 },
  { id: '3', name: '天然黄水晶转运葫芦', cover: '/marketing/course.png', price: 168, originalPrice: 328, stock: 89, sold: 890 },
]

// ============ 直播间观看页(live/[id]) ============
// @data-needs: 直播间详情, 参数 id, 返回 LiveWatchRoom
export const liveWatchRoom = {
  id: '1',
  type: 'knowledge' as 'knowledge' | 'commerce',
  title: '紫微斗数命盘解析直播',
  hostName: '云中子道长',
  hostAvatar: '/marketing/course.png',
  followers: 12800,
  viewerCount: 3256,
  likeCount: 18900,
  isFollowing: false,
  onlineAvatars: ['/marketing/course.png', '/marketing/course.png', '/marketing/course.png'],
}
export const liveWatchComments: VerticalLiveComment[] = [
  { id: '1', userName: '系统', content: '欢迎来到直播间，请文明观看，理性学习', type: 'system' },
  { id: '2', userName: '紫微爱好者', content: '老师讲得太透彻了！', type: 'text' },
  { id: '3', userName: '易学小白', content: '请问命宫怎么看？', type: 'text' },
]

// ============ 直播预告(live/preview) ============
// @data-needs: 直播预告详情, 参数 roomId, 返回 LivePreviewRoom
export interface LivePreviewRoom {
  id: string
  title: string
  cover: string
  hostId: string
  hostName: string
  hostAvatar: string
  hostFollowers: number
  bookedCount: number
  estimatedDuration: number
  startDateText: string
  startTimeText: string
  tags: string[]
  descriptionLines: string[]
  isBooked: boolean
  countdown: { days: number; hours: number; minutes: number; seconds: number }
}
export const livePreviewRoom: LivePreviewRoom = {
  id: '1',
  title: '紫微斗数入门：十二宫位详解与命盘分析实战',
  cover: '/marketing/course.png',
  hostId: 'h1',
  hostName: '云中子',
  hostAvatar: '/marketing/course.png',
  hostFollowers: 12800,
  bookedCount: 1268,
  estimatedDuration: 90,
  startDateText: '12/20',
  startTimeText: '20:00',
  tags: ['紫微斗数', '入门课程', '命盘分析'],
  isBooked: false,
  countdown: { days: 0, hours: 2, minutes: 0, seconds: 0 },
  descriptionLines: [
    '### 课程简介',
    '本次直播将深入讲解紫微斗数的十二宫位体系，帮助初学者建立完整的命盘分析框架。',
    '',
    '### 课程大纲',
    '1. **命宫与身宫** - 了解自我与人生方向',
    '2. **兄弟宫与夫妻宫** - 人际关系的奥秘',
    '3. **子女宫与财帛宫** - 子嗣与财运分析',
    '4. **疾厄宫与迁移宫** - 健康与出行运势',
    '5. **交友宫与官禄宫** - 社交与事业发展',
    '6. **田宅宫与福德宫** - 家宅与精神层面',
    '7. **父母宫** - 长辈缘分与早年运势',
    '',
    '### 适合人群',
    '- 对紫微斗数感兴趣的初学者',
    '- 希望系统学习命理知识的爱好者',
    '- 想要了解自我命运的求知者',
    '',
    '### 讲师简介',
    '云中子老师，从事命理研究二十余年，师承多位名家，融会贯通各派精华。',
  ],
}

// ============ 直播结束(live/end) ============
// @data-needs: 直播结束统计, 参数 roomId, 返回 LiveEndRoom
export interface LiveEndRoom {
  id: string
  title: string
  cover: string
  hostId: string
  hostName: string
  hostAvatar: string
  hostFollowers: number
  tags: string[]
  stats: { totalViewers: number; peakViewers: number; totalLikes: number; totalGifts: number; duration: number }
  hasReplay: boolean
}
export const liveEndRoom: LiveEndRoom = {
  id: '1',
  title: '《周易》六十四卦精讲：乾卦的智慧',
  cover: '/marketing/course.png',
  hostId: 'h1',
  hostName: '易经大师·张道长',
  hostAvatar: '/marketing/course.png',
  hostFollowers: 12580,
  tags: ['周易', '六十四卦', '国学'],
  stats: { totalViewers: 15680, peakViewers: 3256, totalLikes: 8532, totalGifts: 1256, duration: 9000 },
  hasReplay: true,
}
export interface LiveEndRecommendLive {
  id: string
  title: string
  cover: string
  status: 'live' | 'preview'
  viewers: number
  bookedCount: number
}
export const liveEndRecommendLives: LiveEndRecommendLive[] = [
  { id: '2', title: '紫微斗数入门：认识你的命盘', cover: '/marketing/course.png', status: 'preview', viewers: 0, bookedCount: 856 },
  { id: '3', title: '风水布局与家居吉凶', cover: '/marketing/course.png', status: 'live', viewers: 1256, bookedCount: 0 },
]
export const liveEndRecommendCourses = [
  { id: 'c1', title: '周易六十四卦系统课', cover: '/marketing/course.png', price: 299, lessons: 64 },
  { id: 'c2', title: '紫微斗数精讲班', cover: '/marketing/course.png', price: 399, lessons: 48 },
]

// ============ 回放详情(live/replay/[id]) ============
// @data-needs: 回放详情, 参数 id, 返回 ReplayDetail
export interface ReplayChapter { id: number; title: string; startTime: number; timeDisplay: string; description: string }
export interface ReplaySlide { id: number; time: number; timeDisplay: string; title: string }
export interface ReplayDiscussion { id: number; timeDisplay: string; userName: string; content: string; isHost: boolean }
export interface ReplayProduct { id: number; name: string; price: number; originalPrice: number; sales: number; mentionTimeDisplay: string }
export interface ReplayQA { id: number; timeDisplay: string; question: string; questionerName: string; answer: string; answererName: string }
export interface ReplayDetail {
  id: number
  title: string
  hostName: string
  hostAvatar: string
  hostTitle: string
  hostFollowers: number
  isVerified: boolean
  viewerCount: number
  likeCount: number
  duration: string
  startTime: string
  circleName: string
  chapters: ReplayChapter[]
  discussions: ReplayDiscussion[]
  qaList: ReplayQA[]
  products: ReplayProduct[]
}
export const replayDetail: ReplayDetail = {
  id: 1,
  title: '八字命理入门：如何看懂自己的命盘',
  hostName: '周易大师',
  hostAvatar: '/marketing/course.png',
  hostTitle: '资深命理师',
  hostFollowers: 12800,
  isVerified: true,
  viewerCount: 3256,
  likeCount: 1890,
  duration: '02:30:15',
  startTime: '2026-01-15 19:00',
  circleName: '八字命理研习社',
  chapters: [
    { id: 1, title: '课程介绍', startTime: 0, timeDisplay: '00:00:00', description: '本节课程概述' },
    { id: 2, title: '八字基础概念', startTime: 300, timeDisplay: '00:05:00', description: '天干地支与八字结构' },
    { id: 3, title: '日主与十神', startTime: 900, timeDisplay: '00:15:00', description: '日主的含义和十神推算' },
    { id: 4, title: '五行生克关系', startTime: 1800, timeDisplay: '00:30:00', description: '五行相生相克的规律' },
    { id: 5, title: '命盘实例分析', startTime: 3000, timeDisplay: '00:50:00', description: '真实案例解读' },
    { id: 6, title: '大运流年', startTime: 4500, timeDisplay: '01:15:00', description: '大运和流年的看法' },
    { id: 7, title: '互动答疑', startTime: 6000, timeDisplay: '01:40:00', description: '学员问题解答' },
    { id: 8, title: '课程总结', startTime: 7800, timeDisplay: '02:10:00', description: '知识点回顾' },
  ],
  discussions: [
    { id: 1, timeDisplay: '00:05:23', userName: '命理爱好者', content: '老师讲得太好了，终于听懂了', isHost: false },
    { id: 2, timeDisplay: '00:12:45', userName: '学易小白', content: '请问日主是什么意思？', isHost: false },
    { id: 3, timeDisplay: '00:15:30', userName: '周易大师', content: '日主就是日柱天干，代表命主本人', isHost: true },
    { id: 4, timeDisplay: '00:28:10', userName: '紫微门徒', content: '八字和紫微斗数哪个更准？', isHost: false },
    { id: 5, timeDisplay: '00:35:22', userName: '风水学徒', content: '老师能讲讲大运流年吗', isHost: false },
    { id: 6, timeDisplay: '00:42:18', userName: '周易大师', content: '下节课会专门讲大运流年的看法', isHost: true },
    { id: 7, timeDisplay: '01:05:40', userName: '初学者', content: '笔记记下来了，感谢老师', isHost: false },
    { id: 8, timeDisplay: '01:30:15', userName: '命理研究者', content: '这个案例分析太精彩了', isHost: false },
  ],
  qaList: [
    { id: 1, timeDisplay: '00:18:30', question: '八字中的十神是怎么确定的？', questionerName: '学易小白', answer: '十神是根据日干与其他七个字的五行生克关系来确定的。同我者为比劫，生我者为印星，我生者为食伤，我克者为财星，克我者为官杀。', answererName: '周易大师' },
    { id: 2, timeDisplay: '00:45:20', question: '命盘中缺某个五行怎么办？', questionerName: '紫微门徒', answer: '五行有缺不一定是坏事，关键看整体格局。如果缺的五行是忌神，反而是好事。可以通过后天方位、颜色、职业等方式来补充。', answererName: '周易大师' },
    { id: 3, timeDisplay: '01:15:45', question: '大运和流年哪个影响更大？', questionerName: '风水学徒', answer: '大运管十年，影响更为深远和持久；流年管一年，影响相对较短但更为具体。两者需要结合来看，大运好流年差，影响有限；大运差流年好，也难有大的突破。', answererName: '周易大师' },
  ],
  products: [
    { id: 1, name: '《渊海子平》精装版', price: 68, originalPrice: 98, sales: 256, mentionTimeDisplay: '00:25:30' },
    { id: 2, name: '八字排盘专业罗盘', price: 198, originalPrice: 298, sales: 128, mentionTimeDisplay: '00:52:15' },
    { id: 3, name: '命理学入门套装', price: 168, originalPrice: 238, sales: 89, mentionTimeDisplay: '01:18:40' },
  ],
}
export const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2]

// ============ 回放评价(live/replay/[id]/comments) ============
export const replayCommentAspects = [
  { key: 'content', label: '内容质量' },
  { key: 'interaction', label: '互动体验' },
  { key: 'audio', label: '音画质量' },
  { key: 'value', label: '价值感受' },
]
export const replayCommentTagsByRating: Record<number, string[]> = {
  5: ['内容丰富', '讲解清晰', '互动活跃', '干货满满', '值得反复看', '强烈推荐'],
  4: ['内容不错', '讲解清楚', '收获较大', '整体满意'],
  3: ['一般般', '内容普通', '有待提高'],
  2: ['讲解不清', '内容较少', '互动较少'],
  1: ['内容差', '浪费时间', '不推荐'],
}
export const replayCommentLabels = ['', '很差', '较差', '一般', '不错', '非常好']

// ============================================
// API 层：useMock 开关控制真实/模拟数据切换
// ============================================

function mapLiveRoom(raw: any): LiveItem {
  return {
    id: raw.id, title: raw.title, cover: raw.cover || raw.coverUrl,
    hostName: raw.host?.name || raw.hostName, hostAvatar: raw.host?.avatar || raw.hostAvatar,
    viewerCount: raw.viewerCount ?? raw.viewers ?? 0,
    type: raw.type || 'knowledge', status: raw.status || 'live',
    orientation: raw.orientation || 'vertical', priceType: raw.priceType || 'free',
    scheduledTime: raw.scheduledTime, duration: raw.duration,
    price: raw.price, circleFree: raw.circleFree, productCount: raw.productCount,
  }
}

export const liveApi = {
  /** 直播间列表 */
  async list(params?: { tab?: string; page?: number; pageSize?: number }) {
    const page = params?.page ?? 1
    const pageSize = params?.pageSize ?? 20
    if (useMock()) {
      let filtered = liveList
      if (params?.tab && params.tab !== '全部') {
        const type = params.tab === '知识授课' ? 'knowledge' : params.tab === '电商带货' ? 'commerce' : null
        if (type) filtered = liveList.filter(l => l.type === type)
      }
      return { items: filtered, total: filtered.length, page, pageSize }
    }
    try {
      const type = params?.tab && params.tab !== '全部' && params.tab !== '关注的'
        ? (params.tab === '知识授课' ? 'knowledge' : 'commerce') : undefined
      const qs = [`page=${page}`, `pageSize=${pageSize}`, type ? `type=${type}` : ''].filter(Boolean).join('&')
      const data = await apiGet<any>(`/live/rooms?${qs}`)
      return {
        items: (data.items || data.data || []).map(mapLiveRoom),
        total: data.total ?? 0, page: data.page ?? page, pageSize: data.pageSize ?? pageSize,
      }
    } catch { return { items: liveList, total: liveList.length, page: 1, pageSize: 20 } }
  },

  /** 直播间详情 */
  async roomDetail(id: string) {
    if (useMock()) return liveWatchRoom
    try {
      const r = await apiGet<any>(`/live/rooms/${id}`)
      return {
        id: r.id, type: r.type || 'knowledge', title: r.title,
        hostName: r.host?.name || r.hostName, hostAvatar: r.host?.avatar || r.hostAvatar,
        followers: r.followers ?? 0, viewerCount: r.viewerCount ?? 0,
        likeCount: r.likeCount ?? 0, isFollowing: r.isFollowing ?? false,
        onlineAvatars: r.onlineAvatars || [],
      }
    } catch { return liveWatchRoom }
  },

  /** 预定的直播 */
  async scheduled() {
    if (useMock()) return liveList.filter(l => l.status === 'upcoming')
    try {
      const data = await apiGet<any[]>('/live/scheduled')
      return data.map(mapLiveRoom)
    } catch { return liveList.filter(l => l.status === 'upcoming') }
  },

  /** 回放列表 */
  async replays(params?: { sortBy?: string; page?: number }) {
    const sortBy = params?.sortBy || 'latest'
    if (useMock()) {
      let sorted = [...liveReplays]
      if (sortBy === 'popular') sorted.sort((a, b) => b.viewers - a.viewers)
      else if (sortBy === 'duration') sorted.sort((a, b) => b.duration - a.duration)
      return sorted
    }
    try {
      const data = await apiGet<any[]>(`/live/replays?sortBy=${sortBy}`)
      return data.map((r: any) => ({
        id: r.id, title: r.title, cover: r.cover, hostName: r.hostName,
        hostAvatar: r.hostAvatar, category: r.category, viewers: r.viewers,
        duration: r.duration, dateText: r.dateText || r.createdAt,
      }))
    } catch { return liveReplays }
  },

  /** 主播列表 */
  async hosts(filter?: string) {
    if (useMock()) {
      if (filter === 'live') return liveHosts.filter(h => h.isLive)
      return liveHosts
    }
    try {
      const qs = filter ? `?filter=${filter}` : ''
      const data = await apiGet<any[]>(`/live/hosts${qs}`)
      return data.map((h: any) => ({
        id: h.id, name: h.name, avatar: h.avatar, cover: h.cover,
        specialty: h.specialty, followers: h.followers, likes: h.likes,
        liveCount: h.liveCount, rating: h.rating, isLive: h.isLive,
        viewerCount: h.viewerCount, tags: h.tags, verified: h.verified,
      }))
    } catch { return liveHosts }
  },

  /** 创建直播分类 */
  async createCategories() {
    if (useMock()) return liveCreateCategories
    try {
      const data = await apiGet<any[]>('/live/categories')
      return data.map((c: any) => ({ id: c.id, name: c.name }))
    } catch { return liveCreateCategories }
  },
}
