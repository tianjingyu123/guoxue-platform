// 智能体/AI Bot 相关 API
import { apiGet, apiPost, useMock } from '../api-client'
import type { ApiResponse } from '../types/api'
import type { 
  BotItem, 
  BotCategory, 
  BotCategoryInfo, 
  BotListResponse, 
  BotRankingResponse, 
  BotMarketplaceData,
  BotFeedCard,
  BotDetail,
  ChatMessage,
  ChatSession,
  ChatSessionItem,
  StreamCallbacks
} from '../types/bots'

// ========== Mock 数据 ==========

const mockCategories: BotCategoryInfo[] = [
  { id: 'all', name: '全部', icon: 'Grid3X3' },
  { id: 'bazi', name: '八字命理', icon: 'Calendar' },
  { id: 'fengshui', name: '风水堪舆', icon: 'Compass' },
  { id: 'health', name: '养生保健', icon: 'Heart' },
  { id: 'divination', name: '占卜预测', icon: 'Sparkles' },
  { id: 'naming', name: '起名取字', icon: 'PenTool' },
  { id: 'dream', name: '解梦析梦', icon: 'Moon' },
  { id: 'face', name: '面相分析', icon: 'Scan' },
  { id: 'palm', name: '手相解读', icon: 'Hand' },
  { id: 'other', name: '其他', icon: 'MoreHorizontal' },
]

const mockBots: BotItem[] = [
  {
    id: 1,
    name: '八字大师',
    avatar: '/placeholder.svg?height=80&width=80',
    description: '专业八字命理分析，精准解读您的命运密码，提供事业、婚姻、财运等全方位指导。',
    category: 'bazi',
    categoryName: '八字命理',
    hotScore: 9800,
    useCount: 125600,
    rating: 4.9,
    ratingCount: 8520,
    tags: ['八字', '命理', '运势'],
    isOfficial: true,
    isRecommended: true,
    isNew: false,
    isFree: false,
    price: 9.9,
  },
  {
    id: 2,
    name: '风水顾问',
    avatar: '/placeholder.svg?height=80&width=80',
    description: '家居风水、办公风水专业分析，为您打造最佳能量场，助力事业与生活。',
    category: 'fengshui',
    categoryName: '风水堪舆',
    hotScore: 8500,
    useCount: 89200,
    rating: 4.8,
    ratingCount: 5630,
    tags: ['风水', '家居', '办公'],
    isOfficial: true,
    isRecommended: true,
    isNew: false,
    isFree: true,
  },
  {
    id: 3,
    name: '周公解梦',
    avatar: '/placeholder.svg?height=80&width=80',
    description: '传承周公解梦智慧，结合现代心理学，为您揭示梦境中的深层含义。',
    category: 'dream',
    categoryName: '解梦析梦',
    hotScore: 7200,
    useCount: 67800,
    rating: 4.7,
    ratingCount: 4120,
    tags: ['解梦', '周公', '心理'],
    isOfficial: false,
    isRecommended: false,
    isNew: true,
    isFree: true,
    creator: {
      id: 101,
      name: '易学研究院',
      avatar: '/placeholder.svg?height=32&width=32',
      verified: true,
    },
  },
  {
    id: 4,
    name: '起名助手',
    avatar: '/placeholder.svg?height=80&width=80',
    description: '融合五行、生辰、音韵，为宝宝或公司起一个吉祥如意的好名字。',
    category: 'naming',
    categoryName: '起名取字',
    hotScore: 9200,
    useCount: 156000,
    rating: 4.9,
    ratingCount: 12300,
    tags: ['起名', '宝宝', '公司'],
    isOfficial: true,
    isRecommended: true,
    isNew: false,
    isFree: false,
    price: 19.9,
  },
  {
    id: 5,
    name: '中医养生',
    avatar: '/placeholder.svg?height=80&width=80',
    description: '根据体质辨识，提供个性化养生建议，药膳食疗、穴位按摩一应俱全。',
    category: 'health',
    categoryName: '养生保健',
    hotScore: 6800,
    useCount: 45600,
    rating: 4.6,
    ratingCount: 2890,
    tags: ['养生', '中医', '食疗'],
    isOfficial: false,
    isRecommended: false,
    isNew: false,
    isFree: true,
    creator: {
      id: 102,
      name: '国医馆',
      avatar: '/placeholder.svg?height=32&width=32',
      verified: true,
    },
  },
  {
    id: 6,
    name: '塔罗占卜',
    avatar: '/placeholder.svg?height=80&width=80',
    description: '专业塔罗牌占卜，解答感情、事业、财运等困惑，指引前行方向。',
    category: 'divination',
    categoryName: '占卜预测',
    hotScore: 7500,
    useCount: 78900,
    rating: 4.7,
    ratingCount: 5670,
    tags: ['塔罗', '占卜', '感情'],
    isOfficial: false,
    isRecommended: true,
    isNew: true,
    isFree: false,
    price: 6.6,
    creator: {
      id: 103,
      name: '神秘塔罗屋',
      avatar: '/placeholder.svg?height=32&width=32',
      verified: false,
    },
  },
  {
    id: 7,
    name: '面相大师',
    avatar: '/placeholder.svg?height=80&width=80',
    description: '上传照片即可分析面相，解读五官特征与运势的关联。',
    category: 'face',
    categoryName: '面相分析',
    hotScore: 5500,
    useCount: 34200,
    rating: 4.5,
    ratingCount: 1890,
    tags: ['面相', 'AI识别', '运势'],
    isOfficial: true,
    isRecommended: false,
    isNew: false,
    isFree: true,
  },
  {
    id: 8,
    name: '手相解读',
    avatar: '/placeholder.svg?height=80&width=80',
    description: '智能识别手纹，从生命线、感情线、事业线解读您的人生轨迹。',
    category: 'palm',
    categoryName: '手相解读',
    hotScore: 4800,
    useCount: 28900,
    rating: 4.4,
    ratingCount: 1560,
    tags: ['手相', 'AI识别', '掌纹'],
    isOfficial: true,
    isRecommended: false,
    isNew: true,
    isFree: true,
  },
]

