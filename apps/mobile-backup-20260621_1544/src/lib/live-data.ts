// ============ 直播板块(live) mock 数据（从原型 app/live 迁移） ============
// 说明：原型封面/头像为 mock 配图，dev 下回退占位；此处统一用 /marketing 占位路径，比对时会被中和
import { apiGet, useMock } from '@/utils/request'

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

const _liveTabs = ['全部', '知识授课', '电商带货', '关注的'] as const

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

// ============ 横屏直播间(live/horizontal) ============
// @data-needs: 横屏直播间详情, 参数 id, 返回 HorizontalLiveRoom + 课件/问答/聊天/资料
export interface HorizontalLiveRoom {
  id: string
  title: string
  hostName: string
  hostAvatar: string
  hostTitle: string
  followers: number
  viewers: number
  likes: number
  duration: string
  category: string
}
export interface HorizontalSlide { id: string; pageNum: number; title: string; thumbnail: string }
export interface HorizontalQuestion {
  id: string
  userName: string
  userAvatar: string
  content: string
  isPublic: boolean
  status: 'pending' | 'answered'
  answer?: string
  time: string
}
export interface HorizontalMessage { id: string; userName: string; content: string; time: string }
export interface HorizontalFile { id: string; name: string; size: string; type: 'pdf' | 'image' }

export const horizontalLiveRoom: HorizontalLiveRoom = {
  id: '1',
  title: '《周易》六十四卦精讲 - 第12讲：泰卦与否卦',
  hostName: '张明远',
  hostAvatar: '/marketing/course.png',
  hostTitle: '易学研究员',
  followers: 12800,
  viewers: 1856,
  likes: 4520,
  duration: '45:32',
  category: '易经',
}
export const horizontalSlides: HorizontalSlide[] = [
  { id: '1', pageNum: 1, title: '第一章：泰卦概述', thumbnail: '/marketing/course.png' },
  { id: '2', pageNum: 2, title: '泰卦卦象解读', thumbnail: '/marketing/course.png' },
  { id: '3', pageNum: 3, title: '泰卦六爻详解', thumbnail: '/marketing/course.png' },
  { id: '4', pageNum: 4, title: '否卦概述', thumbnail: '/marketing/course.png' },
  { id: '5', pageNum: 5, title: '泰否对比分析', thumbnail: '/marketing/course.png' },
]
export const horizontalQuestions: HorizontalQuestion[] = [
  { id: '1', userName: '学员A', userAvatar: '/marketing/course.png', content: '泰卦和否卦的核心区别是什么？', isPublic: true, status: 'answered', answer: '泰卦象征天地交泰、上下沟通，否卦象征天地不交、闭塞不通。一通一塞，正是相反相成。', time: '12:35' },
  { id: '2', userName: '学员B', userAvatar: '/marketing/course.png', content: '否极泰来这个成语和这两卦有关系吗？', isPublic: true, status: 'pending', time: '12:38' },
  { id: '3', userName: '学员C', userAvatar: '/marketing/course.png', content: '请问老师，泰卦在占卜中一般代表什么含义？', isPublic: true, status: 'pending', time: '12:42' },
]
export const horizontalMessages: HorizontalMessage[] = [
  { id: '1', userName: '易学爱好者', content: '老师讲得太清楚了', time: '12:30' },
  { id: '2', userName: '国学小白', content: '终于理解了泰卦的含义', time: '12:32' },
  { id: '3', userName: '命理研究', content: '这个课程质量真高', time: '12:34' },
]
export const horizontalFiles: HorizontalFile[] = [
  { id: '1', name: '泰卦与否卦详解讲义.pdf', size: '2.3MB', type: 'pdf' },
  { id: '2', name: '六十四卦速查表.pdf', size: '1.5MB', type: 'pdf' },
  { id: '3', name: '本课思维导图.png', size: '890KB', type: 'image' },
]

// ============ 竖屏直播间(live/vertical) ============
// @data-needs: 竖屏直播间数据, 返回 VerticalLiveRoom
export interface VerticalLiveComment {
  id: string
  userName: string
  content: string
  type: 'text' | 'gift' | 'system' | 'enter'
  isHost?: boolean
  giftInfo?: { name: string; icon: string; count: number }
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
  { id: '1', userName: '紫微爱好者', content: '老师讲得太透彻了！', type: 'text' },
  { id: '2', userName: '易学小白', content: '请问命宫怎么看？', type: 'text' },
  { id: '3', userName: '国学传承', content: '受益匪浅', type: 'text' },
]

// 打赏榜
export interface LiveWatchRankItem { rank: number; user: string; amount: number }
export const liveWatchRankList: LiveWatchRankItem[] = [
  { rank: 1, user: '易道传人', amount: 8888 },
  { rank: 2, user: '国学守护', amount: 5666 },
  { rank: 3, user: '玄学爱好', amount: 3288 },
]

// 直播间商品（复用 VerticalLiveProduct 结构）
export const liveWatchProducts: VerticalLiveProduct[] = [
  { id: 'p1', name: '开光招财貔貅摆件', cover: '/marketing/course.png', price: 299, originalPrice: 599, stock: 56, sold: 1280, isExplaining: true },
  { id: 'p2', name: '天然黄水晶转运葫芦', cover: '/marketing/course.png', price: 168, originalPrice: 328, stock: 128, sold: 890 },
  { id: 'p3', name: '紫檀木雕福禄寿三星', cover: '/marketing/course.png', price: 1680, originalPrice: 2999, stock: 23, sold: 156 },
]

// 用户国学币余额（mock）
export const liveCoinBalance = 2680

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

