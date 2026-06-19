/**
 * 克制型 AI 辅助数据类型（母版系统）
 *
 * 与原型已有的「对话式 AI 助手」互补：这是轻量内联辅助——
 * 用户在写评论/创作内容/学习笔记时，就地润色/摘要/续写/取标题，
 * 结果直接可用，不打断心流，不弹全屏对话。
 */

// AI 辅助能力类型
export type AIAssistAction =
  | 'polish' // 润色：让文字更通顺优雅
  | 'summarize' // 摘要：提炼要点
  | 'continue' // 续写：顺着思路往下写
  | 'title' // 取标题：生成标题候选
  | 'expand' // 扩写：把短句展开
  | 'classical' // 雅化：转为国风文言风格

// 能力元信息（图标在组件内映射）
export interface AIAssistCapability {
  action: AIAssistAction
  label: string
  hint: string
}

// 辅助场景（决定可用能力集与文案）
export type AIAssistScene = 'comment' | 'creation' | 'note' | 'title'

// 一次辅助请求
export interface AIAssistRequest {
  action: AIAssistAction
  input: string
  scene: AIAssistScene
}

// 一次辅助结果
export interface AIAssistResult {
  action: AIAssistAction
  /** 候选结果，可能多条（如取标题） */
  candidates: string[]
}

// 各场景默认开放的能力
export const SCENE_CAPABILITIES: Record<AIAssistScene, AIAssistCapability[]> = {
  comment: [
    { action: 'polish', label: '润色', hint: '让表达更得体' },
    { action: 'classical', label: '雅化', hint: '转为国风文言' },
  ],
  creation: [
    { action: 'polish', label: '润色', hint: '优化文笔' },
    { action: 'expand', label: '扩写', hint: '展开成段' },
    { action: 'continue', label: '续写', hint: '顺势而下' },
    { action: 'classical', label: '雅化', hint: '国风文言' },
  ],
  note: [
    { action: 'summarize', label: '提炼', hint: '归纳要点' },
    { action: 'polish', label: '润色', hint: '梳理表达' },
  ],
  title: [{ action: 'title', label: '取标题', hint: '生成标题候选' }],
}