const mockFeedCards: BotFeedCard[] = [
  {
    id: 1,
    type: 'bot_recommend',
    title: '本周热门推荐',
    description: '八字大师带你解锁命运密码',
    bot: mockBots[0],
    link: '/bots/chat/1',
  },
  {
    id: 2,
    type: 'hot_topic',
    title: '热门话题',
    description: '2026年下半年运势预测',
    topic: { name: '下半年运势', discussCount: 12580 },
    link: '/bots/topic/1',
  },
  {
    id: 3,
    type: 'user_story',
    title: '用户故事',
    description: '"起名助手帮我女儿取了一个寓意美好的名字"',
    story: {
      user: { name: '幸福妈妈', avatar: '/placeholder.svg?height=32&width=32' },
      content: '感谢起名助手，结合了生辰八字和音韵美感，名字寓意很好！',
      botName: '起名助手',
    },
    link: '/bots/chat/4',
  },
]

// ========== API 函数 ==========

/**
 * 获取智能体广场首页数据
 */
export async function getBotMarketplaceData(): Promise<ApiResponse<BotMarketplaceData>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      code: 200,
      data: {
        categories: mockCategories,
        banners: [
          { id: 1, image: '/placeholder.svg?height=160&width=350', link: '/bots/chat/1' },
          { id: 2, image: '/placeholder.svg?height=160&width=350', link: '/bots/chat/4' },
        ],
        hotBots: mockBots.filter(b => b.isRecommended).slice(0, 6),
        newBots: mockBots.filter(b => b.isNew),
        feedCards: mockFeedCards,
      },
      message: 'success',
    }
  }
  return apiGet<BotMarketplaceData>('/bots/marketplace')
}

/**
 * 获取智能体列表
 */
export async function getBotList(
  category: BotCategory = 'all',
  page: number = 1,
  pageSize: number = 20
): Promise<ApiResponse<BotListResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 400))
    let filtered = mockBots
    if (category !== 'all') {
      filtered = mockBots.filter(b => b.category === category)
    }
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return {
      code: 200,
      data: {
        list: filtered.slice(start, end),
        total: filtered.length,
        hasMore: end < filtered.length,
      },
      message: 'success',
    }
  }
  return apiGet<BotListResponse>('/bots/list', { category, page, pageSize })
}

/**
 * 获取智能体排行榜
 */