// ============ 带货商品(live/products) ============
export interface LiveProductFilter {
  key: string
  label: string
}
export interface LiveProductItem {
  id: string
  name: string
  cover: string
  price: number
  stock: number
  sold: number
  status: 'on' | 'off'
}
export const liveProductFilters: LiveProductFilter[] = [
  { key: 'all', label: '全部' },
  { key: 'on', label: '已上架' },
  { key: 'off', label: '已下架' },
]
export const liveProducts: LiveProductItem[] = [
  { id: '1', name: '开光招财貔貅摆件 天然黑曜石', cover: '/marketing/course.png', price: 299, stock: 56, sold: 1280, status: 'on' },
  { id: '2', name: '五帝钱挂件 真品铜钱招财镇宅', cover: '/marketing/course.png', price: 128, stock: 128, sold: 2350, status: 'on' },
  { id: '3', name: '天然黄水晶转运葫芦', cover: '/marketing/course.png', price: 168, stock: 89, sold: 890, status: 'on' },
  { id: '4', name: '紫檀木雕福禄寿三星摆件', cover: '/marketing/course.png', price: 1680, stock: 23, sold: 156, status: 'on' },
  { id: '5', name: '手工铜制五路财神像', cover: '/marketing/course.png', price: 388, stock: 45, sold: 320, status: 'off' },
  { id: '6', name: '纯铜太极八卦盘', cover: '/marketing/course.png', price: 258, stock: 0, sold: 680, status: 'on' },
  { id: '7', name: '天然白水晶球 财运事业', cover: '/marketing/course.png', price: 398, stock: 12, sold: 420, status: 'on' },
  { id: '8', name: '桃木剑镇宅辟邪挂件', cover: '/marketing/course.png', price: 88, stock: 200, sold: 1680, status: 'off' },
]

// ============ 直播评价(live/reviews) ============
export interface LiveReviewFilter {
  key: string
  label: string
}
export interface LiveReviewDistItem {
  star: number
  count: number
  pct: number
}
export interface LiveReviewItem {
  id: string
  user: string
  rating: number
  time: string
  content: string
  live: string
  flagged: boolean
  reply?: string
}
export const liveReviewFilters: LiveReviewFilter[] = [
  { key: 'all', label: '全部评价' },
  { key: '5', label: '5星' },
  { key: '4', label: '4星' },
  { key: '3', label: '3星' },
  { key: '2', label: '2星' },
  { key: '1', label: '1星' },
  { key: 'pending', label: '未回复' },
  { key: 'replied', label: '已回复' },
]
export const liveReviewDist: LiveReviewDistItem[] = [
  { star: 5, count: 128, pct: 52 },
  { star: 4, count: 68, pct: 28 },
  { star: 3, count: 32, pct: 13 },
  { star: 2, count: 12, pct: 5 },
  { star: 1, count: 5, pct: 2 },
]
export const liveReviews: LiveReviewItem[] = [
  { id: '1', user: '易学爱好者', rating: 5, time: '2小时前', content: '老师讲得太好了！内容丰富，深入浅出，非常适合初学者。', live: '八字命理入门精讲', flagged: false, reply: '感谢您的支持！' },
  { id: '2', user: '国学传承者', rating: 5, time: '昨天', content: '第二次听这个系列了，每次都有新收获。老师的案例分析非常精彩。', live: '八字命理入门精讲', flagged: false, reply: '谢谢您的持续关注！' },
  { id: '3', user: '玄学小白', rating: 4, time: '3天前', content: '讲得很清楚，建议老师下次可以多讲一些实战案例。', live: '紫微斗数实战分析', flagged: false },
  { id: '4', user: '命理研究员', rating: 5, time: '5天前', content: '专业度很高，能够把复杂的概念讲得通俗易懂，强烈推荐！', live: '紫微斗数实战分析', flagged: false, reply: '感谢认可！' },
  { id: '5', user: '风水爱好者', rating: 3, time: '1周前', content: '内容还可以，但是直播画面有时会卡顿，影响观看体验。', live: '家居风水布局入门', flagged: true },
  { id: '6', user: '易经学生', rating: 4, time: '1周前', content: '干货很多，但是节奏稍微有点快，新手可能跟不上。', live: '周易六十四卦详解', flagged: false },
  { id: '7', user: '六爻门徒', rating: 5, time: '2周前', content: '老师对易经的理解非常深刻，听完茅塞顿开！', live: '周易六十四卦详解', flagged: false, reply: '很高兴对您有帮助！' },
  { id: '8', user: '国学爱好者', rating: 2, time: '2周前', content: '内容太浅了，适合完全没有基础的人，希望能有进阶课程。', live: '八字命理入门精讲', flagged: false },
]

