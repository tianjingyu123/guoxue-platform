// ===== 站长助手 assistant 数据层 =====
// 真连核实结论（2026-06-28）：后端 station 模块 5 个 controller
// （station / station/dashboard / station/operator-dashboard / station/micro-page
// / station/promotion / admin/referral）均无 assistant 相关端点；
// bot 模块仅有 :id/chat（智能体广场/圈主助理，需 botId，属另一套体系）。
// 即不存在分站专属的 /station/assistant/config 与 /station/assistant/chat。
// 因此：
//   getConfig() —— 纯前端 UI 配置（助手名/欢迎语/建议词/能力标签），保留静态常量，去掉伪装的 if(true)；
//   sendMessage() —— 无对应 AI 对话端点，诚实降级返回明确提示，绝不再返回伪造的运营数据/图表/排行。

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

export interface AssistantReply {
  text: string
  chart?: ChartData
  table?: TableData
  actions?: ActionSuggestion[]
}

// 纯前端 UI 配置（非后端数据，无对应端点；用于渲染助手头部/欢迎区/建议词）
export const assistantConfig = {
  name: '站长助理',
  welcomeMessage:
    '您好，我是您的专属站长运营助理。智能问答功能正在接入中，敬请期待。当前您可前往「数据中心」「团队管理」「推广素材」查看分站真实经营数据。',
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

// 诚实降级回复：后端尚无 AI 对话端点，引导用户前往真实数据页，不伪造任何运营指标
function buildDegradedReply(): AssistantReply {
  return {
    text:
      '## 智能问答暂未开放\n\n' +
      '抱歉，AI 运营助手尚未接入后端服务，暂时无法基于实时数据为您解答。\n\n' +
      '在此期间，您可以前往以下页面查看分站的真实经营数据：\n\n' +
      '- **数据中心**：分站用户、订单、收益等核心指标\n' +
      '- **团队管理**：团队成员构成与业绩明细\n' +
      '- **推广素材**：海报、文案等推广物料\n\n' +
      '> 该功能开放后将第一时间通知您。',
    actions: [
      { title: '查看数据中心', description: '分站经营数据', link: '/pkg-operator/analysis/index', priority: 'medium' },
      { title: '团队管理', description: '成员与业绩', link: '/pkg-operator/team/index', priority: 'low' },
    ],
  }
}

// ===== stationAssistantApi — 站长助手数据 API 层 =====
export const stationAssistantApi = {
  // 纯 UI 配置，直接返回静态常量（后端无 /station/assistant/config 端点）
  async getConfig() {
    return assistantConfig
  },
  // 后端无 /station/assistant/chat 等 AI 对话端点 → 诚实降级，不再返回伪造数据
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendMessage(_content: string): Promise<AssistantReply> {
    return buildDegradedReply()
  },
}