export async function getBotRanking(type: 'hot' | 'rating' | 'new' = 'hot'): Promise<ApiResponse<BotRankingResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const sorted = [...mockBots].sort((a, b) => {
      if (type === 'hot') return b.hotScore - a.hotScore
      if (type === 'rating') return b.rating - a.rating
      return b.id - a.id
    })
    return {
      code: 200,
      data: {
        list: sorted.slice(0, 10).map((bot, index) => ({
          ...bot,
          rank: index + 1,
          rankChange: Math.floor(Math.random() * 5) - 2,
        })),
        updateTime: new Date().toLocaleString('zh-CN'),
      },
      message: 'success',
    }
  }
  return apiGet<BotRankingResponse>('/bots/ranking', { type })
}

/**
 * 搜索智能体
 */
export async function searchBots(keyword: string, page: number = 1): Promise<ApiResponse<BotListResponse>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const filtered = mockBots.filter(b => 
      b.name.includes(keyword) || 
      b.description.includes(keyword) ||
      b.tags.some(t => t.includes(keyword))
    )
    return {
      code: 200,
      data: {
        list: filtered,
        total: filtered.length,
        hasMore: false,
      },
      message: 'success',
    }
  }
  return apiGet<BotListResponse>('/bots/search', { keyword, page })
}

/**
 * 获取分类列表
 */
export function getBotCategories(): BotCategoryInfo[] {
  return mockCategories
}

/**
 * 格式化热度数字
 */
export function formatHotScore(score: number): string {
  if (score >= 10000) {
    return (score / 10000).toFixed(1) + 'w'
  }
  if (score >= 1000) {
    return (score / 1000).toFixed(1) + 'k'
  }
  return score.toString()
}

// ========== 对话相关 API ==========

const mockBotDetails: Record<number, BotDetail> = {
  1: {
    ...mockBots[0],
    welcomeMessage: '您好！我是八字大师，专注于八字命理分析已有多年经验。请提供您的出生年月日时（农历或阳历皆可），我将为您详细解读命盘信息。',
    suggestions: [
      '帮我分析一下今年的运势',
      '我的八字适合什么职业？',
      '分析一下我的婚姻运',
      '看看我的财运如何'
    ],
    capabilities: ['八字排盘', '运势分析', '事业指导', '婚姻分析', '财运预测'],
    limits: { dailyFreeCount: 3, usedCount: 1 },
    voiceEnabled: true,
    fileEnabled: false,
  },
  2: {
    ...mockBots[1],
    welcomeMessage: '您好！我是风水顾问，可以为您分析家居或办公环境的风水布局。您可以上传户型图或描述您想了解的问题。',
    suggestions: [
      '客厅沙发怎么摆放最好？',
      '卧室床位有什么讲究？',
      '办公桌朝向哪个方向好？',
      '入户门对着卫生间怎么化解？'
    ],
    capabilities: ['家居风水', '办公风水', '商铺风水', '风水化解', '布局建议'],
    voiceEnabled: true,
    fileEnabled: true,
  },
}

/**
 * 获取 Bot 详情
 */
export async function getBotDetail(botId: number): Promise<ApiResponse<BotDetail>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const detail = mockBotDetails[botId] || {
      ...mockBots.find(b => b.id === botId) || mockBots[0],
      welcomeMessage: '您好！有什么可以帮您的吗？',
      suggestions: ['请问您能做什么？', '帮我分析一下', '我想了解更多'],
      capabilities: ['智能问答', '专业分析'],
      voiceEnabled: true,
      fileEnabled: false,
    }
    return { code: 200, data: detail, message: 'success' }
  }
  return apiGet<BotDetail>(`/bots/${botId}`)
}

/**
 * 获取对话历史
 */
export async function getChatHistory(botId: number, sessionId?: string): Promise<ApiResponse<ChatSession>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 200))
    return {
      code: 200,
      data: {
        id: sessionId || 'session_' + Date.now(),
        botId,
        botName: mockBots.find(b => b.id === botId)?.name || '智能助手',
        botAvatar: mockBots.find(b => b.id === botId)?.avatar || '/placeholder.svg',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      message: 'success',
    }
  }
  return apiGet<ChatSession>(`/bots/${botId}/chat`, { sessionId })
}

/**
 * 获取历史会话列表
 */
