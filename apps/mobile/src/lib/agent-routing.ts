/**
 * 智能体专业分工与确定性转介。
 *
 * 这层不依赖大模型自由发挥：涉及个人结果预测时统一交给排盘工具；
 * 明确属于其他专业的问题，交给对应领域学伴。这样 H5、小程序和 App
 * 即使走不同对话链路，也能保持相同的专业边界。
 */
export interface AgentReferral {
  kind: 'paipan' | 'agent'
  eyebrow: string
  title: string
  description: string
  reason: string
  actionLabel: string
  route: string
  glyph: string
  tone: 'crimson' | 'indigo' | 'cyan' | 'violet' | 'jade' | 'amber'
}

interface Specialist {
  key: string
  id: string
  name: string
  glyph: string
  tone: AgentReferral['tone']
  match: RegExp
  reason: string
}

const SPECIALISTS: Specialist[] = [
  {
    key: 'POETRY_ART',
    id: 'b1000001-0000-0000-0000-000000000002',
    name: '诗词鉴赏导师',
    glyph: '诗',
    tone: 'violet',
    match: /诗词|诗歌|格律|押韵|平仄|意象|仿写/,
    reason: '它会从意象、声律、用典和时代背景逐层陪读。',
  },
  {
    key: 'CLASSICS_READING',
    id: 'b1000001-0000-0000-0000-000000000001',
    name: '古籍句读助手',
    glyph: '古',
    tone: 'cyan',
    match: /古文|古籍|句读|断句|释词|白话翻译|文言文/,
    reason: '它能按原文、句读、释词、白话和出处整理知识卡。',
  },
  {
    key: 'CLASSICS_READING',
    id: 'b1000001-0000-0000-0000-000000000003',
    name: '典故溯源官',
    glyph: '典',
    tone: 'cyan',
    match: /典故|成语|出处|词义演变|用典/,
    reason: '它专门核对原始出处、历史语境与今天的正确用法。',
  },
  {
    key: 'WRITING_STUDIO',
    id: 'b1000001-0000-0000-0000-000000000004',
    name: '国风写作陪练',
    glyph: '文',
    tone: 'violet',
    match: /写作|润色|改写|家书|祝词|序言|文案/,
    reason: '它会给简洁版、典雅版成稿，并解释关键修改。',
  },
  {
    key: 'RITES_CULTURE',
    id: 'b1000001-0000-0000-0000-000000000005',
    name: '礼乐生活顾问',
    glyph: '礼',
    tone: 'amber',
    match: /礼仪|礼俗|称谓|待客|婚礼|祭礼|节俗/,
    reason: '它会区分历史制度、地方习俗与当代可行做法。',
  },
  {
    key: 'RITES_CULTURE',
    id: 'b1000001-0000-0000-0000-000000000006',
    name: '节气生活家',
    glyph: '节',
    tone: 'amber',
    match: /节气|物候|农事|时令|二十四节气/,
    reason: '它能把物候、诗词、民俗与生活活动连接起来。',
  },
  {
    key: 'LEARNING_GROWTH',
    id: 'b1000001-0000-0000-0000-000000000007',
    name: '亲子蒙学伴读',
    glyph: '童',
    tone: 'jade',
    match: /蒙学|三字经|千字文|弟子规|亲子|孩子.*国学/,
    reason: '它会按孩子年龄，用故事、知识点和互动问题讲解。',
  },
  {
    key: 'LEARNING_GROWTH',
    id: 'b1000001-0000-0000-0000-000000000008',
    name: '国学学习规划师',
    glyph: '学',
    tone: 'jade',
    match: /学习计划|阅读路线|入门路线|怎么学|学习规划/,
    reason: '它会按目标、基础和时间生成可执行的阶段计划。',
  },
  {
    key: 'YIJING_STUDY',
    id: 'b1000001-0000-0000-0000-000000000009',
    name: '易经卦象研习官',
    glyph: '易',
    tone: 'indigo',
    match: /周易|易经|卦辞|爻辞|象传|卦象|十神|干支|五行|命理知识/,
    reason: '它专注经传文本、术数原理与学习方法，不作个人结果判断。',
  },
  {
    key: 'YIJING_STUDY',
    id: 'b1000001-0000-0000-0000-000000000010',
    name: '象数思维训练师',
    glyph: '数',
    tone: 'indigo',
    match: /象数|取象|阴阳变化|变化思维|梅花易数.*学习/,
    reason: '它把象数转化为变量、关系与变化条件的思维练习。',
  },
]

const PREDICTION_RE = /运势|算命|预测|吉凶|测一测|事业运|财运|桃花运|婚姻运|健康运|流年|大运|命运|合婚|何时结婚|能不能发财|会不会成功|未来如何|结果怎么样/
const BIRTH_DETAILS_RE = /(出生年月|生辰|看八字|批八字)|((19\d{2}|20\d{2})\s*[年\-./]\s*\d{1,2}\s*[月\-./]\s*\d{1,2}.*(男|女|出生|时|点))/
const LEARNING_CONTEXT_RE = /学习|原理|历史|经典|文本|知识|含义|怎么理解|如何入门|研究|课程|讲解/

export function resolveAgentReferral(
  query: string,
  currentType = 'GUIDE',
  currentName = '',
): AgentReferral | null {
  const text = String(query || '').trim()
  if (!text) return null

  if ((PREDICTION_RE.test(text) || BIRTH_DETAILS_RE.test(text)) && !LEARNING_CONTEXT_RE.test(text)) {
    return {
      kind: 'paipan',
      eyebrow: '专业能力转介',
      title: '这类问题，交给专业排盘更合适',
      description: '我可以陪你理解相关文化与原理；涉及个人盘面和阶段性趋势时，平台排盘工具会先调用专业算法生成真实盘面，再提供对应解读。',
      reason: '不是把问题推开，而是把它交给更准确、可核对的工具链。',
      actionLabel: '进入排盘工具',
      route: '/pages/paipan/index',
      glyph: '盘',
      tone: 'crimson',
    }
  }

  const specialist = SPECIALISTS.find((item) => item.match.test(text))
  if (!specialist) return null

  const isGuide = currentType === 'GUIDE' || /智玄|向导|客服/.test(currentName)
  const sameDomain = currentType === specialist.key
  const sameAgent = currentName === specialist.name
  if (!isGuide && (sameDomain || sameAgent)) return null

  return {
    kind: 'agent',
    eyebrow: '专业学伴接力',
    title: `推荐由「${specialist.name}」继续回答`,
    description: specialist.reason,
    reason: '专业问题由对应领域智能体回答，内容会更深入，展示模板也会贴合这个学科。',
    actionLabel: '交给专业学伴',
    route: `/pkg-agent/agent/chat?id=${specialist.id}&q=${encodeURIComponent(text)}`,
    glyph: specialist.glyph,
    tone: specialist.tone,
  }
}
