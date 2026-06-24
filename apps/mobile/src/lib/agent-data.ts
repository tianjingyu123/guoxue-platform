/**
 * 智能体模块数据层
 * 从原型 app/agent/[id]/page.tsx、main、customer-service、history 迁移
 */
import { apiGet, apiPost, useMock } from '@/utils/request'

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  time: string
  isStreaming?: boolean
  recommendations?: RecommendItem[]
}

export interface RecommendItem {
  type: 'course' | 'circle' | 'product' | 'paipan'
  data: any
}

// 智能体基础信息
export const agentDetail = {
  id: 1,
  name: '八字命理大师',
  description: '精通八字命理，可为您解读命盘、分析运势',
  tags: ['八字排盘', '运势分析', '婚姻事业'],
  pricePerChat: 0.5,
  freeQuota: 3,
  callPrice: 2,
}

// 快捷提问
export const quickQuestions = [
  '帮我看看今年的运势如何？',
  '我的八字五行缺什么？',
  '分析一下我的事业运',
  '看看我的婚姻宫情况',
  '帮我解读一下命盘',
]

// 推荐内容
export const recommendedCourses = [
  { id: 1, title: '八字入门实战课', instructor: '周易大师', price: 199, originalPrice: 299, students: 2680, rating: 4.9 },
  { id: 2, title: '八字看婚姻专题', instructor: '玄学居士', price: 99, originalPrice: 149, students: 1520, rating: 4.8 },
  { id: 3, title: '流年运势精解', instructor: '周易大师', price: 149, originalPrice: 199, students: 1890, rating: 4.9 },
]

export const recommendedCircles = [
  { id: 1, name: '八字命理研习社', members: 3280, price: 99, description: '系统学习八字命理' },
  { id: 2, name: '周易大师交流圈', members: 5620, price: 0, description: '与高手一起探讨' },
]

export const recommendedProducts = [
  { id: 1, name: '八字命理入门', type: '电子书', price: 29, originalPrice: 49, sales: 856 },
  { id: 2, name: '开运水晶手链', type: '饰品', price: 168, originalPrice: 268, sales: 326 },
]