// ============ 直播排期(live/schedule) ============
export interface ScheduleItem {
  id: number
  title: string
  date: string
  startTime: string
  endTime: string
  status: 'scheduled' | 'live' | 'completed'
  type: LiveType
  hostName: string
  hostAvatar: string
  viewerCount: number
  description?: string
  tag?: string
  seriesName?: string
  seriesIndex?: number
  seriesTotal?: number
  time?: string
  duration?: number
  actualViewers?: number
  viewerEstimate?: number
}
export const scheduleStatusConfig: Record<string, { label: string; color: string; dot: string; badge?: string }> = {
  scheduled: { label: '待开播', color: '#2563eb', dot: '#2563eb', badge: '#2563eb|#ffffff|#2563eb' },
  live: { label: '直播中', color: '#dc2626', dot: '#dc2626', badge: '#dc2626|#ffffff|#dc2626' },
  completed: { label: '已结束', color: '#4b5563', dot: '#4b5563', badge: '#4b5563|#ffffff|#4b5563' },
}
export const scheduleList: ScheduleItem[] = [
  { id: 1, title: '八字命理入门：如何快速解读四柱八字', date: '2026-05-10', startTime: '19:00', endTime: '21:00', status: 'live', type: 'knowledge', hostName: '易道先生', hostAvatar: '/marketing/course.png', viewerCount: 12580, tag: '热门' },
  { id: 2, title: '开光吉祥物专场：招财貔貅、转运葫芦', date: '2026-05-10', startTime: '20:00', endTime: '22:00', status: 'live', type: 'commerce', hostName: '福缘阁主', hostAvatar: '/marketing/course.png', viewerCount: 8920, tag: '带货' },
  { id: 3, title: '紫微斗数实战案例分析第三期', date: '2026-05-11', startTime: '19:30', endTime: '21:30', status: 'scheduled', type: 'knowledge', hostName: '紫微大师', hostAvatar: '/marketing/course.png', viewerCount: 3280, description: '本期分析三个真实命盘案例' },
  { id: 4, title: '天然水晶手链专场直播', date: '2026-05-12', startTime: '18:00', endTime: '20:00', status: 'scheduled', type: 'commerce', hostName: '晶缘坊', hostAvatar: '/marketing/course.png', viewerCount: 0 },
  { id: 5, title: '今晚8点：风水布局与家居旺财秘诀', date: '2026-05-10', startTime: '20:00', endTime: '21:30', status: 'live', type: 'knowledge', hostName: '风水堂主', hostAvatar: '/marketing/course.png', viewerCount: 3280, tag: '热门' },
  { id: 6, title: '周易六十四卦精讲：乾卦的智慧', date: '2026-05-08', startTime: '19:00', endTime: '21:00', status: 'completed', type: 'knowledge', hostName: '张道长', hostAvatar: '/marketing/course.png', viewerCount: 5600 },
  { id: 7, title: '手工罗盘制作工艺展示与售卖', date: '2026-05-07', startTime: '14:00', endTime: '16:00', status: 'completed', type: 'commerce', hostName: '匠心堂', hostAvatar: '/marketing/course.png', viewerCount: 1520 },
  { id: 8, title: '道家符箓专场直播', date: '2026-05-09', startTime: '19:00', endTime: '21:00', status: 'completed', type: 'commerce', hostName: '玄真道人', hostAvatar: '/marketing/course.png', viewerCount: 980 },
]

// ============ B端直播控制台(live/console) ============
export interface ConsoleDanmaku {
  id: number
  user: string
  content: string
  time: string
  level: number
  isVip: boolean
}

export interface ConsoleConnectRequest {
  id: number
  user: string
  waitTime: string
  reason: string
}

export interface ConsoleProductItem {
  id: number
  name: string
  price: number
  stock: number
  sold: number
  isLive: boolean
  isHot?: boolean
}

export interface ConsoleScriptItem {
  id: number
  time: string
  content: string
  isCurrent: boolean
  done: boolean
}

export interface ConsoleCouponItem {
  name: string
  count: number
}

export interface ConsoleStats {
  onlineCount: number
  totalViews: number
  totalGift: number
  totalSales: number
  peakOnline: number
  newFollowers: number
  avgWatchTime: string
  interactionRate: string
}

const _consoleStats: ConsoleStats = {
  onlineCount: 3256, totalViews: 12850, totalGift: 5680, totalSales: 36800,
  peakOnline: 5680, newFollowers: 486, avgWatchTime: '12分36秒', interactionRate: '68%',
}

const _consoleDanmaku: ConsoleDanmaku[] = [
  { id: 1, user: '易学新人', content: '老师讲得太好了！', time: '19:35:12', level: 5, isVip: false },
  { id: 2, user: '命理爱好者', content: '这个知识点很重要', time: '19:35:18', level: 8, isVip: true },
  { id: 3, user: '国学小白', content: '请问八字用神怎么理解？', time: '19:35:25', level: 2, isVip: false },
  { id: 4, user: '道法自然', content: '天干地支的关系讲得很透彻', time: '19:35:33', level: 7, isVip: true },
  { id: 5, user: '玄学爱好者', content: '醍醐灌顶！', time: '19:35:40', level: 4, isVip: false },
  { id: 6, user: '易经门徒', content: '老师能讲讲大运流年吗', time: '19:35:48', level: 6, isVip: false },
  { id: 7, user: '五行缺金', content: '求老师讲一下五行相生', time: '19:35:55', level: 3, isVip: false },
  { id: 8, user: '风水学徒', content: '感谢老师分享！', time: '19:36:02', level: 5, isVip: false },
]

const _consoleConnectRequests: ConsoleConnectRequest[] = [
  { id: 1, user: '风水大师兄', waitTime: '约30秒', reason: '想和老师讨教风水问题' },
  { id: 2, user: '命理研究者', waitTime: '约2分钟', reason: '有个八字案例想和老师探讨' },
]

const _consoleProducts: ConsoleProductItem[] = [
  { id: 1, name: '开光招财貔貅 天然黑曜石', price: 299, stock: 56, sold: 1280, isLive: true },
  { id: 2, name: '五帝钱挂件 真品铜钱', price: 128, stock: 5, sold: 2350, isLive: false, isHot: true },
  { id: 3, name: '天然黄水晶转运葫芦', price: 168, stock: 89, sold: 890, isLive: false },
  { id: 4, name: '纯铜太极八卦盘', price: 258, stock: 3, sold: 680, isLive: false, isHot: true },
  { id: 5, name: '紫檀木福禄寿三星', price: 1680, stock: 23, sold: 156, isLive: false },
  { id: 6, name: '桃木剑镇宅辟邪挂件', price: 88, stock: 200, sold: 1680, isLive: false },
]

