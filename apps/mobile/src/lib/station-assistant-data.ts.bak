// ===== 站长助手 assistant 数据与 mock 响应（对齐原型 lib/api/station-assistant）=====

import { apiGet, apiPost, useMock } from '@/utils/request'

export interface ChartPoint {
  label: string
  value: number
  color?: string
}
export interface ChartData {
  type: 'line' | 'pie'
  title: string
  data: ChartPoint[]
}
export interface TableData {
  title: string
  headers: string[]
  rows: string[][]
}
export interface ActionSuggestion {
  title: string
  description?: string
  link?: string
  priority: 'high' | 'medium' | 'low'
}
export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  chart?: ChartData
  table?: TableData
  actions?: ActionSuggestion[]
}

export interface AssistantSuggestion {
  id: string
  text: string
  category: string
}

export const assistantConfig = {
  name: '站长助理',
  welcomeMessage:
    '您好，我是您的专属站长运营助理。我可以帮您分析运营数据、提供推广策略建议、总结团队业绩等。有什么我可以帮您的吗？',
  suggestions: [
    { id: '1', text: '本周数据总结', category: 'data' },
    { id: '2', text: '如何提升用户活跃度？', category: 'operation' },
    { id: '3', text: '推荐几个推广策略', category: 'promotion' },
    { id: '4', text: '团队业绩排行分析', category: 'team' },
    { id: '5', text: '本月收益预测', category: 'data' },
    { id: '6', text: '有哪些待处理事项？', category: 'operation' },
  ] as AssistantSuggestion[],
  capabilities: ['数据分析', '运营建议', '推广策略', '团队管理', '收益预测'],
}

