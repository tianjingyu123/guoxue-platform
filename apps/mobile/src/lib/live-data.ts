// ============ 直播板块(live) mock 数据（从原型 app/live 迁移） ============
// 说明：原型封面/头像为 mock 配图，dev 下回退占位；此处统一用 /marketing 占位路径，比对时会被中和

import { apiGet, apiGetOptionalAuth, apiPost, apiPostOptionalAuth, apiPut, apiDelete } from '@/utils/request'

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
  /** 原始预定开播时间(ISO)：预告列表用于过滤已过期场次 */
  scheduledAtRaw?: string
  duration?: string
  price?: number
  circleFree?: boolean
  productCount?: number
}

export const liveTabs = ['全部', '知识授课', '电商带货', '关注的'] as const

export const liveList: LiveItem[] = [
  { id: '1', title: '八字命理入门：如何快速解读四柱八字', cover: 'https://api.rebugx.cn/assets/live/live-h1.webp', hostName: '易道先生', hostAvatar: 'https://api.rebugx.cn/assets/experts/expert-1.webp', viewerCount: 12580, type: 'knowledge', status: 'live', orientation: 'horizontal', priceType: 'free' },
  { id: '2', title: '开光吉祥物专场：招财貔貅、转运葫芦', cover: 'https://api.rebugx.cn/assets/live/live-2.webp', hostName: '福缘阁主', hostAvatar: 'https://api.rebugx.cn/assets/experts/expert-2.webp', viewerCount: 8920, type: 'commerce', status: 'live', orientation: 'vertical', priceType: 'free', productCount: 12 },
  { id: '3', title: '天然水晶手链专场直播', cover: 'https://api.rebugx.cn/assets/live/live-3.webp', hostName: '晶缘坊', hostAvatar: '', viewerCount: 5630, type: 'commerce', status: 'live', orientation: 'vertical', priceType: 'free', productCount: 8 },
  { id: '4', title: '紫微斗数实战案例分析第三期', cover: 'https://api.rebugx.cn/assets/live/live-h1.webp', hostName: '紫微大师', hostAvatar: 'https://api.rebugx.cn/assets/experts/expert-1.webp', viewerCount: 3280, type: 'knowledge', status: 'live', orientation: 'horizontal', priceType: 'paid', price: 99, circleFree: true },
  { id: '5', title: '今晚8点：风水布局与家居旺财秘诀', cover: 'https://api.rebugx.cn/assets/live/live-1.webp', hostName: '风水堂主', hostAvatar: '', viewerCount: 328, type: 'knowledge', status: 'upcoming', scheduledTime: '今晚 20:00', orientation: 'vertical', priceType: 'free' },
  { id: '6', title: '周易古籍珍藏版专场直播', cover: 'https://api.rebugx.cn/assets/live/live-2.webp', hostName: '古籍书阁', hostAvatar: '', viewerCount: 4150, type: 'commerce', status: 'live', orientation: 'vertical', priceType: 'free', productCount: 15 },
  { id: '7', title: '奇门遁甲：预测学的巅峰之术', cover: 'https://api.rebugx.cn/assets/live/live-3.webp', hostName: '奇门居士', hostAvatar: '', viewerCount: 186, type: 'knowledge', status: 'upcoming', scheduledTime: '明天 14:00', orientation: 'vertical', priceType: 'paid', price: 168 },
  { id: '8', title: '手把手教你排八字命盘', cover: 'https://api.rebugx.cn/assets/live/live-h1.webp', hostName: '李命理', hostAvatar: 'https://api.rebugx.cn/assets/experts/expert-2.webp', viewerCount: 2860, type: 'knowledge', status: 'live', orientation: 'horizontal', priceType: 'free' },
  { id: '9', title: '手工罗盘制作工艺展示与售卖', cover: 'https://api.rebugx.cn/assets/live/live-1.webp', hostName: '匠心堂', hostAvatar: '', viewerCount: 1520, type: 'commerce', status: 'live', orientation: 'vertical', priceType: 'free', productCount: 6 },
  { id: '10', title: '道家符箓专场直播', cover: 'https://api.rebugx.cn/assets/live/live-2.webp', hostName: '玄真道人', hostAvatar: '', viewerCount: 980, type: 'commerce', status: 'live', orientation: 'vertical', priceType: 'free', productCount: 9 },
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
  { id: '1', name: '易道先生', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', cover: 'https://images.unsplash.com/photo-1588666309990-d68f08e3d4a6?w=300', specialty: '八字命理知识直播', followers: 128000, likes: 960000, liveCount: 286, rating: 4.9, isLive: true, viewerCount: 12580, tags: ['八字', '流年', '命理'], verified: true },
  { id: '2', name: '福缘阁主', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80', cover: 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=300', specialty: '吉祥物电商直播', followers: 96400, likes: 780000, liveCount: 198, rating: 4.8, isLive: true, viewerCount: 8920, tags: ['吉祥物', '开光', '风水'], verified: true },
  { id: '3', name: '晶缘坊', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80', cover: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300', specialty: '天然水晶珠宝直播', followers: 74600, likes: 620000, liveCount: 156, rating: 4.7, isLive: true, viewerCount: 5630, tags: ['水晶', '珠宝', '开运'], verified: false },
  { id: '4', name: '玄学居士', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80', cover: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300', specialty: '紫微斗数授课直播', followers: 58200, likes: 486000, liveCount: 124, rating: 4.8, isLive: false, tags: ['紫微', '斗数', '命理'], verified: true },
  { id: '5', name: '王先生讲风水', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80', cover: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=300', specialty: '风水堪舆讲解', followers: 42800, likes: 356000, liveCount: 98, rating: 4.6, isLive: false, tags: ['风水', '堪舆', '布局'], verified: false },
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
  { id: '1', title: '《周易》六十四卦详解 - 乾卦篇', cover: 'https://api.rebugx.cn/assets/live/live-h1.webp', hostName: '张道长', hostAvatar: 'https://api.rebugx.cn/assets/experts/expert-1.webp', category: '易经', viewers: 8520, duration: 7200, dateText: '1月15日' },
  { id: '2', title: '紫微斗数入门：命盘基础解读', cover: 'https://api.rebugx.cn/assets/live/live-1.webp', hostName: '李命师', hostAvatar: 'https://api.rebugx.cn/assets/experts/expert-2.webp', category: '紫微斗数', viewers: 6230, duration: 5400, dateText: '1月14日' },
  { id: '3', title: '八字命理：如何看流年运势', cover: 'https://api.rebugx.cn/assets/live/live-2.webp', hostName: '王半仙', hostAvatar: 'https://api.rebugx.cn/assets/experts/expert-1.webp', category: '八字命理', viewers: 12800, duration: 6800, dateText: '1月13日' },
  { id: '4', title: '梅花易数：起卦与断卦技巧', cover: 'https://api.rebugx.cn/assets/live/live-3.webp', hostName: '赵易师', hostAvatar: 'https://api.rebugx.cn/assets/experts/expert-2.webp', category: '梅花易数', viewers: 4520, duration: 4800, dateText: '1月12日' },
  { id: '5', title: '风水布���：家居风水入门', cover: 'https://api.rebugx.cn/assets/live/live-1.webp', hostName: '陈风水', hostAvatar: 'https://api.rebugx.cn/assets/experts/expert-1.webp', category: '风水', viewers: 9800, duration: 5600, dateText: '1月11日' },
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
  { id: '1', title: '2024甲辰年运势全解析', cover: 'https://api.rebugx.cn/assets/live/live-h1.webp', hostName: '玄真子', hostAvatar: 'https://api.rebugx.cn/assets/experts/expert-1.webp', duration: 7200, views: 58600, category: '易经', isHot: true },
  { id: '2', title: '家居风水布局实战课', cover: 'https://api.rebugx.cn/assets/live/live-1.webp', hostName: '明德居士', hostAvatar: 'https://api.rebugx.cn/assets/experts/expert-2.webp', duration: 5400, views: 42300, category: '风水', isHot: true },
]

export const replayHomeList: ReplayHomeItem[] = [
  { id: '3', title: '八字入门：如何排盘与看命', cover: 'https://api.rebugx.cn/assets/live/live-2.webp', hostName: '子平先生', hostAvatar: 'https://api.rebugx.cn/assets/experts/expert-1.webp', duration: 4800, views: 28500, category: '八字' },
  { id: '4', title: '梅花易数断卦技巧', cover: 'https://api.rebugx.cn/assets/live/live-3.webp', hostName: '易林', hostAvatar: 'https://api.rebugx.cn/assets/experts/expert-2.webp', duration: 3600, views: 19200, category: '梅花' },
  { id: '5', title: '六爻预测实战案例分析', cover: 'https://api.rebugx.cn/assets/live/live-1.webp', hostName: '卦象大师', hostAvatar: 'https://api.rebugx.cn/assets/experts/expert-1.webp', duration: 5100, views: 15800, category: '六爻' },
  { id: '6', title: '奇门遁甲入门指南', cover: 'https://api.rebugx.cn/assets/live/live-h1.webp', hostName: '遁甲居士', hostAvatar: 'https://api.rebugx.cn/assets/experts/expert-2.webp', duration: 6000, views: 12400, category: '奇门' },
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
  { id: '1', title: '八字命理入门精讲（第12期）', cover: 'https://api.rebugx.cn/assets/marketing/course.webp', status: 'ended', dateText: '1/15 19:00', duration: 150, views: 3280, gifts: 280, revenue: 560 },
  { id: '2', title: '紫微斗数实战案例分析', cover: 'https://api.rebugx.cn/assets/marketing/course.webp', status: 'ended', dateText: '1/12 20:00', duration: 120, views: 2560, gifts: 180, revenue: 380 },
  { id: '3', title: '六爻占卜基础教学', cover: 'https://api.rebugx.cn/assets/marketing/course.webp', status: 'ended', dateText: '1/10 19:30', duration: 90, views: 1980, gifts: 120, revenue: 240 },
  { id: '4', title: '梅花易数快速入门', cover: 'https://api.rebugx.cn/assets/marketing/course.webp', status: 'preview', dateText: '1/20 19:00', duration: 0, views: 0, gifts: 0, revenue: 0 },
]

// 固定的30天趋势(避免随机数破坏比对稳定性)
const _viewsSeq = [1820, 2360, 1540, 2890, 2100, 1680, 3200, 2450, 1920, 2780, 1450, 3050, 2200, 1760, 2640, 1980, 3380, 2120, 1580, 2900, 2460, 1840, 3120, 2280, 1660, 2740, 2040, 3300, 2380, 2860]
const _revSeq = [220, 380, 160, 480, 320, 200, 560, 420, 260, 500, 140, 540, 360, 240, 460, 300, 580, 340, 180, 520, 400, 260, 540, 380, 220, 480, 320, 560, 420, 500]
export const hostLiveTrend: HostLiveTrend[] = Array.from({ length: 30 }, (_, i) => {
  // 与原型一致：近30天(以今天为最后一天)
  const d = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
  return {
    dateLabel: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
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
  hostAvatar: 'https://api.rebugx.cn/assets/marketing/course.webp',
  hostId: '', // 主播 userId（关注主播用·真连时由后端房间返回）
  hostLevel: 5,
  followers: 12800,
  viewerCount: 8920,
  likeCount: 32100,
  onlineAvatars: ['https://api.rebugx.cn/assets/marketing/course.webp', 'https://api.rebugx.cn/assets/marketing/course.webp', 'https://api.rebugx.cn/assets/marketing/course.webp'],
  imGroupId: '', // TIM 弹幕群 ID（真连时由后端房间返回，用于加入群收发弹幕）
}
export const verticalLiveComments: VerticalLiveComment[] = [
  { id: '1', userName: '系统', content: '欢迎来到直播间，请文明观看', type: 'system' },
  { id: '2', userName: '易学爱好者', content: '主播讲得太好了！', type: 'text' },
]
export const verticalLiveProducts: VerticalLiveProduct[] = [
  { id: '1', name: '开光招财貔貅摆件 天然黑曜石', cover: 'https://api.rebugx.cn/assets/marketing/course.webp', price: 299, originalPrice: 599, stock: 56, sold: 1280, isExplaining: true },
  { id: '2', name: '五帝钱挂件 真品铜钱招财镇宅', cover: 'https://api.rebugx.cn/assets/marketing/course.webp', price: 128, originalPrice: 268, stock: 128, sold: 2350 },
  { id: '3', name: '天然黄水晶转运葫芦', cover: 'https://api.rebugx.cn/assets/marketing/course.webp', price: 168, originalPrice: 328, stock: 89, sold: 890 },
]

// ============ 直播间观看页(live/[id]) ============
// @data-needs: 直播间详情, 参数 id, 返回 LiveWatchRoom
export const liveWatchRoom = {
  id: '1',
  type: 'knowledge' as 'knowledge' | 'commerce',
  title: '紫微斗数命盘解析直播',
  hostName: '云中子道长',
  hostAvatar: 'https://api.rebugx.cn/assets/marketing/course.webp',
  hostId: '',
  followers: 12800,
  viewerCount: 3256,
  likeCount: 18900,
  isFollowing: false,
  onlineAvatars: ['https://api.rebugx.cn/assets/marketing/course.webp', 'https://api.rebugx.cn/assets/marketing/course.webp', 'https://api.rebugx.cn/assets/marketing/course.webp'],
  imGroupId: '', // TIM 弹幕群 ID
  circleId: '', // 发起直播的圈子 ID（佣-V2-P3：进房上报圈子渠道点击/购买带 LIVE 来源）
}

/** 观看页房间数据（getWatchRoom 适配后的完整形状·三态改造：预约/直播中/回放共用） */
export interface LiveWatchRoomInfo {
  id: string
  type: 'knowledge' | 'commerce'
  title: string
  hostName: string
  hostAvatar: string
  hostId: string
  /** 主播粉丝数：房间接口不返回该字段 → null（页面隐藏该行，不再写死 0 误导观众） */
  followers: number | null
  viewerCount: number
  likeCount: number
  isFollowing: boolean
  onlineAvatars: string[]
  imGroupId: string
  circleId: string
  /** 房间状态 WAITING/LIVING/ENDED/REPLAY（大写原样透传） */
  status: string
  cover: string
  startTime: string
  /** 收费类型（大写）：FREE | 其他=付费 */
  chargeType: string
  chargePrice: number
  /** 画质档位：basic | hd | uhd（空=未知） */
  quality: string
  replayUrl: string
  /** #21 回放章节点（主播标注·无则空数组） */
  replayChapters: { t: number; title: string }[]
  circleName: string
}
// 原型 mockDanmaku 全部为普通弹幕(type:normal)，无"系统/欢迎"项；系统消息走 liveWatchSystemPool 横幅
export const liveWatchComments: VerticalLiveComment[] = [
  { id: '2', userName: '紫微爱好者', content: '老师讲得太透彻了！', type: 'text' },
  { id: '3', userName: '易学小白', content: '请问命宫怎么看？', type: 'text' },
]
// 滚动弹幕池（原型 setInterval 推送）
export const liveWatchDanmakuPool: VerticalLiveComment[] = [
  { id: 'd1', userName: '易学爱好者', content: '讲得太好了！', type: 'text' },
  { id: 'd2', userName: '命理初学', content: '老师这个怎么看大运？', type: 'text' },
  { id: 'd3', userName: '紫微门人', content: '666', type: 'text' },
  { id: 'd4', userName: '风水小白', content: '感谢老师分享', type: 'text' },
  { id: 'd5', userName: '国学传承', content: '受益匪浅', type: 'text' },
]
// 系统消息池（进入/送礼/购买）
export interface LiveWatchSystemMsg { id: number; type: 'enter' | 'gift' | 'buy'; user: string; content: string; giftIcon?: string }
export const liveWatchSystemPool: LiveWatchSystemMsg[] = [
  { id: 1, type: 'enter', user: '玄学新人', content: '进入了直播间' },
  { id: 2, type: 'gift', user: '易道弟子', content: '送出了 太极', giftIcon: '☯️' },
  { id: 3, type: 'buy', user: '福气满满', content: '购买了 开光招财貔貅摆件' },
]
// 打赏榜
export interface LiveWatchRankItem { rank: number; user: string; amount: number }
export const liveWatchRankList: LiveWatchRankItem[] = [
  { rank: 1, user: '易道传人', amount: 8888 },
  { rank: 2, user: '国学守护', amount: 5666 },
  { rank: 3, user: '玄学爱好', amount: 3288 },
]
// 直播间商品（电商直播复用 VerticalLiveProduct 结构）
export const liveWatchProducts: VerticalLiveProduct[] = [
  { id: 'p1', name: '开光招财貔貅摆件', cover: 'https://api.rebugx.cn/assets/marketing/course.webp', price: 299, originalPrice: 599, stock: 56, sold: 1280, isExplaining: true },
  { id: 'p2', name: '天然黄水晶转运葫芦', cover: 'https://api.rebugx.cn/assets/marketing/course.webp', price: 168, originalPrice: 328, stock: 128, sold: 890 },
  { id: 'p3', name: '紫檀木雕福禄寿三星', cover: 'https://api.rebugx.cn/assets/marketing/course.webp', price: 1680, originalPrice: 2999, stock: 23, sold: 156 },
]
// 电商直播实时已售通知的随机用户名
export const liveWatchBuyerNames = ['福气满满', '招财进宝', '玄学新人', '易道弟子', '国学传承', '命理初学', '紫微门人']

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
  cover: 'https://api.rebugx.cn/assets/live/live-3.webp',
  hostId: 'h1',
  hostName: '云中子',
  hostAvatar: 'https://api.rebugx.cn/assets/experts/expert-1.webp',
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
  cover: 'https://api.rebugx.cn/assets/live/live-h1.webp',
  hostId: 'h1',
  hostName: '易经大师·张道长',
  hostAvatar: 'https://api.rebugx.cn/assets/experts/expert-1.webp',
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
  { id: '2', title: '紫微斗数入门：认识你的命盘', cover: 'https://api.rebugx.cn/assets/live/live-2.webp', status: 'preview', viewers: 0, bookedCount: 856 },
  { id: '3', title: '风水布局与家居吉凶', cover: 'https://api.rebugx.cn/assets/live/live-1.webp', status: 'live', viewers: 1256, bookedCount: 0 },
]
export const liveEndRecommendCourses = [
  { id: 'c1', title: '周易六十四卦系统课', cover: 'https://api.rebugx.cn/assets/live/live-h1.webp', price: 299, lessons: 64 },
  { id: 'c2', title: '紫微斗数精讲班', cover: 'https://api.rebugx.cn/assets/live/live-3.webp', price: 399, lessons: 48 },
]

// ============ 回放详情(live/replay/[id]) ============
// @data-needs: 回放详情, 参数 id, 返回 ReplayDetail
export interface ReplayChapter { id: number; title: string; startTime: number; timeDisplay: string; description: string }
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
  durationSec: number
  startTime: string
  circleName: string
  isPaid: boolean
  isPurchased: boolean
  price?: string
  slides: ReplaySlide[]
  chapters: ReplayChapter[]
  discussions: ReplayDiscussion[]
  qaList: ReplayQA[]
  products: ReplayProduct[]
}
export interface ReplaySlide {
  id: number
  time: number
  timeDisplay: string
  title?: string
  imageUrl: string
}
export const replayDetail: ReplayDetail = {
  id: 1,
  title: '八字命理入门：如何看懂自己的命盘',
  hostName: '周易大师',
  hostAvatar: 'https://api.rebugx.cn/assets/experts/expert-1.webp',
  hostTitle: '资深命理师',
  hostFollowers: 12800,
  isVerified: true,
  viewerCount: 3256,
  likeCount: 1890,
  duration: '02:30:15',
  durationSec: 9015,
  startTime: '2026-01-15 19:00',
  circleName: '八字命理研习社',
  isPaid: false,
  isPurchased: false,
  slides: [
    { id: 1, time: 0, timeDisplay: '00:00:00', title: '课程封面', imageUrl: 'https://api.rebugx.cn/assets/marketing/course.webp' },
    { id: 2, time: 300, timeDisplay: '00:05:00', title: '天干地支表', imageUrl: 'https://api.rebugx.cn/assets/marketing/course.webp' },
    { id: 3, time: 900, timeDisplay: '00:15:00', title: '十神关系图', imageUrl: 'https://api.rebugx.cn/assets/marketing/course.webp' },
    { id: 4, time: 1800, timeDisplay: '00:30:00', title: '五行生克图', imageUrl: 'https://api.rebugx.cn/assets/marketing/luopan.webp' },
    { id: 5, time: 3000, timeDisplay: '00:50:00', title: '命盘实例', imageUrl: 'https://api.rebugx.cn/assets/marketing/course.webp' },
    { id: 6, time: 4500, timeDisplay: '01:15:00', title: '大运流年表', imageUrl: 'https://api.rebugx.cn/assets/marketing/course.webp' },
  ],
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
  imGroupId?: string // TIM 弹幕群 ID
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
  hostAvatar: 'https://api.rebugx.cn/assets/marketing/course.webp',
  hostTitle: '易学研究员',
  followers: 12800,
  viewers: 1856,
  likes: 4520,
  duration: '45:32',
  category: '易经',
}
export const horizontalSlides: HorizontalSlide[] = [
  { id: '1', pageNum: 1, title: '第一章：泰卦概述', thumbnail: 'https://api.rebugx.cn/assets/marketing/course.webp' },
  { id: '2', pageNum: 2, title: '泰卦卦象解读', thumbnail: 'https://api.rebugx.cn/assets/marketing/course.webp' },
  { id: '3', pageNum: 3, title: '泰卦六爻详解', thumbnail: 'https://api.rebugx.cn/assets/marketing/course.webp' },
  { id: '4', pageNum: 4, title: '否卦概述', thumbnail: 'https://api.rebugx.cn/assets/marketing/course.webp' },
  { id: '5', pageNum: 5, title: '泰否对比分析', thumbnail: 'https://api.rebugx.cn/assets/marketing/course.webp' },
]
export const horizontalQuestions: HorizontalQuestion[] = [
  { id: '1', userName: '学员A', userAvatar: 'https://api.rebugx.cn/assets/marketing/course.webp', content: '泰卦和否卦的核心区别是什么？', isPublic: true, status: 'answered', answer: '泰卦象征天地交泰、上下沟通，否卦象征天地不交、闭塞不通。一通一塞，正是相反相成。', time: '12:35' },
  { id: '2', userName: '学员B', userAvatar: 'https://api.rebugx.cn/assets/marketing/course.webp', content: '否极泰来这个成语和这两卦有关系吗？', isPublic: true, status: 'pending', time: '12:38' },
  { id: '3', userName: '学员C', userAvatar: 'https://api.rebugx.cn/assets/marketing/course.webp', content: '请问老师，泰卦在占卜中一般代表什么含义？', isPublic: true, status: 'pending', time: '12:42' },
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
// 模拟滚动新消息池（原型 setInterval 随机推送）
export const horizontalAutoComments = ['学到了', '受益匪浅', '老师讲得好', '涨知识了', '感谢分享']
export const horizontalAutoUsers = ['玄学新人', '易道弟子', '国学迷', '命理初学', '风水爱好']

// ============ 礼物（vertical / watch / horizontal 打赏面板共用）============
// @data-needs: 礼物清单接口；送礼后扣减国学币余额 liveCoinBalance
export interface LiveGift { id: string; name: string; icon: string; price: number }
export const liveGifts: LiveGift[] = [
  { id: 'g1', name: '点赞', icon: 'https://api.rebugx.cn/assets/marketing/course.webp', price: 1 },
  { id: 'g2', name: '鲜花', icon: 'https://api.rebugx.cn/assets/marketing/course.webp', price: 6 },
  { id: 'g3', name: '香囊', icon: 'https://api.rebugx.cn/assets/marketing/course.webp', price: 18 },
  { id: 'g4', name: '玉如意', icon: 'https://api.rebugx.cn/assets/marketing/course.webp', price: 66 },
  { id: 'g5', name: '聚宝盆', icon: 'https://api.rebugx.cn/assets/marketing/course.webp', price: 188 },
  { id: 'g6', name: '麒麟', icon: 'https://api.rebugx.cn/assets/marketing/course.webp', price: 520 },
]
// 用户国学币余额（mock）
export const liveCoinBalance = 2680

// ============ 画质分档商业化（C5·时长包/额度）============
export interface LiveQualityPackage {
  id: string
  name: string
  quality: 'hd' | 'uhd'
  minutes: number
  priceCoin: number
  priceYuan: number
}
export interface LiveQuota {
  hdMinutes: number
  uhdMinutes: number
}

// ============ 创作者后台 · 直播中控制台 (/creator/live/console) ============
// @data-needs: 直播实时数据流（在线/观看/打赏/带货等），由后端 WebSocket 推送
export const consoleLiveStats = {
  onlineCount: 1258,
  totalViews: 8560,
  newFollowers: 86,
  totalGift: 2680,
  totalSales: 12800,
  peakOnline: 1580,
  avgWatchTime: '8:32',
  interactionRate: '12.5%',
}

// @data-needs: 实时弹幕流，后端推送追加；含等级/VIP 标记
export interface ConsoleDanmaku { id: number; userId?: string; user: string; content: string; time: string; level: number; isVip: boolean }
export const consoleDanmaku: ConsoleDanmaku[] = [
  { id: 1, user: '易学小白', content: '老师讲得真好！', time: '10:23:15', level: 3, isVip: false },
  { id: 2, user: '命理爱好者', content: '这个八字怎么看财运？', time: '10:23:18', level: 5, isVip: true },
  { id: 3, user: '紫微迷', content: '老师能讲讲紫微斗数吗', time: '10:23:22', level: 2, isVip: false },
  { id: 4, user: '风水先生', content: '支持老师！', time: '10:23:25', level: 8, isVip: true },
  { id: 5, user: '新用户001', content: '刚来，老师在讲什么？', time: '10:23:30', level: 1, isVip: false },
  { id: 6, user: '道法自然', content: '八字日主分析很到位', time: '10:23:35', level: 6, isVip: false },
  { id: 7, user: '学易人', content: '请问今天有抽奖吗？', time: '10:23:40', level: 4, isVip: false },
  { id: 8, user: '命理大师粉丝', content: '已购买课程，非常棒！', time: '10:23:45', level: 7, isVip: true },
]

// @data-needs: 连麦申请列表，观众发起后入列；接受/拒绝走后端
export interface ConsoleConnectRequest { id: number; user: string; avatar: string; reason: string; waitTime: string }
export const consoleConnectRequests: ConsoleConnectRequest[] = [
  { id: 1, user: '命理爱好者', avatar: '', reason: '想请教老师关于日主偏弱的问题', waitTime: '2:30' },
  { id: 2, user: '紫微迷', avatar: '', reason: '我的命盘有疑问想请老师解答', waitTime: '1:15' },
  { id: 3, user: '风水先生', avatar: '', reason: '交流风水布局心得', waitTime: '0:45' },
]

// @data-needs: 直播间挂载商品；isLive 表示正在讲解；上架/结束讲解走后端
export interface ConsoleProduct { id: number; name: string; price: number; stock: number; sold: number; isLive: boolean; isHot: boolean }
export const consoleProducts: ConsoleProduct[] = [
  { id: 1, name: '八字命理精讲课程', price: 199, stock: 100, sold: 58, isLive: true, isHot: true },
  { id: 2, name: '紫微斗数入门到精通', price: 299, stock: 50, sold: 32, isLive: false, isHot: false },
  { id: 3, name: '开光貔貅摆件', price: 168, stock: 15, sold: 85, isLive: false, isHot: true },
  { id: 4, name: '专业罗盘（铜制）', price: 398, stock: 8, sold: 42, isLive: false, isHot: false },
  { id: 5, name: '五帝钱套装', price: 88, stock: 3, sold: 97, isLive: false, isHot: false },
]

// @data-needs: 提词器脚本，主播预先配置；isCurrent 标记当前进度
export interface ConsoleScript { id: number; time: string; content: string; done: boolean; isCurrent?: boolean }
export const consoleScript: ConsoleScript[] = [
  { id: 1, time: '00:00', content: '开场白：欢迎各位来到今天的八字命理课堂', done: true },
  { id: 2, time: '05:00', content: '第一部分：八字的基本概念和四柱含义', done: true },
  { id: 3, time: '15:00', content: '第二部分：十天干的特性与作用关系', done: false, isCurrent: true },
  { id: 4, time: '30:00', content: '第三部分：十二地支的藏干与刑冲合害', done: false },
  { id: 5, time: '45:00', content: '第四部分：日主强弱的判断方法', done: false },
  { id: 6, time: '55:00', content: '互动环节：观众提问与命盘分析', done: false },
  { id: 7, time: '58:00', content: '结尾：课程推荐和下期预告', done: false },
]

// 优惠券选项（发放优惠券弹窗，照抄原型）
export const consoleCoupons = [
  { name: '满100减10', count: 100 },
  { name: '满200减30', count: 50 },
  { name: '课程8折券', count: 30 },
]

// ============ creator/live/obs 推流设置(竖屏,含实时推流统计) ============
export const obsStreamData = {
  serverUrl: 'rtmp://live-push.rebu.cn/live',
  streamKey: 'rebu_live_8f7d6e5c4b3a2910_1698765432',
  status: 'online', // online | offline | connecting
  duration: 3845, // 秒
  fps: 30,
  bitrate: 4500, // kbps
  resolution: '1920x1080',
  droppedFrames: 12,
  totalFrames: 115350,
}
export const obsQualityPresets = [
  { id: 'high', name: '高清 1080P', resolution: '1920x1080', bitrate: '4500-6000', fps: 30, network: '上行 ≥ 10Mbps', recommended: true, desc: '适合知识授课，画面清晰细腻' },
  { id: 'medium', name: '标清 720P', resolution: '1280x720', bitrate: '2500-4000', fps: 30, network: '上行 ≥ 5Mbps', recommended: false, desc: '适合大部分场景，兼顾清晰度与流畅度' },
  { id: 'low', name: '流畅 480P', resolution: '854x480', bitrate: '1000-2000', fps: 30, network: '上行 ≥ 2Mbps', recommended: false, desc: '网络较差时使用，保证流畅性' },
]
export const obsPageSteps = [
  { step: 1, title: '打开OBS设置', desc: '点击菜单栏「设置」或按快捷键 Ctrl+Shift+S' },
  { step: 2, title: '进入推流设置', desc: '在左侧菜单选择「推流」选项' },
  { step: 3, title: '选择服务类型', desc: '服务选择「自定义」，填入下方服务器地址' },
  { step: 4, title: '填写串流密钥', desc: '将下方串流密钥复制粘贴到对应输入框' },
  { step: 5, title: '开始推流', desc: '点击「开始推流」按钮，等待连接成功' },
]
export const obsOutputSettings = [
  { label: '输出模式', value: '高级' },
  { label: '编码器', value: 'x264 / NVENC（N卡推荐）' },
  { label: '码率控制', value: 'CBR（恒定码率）' },
  { label: '关键帧间隔', value: '2秒' },
  { label: 'CPU预设', value: 'veryfast' },
  { label: '音频采样率', value: '44.1kHz / 48kHz' },
]
export const obsPageFaq = [
  { q: '推流失败怎么办？', a: '1. 检查服务器地址和串流密钥是否正确复制\n2. 确认网络连接正常，防火墙未拦截OBS\n3. 尝试重新生成串流密钥' },
  { q: '画面卡顿如何解决？', a: '1. 降低输出分辨率和码率\n2. 检查CPU/GPU占用率，关闭不必要的程序\n3. 使用有线网络替代WiFi' },
  { q: '如何实现画中画效果？', a: '在OBS中添加「视频捕获设备」源获取摄像头画面，调整大小和位置叠加在课件画面上即可。' },
]

// ============ creator/live/theme 直播间装修(竖屏) ============
export const themeTemplates = [
  { id: 'default', name: '默认主题', desc: '简洁大气，适合日常直播', primaryColor: '#C41E3A', secondaryColor: '#C9A96E', bg1: '#2a1215', bg2: '#160b0d', preview: '📜', isFree: true, isUsing: true },
  { id: 'chinese', name: '新中式', desc: '古典韵味，国学文化氛围', primaryColor: '#DC2626', secondaryColor: '#F59E0B', bg1: '#450a0a', bg2: '#451a03', preview: '🏮', isFree: true, isUsing: false },
  { id: 'spring', name: '春节喜庆', desc: '红红火火，节日氛围拉满', primaryColor: '#EF4444', secondaryColor: '#FCD34D', bg1: '#dc2626', bg2: '#7f1d1d', preview: '🧧', isFree: false, isUsing: false },
  { id: 'mid-autumn', name: '中秋团圆', desc: '月圆人圆，温馨典雅', primaryColor: '#F59E0B', secondaryColor: '#FDE68A', bg1: '#78350f', bg2: '#431407', preview: '🌕', isFree: false, isUsing: false },
  { id: 'minimalist', name: '极简白', desc: '干净清爽，专注内容', primaryColor: '#6366F1', secondaryColor: '#818CF8', bg1: '#f1f5f9', bg2: '#e2e8f0', preview: '⬜', isFree: true, isUsing: false },
  { id: 'ink', name: '水墨风', desc: '淡雅水墨，文人气质', primaryColor: '#374151', secondaryColor: '#9CA3AF', bg1: '#292524', bg2: '#1c1917', preview: '🖋️', isFree: false, isUsing: false },
]
export const themePendants = [
  { id: 1, name: '福字', icon: '福', position: '左上', isActive: true },
  { id: 2, name: '灯笼', icon: '🏮', position: '右上', isActive: false },
  { id: 3, name: '祥云', icon: '☁️', position: '顶部', isActive: false },
  { id: 4, name: '铜钱', icon: '🪙', position: '角落', isActive: true },
]
export const themeEffects = [
  { id: 1, name: '入场特效', type: 'enter', desc: '观众进入直播间动画', icon: 'users' },
  { id: 2, name: '点赞特效', type: 'like', desc: '爱心上浮动画样式', icon: 'heart' },
  { id: 3, name: '礼物特效', type: 'gift', desc: '礼物飞屏动画', icon: 'gift' },
  { id: 4, name: '弹幕样式', type: 'danmaku', desc: '弹幕气泡外观', icon: 'sparkles' },
]
export const themeCustomColors = ['#8B5CF6', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#EC4899']
export const themeEnterStyles = [
  { name: '祥云入场', emoji: '☁️' },
  { name: '金光闪烁', emoji: '✨' },
  { name: '简约淡入', emoji: '💫' },
  { name: '烟花绽放', emoji: '🎆' },
  { name: '波纹扩散', emoji: '🌊' },
  { name: '无特效', emoji: '⬜' },
]
export const themeLikeStyles = ['❤️ 爱心', '👍 点赞', '🌸 花瓣', '⭐ 星星']
export const themeComponentStyles = [
  { icon: 'users', label: '观众列表样式', tag: '头像堆叠' },
  { icon: 'gift', label: '礼物栏样式', tag: '底部横条' },
  { icon: 'heart', label: '弹幕气泡样式', tag: '圆角气泡' },
]

// ============ creator/live/schedule 直播排期管理(竖屏) ============
// @data-needs: 排期场次列表，按 hostId 查询；今日日期由后端/客户端确定（原型固定 2026-05-10）
export interface ScheduleItem {
  id: number | string; title: string; date: string; time: string; duration: number
  type: 'knowledge' | 'commerce'; status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  seriesName: string | null; seriesIndex: number | null; seriesTotal: number | null
  viewerEstimate: number; actualViewers?: number
}
export const scheduleList: ScheduleItem[] = [
  { id: 1, title: '八字命理入门第一课：天干地支基础', date: '2026-05-12', time: '20:00', duration: 90, type: 'knowledge', status: 'scheduled', seriesName: '八字命理入门系列', seriesIndex: 1, seriesTotal: 8, viewerEstimate: 500 },
  { id: 2, title: '八字命理入门第二课：五行生克制化', date: '2026-05-14', time: '20:00', duration: 90, type: 'knowledge', status: 'scheduled', seriesName: '八字命理入门系列', seriesIndex: 2, seriesTotal: 8, viewerEstimate: 500 },
  { id: 3, title: '开光吉祥物专场直播', date: '2026-05-15', time: '19:30', duration: 120, type: 'commerce', status: 'scheduled', seriesName: null, seriesIndex: null, seriesTotal: null, viewerEstimate: 800 },
  { id: 4, title: '八字命理入门第三课：十神详解', date: '2026-05-19', time: '20:00', duration: 90, type: 'knowledge', status: 'scheduled', seriesName: '八字命理入门系列', seriesIndex: 3, seriesTotal: 8, viewerEstimate: 500 },
  { id: 5, title: '风水布局答疑专场', date: '2026-05-10', time: '20:00', duration: 60, type: 'knowledge', status: 'completed', seriesName: null, seriesIndex: null, seriesTotal: null, viewerEstimate: 300, actualViewers: 428 },
  { id: 6, title: '紫微斗数基础课', date: '2026-05-08', time: '19:00', duration: 90, type: 'knowledge', status: 'completed', seriesName: '紫微斗数入门系列', seriesIndex: 1, seriesTotal: 6, viewerEstimate: 400, actualViewers: 512 },
]
export const scheduleStatusConfig: Record<string, { label: string; dot: string; badge: string }> = {
  scheduled: { label: '待开播', dot: '#3b82f6', badge: 'rgba(59,130,246,0.1)|#2563eb|rgba(59,130,246,0.2)' },
  live: { label: '直播中', dot: '#ef4444', badge: 'rgba(239,68,68,0.1)|#dc2626|rgba(239,68,68,0.2)' },
  completed: { label: '已结束', dot: '#9ca3af', badge: 'rgba(107,114,128,0.1)|#4b5563|rgba(107,114,128,0.2)' },
  cancelled: { label: '已取消', dot: '#f97316', badge: 'rgba(249,115,22,0.1)|#ea580c|rgba(249,115,22,0.2)' },
}

// ============ creator/live/team 主播团队管理(竖屏) ============
// @data-needs: 团队成员/可添加成员/角色权限，按机构(hostId)查询
export type TeamRole = 'host' | 'cohost' | 'operator' | 'guest'
export interface TeamRoleConfig { label: string; color: string; icon: string; level: number; desc: string }
export const teamRoleConfig: Record<TeamRole, TeamRoleConfig> = {
  host: { label: '主播', color: '#ef4444', icon: 'crown', level: 1, desc: 'Owner - 最高权限' },
  cohost: { label: '副播', color: '#f97316', icon: 'mic', level: 2, desc: 'Co-Host - 开播时协助' },
  operator: { label: '场控/运营', color: '#3b82f6', icon: 'headphones', level: 3, desc: '偏重台下管理' },
  guest: { label: '嘉宾', color: '#22c55e', icon: 'users', level: 4, desc: '仅参与连麦互动' },
}
export interface TeamMember {
  id: number | string; name: string; avatar: string; role: TeamRole; expertise: string[]
  phone: string; joinDate: string; liveCount: number; hasActiveLive: boolean; status: 'online' | 'offline'
}
export const teamMembers: TeamMember[] = [
  { id: 1, name: '易道先生', avatar: 'https://api.rebugx.cn/assets/marketing/course.webp', role: 'host', expertise: ['八字命理', '紫微斗数'], phone: '138****8888', joinDate: '2024-01-15', liveCount: 56, hasActiveLive: true, status: 'online' },
  { id: 2, name: '紫微大师', avatar: 'https://api.rebugx.cn/assets/marketing/course.webp', role: 'host', expertise: ['紫微斗数', '风水堪舆'], phone: '139****6666', joinDate: '2024-02-20', liveCount: 32, hasActiveLive: false, status: 'offline' },
  { id: 3, name: '小雅助理', avatar: 'https://api.rebugx.cn/assets/marketing/course.webp', role: 'cohost', expertise: ['商品讲解', '互动管理'], phone: '137****5555', joinDate: '2024-03-10', liveCount: 28, hasActiveLive: true, status: 'online' },
  { id: 4, name: '运营小李', avatar: 'https://api.rebugx.cn/assets/marketing/course.webp', role: 'operator', expertise: ['数据分析', '活动策划'], phone: '136****4444', joinDate: '2024-04-05', liveCount: 15, hasActiveLive: false, status: 'online' },
]
export interface AvailableMember { id: number | string; name: string; avatar: string; expertise: string[]; type: 'lecturer' | 'member' }
export const teamAvailableMembers: AvailableMember[] = [
  { id: 101, name: '风水堂主', avatar: '', expertise: ['风水堪舆', '择日择吉'], type: 'lecturer' },
  { id: 102, name: '起名大师', avatar: '', expertise: ['姓名学', '五行分析'], type: 'lecturer' },
  { id: 103, name: '周易研究', avatar: '', expertise: ['周易', '梅花易数'], type: 'member' },
  { id: 104, name: '命理助手', avatar: '', expertise: ['八字入门', '流年运势'], type: 'member' },
]
export interface TeamPermission { icon: string; label: string; desc: string }
export const teamPermissions: Record<TeamRole, TeamPermission[]> = {
  host: [
    { icon: 'crown', label: '创建/编辑/删除直播', desc: '完全管理直播内容和设置' },
    { icon: 'users', label: '管理所有成员', desc: '添加、编辑、移除团队成员' },
    { icon: 'shield', label: '获取推流码', desc: '获取OBS推流地址和密钥' },
    { icon: 'mic', label: '开启/关闭直播', desc: '控制直播开始和结束' },
    { icon: 'shopping-bag', label: '推送商品', desc: '在直播间推送商品讲解' },
    { icon: 'gift', label: '发放优惠券', desc: '向观众发放优惠券' },
    { icon: 'message-square', label: '评论管理', desc: '置顶/删除评论、禁言/踢人' },
  ],
  cohost: [
    { icon: 'shopping-bag', label: '推送商品', desc: '在直播间推送商品讲解' },
    { icon: 'gift', label: '发放优惠券', desc: '向观众发放优惠券' },
    { icon: 'users', label: '发起抽奖', desc: '创建抽奖并查看中奖名单' },
    { icon: 'message-square', label: '弹幕管理', desc: '置顶/删除评论、禁言用户' },
  ],
  operator: [
    { icon: 'shield', label: '后台活动配置', desc: '配置营销活动和商品' },
    { icon: 'users', label: '直播监控', desc: '查看直播间实时数据' },
    { icon: 'message-square', label: '数据复盘', desc: '查看直播数据报告' },
  ],
  guest: [
    { icon: 'mic', label: '连麦互动', desc: '参与连麦与主播互动' },
  ],
}

// ============ creator/live/analytics/[id] 直播数据复盘(竖屏) ============
// @data-needs: 按直播场次id查询全部统计数据
export const analyticsLiveInfo = {
  id: '1',
  title: '八字命理入门：如何快速解读四柱八字',
  type: 'knowledge',
  startTime: '2024-01-15 19:00',
  endTime: '2024-01-15 21:35',
  duration: '2小时35分钟',
  status: 'ended',
}
export interface CoreStat { label: string; value: string; change: string; trend: 'up' | 'down' | 'flat'; icon: string }
export const analyticsCoreStats: CoreStat[] = [
  { label: '总观看人数', value: '12,580', change: '+23%', trend: 'up', icon: 'eye' },
  { label: '峰值在线', value: '3,256', change: '+15%', trend: 'up', icon: 'users' },
  { label: '平均观看时长', value: '18分32秒', change: '+8%', trend: 'up', icon: 'clock' },
  { label: '新增关注', value: '428', change: '+45%', trend: 'up', icon: 'heart' },
  { label: '加入圈子', value: '156', change: '+32%', trend: 'up', icon: 'target' },
  { label: '打赏收入', value: '¥2,680', change: '+18%', trend: 'up', icon: 'gift' },
]
export const analyticsTrafficData = [
  { time: '19:00', value: 120 }, { time: '19:15', value: 580 }, { time: '19:30', value: 1200 },
  { time: '19:45', value: 2100 }, { time: '20:00', value: 2850 }, { time: '20:15', value: 3256 },
  { time: '20:30', value: 2980 }, { time: '20:45', value: 2650 }, { time: '21:00', value: 2200 },
  { time: '21:15', value: 1800 }, { time: '21:30', value: 1200 },
]
export const analyticsKeyMoments = [
  { time: '19:05', event: '直播开始', desc: '120人进入直播间' },
  { time: '20:15', event: '峰值在线', desc: '在线人数达到3256人，正在讲解八字排盘基础' },
  { time: '20:45', event: '互动高峰', desc: '弹幕数量达到峰值，观众提问活跃' },
  { time: '21:30', event: '直播结束', desc: '累计观看12580人，平均时长18分32秒' },
]
export const analyticsAudience = {
  gender: [
    { label: '男性', value: 42, color: '#3b82f6' },
    { label: '女性', value: 55, color: '#ec4899' },
    { label: '未知', value: 3, color: '#9ca3af' },
  ],
  age: [
    { label: '18-24', value: 15 }, { label: '25-34', value: 38 }, { label: '35-44', value: 28 },
    { label: '45-54', value: 14 }, { label: '55+', value: 5 },
  ],
  region: [
    { name: '广东', value: 18 }, { name: '北京', value: 15 }, { name: '浙江', value: 12 },
    { name: '江苏', value: 10 }, { name: '上海', value: 8 }, { name: '其他', value: 37 },
  ],
  source: [
    { label: '首页推荐', value: 35, icon: '🏠' }, { label: '关注列表', value: 28, icon: '❤️' },
    { label: '直播广场', value: 18, icon: '📺' }, { label: '分享链接', value: 12, icon: '🔗' },
    { label: '搜索', value: 7, icon: '🔍' },
  ],
}
export const analyticsInteraction = {
  danmaku: 8650, likes: 58600, comments: 1280, shares: 456,
  gifts: [
    { name: '太极', count: 2580, amount: 2580 }, { name: '梅花', count: 156, amount: 1560 },
    { name: '竹简', count: 28, amount: 1456 }, { name: '罗盘', count: 12, amount: 1188 },
  ],
}
export const analyticsWordCloud = [
  { word: '八字', size: 48, color: '#C41E3A' }, { word: '命理', size: 40, color: '#8b5cf6' },
  { word: '四柱', size: 36, color: '#3b82f6' }, { word: '干货', size: 32, color: '#f59e0b' },
  { word: '老师好', size: 36, color: '#22c55e' }, { word: '学到了', size: 40, color: '#ec4899' },
  { word: '感谢', size: 32, color: '#06b6d4' }, { word: '收藏', size: 28, color: '#f97316' },
  { word: '精彩', size: 32, color: '#ef4444' }, { word: '厉害', size: 28, color: '#6366f1' },
]
export const analyticsProductStats = [
  { id: 1, name: '渊海子平精装版', clicks: 3560, orders: 128, amount: 6272, conversion: 3.6 },
  { id: 2, name: '专业罗盘', clicks: 2890, orders: 45, amount: 8910, conversion: 1.6 },
  { id: 3, name: '五帝钱套装', clicks: 2150, orders: 89, amount: 3382, conversion: 4.1 },
]
export const analyticsReplay = {
  playCount: 2580, playDuration: '平均12分钟', revenue: 0, isPublic: true, isPaid: false,
}

// ============ 直播评价(live/reviews) ============
// @data-needs: 评价筛选项, 返回 ReviewFilter[]
export interface LiveReviewFilter { key: string; label: string }
export const liveReviewFilters: LiveReviewFilter[] = [
  { key: 'all', label: '全部' },
  { key: '5', label: '5星' },
  { key: '4', label: '4星' },
  { key: '3', label: '3星及以下' },
  { key: 'pending', label: '待回复' },
  { key: 'replied', label: '已回复' },
]
// @data-needs: 评分分布, 返回 ReviewDist[]
export interface LiveReviewDist { star: number; pct: number; count: number }
export const liveReviewDist: LiveReviewDist[] = [
  { star: 5, pct: 72, count: 184 },
  { star: 4, pct: 18, count: 46 },
  { star: 3, pct: 6, count: 15 },
  { star: 2, pct: 2, count: 6 },
  { star: 1, pct: 2, count: 4 },
]
// @data-needs: 直播评价列表, 参数 filter, 返回 LiveReview[]
export interface LiveReview {
  id: string
  user: string
  avatar: string
  rating: number
  content: string
  live: string
  time: string
  reply: string | null
  flagged: boolean
}
export const liveReviews: LiveReview[] = [
  { id: '1', user: '山河客', avatar: '', rating: 5, content: '讲得非常细致，八字命盘分析深入浅出，对我帮助很大！', live: '八字命理精讲第12课', time: '2天前', reply: '感谢支持！希望对你有所帮助。', flagged: false },
  { id: '2', user: '星空旅人', avatar: '', rating: 5, content: '老师解盘思路清晰，案例丰富，值得反复观看。', live: '紫微斗数专题', time: '3天前', reply: null, flagged: false },
  { id: '3', user: '云上墨', avatar: '', rating: 4, content: '内容很好，就是有些地方讲得稍快，建议放慢一点。', live: '紫微斗数专题', time: '4天前', reply: '感谢建议，后续会注意节奏。', flagged: false },
  { id: '4', user: '问道者', avatar: '', rating: 3, content: '普通，没太多新意，期望更深入的内容。', live: '奇门遁甲入门', time: '5天前', reply: null, flagged: false },
  { id: '5', user: '墨言先生', avatar: '', rating: 5, content: '这是我看过的最好的命理直播，强烈推荐！', live: '风水堂第8课', time: '1周前', reply: null, flagged: false },
]

// ============ 直播设置(live/settings) ============
// @data-needs: 通知设置项, 返回 SettingToggle[]
export interface LiveSettingToggle { key: string; label: string; desc: string }
export const liveNotifyKeys: LiveSettingToggle[] = [
  { key: 'newViewer', label: '新观众进入', desc: '有新观众进入直播间时通知' },
  { key: 'reward', label: '打赏提醒', desc: '收到打赏时通知' },
  { key: 'comment', label: '评论提醒', desc: '新评论时通知' },
  { key: 'order', label: '带货成交', desc: '带货商品成交时通知' },
]
export const livePrivacyKeys: LiveSettingToggle[] = [
  { key: 'allowComment', label: '允许评论', desc: '观众可在直播中发表评论' },
  { key: 'allowGift', label: '允许打赏', desc: '观众可在直播中打赏' },
  { key: 'showViewCount', label: '显示观看人数', desc: '在直播间展示观看人数' },
  { key: 'autoRecord', label: '自动录制回放', desc: '直播结束后自动生成回放' },
]
// @data-needs: 直播间资料, 返回 LiveSettingProfile
export const liveSettingProfile = {
  name: '国学命理讲堂',
  desc: '专注八字、紫微、奇门等传统命理学的讲解与传播',
  cover: 'https://api.rebugx.cn/assets/marketing/course.webp',
}
export const liveSettingNotifyDefault = { newViewer: true, reward: true, comment: false, order: true }
export const liveSettingPrivacyDefault = { allowComment: true, allowGift: true, showViewCount: true, autoRecord: true }

// ============ 带货商品(live/products) ============
// @data-needs: 商品筛选项, 返回 ProductFilter[]
export interface LiveProductFilter { key: string; label: string }
export const liveProductFilters: LiveProductFilter[] = [
  { key: 'all', label: '全部' },
  { key: 'on', label: '已上架' },
  { key: 'off', label: '已下架' },
]
// @data-needs: 带货商品列表, 参数 filter+search, 返回 LiveProduct[]
export interface LiveProductItem {
  id: string
  name: string
  price: number
  stock: number
  sold: number
  cover: string
  status: 'on' | 'off'
}
// 本场已配商品（GET /live/rooms/:id 关联 productId → /shop/products/:id 充实）
export interface LiveConfiguredProduct {
  id: string
  name: string
  price: number
  stock: number
  sold: number
  cover: string
}
// 选品层商品池（GET /shop/products?status=ON_SALE 平台在售商品）
export interface LivePickerProduct {
  id: string
  name: string
  price: number
  cover: string
}
export const liveProducts: LiveProductItem[] = [
  { id: '1', name: '《渊海子平》精装典藏版', price: 168, stock: 200, sold: 86, cover: 'https://api.rebugx.cn/assets/marketing/course.webp', status: 'on' },
  { id: '2', name: '紫微斗数入门教程（平装）', price: 88, stock: 150, sold: 142, cover: 'https://api.rebugx.cn/assets/marketing/course.webp', status: 'on' },
  { id: '3', name: '八字命盘分析工具书', price: 128, stock: 0, sold: 320, cover: 'https://api.rebugx.cn/assets/marketing/course.webp', status: 'off' },
  { id: '4', name: '纯铜罗盘（专业款）', price: 480, stock: 15, sold: 28, cover: 'https://api.rebugx.cn/assets/marketing/luopan.webp', status: 'on' },
  { id: '5', name: '手抄本《周易参同契》', price: 240, stock: 8, sold: 45, cover: 'https://api.rebugx.cn/assets/marketing/course.webp', status: 'off' },
]

// ============ 直播收益(live/earnings) ============
// @data-needs: 收益时间范围统计, 返回 Record<Range, EarningStats>
export interface LiveEarningRange { key: string; label: string }
export const liveEarningRanges: LiveEarningRange[] = [
  { key: '7d', label: '近7天' },
  { key: '30d', label: '近30天' },
  { key: '90d', label: '近90天' },
]
export interface LiveEarningStats { total: number; reward: number; goods: number; trend: number }
export const liveEarningStatsByRange: Record<string, LiveEarningStats> = {
  '7d': { total: 3680, reward: 1280, goods: 2400, trend: 12.5 },
  '30d': { total: 18600, reward: 5400, goods: 13200, trend: 8.3 },
  '90d': { total: 52400, reward: 14800, goods: 37600, trend: -2.1 },
}
// @data-needs: 收益明细列表, 参数 typeFilter, 返回 LiveEarningRecord[]
export interface LiveEarningRecord {
  id: string
  date: string
  type: 'reward' | 'goods'
  desc: string
  amount: number
  live: string
}
export const liveEarningRecords: LiveEarningRecord[] = [
  { id: '1', date: '2024-01-15', type: 'reward', desc: '用户「星空」打赏', amount: 520, live: '八字命理精讲第12课' },
  { id: '2', date: '2024-01-15', type: 'goods', desc: '带货成交：《渊海子平》', amount: 168, live: '八字命理精讲第12课' },
  { id: '3', date: '2024-01-14', type: 'goods', desc: '带货成交：紫微斗数入门', amount: 88, live: '紫微斗数专题' },
  { id: '4', date: '2024-01-14', type: 'reward', desc: '用户「山河」打赏', amount: 200, live: '紫微斗数专题' },
  { id: '5', date: '2024-01-13', type: 'reward', desc: '用户「云上」打赏', amount: 360, live: '奇门遁甲入门' },
  { id: '6', date: '2024-01-12', type: 'goods', desc: '带货成交：铜制罗盘', amount: 480, live: '风水堂第8课' },
  { id: '7', date: '2024-01-12', type: 'reward', desc: '用户「墨言」打赏', amount: 100, live: '风水堂第8课' },
  { id: '8', date: '2024-01-11', type: 'goods', desc: '带货成交：手抄本', amount: 240, live: '八字命理精讲第11课' },
]

// ============ 直播管理首页(creator/live) ============
// @data-needs: 直播管理数据概览, 返回 LiveManageStat[]
export interface LiveManageStat {
  id: number
  label: string
  value: string
  unit: string
  icon: string
  color: string
}
export const liveManageStats: LiveManageStat[] = [
  { id: 1, label: '本月直播', value: '12', unit: '场', icon: 'video', color: 'linear-gradient(135deg, #3b82f6, #6366f1)' },
  { id: 2, label: '累计观看', value: '8.6', unit: '万', icon: 'eye', color: 'linear-gradient(135deg, #a855f7, #8b5cf6)' },
  { id: 3, label: '新增粉丝', value: '1,280', unit: '', icon: 'users', color: 'linear-gradient(135deg, #ec4899, #f43f5e)' },
]

// @data-needs: 直播管理列表, 参数 tab(all|preview|live|ended|draft), 返回 LiveManageItem[]
export interface LiveManageItem {
  id: number | string
  title: string
  cover: string // 封面（9:16 小图）
  type: 'knowledge' | 'commerce'
  status: 'preview' | 'live' | 'ended' | 'draft'
  orientation: 'portrait' | 'landscape' // 竖屏 / OBS横屏（场次卡形态标签）
  quality: string // 画质档 basic|hd|uhd
  priceType: 'free' | 'paid'
  price: number // 付费金额（元）
  replayUrl: string // 已结束有回放时展示「查看回放」
  scheduledTime: string
  duration: string
  viewers: number
  peakViewers: number
  income: number
  likes: number
  previewCount?: number
  selfOnly?: boolean // 机审降级仅自己可见（管理列表灰色小标·点击看说明与申诉指引）
  removed?: boolean // 严重违规已下架
}
// 兜底展示样例（getManageList 走真实 my-rooms，异常仅回退空列表，此常量不用于线上渲染）
const _mDefault = { cover: '', orientation: 'portrait' as const, quality: 'basic', priceType: 'free' as const, price: 0, replayUrl: '' }
export const liveManageList: LiveManageItem[] = [
  { id: 1, title: '八字命理入门：如何快速解读四柱八字', ..._mDefault, type: 'knowledge', status: 'live', scheduledTime: '2024-01-15 20:00', duration: '进行中', viewers: 1258, peakViewers: 2100, income: 680, likes: 3200 },
  { id: 2, title: '开光貔貅专场：招财转运好物推荐', ..._mDefault, type: 'commerce', status: 'preview', scheduledTime: '2024-01-16 19:30', duration: '-', viewers: 0, peakViewers: 0, income: 0, likes: 0, previewCount: 328 },
  { id: 3, title: '紫微斗数命盘实战解析', ..._mDefault, type: 'knowledge', status: 'ended', scheduledTime: '2024-01-14 20:00', duration: '2小时15分', viewers: 5680, peakViewers: 3200, income: 1280, likes: 8900 },
]

export const liveManageTabs = [
  { key: 'all', label: '全部' },
  { key: 'preview', label: '待开播' },
  { key: 'live', label: '直播中' },
  { key: 'ended', label: '已结束' },
]
export const liveManageStatusConfig: Record<string, { label: string; color: string }> = {
  preview: { label: '待开播', color: '#3b6fd4' },
  live: { label: '直播中', color: '#C41E3A' },
  ended: { label: '已结束', color: '#9ca3af' },
  draft: { label: '草稿', color: '#d99423' },
}

// ============ API 层 ============

/* —— 后端原始响应类型（容错适配用，字段宽松，仅声明 adapter 实际访问到的字段；不 export） —— */
interface RawLiveUser { nickname?: string; avatar?: string }
/** 后端直播间原始响应 */
interface RawLiveRoom {
  id?: string
  title?: string
  cover?: string | null
  user?: RawLiveUser | null
  viewCount?: number
  status?: string
  chargeType?: string
  chargePrice?: number | string | null
  startTime?: string
  endTime?: string
  hasProducts?: boolean
  productCount?: number // my-rooms 返回：本场商品数
  orientation?: string | null // my-rooms 返回：portrait 竖屏 / landscape OBS横屏
  quality?: string | null // my-rooms 返回：画质档 basic|hd|uhd
  replayUrl?: string | null // my-rooms 返回：已结束有回放时
  selfOnly?: boolean // my-rooms 返回：机审降级仅自己可见
  removed?: boolean // my-rooms 返回：严重违规已下架
  _count?: { products?: number } | null
}
/** GET /live/rooms/:id 详情（getRoom·含 imGroupId/products 关联/主播资料） */
interface RawLiveRoomDetail extends RawLiveRoom {
  imGroupId?: string | null
  hostUserId?: string
  likeCount?: number
  circleId?: string | null // 发起直播的圈子（佣-V2-P3 内容场景归因：直播购买佣金归圈子）
  user?: (RawLiveUser & { id?: string }) | null
  products?: { id?: string; productId?: string }[] | null
  quality?: string | null // 画质档位 basic|hd|uhd（C5 分档）
  replayUrl?: string | null // 回放地址（ENDED/REPLAY 态有回放时返回）
  replayChapters?: { t?: number; title?: string }[] | null // #21 回放章节点（主播标注·[{t 秒, title}]）
  circle?: { id?: string; name?: string } | null // 圈子关联（观看页展示「来自圈子」）
}
/** GET /shop/products/:id 精简形状（直播带货商品充实用·仅声明访问到的字段） */
interface RawLiveShopProduct {
  id?: string; title?: string; price?: number | string; originalPrice?: number | string | null
  effectivePrice?: number | string; images?: string[]; cover?: string | null; stock?: number; salesCount?: number
}
/** GET /live/gifts 单项（Gift 模型：priceCoin→前端 price·level 档位） */
interface RawGift { id?: string; name?: string; icon?: string | null; priceCoin?: number; level?: string }
/** GET /live/rooms/:id/slides 单项（LiveSlide：url→thumbnail） */
interface RawLiveSlide { id?: string; title?: string; url?: string; type?: string; sortOrder?: number }
/** GET /coin/balance */
interface RawCoinBalance { balance?: number }
/** GET /live/rooms/:id/gift-ranking 单项 */
interface RawGiftRankItem { userId?: string; nickname?: string; avatar?: string; totalCoin?: number }
/** GET /live/quality-packages 单项 */
interface RawQualityPackage { id?: string; name?: string; quality?: string; minutes?: number; priceCoin?: number; priceYuan?: number | string }
/** GET /live/rooms 列表（裸数组或包装对象） */
interface RawLiveRoomList { rooms?: RawLiveRoom[]; data?: RawLiveRoom[] }
/** GET /live/my-rooms 经营聚合 */
interface RawMyRoomsStats { monthCount?: number; totalViews?: number; endedCount?: number }
interface RawMyRooms { stats?: RawMyRoomsStats; rooms?: RawLiveRoom[] }
/** 主播/回放列表包装（Array.isArray 守卫在运行时处理裸数组分支） */
interface RawHostsResp { items?: LiveHost[] }
interface RawReplaysResp { items?: LiveReplay[] }
/** 回放首页条目原始响应 */
interface RawReplayHomeItem {
  id?: string | number; title?: string; cover?: string
  hostName?: string; hostAvatar?: string; duration?: number | string
  viewers?: number | string; category?: string
}
/** GET /live/end/:id */
interface RawEndRoom {
  id?: string | number; title?: string; cover?: string
  hostName?: string; hostAvatar?: string; hostFollowers?: number | string
  tags?: string[]; viewerCount?: number | string; peakViewers?: number | string
  likeCount?: number | string; giftCoin?: number | string; duration?: number | string
  hasReplay?: boolean
}
interface RawEndResp { room?: RawEndRoom; recommendLives?: LiveEndRecommendLive[]; recommendCourses?: typeof liveEndRecommendCourses }
/** GET /live/console/:id */
interface RawConsole {
  title?: string; stats?: typeof consoleLiveStats; danmaku?: ConsoleDanmaku[]
  requests?: ConsoleConnectRequest[]; products?: ConsoleProduct[]; script?: ConsoleScript[]
}
/** GET /live/stream-config */
interface RawStreamConfig {
  roomId?: string; roomTitle?: string; streamUrl?: string; streamKey?: string; playUrl?: string
  recommendedSettings?: { resolution?: string; bitrate?: string; fps?: number | string; encoder?: string } | null
}
/** GET /live/team */
interface RawTeam { members?: TeamMember[]; available?: AvailableMember[] }
/** GET /live/settings */
interface RawLiveSettings { profile?: typeof liveSettingProfile; notify?: typeof liveSettingNotifyDefault; privacy?: typeof liveSettingPrivacyDefault }
/** GET /live/earnings */
interface RawEarnings { ranges?: LiveEarningRange[]; stats?: LiveEarningStats; records?: LiveEarningRecord[] }
/** GET /live/reviews */
interface RawReviews { dist?: LiveReviewDist[]; reviews?: LiveReview[] }
/* —— 直播数据复盘 getAnalytics 的后端多端点原始响应 —— */
interface RawDashboardOverview {
  title?: string; startTime?: string; viewCount?: number; peakOnline?: number
  gmv?: number; orderCount?: number; commentCount?: number
  totalGiftCoin?: number; giftCount?: number; status?: string
}
/** 分钟趋势点（用于算术/比较，数值字段声明为 number） */
interface RawTrendPoint { minute: string; online: number; orders: number; gmv: number }
interface RawDashboardTrends { trends?: RawTrendPoint[] }
/** 带货商品聚合（revenue/sales 用于算术/排序，声明为 number 避免 possibly-undefined） */
interface RawDashboardProduct { productId?: string | number; title?: string; sales: number; revenue: number }
interface RawDashboardProducts { products?: RawDashboardProduct[] }
interface RawGiftByType { name: string; count: number; totalCoin: number }
interface RawInteractions { giftsByType?: RawGiftByType[] }
interface RawReportSummary { avgOnline?: number; durationMinutes?: number; totalComments?: number; totalLikes?: number }
interface RawReport { summary?: RawReportSummary }
interface RawCompare { changes?: Record<string, string>; previous?: unknown }
interface RawAudience { gender?: string }

/** 后端 LiveStatus（WAITING/LIVING/ENDED/REPLAY）→ 前端（live/upcoming/replay） */
function mapLiveStatus(s: string): LiveStatus {
  const u = String(s || '').toUpperCase()
  if (u === 'LIVING') return 'live'
  if (u === 'WAITING') return 'upcoming'
  return 'replay' // ENDED / REPLAY
}
/** 开播时间 ISO → 友好格式「M月D日 H:mm」 */
function fmtLiveTime(iso?: string): string | undefined {
  if (!iso) return undefined
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return undefined
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${mm}`
}

/** 后端直播间 → 前端 LiveItem（type/orientation 后端无→默认；价格按 chargeType） */
function adaptLiveItem(r: RawLiveRoom): LiveItem {
  return {
    id: r.id || '',
    title: r.title || '',
    cover: r.cover || '',
    hostName: r.user?.nickname || '',
    hostAvatar: r.user?.avatar || '',
    viewerCount: r.viewCount ?? 0,
    type: 'knowledge',
    status: mapLiveStatus(r.status || ''),
    orientation: 'horizontal',
    priceType: (r.chargeType && String(r.chargeType).toUpperCase() !== 'FREE') ? 'paid' : 'free',
    price: r.chargePrice != null ? Number(r.chargePrice) : undefined,
    productCount: r._count?.products ?? undefined,
    scheduledTime: fmtLiveTime(r.startTime),
    scheduledAtRaw: r.startTime || undefined,
  }
}

/** 后端礼物 Gift → 前端 LiveGift（priceCoin→price；icon 后端可空） */
function adaptGift(g: RawGift): LiveGift {
  return { id: g.id || '', name: g.name || '', icon: g.icon || '', price: Number(g.priceCoin) || 0 }
}

export const liveApi = {
  /**
   * 获取观众拉流地址 — GET /live/rooms/:id/play-url
   * 返回 { flv, hls }：flv 低延时(2-3s·小程序/App live-player + H5 flv.js)，hls 兜底。
   * 后端仅在直播 LIVING 时返回，未开播/已结束会抛错 → 交页面按未直播态处理。
   */
  async getPlayUrl(roomId: string): Promise<{ flv: string; hls: string }> {
    return await apiGet<{ flv: string; hls: string }>(`/live/rooms/${roomId}/play-url`)
  },

  /** 直播广场列表 — GET /live/rooms（适配）；tab 客户端过滤 */
  async getPlaza(tab?: string): Promise<LiveItem[]> {
    try {
      const res = await apiGet<RawLiveRoom[] | RawLiveRoomList>('/live/rooms?pageSize=30')
      const arr: RawLiveRoom[] = Array.isArray(res) ? res : (res?.rooms ?? res?.data ?? [])
      let items: LiveItem[] = arr.map(adaptLiveItem)
      if (tab && tab !== '全部') {
        const typeMap: Record<string, string> = { '知识授课': 'knowledge', '电商带货': 'commerce' }
        const t = typeMap[tab]
        if (t) items = items.filter((i) => i.type === t)
        else if (tab === '关注的') items = []
      }
      return items.length ? items : liveList
    } catch {
      return liveList
    }
  },

  /** 直播间详情 — GET /live/rooms/:id（适配） */
  async getWatch(id: string): Promise<LiveItem | undefined> {
    try {
      return adaptLiveItem(await apiGet<RawLiveRoom>(`/live/rooms/${id}`))
    } catch {
      return liveList.find(item => item.id === id)
    }
  },

  /** 主播列表 — GET /live/hosts（后端结构已对齐 LiveHost） */
  async getHosts(filter?: string): Promise<LiveHost[]> {
    try {
      const url = filter ? `/live/hosts?filter=${encodeURIComponent(filter)}` : '/live/hosts'
      const res = await apiGet<RawHostsResp>(url)
      const arr = res?.items ?? (Array.isArray(res) ? res : [])
      return (arr.length ? arr : liveHosts) as LiveHost[]
    } catch {
      return liveHosts
    }
  },

  /** 回放列表 — GET /live/replays（后端结构已对齐 LiveReplay） */
  async getReplays(sort?: string): Promise<LiveReplay[]> {
    try {
      const url = sort ? `/live/replays?sort=${encodeURIComponent(sort)}` : '/live/replays'
      const res = await apiGet<RawReplaysResp>(url)
      const arr = res?.items ?? (Array.isArray(res) ? res : [])
      return (arr.length ? arr : liveReplays) as LiveReplay[]
    } catch {
      return liveReplays
    }
  },

  /** 获取回放详情 — GET /live/replay/:id */
  async getReplayDetail(id: string): Promise<ReplayDetail> {
    try {
      return await apiGet<ReplayDetail>(`/live/replay/${id}`)
    } catch {
      return replayDetail
    }
  },

  /** 获取回放首页数据 — GET /live/replay-home */
  async getReplayHome(): Promise<{
    categories: ReplayCategory[]; hotItems: ReplayHomeItem[]; list: ReplayHomeItem[]; hotSearches: string[]
  }> {
    // 后端无 replay-home 聚合端点、回放也无分类维度 → 用 GET /live/replays 组合「最新+热门」，分类不做假筛选
    const toItem = (r: RawReplayHomeItem): ReplayHomeItem => ({
      id: String(r?.id || ''), title: r?.title || '', cover: r?.cover || '',
      hostName: r?.hostName || '', hostAvatar: r?.hostAvatar || '',
      duration: Number(r?.duration) || 0, views: Number(r?.viewers) || 0,
      category: r?.category || '', isHot: false,
    })
    const [latest, popular] = await Promise.all([
      apiGet<{ items?: RawReplayHomeItem[] }>('/live/replays').catch(() => ({ items: [] as RawReplayHomeItem[] })),
      apiGet<{ items?: RawReplayHomeItem[] }>('/live/replays?sortBy=popular').catch(() => ({ items: [] as RawReplayHomeItem[] })),
    ])
    const list = (Array.isArray(latest?.items) ? latest.items : []).map(toItem)
    const hotItems = (Array.isArray(popular?.items) ? popular.items : []).slice(0, 5).map((r: RawReplayHomeItem) => ({ ...toItem(r), isHot: true }))
    return {
      categories: [], // 后端回放无分类维度 → 不做假分类筛选（页面分类区随之隐藏）
      hotItems,
      list,
      hotSearches: replayHotSearches, // 搜索热词为运营配置（非数据 mock）
    }
  },

  /** 获取直播预告 — GET /live/preview/:id */
  async getPreview(id: string): Promise<LivePreviewRoom> {
    try {
      return await apiGet<LivePreviewRoom>(`/live/preview/${id}`)
    } catch {
      return livePreviewRoom
    }
  },

  /** 获取直播结束数据 — GET /live/end/:id（真连，含真实峰值/获赞/打赏聚合） */
  async getEndRoom(id: string): Promise<{
    room: LiveEndRoom; recommendLives: LiveEndRecommendLive[]; recommendCourses: typeof liveEndRecommendCourses
  }> {
    const data = await apiGet<RawEndResp>(`/live/end/${id}`)
    const r: RawEndRoom = data?.room || {}
    const room: LiveEndRoom = {
      id: String(r.id || ''),
      title: r.title || '',
      cover: r.cover || '',
      hostId: '', // 后端 end 未返回 hostId
      hostName: r.hostName || '',
      hostAvatar: r.hostAvatar || '',
      hostFollowers: Number(r.hostFollowers) || 0, // 后端无 → 0（页面降级隐藏）
      tags: Array.isArray(r.tags) ? r.tags : [], // 后端无 → 空（页面 v-for 不渲染）
      stats: {
        totalViewers: Number(r.viewerCount) || 0,
        peakViewers: Number(r.peakViewers) || 0,
        totalLikes: Number(r.likeCount) || 0,
        totalGifts: Number(r.giftCoin) || 0, // 打赏金币总额（label「礼物收入」）
        duration: Number(r.duration) || 0,
      },
      hasReplay: !!r.hasReplay,
    }
    return {
      room,
      // 推荐位后端暂无数据源 → 空（页面 section 降级隐藏）
      recommendLives: Array.isArray(data?.recommendLives) ? data.recommendLives : [],
      recommendCourses: Array.isArray(data?.recommendCourses) ? data.recommendCourses : [],
    }
  },

  /** 获取创建直播分类 — GET /live/categories */
  async getCategories(): Promise<LiveCategory[]> {
    // 直播分类为前端运营配置（后端无分类模型），非数据 mock
    return liveCreateCategories
  },

  /** 创建直播间 — POST /live/rooms（预约直播，status=WAITING；quality 画质档 basic/hd/uhd；orientation 开播方式 portrait=手机竖屏/landscape=OBS横屏；visibility 开放范围 CIRCLE_ONLY=仅本圈默认/PLATFORM=全平台·创建即生效，机审后台异步；productIds 带货商品挂车，后端落 LiveProduct 关联表） */
  async createRoom(payload: { circleId?: string; title: string; cover?: string; startTime?: string; chargeType?: string; chargePrice?: number; quality?: string; orientation?: 'portrait' | 'landscape'; visibility?: 'CIRCLE_ONLY' | 'PLATFORM'; productIds?: string[] }): Promise<{ id: string }> {
    return await apiPost<{ id: string }>('/live/rooms', payload)
  },

  /** 开始直播（房主本人或管理员） — PUT /live/rooms/:id/start（后端生成推拉流地址+建 IM 弹幕群） */
  async startLive(roomId: string): Promise<{ id: string; status?: string; imGroupId?: string }> {
    return await apiPut<{ id: string; status?: string; imGroupId?: string }>(`/live/rooms/${roomId}/start`)
  },

  /** 结束直播（房主本人或管理员） — PUT /live/rooms/:id/end */
  async endLive(roomId: string): Promise<{ id: string; status?: string }> {
    return await apiPut<{ id: string; status?: string }>(`/live/rooms/${roomId}/end`)
  },

  /** 删除直播间（房主本人或管理员） — DELETE /live/rooms/:id */
  async deleteRoom(roomId: string): Promise<void> {
    await apiDelete(`/live/rooms/${roomId}`)
  },

  /** 禁言用户（房主或管理员） — POST /live/rooms/:id/mute */
  async muteUser(roomId: string, userId: string, durationMinutes?: number): Promise<void> {
    await apiPost(`/live/rooms/${roomId}/mute`, { userId, ...(durationMinutes ? { durationMinutes } : {}) })
  },

  /** 解除禁言 — DELETE /live/rooms/:id/mute/:userId */
  async unmuteUser(roomId: string, userId: string): Promise<void> {
    await apiDelete(`/live/rooms/${roomId}/mute/${userId}`)
  },

  /** 回复直播评价（仅房主） — POST /live/reviews/:id/reply */
  async replyReview(reviewId: string, reply: string): Promise<void> {
    await apiPost(`/live/reviews/${reviewId}/reply`, { reply })
  },

  // ───────── 关注主播（复用平台用户关注端点·与短视频批同一套）─────────

  /** 是否已关注主播 — GET /users/:id/is-following */
  async isFollowingHost(userId: string): Promise<boolean> {
    const res = await apiGet<{ isFollowing?: boolean; following?: boolean }>(`/users/${userId}/is-following`)
    return !!(res?.isFollowing ?? res?.following)
  },

  /** 关注主播 — POST /users/:id/follow */
  async followHost(userId: string): Promise<void> {
    await apiPost(`/users/${userId}/follow`)
  },

  /** 取关主播 — DELETE /users/:id/follow */
  async unfollowHost(userId: string): Promise<void> {
    await apiDelete(`/users/${userId}/follow`)
  },

  // ───────── 画质分档商业化（C5·时长包/额度）─────────

  /** 时长包列表 — GET /live/quality-packages（公开） */
  async getQualityPackages(): Promise<LiveQualityPackage[]> {
    const arr = await apiGet<RawQualityPackage[]>('/live/quality-packages')
    return (Array.isArray(arr) ? arr : []).map((p) => ({
      id: p.id || '', name: p.name || '', quality: (p.quality === 'uhd' ? 'uhd' : 'hd'),
      minutes: Number(p.minutes) || 0, priceCoin: Number(p.priceCoin) || 0,
      priceYuan: Number(p.priceYuan) || 0,
    }))
  },

  /** 我的画质额度 — GET /live/quota（高清/超清剩余分钟；未登录抛错交页面三态） */
  async getQuota(): Promise<LiveQuota> {
    const q = await apiGet<{ hdMinutes?: number; uhdMinutes?: number }>('/live/quota')
    return { hdMinutes: Number(q?.hdMinutes) || 0, uhdMinutes: Number(q?.uhdMinutes) || 0 }
  },

  /** 购买时长包 — POST /live/quality-packages/:id/purchase（返回购买后额度） */
  async purchaseQualityPackage(packageId: string): Promise<LiveQuota> {
    const q = await apiPost<{ hdMinutes?: number; uhdMinutes?: number }>(`/live/quality-packages/${packageId}/purchase`)
    return { hdMinutes: Number(q?.hdMinutes) || 0, uhdMinutes: Number(q?.uhdMinutes) || 0 }
  },

  /** 获取直播管理列表 — GET /live/manage */
  async getManageList(): Promise<{ stats: LiveManageStat[]; list: LiveManageItem[] }> {
    // 经营概览（真实聚合，无运行数据则为 0；后端 GET /live/my-rooms BFF）
    const buildStats = (s?: { monthCount?: number; totalViews?: number; endedCount?: number }): LiveManageStat[] => {
      const views = s?.totalViews ?? 0
      const viewsLabel = views >= 10000 ? (views / 10000).toFixed(1) + '万' : String(views)
      return [
        { id: 1, label: '本月直播', value: String(s?.monthCount ?? 0), unit: '场', icon: 'video', color: 'linear-gradient(135deg, #3b82f6, #6366f1)' },
        { id: 2, label: '累计观看', value: viewsLabel, unit: '', icon: 'eye', color: 'linear-gradient(135deg, #a855f7, #8b5cf6)' },
        { id: 3, label: '已结束', value: String(s?.endedCount ?? 0), unit: '场', icon: 'check-circle', color: 'linear-gradient(135deg, #ec4899, #f43f5e)' },
      ]
    }
    // 后端直播状态 → 前端管理页状态（后端无「草稿」概念）
    const statusMap: Record<string, LiveManageItem['status']> = { WAITING: 'preview', LIVING: 'live', ENDED: 'ended', REPLAY: 'ended' }
    const adapt = (r: RawLiveRoom): LiveManageItem => {
      const status = statusMap[r.status || ''] || 'ended'
      let duration = '-'
      if (status === 'live') duration = '进行中'
      else if (r.startTime && r.endTime) {
        const mins = Math.round((new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 60000)
        if (mins > 0) duration = mins >= 60 ? `${Math.floor(mins / 60)}小时${mins % 60}分` : `${mins}分钟`
      }
      const price = Number(r.chargePrice ?? 0)
      return {
        id: r.id || '',
        title: r.title || '',
        cover: r.cover || '',
        type: r.hasProducts ? 'commerce' : 'knowledge',
        status,
        orientation: r.orientation === 'landscape' ? 'landscape' : 'portrait',
        quality: r.quality || 'basic',
        priceType: r.chargeType === 'PAID' && price > 0 ? 'paid' : 'free',
        price,
        replayUrl: r.replayUrl || '',
        scheduledTime: fmtLiveTime(r.startTime) || '',
        duration,
        viewers: r.viewCount || 0,
        peakViewers: 0, // 后端无峰值（依赖运行时分钟数据，当前为空）
        income: 0, // 同上，收益依赖运行时订单/打赏
        likes: 0,
        previewCount: status === 'preview' ? 0 : undefined, // 预约数后端暂未聚合
        selfOnly: !!r.selfOnly,
        removed: !!r.removed,
      }
    }
    try {
      const data = await apiGet<RawMyRooms>('/live/my-rooms')
      return { stats: buildStats(data?.stats), list: (data?.rooms || []).map(adapt) }
    } catch {
      // 未登录 / 无直播间 → 空概览 + 空列表（页面走空态，不回退假数据）
      return { stats: buildStats(), list: [] }
    }
  },

  /** 获取直播控制台数据 — GET /live/console/:id */
  async getConsoleData(id: string): Promise<{
    title: string; stats: typeof consoleLiveStats; danmaku: ConsoleDanmaku[]; requests: ConsoleConnectRequest[]
    products: ConsoleProduct[]; script: ConsoleScript[]
  }> {
    try {
      const data = await apiGet<RawConsole>(`/live/console/${id}`)
      return {
        title: data?.title || '',
        stats: data?.stats || consoleLiveStats,
        danmaku: data?.danmaku || [],
        requests: data?.requests || [],
        products: data?.products || [],
        script: data?.script || [],
      }
    } catch {
      // 未登录 / 无权 → 抛错走页面 error 态
      throw new Error('加载控制台失败')
    }
  },

  /** 获取OBS推流配置与实时状态 — GET /live/stream-config（未推流时为离线态，实时指标由推流引擎上报） */
  async getObsStream(): Promise<typeof obsStreamData> {
    const cfg = await apiGet<RawStreamConfig>('/live/stream-config')
    const rs = cfg?.recommendedSettings || {}
    return {
      serverUrl: cfg?.streamUrl || '',
      streamKey: cfg?.streamKey || '',
      status: 'offline', // 当前未推流（真实离线；时长/帧率/码率等实时指标由推流引擎上报）
      duration: 0,
      fps: 0,
      bitrate: 0,
      resolution: rs.resolution || '',
      droppedFrames: 0,
      totalFrames: 0,
    } as typeof obsStreamData
  },

  /** 获取我的排期 — GET /live/my-rooms 适配为排期项（我创建的全部直播按时间编排） */
  async getScheduleList(): Promise<ScheduleItem[]> {
    const fmtDate = (iso?: string) => { if (!iso) return ''; const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
    const fmtTime = (iso?: string) => { if (!iso) return ''; const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
    const statusMap: Record<string, ScheduleItem['status']> = { WAITING: 'scheduled', LIVING: 'live', ENDED: 'completed', REPLAY: 'completed' }
    try {
      const data = await apiGet<RawMyRooms>('/live/my-rooms')
      return (data?.rooms || []).map((r: RawLiveRoom): ScheduleItem => {
        const status = statusMap[r.status || ''] || 'completed'
        let duration = 90 // 待开播无结束时间，用默认时长
        if (r.startTime && r.endTime) {
          const m = Math.round((new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 60000)
          if (m > 0) duration = m
        }
        return {
          id: r.id || '',
          title: r.title || '',
          date: fmtDate(r.startTime),
          time: fmtTime(r.startTime),
          duration,
          type: r.hasProducts ? 'commerce' : 'knowledge',
          status,
          seriesName: null, seriesIndex: null, seriesTotal: null, // 后端无系列课概念
          viewerEstimate: r.viewCount || 0,
          actualViewers: status === 'completed' ? (r.viewCount || 0) : undefined,
        }
      })
    } catch {
      // 未登录 / 无排期 → 空列表（页面走空态，不回退假数据）
      return []
    }
  },

  /** 获取团队成员 — GET /live/team */
  async getTeam(): Promise<{ members: TeamMember[]; available: AvailableMember[] }> {
    try {
      const data = await apiGet<RawTeam>('/live/team')
      return { members: data?.members || [], available: data?.available || [] }
    } catch {
      // 未登录 / 无团队 → 空（页面走空态，不回退假mock）
      return { members: [], available: [] }
    }
  },

  /** 获取直播分析数据 — GET /live/analytics/:id */
  async getAnalytics(id: string): Promise<{
    info: typeof analyticsLiveInfo; coreStats: CoreStat[]; trafficData: typeof analyticsTrafficData
    keyMoments: typeof analyticsKeyMoments; audience: typeof analyticsAudience
    interaction: typeof analyticsInteraction; wordCloud: typeof analyticsWordCloud
    productStats: typeof analyticsProductStats; replay: typeof analyticsReplay
    insights: string[]
  }> {
    // 聚合主播端数据大屏多接口（dashboard/*）+ 复盘 report + 对比 compare，适配为分析页结构。
    // 主数据接口任一失败 → 抛错走页面 error 态（不回退假 mock）；compare/audience 为增强项，失败容错。
    const wan = (n: number) => (n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n))
    const hm = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
    const dur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}小时${m % 60}分` : `${m}分钟`)
    const trendOf = (c?: string): 'up' | 'down' | 'flat' => { if (!c) return 'flat'; const n = parseFloat(c); return n > 0 ? 'up' : n < 0 ? 'down' : 'flat' }

    const [overview, trends, products, interactions, report, compare, audienceRaw] = await Promise.all([
      apiGet<RawDashboardOverview>(`/live/rooms/${id}/dashboard/overview`),
      apiGet<RawDashboardTrends>(`/live/rooms/${id}/dashboard/trends`),
      apiGet<RawDashboardProducts>(`/live/rooms/${id}/dashboard/products`),
      apiGet<RawInteractions>(`/live/rooms/${id}/dashboard/interactions`),
      apiGet<RawReport>(`/live/rooms/${id}/report`),
      apiGet<RawCompare>(`/live/rooms/${id}/compare`).catch(() => null),
      apiGet<RawAudience>(`/live/rooms/${id}/dashboard/audience`).catch(() => null),
    ])

    const sum: RawReportSummary = report?.summary || {}
    const ch: Record<string, string> = compare?.changes || {}
    const hasPrev = !!compare?.previous
    const stat = (label: string, value: string, icon: string, key: string): CoreStat => ({
      label, value, icon,
      trend: hasPrev ? trendOf(ch[key]) : 'flat',
      change: hasPrev ? (ch[key] || '—') : '持平',
    })

    // 关键时刻：从分钟趋势派生真实可解释的节点（峰值/首单/成交高峰）
    const tr: RawTrendPoint[] = trends?.trends || []
    const keyMoments: { time: string; event: string; desc: string }[] = []
    if (tr.length) {
      const peak = tr.reduce((a, b) => (b.online > a.online ? b : a), tr[0])
      keyMoments.push({ time: hm(peak.minute), event: '人气峰值', desc: `在线人数达到峰值 ${peak.online} 人` })
      const firstOrder = tr.find((t) => t.orders > 0)
      if (firstOrder) keyMoments.push({ time: hm(firstOrder.minute), event: '首笔成交', desc: '直播间产生首笔订单' })
      const topGmv = tr.reduce((a, b) => (b.gmv > a.gmv ? b : a), tr[0])
      if (topGmv.gmv > 0) keyMoments.push({ time: hm(topGmv.minute), event: '成交高峰', desc: `单分钟成交额 ¥${topGmv.gmv}` })
    }

    // 观众画像：解析后端「男X / 女Y」为占比；无画像字段则留空（页面隐藏空卡）
    const gender: { label: string; value: number; color: string }[] = []
    const gstr: string | undefined = audienceRaw?.gender
    if (gstr && gstr !== '--') {
      const m = gstr.match(/男\s*(\d+)\s*\/\s*女\s*(\d+)/)
      if (m) {
        const male = +m[1], female = +m[2], tot = male + female
        if (tot > 0) {
          gender.push({ label: '男', value: Math.round((male / tot) * 100), color: '#3b82f6' })
          gender.push({ label: '女', value: 100 - Math.round((male / tot) * 100), color: '#ec4899' })
        }
      }
    }

    // 数据洞察：基于真实指标生成（非写死假文本）
    const insights: string[] = []
    const ov: RawDashboardOverview = overview || {}
    if (ov.peakOnline) insights.push(`本场峰值在线 ${ov.peakOnline} 人，累计观看 ${wan(ov.viewCount || 0)} 人次，平均在线 ${sum.avgOnline || 0} 人。`)
    if (ov.orderCount) {
      const top = (products?.products || []).slice().sort((a: RawDashboardProduct, b: RawDashboardProduct) => b.revenue - a.revenue)[0]
      insights.push(`直播带货成交 ${ov.orderCount} 单，GMV ¥${ov.gmv}${top ? `，「${top.title}」最畅销（售 ${top.sales} 件）` : ''}。`)
    }
    if (ov.totalGiftCoin) insights.push(`收到打赏 ${ov.giftCount} 次共 ${ov.totalGiftCoin} 金币，弹幕互动 ${ov.commentCount} 条。`)

    return {
      // info 字面量仅构造展示所需子集（缺 id/endTime/status，与 typeof analyticsLiveInfo 不完全一致）→ as any
      info: {
        title: overview?.title || '',
        startTime: overview?.startTime ? (fmtLiveTime(overview.startTime) || '') : '',
        duration: dur(sum.durationMinutes || 0),
        type: products?.products?.length ? 'commerce' : 'knowledge',
      } as any,
      coreStats: [
        stat('观看人数', wan(overview?.viewCount || 0), 'eye', 'views'),
        stat('峰值在线', wan(overview?.peakOnline || 0), 'users', 'peakOnline'),
        stat('直播GMV', '¥' + (overview?.gmv || 0), 'shopping-bag', 'gmv'),
        stat('成交订单', String(overview?.orderCount || 0), 'shopping-cart', 'orders'),
      ],
      trafficData: (() => {
        // 降采样至约 30 个点，避免柱状图过密
        const step = Math.max(1, Math.ceil(tr.length / 30))
        return tr.filter((_, i) => i % step === 0).map((t) => ({ time: hm(t.minute), value: t.online }))
      })(),
      keyMoments,
      audience: { gender, age: [], region: [], source: [] },
      interaction: {
        danmaku: sum.totalComments || overview?.commentCount || 0,
        likes: sum.totalLikes || 0,
        comments: overview?.commentCount || 0,
        shares: 0,
        gifts: (interactions?.giftsByType || []).map((g: RawGiftByType) => ({ name: g.name, count: g.count, amount: g.totalCoin })),
      },
      wordCloud: [],
      // productStats 的 id 取后端 productId（string|number）与 typeof analyticsProductStats 的 id:number 不一致 → as any
      productStats: (products?.products || []).map((p: RawDashboardProduct) => ({
        id: p.productId, name: p.title, clicks: 0, orders: p.sales, amount: p.revenue, conversion: 0,
      })) as any,
      replay: { isPublic: overview?.status === 'REPLAY', isPaid: false, playCount: 0, playDuration: '', revenue: 0 },
      insights,
    }
  },

  /** 获取收益数据 — GET /live/earnings */
  async getEarnings(range?: string): Promise<{
    ranges: LiveEarningRange[]; stats: LiveEarningStats; records: LiveEarningRecord[]
  }> {
    try {
      const url = range ? `/live/earnings?range=${encodeURIComponent(range ?? "")}` : '/live/earnings'
      const data = await apiGet<RawEarnings>(url)
      return {
        ranges: data?.ranges || liveEarningRanges,
        stats: data?.stats || { total: 0, reward: 0, goods: 0, trend: 0 },
        records: data?.records || [],
      }
    } catch {
      // 未登录 / 无收益 → 空概览 + 空明细（ranges 为周期 tab 配置，保留）
      return { ranges: liveEarningRanges, stats: { total: 0, reward: 0, goods: 0, trend: 0 }, records: [] }
    }
  },

  /** 获取带货商品列表 — GET /live/products */
  async getProducts(filter?: string): Promise<LiveProductItem[]> {
    try {
      const url = filter && filter !== 'all' ? `/live/products?filter=${encodeURIComponent(filter)}` : '/live/products'
      const data = await apiGet<{ items?: LiveProductItem[] }>(url)
      return data?.items || []
    } catch {
      // 未登录 / 无商品 → 空列表（页面走空态，不回退假数据）
      return []
    }
  },

  /**
   * 本场已配带货商品 — GET /live/rooms/:id（关联表仅存 productId → 逐个拉 /shop/products/:id 充实）。
   * 真连：房间标题 + 已配商品列表（排序即讲解顺序·后端关联表当前无排序/讲解中字段，前端按返回顺序展示）。
   * 单件失败跳过；房间不存在/未登录 → 抛错交页面三态。
   */
  async getRoomProducts(roomId: string): Promise<{ roomTitle: string; products: LiveConfiguredProduct[] }> {
    const r = await apiGet<RawLiveRoomDetail>(`/live/rooms/${roomId}`)
    const rawProds = Array.isArray(r?.products) ? r.products.slice(0, 30) : []
    const enriched = await Promise.all(
      rawProds.map(async (lp): Promise<LiveConfiguredProduct | null> => {
        const pid = lp.productId || ''
        if (!pid) return null
        try {
          const p = await apiGet<RawLiveShopProduct>(`/shop/products/${pid}`)
          return {
            id: pid,
            name: p?.title || '商品',
            cover: (Array.isArray(p?.images) && p.images[0]) || p?.cover || '',
            price: Number(p?.effectivePrice ?? p?.price) || 0,
            stock: p?.stock ?? 0,
            sold: p?.salesCount ?? 0,
          }
        } catch {
          return null // 商品已删/下架 → 跳过
        }
      }),
    )
    return {
      roomTitle: r?.title || '',
      products: enriched.filter((p): p is LiveConfiguredProduct => !!p),
    }
  },

  /**
   * 选品层商品池 — GET /shop/products?status=ON_SALE（平台在售商品·多选加入直播间）。
   * 真连；search 走后端 keyword 过滤。失败/未登录 → 空列表（页面空态，不回退假商品）。
   */
  async getShopProductPool(search?: string): Promise<LivePickerProduct[]> {
    try {
      const q = search ? `&keyword=${encodeURIComponent(search)}` : ''
      const r = await apiGet<unknown>(`/shop/products?status=ON_SALE&pageSize=50${q}`)
      const arr: RawLiveShopProduct[] = Array.isArray(r)
        ? (r as RawLiveShopProduct[])
        : ((r as { products?: RawLiveShopProduct[]; items?: RawLiveShopProduct[]; data?: RawLiveShopProduct[] })?.products
            ?? (r as { items?: RawLiveShopProduct[] })?.items
            ?? (r as { data?: RawLiveShopProduct[] })?.data
            ?? [])
      return arr.map((p) => ({
        id: String(p.id ?? ''),
        name: p.title || '商品',
        cover: (Array.isArray(p.images) && p.images[0]) || p.cover || '',
        price: Number(p.effectivePrice ?? p.price) || 0,
      }))
    } catch {
      return []
    }
  },

  /** 获取评价列表 — GET /live/reviews */
  async getReviews(filter?: string): Promise<{ dist: LiveReviewDist[]; reviews: LiveReview[] }> {
    try {
      const url = filter && filter !== 'all' ? `/live/reviews?filter=${encodeURIComponent(filter)}` : '/live/reviews'
      const data = await apiGet<RawReviews>(url)
      return { dist: data?.dist || [], reviews: data?.reviews || [] }
    } catch {
      // 未登录 / 无评价 → 空（页面走空态，不回退假mock）
      return { dist: [], reviews: [] }
    }
  },

  /** 获取直播设置 — GET /live/settings */
  async getSettings(): Promise<{
    profile: typeof liveSettingProfile; notify: typeof liveSettingNotifyDefault; privacy: typeof liveSettingPrivacyDefault
  }> {
    const data = await apiGet<RawLiveSettings>('/live/settings')
    return {
      profile: data?.profile || liveSettingProfile,
      notify: data?.notify || liveSettingNotifyDefault,
      privacy: data?.privacy || liveSettingPrivacyDefault,
    }
  },

  /**
   * 获取竖屏直播间数据 — 前端组装 GET /live/rooms/:id（房间+主播+商品关联）
   * 弹幕(comments)走 TIM 群实时收发·初始为空；商品详情后端关联表无字段 → 降级空(页面商品区隐藏)。
   * 错误传播给页面三态，不回退假 mock。
   */
  async getVerticalRoom(id: string): Promise<{
    room: typeof verticalLiveRoom; comments: VerticalLiveComment[]; products: VerticalLiveProduct[]
  }> {
    const r = await apiGet<RawLiveRoomDetail>(`/live/rooms/${id}`)
    const room: typeof verticalLiveRoom = {
      id: r.id || id,
      title: r.title || '',
      hostName: r.user?.nickname || '',
      hostAvatar: r.user?.avatar || '',
      hostId: r.user?.id || r.hostUserId || '', // 关注主播用
      hostLevel: 0, // 后端无主播等级 → 降级
      followers: 0, // 后端房间未聚合粉丝数 → 降级
      viewerCount: r.viewCount ?? 0,
      likeCount: r.likeCount ?? 0,
      onlineAvatars: [], // 后端无在线头像列表 → 降级(页面 v-for 不渲染)
      imGroupId: r.imGroupId || '',
    }
    return { room, comments: [], products: [] }
  },

  /**
   * 获取横屏直播间数据 — 前端组装 GET /live/rooms/:id + GET /live/rooms/:id/slides(课件)
   * 聊天(messages)走 TIM 群·初始空；问答/资料下载后端无聚合源 → 降级空(页面对应区隐藏)。
   */
  async getHorizontalRoom(id: string): Promise<{
    room: HorizontalLiveRoom; slides: HorizontalSlide[]; questions: HorizontalQuestion[]
    messages: HorizontalMessage[]; files: HorizontalFile[]
  }> {
    const [r, rawSlides] = await Promise.all([
      apiGet<RawLiveRoomDetail>(`/live/rooms/${id}`),
      apiGet<RawLiveSlide[] | { slides?: RawLiveSlide[] }>(`/live/rooms/${id}/slides`).catch(() => [] as RawLiveSlide[]),
    ])
    const slideArr = Array.isArray(rawSlides) ? rawSlides : (rawSlides?.slides ?? [])
    const room: HorizontalLiveRoom = {
      id: r.id || id,
      title: r.title || '',
      hostName: r.user?.nickname || '',
      hostAvatar: r.user?.avatar || '',
      hostTitle: '', // 后端房间无主播头衔 → 降级
      followers: 0,
      viewers: r.viewCount ?? 0,
      likes: r.likeCount ?? 0,
      duration: '', // 时长依赖运行时 → 降级
      category: '',
      imGroupId: r.imGroupId || '',
    }
    const slides: HorizontalSlide[] = slideArr.map((s, i) => ({
      id: s.id || String(i), pageNum: i + 1, title: s.title || '', thumbnail: s.url || '',
    }))
    return { room, slides, questions: [], messages: [], files: [] }
  },

  /**
   * 获取主播数据中心 — 前端组装 GET /live/my-rooms(经营概览+房间) + GET /live/earnings(收益)
   * 30 天趋势后端无按天源 → 降级空(页面趋势图隐藏)。未登录 → 抛错走页面三态。
   */
  async getHostData(): Promise<{
    stats: HostLiveStats; rooms: HostLiveRoom[]; trend: HostLiveTrend[]
  }> {
    const [my, earn] = await Promise.all([
      apiGet<RawMyRooms>('/live/my-rooms'),
      apiGet<RawEarnings>('/live/earnings').catch(() => null),
    ])
    const s = my?.stats
    const totalRevenue = Number(earn?.stats?.total) || 0
    const rooms: HostLiveRoom[] = (my?.rooms || []).map((r: RawLiveRoom): HostLiveRoom => {
      const ended = String(r.status || '').toUpperCase() === 'ENDED' || String(r.status || '').toUpperCase() === 'REPLAY'
      let duration = 0
      if (r.startTime && r.endTime) {
        const m = Math.round((new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 60000)
        if (m > 0) duration = m
      }
      return {
        id: r.id || '', title: r.title || '', cover: r.cover || '',
        status: ended ? 'ended' : 'preview',
        dateText: fmtLiveTime(r.startTime) || '',
        duration, views: r.viewCount || 0,
        gifts: 0, // 单场打赏依赖运行时聚合 → 降级
        revenue: 0,
      }
    })
    const stats: HostLiveStats = {
      totalViews: s?.totalViews ?? 0,
      totalRevenue,
      avgDuration: 0,
      fansGrowth: 0,
      totalRooms: (my?.rooms || []).length,
      totalGifts: 0,
      viewsGrowthRate: 0,
      revenueGrowthRate: Number(earn?.stats?.trend) || 0,
    }
    return { stats, rooms, trend: [] }
  },

  /**
   * 获取直播间观看页数据 — 前端组装 GET /live/rooms/:id
   * 弹幕(comments)走 TIM 群·初始空；商品详情关联表无字段 → 降级空。
   */
  async getWatchRoom(id: string): Promise<{
    room: LiveWatchRoomInfo; comments: VerticalLiveComment[]; products: VerticalLiveProduct[]
  }> {
    const r = await apiGet<RawLiveRoomDetail>(`/live/rooms/${id}`)
    const room: LiveWatchRoomInfo = {
      id: r.id || id,
      type: (Array.isArray(r.products) && r.products.length ? 'commerce' : 'knowledge'),
      title: r.title || '',
      hostName: r.user?.nickname || '',
      hostAvatar: r.user?.avatar || '',
      hostId: r.user?.id || r.hostUserId || '',
      followers: null, // 后端房间接口无主播粉丝数 → null（页面 v-if 隐藏，不显示假「0 粉丝」）
      viewerCount: r.viewCount ?? 0,
      likeCount: r.likeCount ?? 0,
      isFollowing: false, // 后端房间未返回关注态 → 降级(页面按钮默认未关注)
      onlineAvatars: [],
      imGroupId: r.imGroupId || '',
      circleId: r.circleId || '', // 佣-V2-P3：进房渠道点击上报 + 购买 LIVE 来源归因
      status: r.status || '', // 房间状态(WAITING/LIVING/ENDED/REPLAY)→供未开播占位文案精确判断
      cover: r.cover || '', // 封面（预约态压暗展示/回放态封面）
      startTime: r.startTime || '', // 开播时间（预约态倒计时/时间行）
      chargeType: String(r.chargeType || 'FREE').toUpperCase(), // FREE|付费（付费场如实展示票价，不做假支付）
      chargePrice: Number(r.chargePrice) || 0,
      quality: String(r.quality || ''), // basic|hd|uhd（LIVING 态画质角标）
      replayUrl: r.replayUrl || '', // 回放地址（ENDED/REPLAY 态点播）
      // #21 回放章节点：仅收有效项（t 数字秒 + 非空标题），后端未标注/列未就绪 → 空数组不渲染
      replayChapters: (Array.isArray(r.replayChapters) ? r.replayChapters : [])
        .map((c) => ({ t: Math.max(0, Math.floor(Number(c?.t)) || 0), title: String(c?.title || '').trim() }))
        .filter((c) => c.title),
      circleName: r.circle?.name || '', // 来源圈子名（「来自圈子」一行小字）
    }
    // 带货商品充实（佣-V2-P3 顺带修通）：关联表仅存 productId → 逐个拉商品详情组装带货列表
    // （限 10 件·单件失败跳过·全部失败=空态与此前降级一致，不阻断直播间加载）
    const rawProds = Array.isArray(r.products) ? r.products.slice(0, 10) : []
    const enriched = await Promise.all(rawProds.map(async (lp, i): Promise<VerticalLiveProduct | null> => {
      const pid = lp.productId || ''
      if (!pid) return null
      try {
        const p = await apiGet<RawLiveShopProduct>(`/shop/products/${pid}`)
        return {
          id: pid,
          name: p?.title || '商品',
          cover: (Array.isArray(p?.images) && p.images[0]) || p?.cover || '',
          price: Number(p?.effectivePrice ?? p?.price) || 0,
          originalPrice: Number(p?.originalPrice ?? p?.price) || 0,
          stock: p?.stock ?? 0,
          sold: p?.salesCount ?? 0,
          isExplaining: i === 0, // 关联表无讲解中标记 → 首件视为讲解中（与主播控制台口径一致）
        }
      } catch { return null } // 商品已删/下架 → 跳过该件
    }))
    return { room, comments: [], products: enriched.filter((p): p is VerticalLiveProduct => !!p) }
  },

  /**
   * 直播间渠道点击上报（佣-V2-P3）— POST /commission/channel-click。
   * 进直播间 ≈ 该圈子全店(SHOP_ALL)渠道点击（7天窗 last-click 归因）；
   * 无圈子不调（诚实降级），未登录/资格不符/失败均静默不打扰观看。
   */
  async reportCircleChannelClick(circleId: string): Promise<void> {
    if (!circleId) return
    try { await apiPostOptionalAuth('/commission/channel-click', { subjectType: 'CIRCLE', subjectId: circleId, targetType: 'SHOP_ALL' }) } catch { /* 静默 */ }
  },

  /**
   * 获取礼物列表 — GET /live/gifts(公开) + GET /coin/balance(余额·未登录降级0)
   * 礼物面板为次要 UI：两个接口均容错降级，任一失败不抛错拖垮直播间页面。
   */
  async getGifts(): Promise<{ gifts: LiveGift[]; balance: number }> {
    const [rawGifts, bal] = await Promise.all([
      apiGet<RawGift[] | { items?: RawGift[]; gifts?: RawGift[] }>('/live/gifts').catch(() => [] as RawGift[]),
      apiGetOptionalAuth<RawCoinBalance>('/coin/balance').catch(() => null),
    ])
    const arr = Array.isArray(rawGifts) ? rawGifts : (rawGifts?.items ?? rawGifts?.gifts ?? [])
    return { gifts: arr.map(adaptGift), balance: Number(bal?.balance) || 0 }
  },

  /** 获取推流配置 — GET /live/stream-config */
  async getStreamConfig(): Promise<StreamConfig> {
    const cfg = await apiGet<RawStreamConfig>('/live/stream-config')
    const rs = cfg?.recommendedSettings || {}
    return {
      roomId: cfg?.roomId || '',
      roomTitle: cfg?.roomTitle || '我的直播间',
      streamUrl: cfg?.streamUrl || '',
      streamKey: cfg?.streamKey || '',
      playUrl: cfg?.playUrl || '',
      recommendedSettings: {
        resolution: rs.resolution || '',
        bitrate: rs.bitrate || '',
        fps: String(rs.fps ?? ''),
        encoder: rs.encoder || '',
      },
    }
  },

  // ───────── 直播间互动写操作（弹幕走 TIM 群·此处为业务侧持久化/计费）─────────

  /** 发送礼物 — POST /live/rooms/:id/gifts（后端事务扣国学币 + 记打赏，返回打赏记录） */
  async sendGift(roomId: string, giftId: string, quantity = 1): Promise<{ totalCoin: number }> {
    const rec = await apiPost<{ totalCoin?: number }>(`/live/rooms/${roomId}/gifts`, { giftId, quantity })
    return { totalCoin: Number(rec?.totalCoin) || 0 }
  },

  /** 直播间打赏榜 — GET /live/rooms/:id/gift-ranking（适配为 {rank,user,amount}） */
  async getGiftRanking(roomId: string): Promise<LiveWatchRankItem[]> {
    const arr = await apiGet<RawGiftRankItem[]>(`/live/rooms/${roomId}/gift-ranking`)
    return (Array.isArray(arr) ? arr : []).map((g, i) => ({
      rank: i + 1,
      user: g.nickname || '匿名用户',
      amount: Number(g.totalCoin) || 0,
    }))
  },

  /** 直播点赞 — POST /live/rooms/:id/like */
  async likeRoom(roomId: string): Promise<void> {
    await apiPost(`/live/rooms/${roomId}/like`)
  },

  // ───────── 开播预约（仅 WAITING 可约；后端无「我是否已预约」查询 → 已预约态由页面本次会话乐观维护）─────────

  /** 预约直播 — POST /live/rooms/:id/book（返回 {booked, bookingCount}·未登录/非 WAITING 抛错给页面 toast） */
  async bookRoom(roomId: string): Promise<{ booked: boolean; bookingCount: number }> {
    const res = await apiPost<{ booked?: boolean; bookingCount?: number }>(`/live/rooms/${roomId}/book`)
    return { booked: !!res?.booked, bookingCount: Number(res?.bookingCount) || 0 }
  },

  /** 取消预约 — DELETE /live/rooms/:id/book */
  async unbookRoom(roomId: string): Promise<void> {
    await apiDelete(`/live/rooms/${roomId}/book`)
  },

  /** 预约人数 — GET /live/rooms/:id/bookings（返回 {roomId, bookingCount}·失败交页面容错） */
  async getBookingCount(roomId: string): Promise<number> {
    const res = await apiGet<{ bookingCount?: number }>(`/live/rooms/${roomId}/bookings`)
    return Number(res?.bookingCount) || 0
  },

  /** 发送直播评论/弹幕（业务侧持久化，与 TIM 群实时下发并行） — POST /live/rooms/:id/comment */
  async sendComment(roomId: string, content: string): Promise<void> {
    await apiPost(`/live/rooms/${roomId}/comment`, { content })
  },
}