const _consoleScript: ConsoleScriptItem[] = [
  { id: 1, time: '19:30', content: '欢迎各位朋友来到直播间，今天的主题是八字命理入门精讲', isCurrent: false, done: true },
  { id: 2, time: '19:35', content: '首先介绍什么是八字——生辰八字就是一个人出生的年月日时，用天干地支来表示', isCurrent: false, done: true },
  { id: 3, time: '19:45', content: '现在正在讲解：四柱八字的排盘方法，年柱月柱日柱时柱如何推算', isCurrent: true, done: false },
  { id: 4, time: '20:00', content: '下一步：八字十神的推导，看日主与其他干支的生克关系', isCurrent: false, done: false },
  { id: 5, time: '20:15', content: '五行生克制化——旺相休囚死，五行的强弱判断', isCurrent: false, done: false },
  { id: 6, time: '20:30', content: '大运流年怎么看：排大运的方法，流年对命局的影响', isCurrent: false, done: false },
  { id: 7, time: '20:45', content: '实战案例分享：分析一个真实的八字命盘', isCurrent: false, done: false },
  { id: 8, time: '20:55', content: '互动答疑环节，回答观众提出的问题', isCurrent: false, done: false },
  { id: 9, time: '21:00', content: '课程总结与下期预告，感谢大家收看', isCurrent: false, done: false },
]

const _consoleCoupons: ConsoleCouponItem[] = [
  { name: '满199减30', count: 120 },
  { name: '满399减80', count: 80 },
  { name: '新客立减20', count: 200 },
  { name: '全场88折', count: 50 },
]

// ============ B端直播收益(live/earnings) ============
export const liveEarningRanges = [
  { key: '7d', label: '近7天' },
  { key: '30d', label: '近30天' },
  { key: '90d', label: '近90天' },
  { key: 'all', label: '全部' },
]
export const liveEarningStatsByRange: Record<string, { total: number; trend: number; reward: number; goods: number; withdrawable: number }> = {
  '7d': { total: 12800, trend: 12.5, reward: 8600, goods: 4200, withdrawable: 9800 },
  '30d': { total: 56800, trend: -3.2, reward: 35600, goods: 21200, withdrawable: 45200 },
  '90d': { total: 156800, trend: 8.7, reward: 98600, goods: 58200, withdrawable: 125600 },
  'all': { total: 456800, trend: 15.3, reward: 286000, goods: 170800, withdrawable: 398000 },
}
export const liveEarningRecords = [
  { id: 1, type: 'reward', user: '易学爱好者', amount: 88, time: '2026-05-10 20:30', date: '05-10 20:30', live: '八字命理入门精讲', status: 'completed', desc: '打赏 - 国学书卷×2' },
  { id: 2, type: 'goods', user: '风水达人', amount: 299, time: '2026-05-10 20:45', date: '05-10 20:45', live: '八字命理入门精讲', status: 'completed', desc: '带货 - 开光貔貅摆件' },
  { id: 3, type: 'reward', user: '国学小白', amount: 66, time: '2026-05-09 19:15', date: '05-09 19:15', live: '紫微斗数实战分析', status: 'completed', desc: '打赏 - 智慧之光×1' },
  { id: 4, type: 'reward', user: '命理研究员', amount: 128, time: '2026-05-09 19:40', date: '05-09 19:40', live: '紫微斗数实战分析', status: 'completed', desc: '打赏 - 桃李满园×1' },
  { id: 5, type: 'goods', user: '易经门徒', amount: 168, time: '2026-05-09 20:00', date: '05-09 20:00', live: '紫微斗数实战分析', status: 'completed', desc: '带货 - 黄水晶转运葫芦' },
  { id: 6, type: 'reward', user: '道法自然', amount: 52, time: '2026-05-08 14:30', date: '05-08 14:30', live: '风水布局与家居旺财', status: 'completed', desc: '打赏 - 一帆风顺×1' },
  { id: 7, type: 'goods', user: '玄学爱好', amount: 398, time: '2026-05-07 15:20', date: '05-07 15:20', live: '手工罗盘制作工艺', status: 'completed', desc: '带货 - 天然白水晶球' },
]

// ============ B端直播管理(live/manage) ============
export interface LiveManageItem {
  id: number
  title: string
  cover: string
  status: string
  hostName: string
  hostAvatar: string
  type: string
  viewers: number
  startTime: string
  endTime: string
  likes: number
  sales: number
  scheduledTime?: string
  previewCount?: number
  duration?: number
  income?: number
}
export const liveManageStats = [
  { id: 'totalRooms', color: 'linear-gradient(135deg, #667eea, #764ba2)', icon: 'video', value: 48, unit: '场', label: '总直播场次' },
  { id: 'liveRooms', color: 'linear-gradient(135deg, #f093fb, #f5576c)', icon: 'radio', value: 3, unit: '场', label: '正在直播' },
  { id: 'totalViews', color: 'linear-gradient(135deg, #4facfe, #00f2fe)', icon: 'eye', value: '12.9', unit: '万', label: '累计观看' },
  { id: 'totalGifts', color: 'linear-gradient(135deg, #43e97b, #38f9d7)', icon: 'gift', value: '5.7', unit: '万', label: '打赏收入' },
  { id: 'totalSales', color: 'linear-gradient(135deg, #fa709a, #fee140)', icon: 'shopping-bag', value: '36.8', unit: '万', label: '带货收入' },
]
export const liveManageList: LiveManageItem[] = [
  { id: 1, title: '八字命理入门精讲', cover: '/marketing/course.png', status: 'live', hostName: '易道先生', hostAvatar: '/marketing/course.png', type: 'knowledge', viewers: 12580, startTime: '2026-05-10 19:00', endTime: '2026-05-10 21:00', likes: 4520, sales: 0 },
  { id: 2, title: '开光吉祥物专场', cover: '/marketing/course.png', status: 'live', hostName: '福缘阁主', hostAvatar: '/marketing/course.png', type: 'commerce', viewers: 8920, startTime: '2026-05-10 20:00', endTime: '2026-05-10 22:00', likes: 3210, sales: 12800 },
  { id: 3, title: '紫微斗数实战案例', cover: '/marketing/course.png', status: 'scheduled', hostName: '紫微大师', hostAvatar: '/marketing/course.png', type: 'knowledge', viewers: 0, startTime: '2026-05-11 19:30', endTime: '2026-05-11 21:30', likes: 0, sales: 0 },
  { id: 4, title: '周易六十四卦详解', cover: '/marketing/course.png', status: 'completed', hostName: '张道长', hostAvatar: '/marketing/course.png', type: 'knowledge', viewers: 5600, startTime: '2026-05-08 19:00', endTime: '2026-05-08 21:00', likes: 1890, sales: 560 },
]
export const liveManageTabs = [
  { key: 'all', label: '全部' },
  { key: 'live', label: '直播中' },
  { key: 'scheduled', label: '待开播' },
  { key: 'completed', label: '已结束' },
]
export const liveManageStatusConfig: Record<string, { label: string; color: string }> = {
  live: { label: '直播中', color: '#dc2626' },
  scheduled: { label: '待开播', color: '#2563eb' },
  completed: { label: '已结束', color: '#4b5563' },
}