export async function getChatSessions(botId?: number): Promise<ApiResponse<ChatSessionItem[]>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      code: 200,
      data: [
        {
          id: 'session_1',
          botId: 1,
          botName: '八字大师',
          botAvatar: '/placeholder.svg',
          lastMessage: '根据您的八字，今年下半年事业运势...',
          updatedAt: '2026-06-03 10:30',
          messageCount: 12,
        },
        {
          id: 'session_2',
          botId: 2,
          botName: '风水顾问',
          botAvatar: '/placeholder.svg',
          lastMessage: '客厅沙发建议靠墙摆放...',
          updatedAt: '2026-06-02 15:20',
          messageCount: 8,
        },
      ],
      message: 'success',
    }
  }
  return apiGet<ChatSessionItem[]>('/bots/chat/sessions', { botId })
}

/**
 * 发送消息（非流式）
 */
export async function sendMessage(
  botId: number, 
  content: string, 
  sessionId?: string
): Promise<ApiResponse<ChatMessage>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 1500))
    const responses = [
      '好的，让我为您分析一下。根据您提供的信息，我可以看出...',
      '这是一个很好的问题。从专业角度来看...',
      '我来帮您解答。首先需要了解的是...',
    ]
    return {
      code: 200,
      data: {
        id: 'msg_' + Date.now(),
        role: 'assistant',
        type: 'text',
        content: responses[Math.floor(Math.random() * responses.length)] + 
          '\n\n根据国学理论，这个问题涉及到多个方面的考量。' +
          '建议您可以从以下几个角度来思考：\n\n' +
          '1. **五行相生相克**：了解元素之间的关系\n' +
          '2. **时机选择**：把握最佳的行动时间\n' +
          '3. **方位布局**：注意空间能量的流动\n\n' +
          '如果您需要更详细的分析，可以告诉我更多具体信息。',
        createdAt: new Date().toISOString(),
      },
      message: 'success',
    }
  }
  return apiPost<ChatMessage>(`/bots/${botId}/chat`, { content, sessionId })
}

/**
 * 发送消息（流式）
 */
export async function sendMessageStream(
  botId: number,
  content: string,
  callbacks: StreamCallbacks,
  sessionId?: string
): Promise<void> {
  const fullText = 
    '好的，让我为您详细分析一下。\n\n' +
    '根据您提供的信息，我可以从以下几个方面来解读：\n\n' +
    '**第一，从五行角度看**\n' +
    '您的情况属于木旺之象，建议多接触金、水元素来平衡。\n\n' +
    '**第二，从时机角度看**\n' +
    '当前正处于转运期，把握好接下来的三个月非常关键。\n\n' +
    '**第三，具体建议**\n' +
    '1. 工作上可以主动争取新的项目机会\n' +
    '2. 财务方面建议稳健为主，避免大额投资\n' +
    '3. 人际关系上多与属相相合的人来往\n\n' +
    '您还有其他想要了解的吗？'

  callbacks.onStart?.()
  
  // 模拟流式输出
  let currentIndex = 0
  const interval = setInterval(() => {
    if (currentIndex < fullText.length) {
      const chunk = fullText.slice(currentIndex, currentIndex + Math.floor(Math.random() * 3) + 1)
      currentIndex += chunk.length
      callbacks.onToken?.(chunk)
    } else {
      clearInterval(interval)
      callbacks.onComplete?.(fullText)
    }
  }, 30)
}

/**
 * 上传文件到对话
 */
export async function uploadChatFile(
  botId: number,
  file: File
): Promise<ApiResponse<{ url: string; name: string; size: number }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 800))
    return {
      code: 200,
      data: {
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
      },
      message: 'success',
    }
  }
  const formData = new FormData()
  formData.append('file', file)
  return apiPost(`/bots/${botId}/upload`, formData)
}

/**
 * 创建语音房间
 */
export async function createVoiceRoom(botId: number): Promise<ApiResponse<{ roomId: string; token: string }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      code: 200,
      data: {
        roomId: 'voice_' + Date.now(),
        token: 'mock_voice_token',
      },
      message: 'success',
    }
  }
  return apiPost(`/bots/${botId}/voice/create`)
}

/**
 * 删除对话会话
 */
export async function deleteChatSession(sessionId: string): Promise<ApiResponse<{ success: boolean }>> {
  if (useMock()) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { code: 200, data: { success: true }, message: '删除成功' }
  }
  return apiPost(`/bots/chat/sessions/${sessionId}/delete`)
}
