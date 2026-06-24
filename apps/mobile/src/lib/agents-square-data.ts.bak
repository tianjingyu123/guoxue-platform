/**
 * AI 智能体广场数据（1:1 还原原型 proto-ref-app/agents/page.tsx）
 * 入口：排盘首页「AI 智能体」区块「更多」
 */
import { apiGet, useMock } from '@/utils/request'

export interface SquareBot {
  id: string
  name: string
  avatar: string
  description: string
  category: string
  categoryName: string
  hotScore: number
  useCount: number
  rating: number
  ratingCount: number
  tags: string[]
  isOfficial: boolean
  isRecommended: boolean
  isNew: boolean
  isFree: boolean
  price?: number
  capabilities: string[]
  /** 头像底色（替代原型 tailwind 渐变类，uni 用纯色更稳） */
  bgColor: string
}

export interface SquareQuestion {
  id: string
  question: string
  botId: string
  botName: string
  botAvatar: string
  views: number
}

/** 热门智能体（原型来自 Coze API 的 mock） */
export const hotBots: SquareBot[] = [
  {
    id: '1',
    name: '八字命理大师',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bazi&backgroundColor=c41e3a',
    description: '专业八字排盘解读，精准分析命局特点，为您揭示人生密码',
    category: 'bazi',
    categoryName: '八字命理',
    hotScore: 9856,
    useCount: 128000,
    rating: 4.9,
    ratingCount: 3256,
    tags: ['八字', '命理', '流年运势'],
    isOfficial: true,
    isRecommended: true,
    isNew: false,
    isFree: false,
    capabilities: ['语音对话', '图片识别', '深度解析'],
    bgColor: '#c41e3a',
  },
  {
    id: '2',
    name: '奇门遁甲助手',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=qimen&backgroundColor=7c3aed',
    description: '奇门遁甲起局断卦，预测事业、感情、财运，指点迷津',
    category: 'qimen',
    categoryName: '奇门遁甲',
    hotScore: 7823,
    useCount: 89000,
    rating: 4.8,
    ratingCount: 2134,
    tags: ['奇门', '预测', '决策'],
    isOfficial: true,
    isRecommended: true,
    isNew: false,
    isFree: true,
    capabilities: ['实时起局', '详细解读'],
    bgColor: '#7c3aed',
  },
  {
    id: '3',
    name: '国学经典导读',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=guoxue&backgroundColor=059669',
    description: '《易经》《道德经》等国学经典深度解读，让古籍活起来',
    category: 'guoxue',
    categoryName: '国学经典',
    hotScore: 6542,
    useCount: 67000,
    rating: 4.9,
    ratingCount: 1876,
    tags: ['易经', '国学', '智慧'],
    isOfficial: true,
    isRecommended: false,
    isNew: true,
    isFree: true,
    capabilities: ['语音朗读', '原文释义', '智慧问答'],
    bgColor: '#059669',
  },
  {
    id: '4',
    name: '智能起名顾问',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=naming&backgroundColor=ea580c',
    description: '结合八字五行、三才五格，为宝宝取一个吉祥好名',
    category: 'naming',
    categoryName: '起名改名',
    hotScore: 8234,
    useCount: 102000,
    rating: 4.7,
    ratingCount: 2567,
    tags: ['起名', '五行', '吉祥'],
    isOfficial: false,
    isRecommended: true,
    isNew: false,
    isFree: false,
    price: 9.9,
    capabilities: ['五行分析', '寓意解读', '多方案推荐'],
    bgColor: '#ea580c',
  },
  {
    id: '5',
    name: '紫微斗数解盘',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ziwei&backgroundColor=6366f1',
    description: '紫微斗数命盘解读，十二宫位详解，了解命运轨迹',
    category: 'ziwei',
    categoryName: '紫微斗数',
    hotScore: 5678,
    useCount: 56000,
    rating: 4.8,
    ratingCount: 1432,
    tags: ['紫微', '命盘', '宫位'],
    isOfficial: true,
    isRecommended: false,
    isNew: false,
    isFree: true,
    capabilities: ['命盘生成', '详细解读'],
    bgColor: '#6366f1',
  },
  {
    id: '6',
    name: '国学文案大师',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=copywrite&backgroundColor=0891b2',
    description: '一键生成国学风格推广文案、朋友圈文案、短视频脚本',
    category: 'content',
    categoryName: '文案创作',
    hotScore: 9234,
    useCount: 156000,
    rating: 4.9,
    ratingCount: 3567,
    tags: ['文案', '朋友圈', '短视频'],
    isOfficial: true,
    isRecommended: true,
    isNew: false,
    isFree: true,
    capabilities: ['多风格文案', '一键生成', '智能改写'],
    bgColor: '#0891b2',
  },
]