// ============ B端直播设置(live/settings) ============
export const liveNotifyKeys = [
  { key: 'newFollower', label: '新粉丝关注', desc: '有人关注你时发送通知' },
  { key: 'newGift', label: '收到礼物', desc: '收到观众打赏礼物时通知' },
  { key: 'newComment', label: '新评论', desc: '直播间有新评论时通知' },
  { key: 'liveStart', label: '开播提醒', desc: '你关注的主播开播时通知' },
  { key: 'earningReport', label: '收益报告', desc: '每日/每周收益报告推送' },
]
export const livePrivacyKeys = [
  { key: 'showFans', label: '公开粉丝数', desc: '在个人主页展示粉丝数量' },
  { key: 'showEarnings', label: '公开收益', desc: '在个人主页展示收益数据' },
  { key: 'showHistory', label: '公开直播记录', desc: '在个人主页展示历史直播' },
  { key: 'allowDownload', label: '允许下载回放', desc: '观众可以下载你的直播回放' },
]
export const liveSettingProfile = {
  avatar: '/marketing/course.png',
  name: '易道先生',
  intro: '专注八字命理研究二十年',
  desc: '专注八字命理研究二十年，师承多位名家',
  cover: '/marketing/course.png',
}
export const liveSettingNotifyDefault: Record<string, boolean> = {
  newFollower: true, newGift: true, newComment: true, liveStart: false, earningReport: true,
}
export const liveSettingPrivacyDefault: Record<string, boolean> = {
  showFans: true, showEarnings: false, showHistory: true, allowDownload: true,
}

// ============ B端直播团队(live/team) ============
export type TeamRole = 'host' | 'cohost' | 'operator' | 'assistant'
export interface TeamMember {
  id: number
  name: string
  avatar: string
  role: TeamRole
  expertise: string[]
  hasActiveLive?: boolean
  status?: string
  phone?: string
  liveCount?: number
  type?: string
  joinDate: string
  permissions: string[]
}
export const teamRoleConfig: Record<TeamRole, { label: string; color: string; icon: string }> = {
  host: { label: '主播', color: '#dc2626', icon: 'mic' },
  cohost: { label: '副播', color: '#2563eb', icon: 'mic-2' },
  operator: { label: '运营', color: '#16a34a', icon: 'settings' },
  assistant: { label: '场控', color: '#d97706', icon: 'shield' },
}
export const teamPermissions: Record<TeamRole, { label: string; icon: string }[]> = {
  host: [{ label: '直播', icon: 'radio' }, { label: '管理团队', icon: 'users' }, { label: '查看数据', icon: 'bar-chart-2' }, { label: '财务提现', icon: 'credit-card' }, { label: '内容管理', icon: 'file-text' }, { label: '设置', icon: 'settings' }],
  cohost: [{ label: '直播', icon: 'radio' }, { label: '查看数据', icon: 'bar-chart-2' }, { label: '内容管理', icon: 'file-text' }],
  operator: [{ label: '查看数据', icon: 'bar-chart-2' }, { label: '内容管理', icon: 'file-text' }, { label: '设置', icon: 'settings' }],
  assistant: [{ label: '内容管理', icon: 'file-text' }],
}
export const teamMembers: TeamMember[] = [
  { id: 1, name: '易道先生', avatar: '/marketing/course.png', role: 'host', expertise: ['八字命理', '紫微斗数'], status: 'online', phone: '138****8888', liveCount: 286, type: 'lecturer', joinDate: '2024-01-15', permissions: [] },
  { id: 2, name: '李明远', avatar: '/marketing/course.png', role: 'cohost', expertise: ['风水堪舆', '六爻占卜'], status: 'offline', phone: '139****6666', liveCount: 98, type: 'lecturer', joinDate: '2024-03-20', permissions: [] },
  { id: 3, name: '王运营', avatar: '/marketing/course.png', role: 'operator', expertise: ['数据分析', '社群运营'], status: 'online', phone: '136****1234', liveCount: 0, type: 'member', joinDate: '2024-06-10', permissions: [] },
  { id: 4, name: '赵助理', avatar: '/marketing/course.png', role: 'assistant', expertise: ['场控', '客服'], status: 'online', phone: '137****5678', liveCount: 0, type: 'member', joinDate: '2025-01-05', permissions: [], hasActiveLive: true },
]
export const teamAvailableMembers: TeamMember[] = [
  { id: 5, name: '张风水', avatar: '/marketing/course.png', role: 'cohost', expertise: ['风水', '面相手相'], status: 'offline', phone: '135****9999', liveCount: 56, type: 'lecturer', joinDate: '2025-03-01', permissions: [] },
  { id: 6, name: '陈国学', avatar: '/marketing/course.png', role: 'assistant', expertise: ['客服', '社群'], status: 'offline', phone: '134****3333', liveCount: 0, type: 'member', joinDate: '2025-04-15', permissions: [] },
]