// 根据用户输入生成 AI 回复（对齐原型 sendAssistantMessage 分支）
export function buildAssistantReply(content: string): {
  text: string
  chart?: ChartData
  table?: TableData
  actions?: ActionSuggestion[]
} {
  if (content.includes('数据') || content.includes('总结')) {
    return {
      text:
        '## 本周运营数据总结\n\n根据后台数据分析，本周您的分站整体表现良好：\n\n' +
        '### 核心指标\n' +
        '- **新增用户**：156人，环比上周增长 23.8%\n' +
        '- **活跃用户**：892人，日均活跃率 68.5%\n' +
        '- **订单数量**：78单，转化率 8.7%\n' +
        '- **总收益**：¥12,580，环比增长 15.2%\n\n' +
        '### 数据趋势\n\n以下是近7天的用户增长趋势：',
      chart: {
        type: 'line',
        title: '近7天用户增长趋势',
        data: [
          { label: '周一', value: 18 },
          { label: '周二', value: 25 },
          { label: '周三', value: 22 },
          { label: '周四', value: 28 },
          { label: '周五', value: 32 },
          { label: '周六', value: 15 },
          { label: '周日', value: 16 },
        ],
      },
      actions: [
        { title: '查看详细报表', description: '进入数据中心查看完整分析', link: '/station/analytics', priority: 'medium' },
        { title: '导出周报', description: '生成并下载本周运营报告', priority: 'low' },
      ],
    }
  }
  if (content.includes('活跃') || content.includes('提升')) {
    return {
      text:
        '## 提升用户活跃度的策略建议\n\n' +
        '基于您分站的用户行为数据分析，我为您整理了以下提升活跃度的方案：\n\n' +
        '### 1. 内容运营\n' +
        '- 增加每日签到奖励，连续签到可获得额外积分\n' +
        '- 定期举办主题活动，如"每周命理问答"、"风水知识竞赛"\n' +
        '- 邀请讲师进行直播互动，预告提前3天推送\n\n' +
        '### 2. 社群运营\n' +
        '- 建立核心用户群，每周定期分享专属内容\n' +
        '- 开展老带新活动，邀请奖励双方\n' +
        '- 设立"本周之星"荣誉榜，增强用户荣誉感\n\n' +
        '### 3. 消息触达\n' +
        '- 优化推送时间，根据数据显示，晚8-10点打开率最高\n' +
        '- 个性化推送内容，基于用户兴趣标签\n' +
        '- 沉默用户召回，7天未登录用户发送专属优惠\n\n' +
        '> 建议优先实施签到系统升级，预计可提升日活15%-20%',
      actions: [
        { title: '创建签到活动', description: '配置每日签到奖励规则', link: '/station/activities/checkin', priority: 'high' },
        { title: '设置推送计划', description: '配置自动推送任务', link: '/station/push', priority: 'medium' },
        { title: '查看用户画像', description: '了解用户兴趣分布', link: '/station/users/profile', priority: 'low' },
      ],
    }
  }
  if (content.includes('推广') || content.includes('策略')) {
    return {
      text:
        '## 推广策略建议\n\n' +
        '根据当前市场情况和您分站的定位，推荐以下推广方案：\n\n' +
        '### 短期见效策略（1-2周）\n' +
        '1. **限时优惠活动**：新用户首单5折，刺激快速转化\n' +
        '2. **裂变红包**：分享课程链接，好友购买返现20%\n' +
        '3. **直播引流**：每周固定时间开播，培养用户习惯\n\n' +
        '### 中期增长策略（1-3月）\n' +
        '1. **内容营销**：在小红书/抖音发布国学知识短视频\n' +
        '2. **KOL合作**：联系5-10位命理博主进行课程推荐\n' +
        '3. **社群矩阵**：建立3-5个不同主题的兴趣社群\n\n' +
        '### 各渠道预期ROI对比',
      table: {
        title: '推广渠道效果预估',
        headers: ['渠道', '投入成本', '预期用户', 'ROI'],
        rows: [
          ['朋友圈广告', '¥3,000', '150-200人', '1:2.5'],
          ['小红书种草', '¥1,500', '80-120人', '1:3.2'],
          ['抖音引流', '¥2,000', '200-300人', '1:2.8'],
          ['KOL合作', '¥5,000', '300-500人', '1:3.5'],
          ['老用户裂变', '¥500', '50-80人', '1:4.0'],
        ],
      },
      actions: [
        { title: '创建优惠活动', description: '配置新用户专享优惠', link: '/station/promotions/create', priority: 'high' },
        { title: '生成推广素材', description: '下载海报和文案模板', link: '/station/materials', priority: 'high' },
        { title: '设置分销奖励', description: '配置裂变返现规则', link: '/station/commission', priority: 'medium' },
      ],
    }
  }
  if (content.includes('团队') || content.includes('排行')) {
    return {
      text:
        '## 团队业绩分析\n\n' +
        '截至今日，您的团队整体表现如下：\n\n' +
        '### 团队概况\n' +
        '- 团队总人数：28人\n' +
        '- 本月新增成员：5人\n' +
        '- 活跃成员比例：78.6%\n' +
        '- 团队总佣金：¥45,680\n\n' +
        '### 本月业绩TOP5',
      table: {
        title: '团队业绩排行榜',
        headers: ['排名', '成员', '邀请数', '成交额', '佣金'],
        rows: [
          ['🥇 1', '张三', '45人', '¥18,500', '¥3,700'],
          ['🥈 2', '李四', '38人', '¥15,200', '¥3,040'],
          ['🥉 3', '王五', '32人', '¥12,800', '¥2,560'],
          ['4', '赵六', '28人', '¥10,500', '¥2,100'],
          ['5', '钱七', '25人', '¥9,800', '¥1,960'],
        ],
      },
      chart: {
        type: 'pie',
        title: '团队等级分布',
        data: [
          { label: '金牌成员', value: 5, color: '#FFD700' },
          { label: '银牌成员', value: 8, color: '#C0C0C0' },
          { label: '铜牌成员', value: 15, color: '#CD7F32' },
        ],
      },
      actions: [
        { title: '查看完整排行', description: '进入团队管理查看详情', link: '/station/team', priority: 'medium' },
        { title: '发放激励奖金', description: '为TOP成员发放奖励', priority: 'low' },
      ],
    }
  }
  if (content.includes('待处理') || content.includes('事项')) {
    return {
      text:
        '## 待处理事项提醒\n\n' +
        '您目前有以下事项需要处理：\n\n' +
        '### 紧急事项 🔴\n' +
        '1. **3笔退款申请待审核** - 用户等待时间已超24小时\n' +
        '2. **1个举报内容待处理** - 涉及违规推广\n\n' +
        '### 重要事项 🟡\n' +
        '1. **5个新成员待审核** - 申请加入您的分站\n' +
        '2. **本月优惠券即将到期** - 还有127张未使用\n' +
        '3. **2个直播预约待确认** - 讲师已提交申请\n\n' +
        '### 一般事项 🟢\n' +
        '1. 12条用户反馈未读\n' +
        '2. 周报数据已生成，可查看下载\n' +
        '3. 3个新课程等待上架',
      actions: [
        { title: '处理退款申请', description: '审核待处理的退款请求', link: '/station/orders/refund', priority: 'high' },
        { title: '审核新成员', description: '处理成员加入申请', link: '/station/team/pending', priority: 'medium' },
        { title: '查看用户反馈', description: '了解用户意见和建议', link: '/station/feedback', priority: 'low' },
      ],
    }
  }
  return {
    text:
      '好的，我来为您分析一下。\n\n' +
      '根据您的问题，我建议您可以从以下几个方面入手：\n\n' +
      '1. **数据驱动决策**：定期查看运营数据报表，了解用户行为趋势\n' +
      '2. **内容质量优先**：确保分站内容的专业性和实用性\n' +
      '3. **用户运营精细化**：针对不同用户群体制定差异化策略\n' +
      '4. **团队协作高效化**：建立清晰的工作流程和激励机制\n\n' +
      '如果您需要更具体的建议，可以告诉我您想了解的具体方向，比如：\n' +
      '- 本周数据总结\n' +
      '- 如何提升活跃度\n' +
      '- 推广策略建议\n' +
      '- 团队业绩分析',
    actions: [
      { title: '本周数据总结', priority: 'medium' },
      { title: '推广策略建议', priority: 'medium' },
    ],
  }
}

// ===== stationAssistantApi — 站长助手数据 API 层 =====
export const stationAssistantApi = {
  async getConfig() {
    if (useMock()) return assistantConfig
    try { return await apiGet<any>('/station/assistant/config') }
    catch { return assistantConfig }
  },
  async sendMessage(content: string) {
    if (useMock()) return buildAssistantReply(content)
    try { return await apiPost<any>('/station/assistant/chat', { content }) }
    catch { return buildAssistantReply(content) }
  },
}