/** 热门问答 */
export const hotQuestions: SquareQuestion[] = [
  { id: 'q1', question: '我的八字适合创业还是打工？', botId: '1', botName: '八字命理大师', botAvatar: hotBots[0].avatar, views: 12800 },
  { id: 'q2', question: '2024年下半年财运如何？', botId: '1', botName: '八字命理大师', botAvatar: hotBots[0].avatar, views: 9600 },
  { id: 'q3', question: '奇门遁甲如何预测项目成败？', botId: '2', botName: '奇门遁甲助手', botAvatar: hotBots[1].avatar, views: 8700 },
  { id: 'q4', question: '给属龙宝宝起名有什么讲究？', botId: '4', botName: '智能起名顾问', botAvatar: hotBots[3].avatar, views: 7500 },
  { id: 'q5', question: '如何入门学习《易经》？', botId: '3', botName: '国学经典导读', botAvatar: hotBots[2].avatar, views: 6800 },
]

/** 格式化数量（万） */
export function formatCount(num: number): string {
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`
  return num.toLocaleString()
}

/* ============ 下游页数据 ============ */

/** 对话历史（/agents/history） */
export interface AgentConversation {
  id: string
  agentName: string
  agentCategory: string
  lastMessage: string
  lastTime: string
  messageCount: number
  unread: number
}
export const agentConversations: AgentConversation[] = [
  { id: '1', agentName: '八字命理大师', agentCategory: '八字命理', lastMessage: '您的命局中财星得地，今年走食伤生财之运…', lastTime: '今天 14:35', messageCount: 24, unread: 0 },
  { id: '2', agentName: '奇门遁甲助手', agentCategory: '奇门遁甲', lastMessage: '根据今日癸卯日的奇门布局，您的出行方向…', lastTime: '昨天 20:12', messageCount: 8, unread: 2 },
  { id: '3', agentName: '紫微斗数专家', agentCategory: '紫微斗数', lastMessage: '您的命宫坐紫微星，主性格稳重、志向远大…', lastTime: '2天前', messageCount: 15, unread: 0 },
  { id: '4', agentName: '风水布局师', agentCategory: '风水', lastMessage: '根据您的房屋朝向，建议将财位布置在…', lastTime: '3天前', messageCount: 6, unread: 0 },
  { id: '5', agentName: '易经解读助手', agentCategory: '易经', lastMessage: '您抽到的卦象为「水雷屯」，代表事业初创…', lastTime: '上周', messageCount: 12, unread: 0 },
]

/** 常见问题（/agents/questions） */
export interface AgentFAQ {
  id: string
  category: string
  question: string
  answer: string
}
export const agentFaqs: AgentFAQ[] = [
  { id: '1', category: '使用说明', question: 'AI 助手的回答准确吗？', answer: '我们的 AI 助手基于大量命理学经典文献训练，能够提供专业的命理分析。但命理学本身具有一定的参考性，建议您结合自身实际情况综合判断，不宜过度依赖。' },
  { id: '2', category: '使用说明', question: '如何获得更准确的分析？', answer: '提供尽可能详细的信息，包括准确的出生年月日时（农历/公历）、出生地点等。信息越详细，分析结果越精准。' },
  { id: '3', category: '使用说明', question: '每次对话的内容会保存吗？', answer: '是的，您的所有对话记录都会保存在「对话历史」中，您可以随时查看历史记录。如需删除，可在历史页面中单独删除或一键清空。' },
  { id: '4', category: '收费说明', question: 'AI 助手是免费的吗？', answer: '基础功能提供一定数量的免费对话额度。VIP 会员可享受不限次数的对话，以及更高级的分析功能。开通 VIP 请前往「会员中心」。' },
  { id: '5', category: '收费说明', question: '免费额度用完后怎么办？', answer: '免费额度用完后可以选择：①开通 VIP 会员获得无限对话；②单次购买对话包；③等待每日免费额度自动恢复（每天凌晨重置）。' },
  { id: '6', category: '隐私安全', question: '我的八字信息安全吗？', answer: '我们严格遵守《个人信息保护法》，您的八字等个人信息仅用于本平台的命理分析，不会泄露给第三方。您可以在隐私设置中管理您的数据。' },
  { id: '7', category: '功能介绍', question: 'AI 助手能做什么分析？', answer: '当前支持：八字命局分析、流年运势、大运走势、婚姻感情、事业财运、紫微斗数解读、奇门遁甲起局、风水布局建议等。' },
  { id: '8', category: '功能介绍', question: '可以和专家对话吗？', answer: '是的！除了 AI 助手，您还可以在「专家咨询」页面预约真人专家进行一对一咨询，享受更个性化的服务。' },
]

/** 智能体热度榜（/agents/ranking） */
export interface RankingAgent {
  id: string
  name: string
  description: string
  avatar: string
  category: string
  users: number
  sessions: number
  rating: number
  verified: boolean
}
export const agentsRanking: RankingAgent[] = [
  { id: '1', name: '周易算命大师', description: '专业八字、紫微、奇门遁甲算命', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=zhouyi&backgroundColor=c41e3a', category: '算命', users: 12850, sessions: 45620, rating: 4.9, verified: true },
  { id: '2', name: '国学经典讲解', description: '深度解读四书五经、道德经等', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=guoxuejiang&backgroundColor=059669', category: '国学', users: 9850, sessions: 32140, rating: 4.8, verified: true },
  { id: '3', name: '风水大师助手', description: '阳宅风水、择日、布局建议', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=fengshui&backgroundColor=0891b2', category: '风水', users: 8420, sessions: 28950, rating: 4.7, verified: false },
  { id: '4', name: '塔罗牌占卜', description: '塔罗解读、抽签分析、运势预测', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=tarot&backgroundColor=7c3aed', category: '占卜', users: 7240, sessions: 21850, rating: 4.6, verified: true },
  { id: '5', name: '中医养生顾问', description: '健康咨询、养生建议、体质分析', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=zhongyi&backgroundColor=ea580c', category: '健康', users: 5850, sessions: 18520, rating: 4.5, verified: false },
]

// ============ API 层 ============

export const agentsSquareApi = {
  /** 获取广场智能体列表 */
  async getHotBots(): Promise<SquareBot[]> {
    if (useMock()) return hotBots
    try { return await apiGet<SquareBot[]>('/agents/square') } catch { return hotBots }
  },

  /** 获取热门问答 */
  async getHotQuestions(): Promise<SquareQuestion[]> {
    if (useMock()) return hotQuestions
    try { return await apiGet<SquareQuestion[]>('/agents/questions') } catch { return hotQuestions }
  },

  /** 获取对话历史 */
  async getConversations(): Promise<AgentConversation[]> {
    if (useMock()) return agentConversations
    try { return await apiGet<AgentConversation[]>('/agents/conversations') } catch { return agentConversations }
  },

  /** 获取常见问题 */
  async getFaqs(): Promise<AgentFAQ[]> {
    if (useMock()) return agentFaqs
    try { return await apiGet<AgentFAQ[]>('/agents/faqs') } catch { return agentFaqs }
  },

  /** 获取排行榜 */
  async getRanking(): Promise<RankingAgent[]> {
    if (useMock()) return agentsRanking
    try { return await apiGet<RankingAgent[]>('/agents/ranking') } catch { return agentsRanking }
  },
}