// ============ B端直播间主题(live/theme) ============
export const themeTemplates = [
  { id: 'default', name: '经典国学', preview: '📚', bg1: '#1a1a2e', bg2: '#16213e', isFree: true, isUsing: true, desc: '经典国学风格，沉稳大气', primaryColor: '#8B5CF6', secondaryColor: '#6366f1', colors: { primary: '#8B5CF6', bg: '#1a1a2e', card: '#16213e', text: '#e2e8f0' } },
  { id: 'ink', name: '水墨丹青', preview: '🎨', bg1: '#f5f0e8', bg2: '#e8e0d0', isFree: true, isUsing: false, desc: '水墨画风格，古朴典雅', primaryColor: '#1a1a1a', secondaryColor: '#4a4a4a', colors: { primary: '#1a1a1a', bg: '#f5f0e8', card: '#ffffff', text: '#2c2c2c' } },
  { id: 'gold', name: '金碧辉煌', preview: '👑', bg1: '#1a1410', bg2: '#2a2018', isFree: false, isUsing: false, desc: '帝王金色，华丽尊贵', primaryColor: '#b8860b', secondaryColor: '#daa520', colors: { primary: '#b8860b', bg: '#1a1410', card: '#2a2018', text: '#d4c5a9' } },
  { id: 'jade', name: '玉润冰清', preview: '💎', bg1: '#f0fdf4', bg2: '#dcfce7', isFree: true, isUsing: false, desc: '翡翠绿色调，清新雅致', primaryColor: '#059669', secondaryColor: '#10b981', colors: { primary: '#059669', bg: '#f0fdf4', card: '#ffffff', text: '#1a2e1a' } },
]
export const themePendants = [
  { id: 1, name: '福字挂件', icon: '🧧', preview: '', position: '左上角' },
  { id: 2, name: '中国结', icon: '🏮', preview: '', position: '右上角' },
  { id: 3, name: '灯笼', icon: '🔆', preview: '', position: '底部居中' },
  { id: 4, name: '祥云', icon: '☁️', preview: '', position: '左上角' },
  { id: 5, name: '元宝', icon: '🪙', preview: '', position: '右上角' },
]
export const themeEffects = [
  { id: 'enter', name: '入场特效', preview: '', type: 'enter', icon: 'log-in', desc: '用户进入直播间时播放', defaultStyle: 'fade' },
  { id: 'like', name: '点赞特效', preview: '', type: 'like', icon: 'heart', desc: '点赞时播放特效动画', defaultStyle: 'bubble' },
  { id: 'gift', name: '礼物特效', preview: '', type: 'gift', icon: 'gift', desc: '收到礼物时播放特效', defaultStyle: 'firework' },
  { id: 'danmaku', name: '弹幕特效', preview: '', type: 'danmaku', icon: 'message-square', desc: '弹幕滚动显示效果', defaultStyle: 'scroll' },
]
export const themeCustomColors = ['#C41E3A', '#D4A017', '#3B5998', '#50C878', '#8B5CF6', '#2C2C2C']
export const themeEnterStyles = [
  { name: '淡入', emoji: '💨', id: 'fade', preview: '' },
  { name: '滑入', emoji: '➡️', id: 'slide', preview: '' },
  { name: '缩放', emoji: '🔍', id: 'scale', preview: '' },
  { name: '旋转', emoji: '🔄', id: 'rotate', preview: '' },
]
export const themeLikeStyles = ['❤️ 爱心', '🌟 星光', '🎉 彩带', '💥 爆炸']
export const themeComponentStyles = [
  { id: 'default', name: '默认', label: '默认风格', tag: '经典', icon: 'layout', preview: '' },
  { id: 'rounded', name: '圆润', label: '圆润风格', tag: '柔和', icon: 'circle', preview: '' },
  { id: 'sharp', name: '锐利', label: '锐利风格', tag: '现代', icon: 'square', preview: '' },
]

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

// ============================================
// 直播数据后台 — B端运营仪表盘
// ============================================

const analyticsLiveInfo = {
  id: '1', title: '易经入门基础讲座', startTime: '2024-06-15 19:30', duration: '1小时28分', type: 'knowledge' as const,
}

const analyticsCoreStats = {
  totalViews: 12850, peakViewers: 3420, avgViewers: 2150, newFollowers: 486,
  avgWatchTime: '12分36秒', retention: 68,
}

const analyticsTrafficData = [
  { label: '19:00', value: 120 }, { label: '19:10', value: 850 }, { label: '19:20', value: 2100 },
  { label: '19:30', value: 3200 }, { label: '19:40', value: 2850 }, { label: '19:50', value: 2600 },
  { label: '20:00', value: 2400 }, { label: '20:10', value: 2200 }, { label: '20:20', value: 1950 },
  { label: '20:30', value: 1800 }, { label: '20:40', value: 1650 }, { label: '20:50', value: 1500 },
]

const analyticsKeyMoments = [
  { time: '19:32', label: '开播峰值', desc: '开场互动问答环节，观众参与度最高' },
  { time: '19:45', label: '干货高峰', desc: '八字用神详解，弹幕互动最密集' },
  { time: '20:05', label: '购物车曝光', desc: '推荐《穷通宝鉴》课程，转化率最高' },
]