export function nowTime(): string {
  const d = new Date()
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
  const secs = (seconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

export const chatWelcome = `您好！我是${agentDetail.name}，精通八字命理学，拥有多年实战经验。

我可以为您提供以下服务：
- 八字命盘排盘与解读
- 流年运势分析
- 婚姻事业预测
- 五行调理建议

请告诉我您的出生年月日时（公历或农历均可），我来为您详细分析。`

// 生成回复（模拟）
export function generateResponse(question: string): { text: string; recommendations?: RecommendItem[] } {
  if (question.includes('运势') || question.includes('今年')) {
    return {
      text: `根据您提供的信息，让我来分析一下您的运势：

【2024年整体运势】
今年流年甲辰，天干甲木生助，地支辰土为财库，整体运势呈上升趋势。

【事业运】
上半年贵人运旺，适合拓展人脉、寻求合作机会。下半年需稳中求进，不宜冒进。

【财运】
正财稳定，偏财有小进。建议以稳健投资为主，避免高风险操作。

如果您想更深入地了解流年运势的变化规律，我推荐您学习以下课程：`,
      recommendations: [
        { type: 'course', data: recommendedCourses[2] },
        { type: 'circle', data: recommendedCircles[0] },
      ],
    }
  } else if (question.includes('五行') || question.includes('缺')) {
    return {
      text: `关于五行分析，我需要您提供准确的出生信息：

【所需信息】
1. 出生年份（公历）
2. 出生月份
3. 出生日期
4. 出生时辰（如知道的话）

有了这些信息，我可以为您排出完整八字命盘，分析五行旺衰，判断喜用神。

您可以使用排盘工具快速生成命盘：`,
      recommendations: [
        { type: 'paipan', data: null },
        { type: 'course', data: recommendedCourses[0] },
      ],
    }
  } else if (question.includes('事业')) {
    return {
      text: `关于事业运的分析：

【事业宫位】
八字中以月柱为事业宫，结合日主强弱、官杀星的配置来综合判断。

【一般建议】
1. 身强者适合独立创业或担任领导职位
2. 身弱者适合稳定工作或与人合作
3. 食伤生财格局利于技术、创意类工作
4. 官杀旺者适合体制内或管理岗位

如需针对性分析，请提供您的八字信息。同时，如果您对事业规划有更多疑问，也欢迎加入我们的交流圈：`,
      recommendations: [{ type: 'circle', data: recommendedCircles[1] }],
    }
  } else if (question.includes('婚姻') || question.includes('感情')) {
    return {
      text: `关于婚姻宫的分析：

【婚姻宫位】
八字中以日支为婚姻宫，代表配偶和婚姻状态。

【影响因素】
1. 日支所坐十神（正财、正官等）
2. 日支与其他地支的刑冲合害
3. 大运流年对婚姻宫的影响

请提供您的出生信息，我可以为您详细分析婚姻运势：`,
      recommendations: [
        { type: 'course', data: recommendedCourses[1] },
        { type: 'paipan', data: null },
      ],
    }
  } else if (question.includes('化解') || question.includes('调理')) {
    return {
      text: `关于命理调理和化解：

【调理原则】
1. 五行补缺：通过颜色、方位、饰品等补充所缺五行
2. 流年趋避：了解不利时段，提前规避风险
3. 风水调整：居家办公环境的布局优化
4. 心态调整：顺应天时，积极面对

具体的调理方案需要根据您的八字来定制。另外，一些开运饰品也可以起到辅助作用：`,
      recommendations: [
        { type: 'product', data: recommendedProducts[1] },
        { type: 'course', data: recommendedCourses[2] },
      ],
    }
  }

  return {
    text: `感谢您的提问！

为了给您更准确的命理分析，我需要了解以下信息：

1. 出生日期：公历年月日
2. 出生时辰：如早上7点、下午3点等
3. 出生地点：用于校正真太阳时

有了这些信息，我可以为您排出精准的八字命盘。您也可以先使用排盘工具：`,
    recommendations: [
      { type: 'paipan', data: null },
      { type: 'course', data: recommendedCourses[0] },
    ],
  }
}

// ===== 智玄助手（main）=====
export const zhixuanWelcome = `您好！我是智玄 AI 助手，精通八字命理、奇门遁甲、紫微斗数等传统命理学。

您可以向我提问：
- 八字分析与五行解读
- 流年运势与注意事项
- 婚姻、事业、财运预测
- 风水布局与趋吉避凶

请告诉我您的需求，我将竭诚为您服务。`

export const zhixuanQuickPrompts = ['帮我分析今年运势', '我的八字五行缺什么', '解读事业宫位走势', '分析近期财运方向']

export const zhixuanReply = `感谢您的提问。根据您提供的信息，我来为您做详细分析……

（此为演示模式，实际对话将接入 AI 模型进行精准推算。）`

// ===== 智能客服（customer-service）=====
export const csWelcome = `您好，欢迎联系智玄客服！

我可以帮您解决：
• 账号注册与登录问题
• 课程购买与退款申请
• VIP 会员开通与续费
• 内容投诉与举报
• 其他使用问题

请描述您的问题，我们将尽快为您解答。`

export const csQuick = ['课程退款', 'VIP开通', '账号问题', '内容举报', '联系人工客服']

export const csReplies: Record<string, string> = {
  课程退款: '退款申请流程：进入「我的订单」→ 找到对应课程 → 点击「申请退款」。购买7日内且观看进度低于30%可申请退款，退款将在3个工作日内原路退回。',
  VIP开通: 'VIP会员开通方式：进入「VIP中心」→ 选择套餐 → 完成支付即可立即生效。如遇支付问题请联系人工客服。',
  账号问题: '常见账号问题：\n• 忘记密码：点击登录页「忘记密码」通过手机或邮箱重置\n• 账号被封：请说明详细情况，我们将为您核查处理',
  内容举报: '如发现违规内容，请在内容详情页点击右上角「…」选择「举报」，填写举报原因提交。我们将在24小时内处理。',
  联系人工客服: '人工客服服务时间：周一至周日 9:00-21:00\n工作时间内将在5分钟内响应，非工作时间请留言，我们将在次日处理。',
}

export const csDefaultReply = '感谢您的反馈！我已记录您的问题，客服人员将尽快跟进处理。如需紧急帮助，可拨打客服热线 400-XXX-XXXX。'

// ===== 对话历史（history）=====
export interface HistoryItem {
  id: number
  agentName: string
  agentAvatar: string
  agentType: string
  lastMessage: string
  time: string
  timeGroup: string
  unread: number
  isFree: boolean
}

export const initialHistory: HistoryItem[] = [
  { id: 1, agentName: '八字分析师', agentAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bazi&backgroundColor=c41e3a', agentType: '命理', lastMessage: '根据您的八字，今年的事业运势整体呈上升趋势，尤其是下半年会有贵人相助...', time: '10分钟前', timeGroup: '今天', unread: 2, isFree: false },
  { id: 2, agentName: '紫微斗数大师', agentAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ziwei&backgroundColor=6366f1', agentType: '紫微', lastMessage: '您的命盘中紫微星坐命宫，这是非常好的格局，代表您有领导才能...', time: '昨天 15:30', timeGroup: '昨天', unread: 0, isFree: true },
  { id: 3, agentName: '风水顾问', agentAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=fengshui&backgroundColor=059669', agentType: '风水', lastMessage: '您家的客厅布局基本合理，但建议将沙发稍微往西移动一些...', time: '周一 09:20', timeGroup: '本周', unread: 0, isFree: false },
  { id: 4, agentName: '姓名学专家', agentAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=naming&backgroundColor=ea580c', agentType: '姓名', lastMessage: '这个名字的五行属性偏木，与您的八字喜用神相合，是个不错的选择...', time: '上周三', timeGroup: '更早', unread: 0, isFree: true },
  { id: 5, agentName: '周易占卜师', agentAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=zhouyi&backgroundColor=7c3aed', agentType: '占卜', lastMessage: '您所问之事，卦象显示近期会有转机，但需要耐心等待...', time: '2周前', timeGroup: '更早', unread: 0, isFree: false },
]

export const historyGroups = ['今天', '昨天', '本周', '更早']

// ============ API 层 ============

export const agentApi = {
  /** 获取智能体详情 */
  async getDetail(_id: string): Promise<typeof agentDetail> {
    if (true) return agentDetail
    try { return await apiGet(`/agent/${_id}`) } catch { return agentDetail }
  },

  /** 获取快捷提问 */
  async getQuickQuestions(): Promise<string[]> {
    if (true) return quickQuestions
    try { return await apiGet('/agent/quick-questions') } catch { return quickQuestions }
  },

  /** 发送消息到智能体 */
  async sendMessage(_agentId: string, _content: string): Promise<{ text: string; recommendations?: RecommendItem[] }> {
    if (true) return generateResponse(_content)
    try { return await apiPost(`/agent/${_agentId}/chat`, { content: _content }) } catch { return generateResponse(_content) }
  },

  /** 获取智玄助手欢迎语 */
  async getZhixuanWelcome(): Promise<{ welcome: string; quickPrompts: string[] }> {
    if (true) return { welcome: zhixuanWelcome, quickPrompts: zhixuanQuickPrompts }
    try { return await apiGet('/agent/zhixuan/welcome') } catch { return { welcome: zhixuanWelcome, quickPrompts: zhixuanQuickPrompts } }
  },

  /** 发送消息给智玄助手 */
  async sendZhixuanMessage(_content: string): Promise<string> {
    if (true) return zhixuanReply
    try { const data = await apiPost<any>('/agent/zhixuan/chat', { content: _content }); return data?.reply || zhixuanReply } catch { return zhixuanReply }
  },

  /** 获取客服欢迎语 */
  async getCsWelcome(): Promise<{ welcome: string; quick: string[] }> {
    if (true) return { welcome: csWelcome, quick: csQuick }
    try { return await apiGet('/agent/cs/welcome') } catch { return { welcome: csWelcome, quick: csQuick } }
  },

  /** 发送客服消息 */
  async sendCsMessage(_content: string): Promise<string> {
    if (true) return csReplies[_content] || csDefaultReply
    try { const data = await apiPost<any>('/agent/cs/chat', { content: _content }); return data?.reply || csDefaultReply } catch { return csDefaultReply }
  },

  /** 获取对话历史 */
  async getHistory(): Promise<HistoryItem[]> {
    if (true) return initialHistory
    try { return await apiGet<HistoryItem[]>('/agent/history') } catch { return initialHistory }
  },

  /** 获取推荐内容 */
  async getRecommendations(): Promise<{ courses: any[]; circles: any[]; products: any[] }> {
    if (true) return { courses: recommendedCourses, circles: recommendedCircles, products: recommendedProducts }
    try { return await apiGet('/agent/recommendations') } catch { return { courses: recommendedCourses, circles: recommendedCircles, products: recommendedProducts } }
  },
}
