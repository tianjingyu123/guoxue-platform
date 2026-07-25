/**
 * 智能体跨场景视觉与体验协议。
 *
 * 卡片尺寸由首页、发现页、圈子和广场各自的内容密度决定；
 * 类别颜色、核心字形、动效和对话体验则统一从这里读取。
 */
export interface AgentVisualTheme {
  key: string
  label: string
  glyph: string
  deep: string
  accent: string
  glow: string
  ink: string
  soft: string
  wash: string
  gradient: string
}

export interface AgentExperience {
  theme: AgentVisualTheme
  modeLabel: string
  welcome: string
  quickQuestions: string[]
  taskTitle: string
  taskHint: string
  tasks: Array<{ label: string; description: string }>
  answerKicker: string
  answerTitle: string
  detailOpen: string
  detailClose: string
  nextLabel: string
  nextText: string
}

const THEMES: Record<string, AgentVisualTheme> = {
  CLASSICS_READING: {
    key: 'CLASSICS_READING',
    label: '经典研读',
    glyph: '古',
    deep: '#073B73',
    accent: '#168BD2',
    glow: 'rgba(79,201,255,.44)',
    ink: '#12659D',
    soft: '#E8F6FF',
    wash: '#F5FBFF',
    gradient: 'linear-gradient(145deg,#073B73,#168BD2)',
  },
  POETRY_ART: {
    key: 'POETRY_ART',
    label: '诗词艺术',
    glyph: '诗',
    deep: '#4A176F',
    accent: '#B640E2',
    glow: 'rgba(246,117,255,.38)',
    ink: '#8930AA',
    soft: '#F8EAFE',
    wash: '#FEF7FF',
    gradient: 'linear-gradient(145deg,#4A176F,#B640E2)',
  },
  WRITING_STUDIO: {
    key: 'WRITING_STUDIO',
    label: '文化表达',
    glyph: '国',
    deep: '#6D1B52',
    accent: '#E74C92',
    glow: 'rgba(255,132,194,.4)',
    ink: '#A72E6A',
    soft: '#FDEAF4',
    wash: '#FFF8FC',
    gradient: 'linear-gradient(145deg,#6D1B52,#E74C92)',
  },
  RITES_CULTURE: {
    key: 'RITES_CULTURE',
    label: '礼乐生活',
    glyph: '礼',
    deep: '#74330B',
    accent: '#ED8B2D',
    glow: 'rgba(255,194,92,.42)',
    ink: '#A85B16',
    soft: '#FFF1DE',
    wash: '#FFFBF5',
    gradient: 'linear-gradient(145deg,#74330B,#ED8B2D)',
  },
  LEARNING_GROWTH: {
    key: 'LEARNING_GROWTH',
    label: '学习成长',
    glyph: '学',
    deep: '#075A55',
    accent: '#16A58A',
    glow: 'rgba(68,234,202,.38)',
    ink: '#0D7A69',
    soft: '#E2F8F3',
    wash: '#F5FCFA',
    gradient: 'linear-gradient(145deg,#075A55,#16A58A)',
  },
  YIJING_STUDY: {
    key: 'YIJING_STUDY',
    label: '易学研习',
    glyph: '易',
    deep: '#29276E',
    accent: '#6C63E8',
    glow: 'rgba(142,151,255,.46)',
    ink: '#514AC4',
    soft: '#ECEBFF',
    wash: '#F8F8FF',
    gradient: 'linear-gradient(145deg,#29276E,#6C63E8)',
  },
}

const LABEL_TO_KEY: Record<string, string> = Object.values(THEMES).reduce((map, theme) => {
  map[theme.label] = theme.key
  return map
}, {} as Record<string, string>)

export function resolveAgentTheme(value?: string): AgentVisualTheme {
  const raw = String(value || '').trim()
  if (THEMES[raw]) return THEMES[raw]
  if (LABEL_TO_KEY[raw]) return THEMES[LABEL_TO_KEY[raw]]
  if (/诗词|诗歌|格律/.test(raw)) return THEMES.POETRY_ART
  if (/写作|表达|文案|创作/.test(raw)) return THEMES.WRITING_STUDIO
  if (/礼乐|礼俗|节气|文化生活/.test(raw)) return THEMES.RITES_CULTURE
  if (/亲子|蒙学|规划|学习成长/.test(raw)) return THEMES.LEARNING_GROWTH
  if (/周易|易经|象数|卦象|易学/.test(raw)) return THEMES.YIJING_STUDY
  return THEMES.CLASSICS_READING
}