const analyticsAudience = {
  gender: [
    { label: '男性', percent: 62 },
    { label: '女性', percent: 38 },
  ],
  age: [
    { label: '18-24岁', percent: 15 },
    { label: '25-34岁', percent: 38 },
    { label: '35-44岁', percent: 28 },
    { label: '45岁以上', percent: 19 },
  ],
  region: [
    { name: '广东', percent: 14 }, { name: '北京', percent: 11 }, { name: '上海', percent: 9 },
    { name: '浙江', percent: 8 }, { name: '江苏', percent: 7 },
  ],
  source: [
    { label: '搜索', percent: 35 }, { label: '推荐', percent: 28 },
    { label: '关注', percent: 22 }, { label: '分享', percent: 15 },
  ],
}

const analyticsInteraction = {
  danmaku: 3256, likes: 12800, comments: 486, shares: 312,
  gifts: [
    { name: '国学书卷', count: 128, amount: 2560 },
    { name: '智慧之光', count: 86, amount: 1720 },
    { name: '桃李满园', count: 52, amount: 1040 },
    { name: '一帆风顺', count: 38, amount: 760 },
  ],
}

const analyticsWordCloud = [
  { text: '八字', weight: 28 }, { text: '用神', weight: 22 }, { text: '五行', weight: 18 },
  { text: '命理', weight: 16 }, { text: '大运', weight: 14 }, { text: '格局', weight: 12 },
  { text: '流年', weight: 10 }, { text: '喜用', weight: 8 },
]

const analyticsProductStats = {
  totalProducts: 8, soldCount: 245, revenue: 36800,
}

const analyticsReplay = {
  isPublic: true, isPaid: false, playCount: 5680,
  playDuration: '共86小时', revenue: 2860,
}

const obsStreamData = {
  status: 'online' as const, duration: 0, fps: 30, bitrate: 4500,
  resolution: '1920×1080', droppedFrames: 0, totalFrames: 0,
  serverUrl: 'rtmp://live.rebugx.cn/live', streamKey: 'sk_live_abc123def456',
}

const obsQualityPresets = [
  { label: '超清', resolution: '1920×1080', bitrate: 4500, fps: 30, recommended: true },
  { label: '高清', resolution: '1280×720', bitrate: 2500, fps: 30, recommended: false },
  { label: '标清', resolution: '854×480', bitrate: 1200, fps: 25, recommended: false },
]

const obsPageSteps = [
  { step: 1, title: '下载OBS', desc: '前往 obsproject.com 下载对应系统版本' },
  { step: 2, title: '添加来源', desc: '点击「来源」区域的 + 按钮，添加视频捕获设备或显示器采集' },
  { step: 3, title: '配置推流', desc: '打开「设置→推流」，将服务选择为自定义，填入服务器地址和推流码' },
  { step: 4, title: '开始推流', desc: '在OBS主界面右下角点击「开始推流」按钮即可上线直播' },
]

const obsOutputSettings = [
  { key: '视频编码器', value: '硬件 (NVENC H.264)' },
  { key: '码率控制', value: 'CBR' },
  { key: '视频比特率', value: '4500 Kbps' },
  { key: '关键帧间隔', value: '2 秒' },
  { key: '预设', value: 'P5: 慢（高质量）' },
  { key: '调节', value: '高质量' },
  { key: '配置', value: 'high' },
  { key: '最大B帧', value: '2' },
]

const obsPageFaq = [
  { q: '推流失败怎么办？', a: '检查网络连接，确认服务器地址和推流码正确。防火墙可能阻止OBS连接，需添加OBS到防火墙白名单。' },
  { q: '画面卡顿怎么优化？', a: '降低输出分辨率和码率，关闭不必要的后台程序，确保网络上行带宽充足（≥5Mbps）。' },
  { q: '如何添加多个摄像头？', a: '在来源中添加多个「视频捕获设备」，每个对应一个摄像头，可在场景中自由切换。' },
]

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
      const sorted = [...liveReplays]
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

  /** 竖屏直播间完整数据 */
  async verticalRoom(id: string) {
    if (useMock()) return { room: verticalLiveRoom, comments: verticalLiveComments, products: verticalLiveProducts }
    try {
      const data = await apiGet<any>(`/live/rooms/${id}/vertical`)
      return {
        room: { id: data.id, title: data.title, hostName: data.hostName, hostAvatar: data.hostAvatar, hostLevel: data.hostLevel ?? 1, followers: data.followers ?? 0, viewerCount: data.viewerCount ?? 0, likeCount: data.likeCount ?? 0, onlineAvatars: data.onlineAvatars || [] },
        comments: data.comments || [], products: data.products || [],
      }
    } catch { return { room: verticalLiveRoom, comments: verticalLiveComments, products: verticalLiveProducts } }
  },

  /** 横屏直播间完整数据 */
  async horizontalRoom(id: string) {
    if (useMock()) return { room: horizontalLiveRoom, slides: horizontalSlides, questions: horizontalQuestions, messages: horizontalMessages, files: horizontalFiles }
    try {
      const data = await apiGet<any>(`/live/rooms/${id}/horizontal`)
      return {
        room: data.room || horizontalLiveRoom, slides: data.slides || [], questions: data.questions || [],
        messages: data.messages || [], files: data.files || [],
      }
    } catch { return { room: horizontalLiveRoom, slides: horizontalSlides, questions: horizontalQuestions, messages: horizontalMessages, files: horizontalFiles } }
  },

  /** 直播预告详情 */
  async previewRoom(id: string) {
    if (useMock()) return livePreviewRoom
    try { return await apiGet<any>(`/live/rooms/${id}/preview`) }
    catch { return livePreviewRoom }
  },

  /** 直播结束统计 */
  async endStats(id: string) {
    if (useMock()) return { room: liveEndRoom, recommends: liveEndRecommendLives, courses: liveEndRecommendCourses }
    try {
      const data = await apiGet<any>(`/live/rooms/${id}/end`)
      return { room: data.room || liveEndRoom, recommends: data.recommendLives || [], courses: data.recommendCourses || [] }
    } catch { return { room: liveEndRoom, recommends: liveEndRecommendLives, courses: liveEndRecommendCourses } }
  },

  /** 主播数据中心 */
  async hostDashboard() {
    if (useMock()) return { stats: hostLiveStats, rooms: hostLiveRooms, trend: hostLiveTrend }
    try {
      const data = await apiGet<any>('/live/host/dashboard')
      return { stats: data.stats || hostLiveStats, rooms: data.rooms || [], trend: data.trend || [] }
    } catch { return { stats: hostLiveStats, rooms: hostLiveRooms, trend: hostLiveTrend } }
  },

  /** 回放首页数据 */
  async replayHome() {
    if (useMock()) return { categories: replayCategories, hotItems: replayHotItems, list: replayHomeList, hotSearches: replayHotSearches }
    try {
      const data = await apiGet<any>('/live/replays/home')
      return { categories: data.categories || replayCategories, hotItems: data.hotItems || [], list: data.list || [], hotSearches: data.hotSearches || [] }
    } catch { return { categories: replayCategories, hotItems: replayHotItems, list: replayHomeList, hotSearches: replayHotSearches } }
  },

  /** 回放详情 */
  async replayDetail(id: string) {
    if (useMock()) return replayDetail
    try { return await apiGet<any>(`/live/replays/${id}`) }
    catch { return replayDetail }
  },

  /** 推流配置 */
  async getStreamConfig() {
    if (useMock()) return streamConfig
    try { return await apiGet<any>('/live/stream-config') }
    catch { return streamConfig }
  },

  /** 带货商品列表 */
  async getProducts() {
    if (useMock()) return { filters: liveProductFilters, items: liveProducts }
    try {
      const data = await apiGet<any[]>('/live/products')
      return { filters: liveProductFilters, items: data }
    } catch { return { filters: liveProductFilters, items: liveProducts } }
  },

  /** 直播评价列表 */
  async getReviews() {
    if (useMock()) return { filters: liveReviewFilters, dist: liveReviewDist, items: liveReviews }
    try {
      const data = await apiGet<any>('/live/reviews')
      return { filters: data.filters || liveReviewFilters, dist: data.dist || liveReviewDist, items: data.items || liveReviews }
    } catch { return { filters: liveReviewFilters, dist: liveReviewDist, items: liveReviews } }
  },

  /** 回放评价配置 */
  async getReplayCommentConfig() {
    if (useMock()) return { aspects: replayCommentAspects, tagsByRating: replayCommentTagsByRating, labels: replayCommentLabels }
    try { return await apiGet<any>('/live/replay-comment/config') }
    catch { return { aspects: replayCommentAspects, tagsByRating: replayCommentTagsByRating, labels: replayCommentLabels } }
  },

  /** 直播排期列表 */
  async getScheduleList() {
    if (useMock()) return scheduleList
    try { return await apiGet<any[]>('/live/schedule') }
    catch { return scheduleList }
  },

  /** OBS推流教程 */
  async getObsGuide() {
    if (useMock()) return { steps: obsGuideSteps, requirements: obsGuideRequirements, faq: obsGuideFaq }
    try { return await apiGet<any>('/live/obs-guide') }
    catch { return { steps: obsGuideSteps, requirements: obsGuideRequirements, faq: obsGuideFaq } }
  },

  /** OBS配置教程 + FAQ（用于推流配置页步骤指示器和常见问题） */
  async getObsConfigGuide() {
    if (useMock()) return { steps: obsConfigSteps, faq: streamConfigFaq }
    try { return await apiGet<any>('/live/stream-config/guide') }
    catch { return { steps: obsConfigSteps, faq: streamConfigFaq } }
  },

  /** 直播分析数据 */
  async getAnalytics(id: string) {
    if (useMock()) return {
      liveInfo: analyticsLiveInfo, coreStats: analyticsCoreStats, trafficData: analyticsTrafficData,
      keyMoments: analyticsKeyMoments, audience: analyticsAudience, interaction: analyticsInteraction,
      wordCloud: analyticsWordCloud, productStats: analyticsProductStats, replay: analyticsReplay,
    }
    try { return await apiGet<any>(`/live/rooms/${id}/analytics`) }
    catch { return {
      liveInfo: analyticsLiveInfo, coreStats: analyticsCoreStats, trafficData: analyticsTrafficData,
      keyMoments: analyticsKeyMoments, audience: analyticsAudience, interaction: analyticsInteraction,
      wordCloud: analyticsWordCloud, productStats: analyticsProductStats, replay: analyticsReplay,
    }}
  },

  /** OBS推流页面数据 */
  async getObsPage() {
    if (useMock()) return { stream: obsStreamData, qualityPresets: obsQualityPresets, steps: obsPageSteps, outputSettings: obsOutputSettings, faq: obsPageFaq }
    try { return await apiGet<any>('/live/obs-page') }
    catch { return { stream: obsStreamData, qualityPresets: obsQualityPresets, steps: obsPageSteps, outputSettings: obsOutputSettings, faq: obsPageFaq } }
  },

  /** B端直播控制台数据 */
  async getConsoleData() {
    if (useMock()) return {
      stats: _consoleStats, danmaku: _consoleDanmaku, connectRequests: _consoleConnectRequests,
      products: _consoleProducts, script: _consoleScript, coupons: _consoleCoupons,
    }
    try { return await apiGet<any>('/live/console') }
    catch { return {
      stats: _consoleStats, danmaku: _consoleDanmaku, connectRequests: _consoleConnectRequests,
      products: _consoleProducts, script: _consoleScript, coupons: _consoleCoupons,
    }}
  },
}