const EXPERIENCE: Record<string, Omit<AgentExperience, 'theme'>> = {
  CLASSICS_READING: {
    modeLabel: '句读知识卡',
    welcome: '把想读懂的古文、典故或成语发给我。我会按“原文—句读—释词—白话—出处”整理成一张易读知识卡。',
    quickQuestions: ['帮我断句并翻译这段古文', '查一条典故的原始出处', '解释一个古字在原文中的意思'],
    taskTitle: '从哪里开始',
    taskHint: '粘贴原文即可，不必先整理',
    tasks: [
      { label: '句读', description: '标点、分层并梳理语气' },
      { label: '释词', description: '解释古今异义与关键字' },
      { label: '溯源', description: '核对出处、版本与语境' },
    ],
    answerKicker: '句读知识卡',
    answerTitle: '先看白话要点',
    detailOpen: '展开逐句释义',
    detailClose: '收起逐句释义',
    nextLabel: '继续研读',
    nextText: '可选一句继续追问字词、章法或历史语境。',
  },
  POETRY_ART: {
    modeLabel: '诗境赏析卡',
    welcome: '发来一首诗词或你的仿作。我会从意象、声律、用典与时代背景入手，让赏析更有画面。',
    quickQuestions: ['赏析这首诗的意象和情感', '帮我检查格律与押韵', '陪我仿写一首同题诗'],
    taskTitle: '选择一种读法',
    taskHint: '赏析与仿写使用不同模板',
    tasks: [
      { label: '观意象', description: '看见诗中的景、物与情' },
      { label: '听声律', description: '理解节奏、押韵和转折' },
      { label: '学仿写', description: '给范式、修改与理由' },
    ],
    answerKicker: '诗境赏析卡',
    answerTitle: '先入诗境',
    detailOpen: '展开格律与用典',
    detailClose: '收起格律与用典',
    nextLabel: '下一步',
    nextText: '可以继续看某一意象，也可以按同一格律试写一句。',
  },
  WRITING_STUDIO: {
    modeLabel: '国风写作台',
    welcome: '告诉我用途、读者和语气，再贴上草稿。我会给出简洁版、典雅版，并说明每一处关键修改。',
    quickQuestions: ['帮我润色一封家书', '把这段话改得典雅但易懂', '为活动写一段国风开场'],
    taskTitle: '先确定写作任务',
    taskHint: '用途越清楚，成稿越贴合',
    tasks: [
      { label: '定语气', description: '庄重、温暖或清雅' },
      { label: '出双稿', description: '简洁版与典雅版对照' },
      { label: '讲修改', description: '说明措辞与典故依据' },
    ],
    answerKicker: '国风写作方案',
    answerTitle: '先看推荐成稿',
    detailOpen: '展开修改说明',
    detailClose: '收起修改说明',
    nextLabel: '继续打磨',
    nextText: '补充使用场景或目标读者，我可以再调整语气与篇幅。',
  },
  RITES_CULTURE: {
    modeLabel: '礼俗生活指南',
    welcome: '说说你的节日、待客或家礼场景。我会区分传统制度、地方习俗与当代做法，给出可执行的文化方案。',
    quickQuestions: ['这个节俗最早从哪里来', '家庭待客有哪些得体做法', '设计一个节气亲子活动'],
    taskTitle: '把传统放回生活',
    taskHint: '不渲染禁忌，尊重地域差异',
    tasks: [
      { label: '讲来历', description: '厘清传统与历史语境' },
      { label: '辨差异', description: '区分地域与时代做法' },
      { label: '给方案', description: '转化为现代生活步骤' },
    ],
    answerKicker: '礼俗生活指南',
    answerTitle: '先看当代用法',
    detailOpen: '展开传统来历',
    detailClose: '收起传统来历',
    nextLabel: '因地制宜',
    nextText: '补充地区、人数和场合后，可进一步细化流程。',
  },
  LEARNING_GROWTH: {
    modeLabel: '学习路线图',
    welcome: '告诉我你的兴趣、基础和每周时间。我会把经典阅读拆成书目、周任务、复习卡和可完成的里程碑。',
    quickQuestions: ['帮我制定四周入门计划', '孩子几岁适合读这本蒙学', '把这章变成亲子互动问答'],
    taskTitle: '搭一条走得下去的路',
    taskHint: '轻量、可执行、能复盘',
    tasks: [
      { label: '定目标', description: '明确兴趣与学习成果' },
      { label: '排节奏', description: '按时间拆成每周任务' },
      { label: '做复盘', description: '用问答卡检查理解' },
    ],
    answerKicker: '学习路线图',
    answerTitle: '先看本周起步',
    detailOpen: '展开完整计划',
    detailClose: '收起完整计划',
    nextLabel: '持续学习',
    nextText: '完成一周后告诉我反馈，我会调整后续难度与节奏。',
  },
  YIJING_STUDY: {
    modeLabel: '易学研习笔记',
    welcome: '选择卦名、卦辞或一个象数概念。我会从经传文本、爻位结构与历代注解入手，只做经典研习与思维训练。',
    quickQuestions: ['带我读懂一个卦的结构', '解释卦辞与象传的关系', '给我一道象数思维练习'],
    taskTitle: '从文本进入易学',
    taskHint: '专注经典结构，不作个人结果预测',
    tasks: [
      { label: '识卦象', description: '观察上下卦与爻位关系' },
      { label: '读经传', description: '对照卦爻辞与象传' },
      { label: '练思维', description: '分析变量、关系与变化' },
    ],
    answerKicker: '易学研习笔记',
    answerTitle: '先看卦理提要',
    detailOpen: '展开经传与注家',
    detailClose: '收起经传与注家',
    nextLabel: '继续研习',
    nextText: '可以继续选一爻细读，或做一道结构化思维练习。',
  },
}

export function resolveAgentExperience(detail: { type?: string; name?: string; description?: string }): AgentExperience {
  const source = [detail.type, detail.name, detail.description].filter(Boolean).join(' ')
  const theme = resolveAgentTheme(source)
  return { theme, ...EXPERIENCE[theme.key] }
}

export function agentThemeStyle(value?: string): Record<string, string> {
  const theme = resolveAgentTheme(value)
  return {
    '--agent-deep': theme.deep,
    '--agent-accent': theme.accent,
    '--agent-glow': theme.glow,
    '--agent-ink': theme.ink,
    '--agent-soft': theme.soft,
    '--agent-wash': theme.wash,
  }
}
