/**
 * 克制型 AI 辅助数据类型 + Mock（母版系统）
 *
 * 轻量内联辅助：润色/摘要/续写/取标题/扩写/雅化，结果一键采用。
 * 真实接入时替换 runAIAssist 为 AI SDK 调用即可，组件层无需改动。
 */
import { apiGet, apiPost, useMock } from '@/utils/request'

export type AIAssistAction =
  | 'polish'
  | 'summarize'
  | 'continue'
  | 'title'
  | 'expand'
  | 'classical'

export interface AIAssistCapability {
  action: AIAssistAction
  label: string
  hint: string
}

export type AIAssistScene = 'comment' | 'creation' | 'note' | 'title'

export interface AIAssistRequest {
  action: AIAssistAction
  input: string
  scene: AIAssistScene
}

export interface AIAssistResult {
  action: AIAssistAction
  candidates: string[]
}

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

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function runAIAssist(req: AIAssistRequest): Promise<AIAssistResult> {
  await delay(600)
  const { action, input } = req
  const base = input.trim()

  switch (action) {
    case 'polish':
      return {
        action,
        candidates: [`${base}。（润色：表达更得体流畅）`, `窃以为，${base}，诚为至理。`],
      }
    case 'classical':
      return {
        action,
        candidates: [`${base}——译为雅言：「${base.slice(0, 8)}…」之意，古风盎然。`],
      }
    case 'summarize':
      return { action, candidates: [`要点：${base.slice(0, 20)}…`] }
    case 'continue':
      return { action, candidates: [`${base}……承上所言，更进一层。`] }
    case 'expand':
      return { action, candidates: [`${base}。细究其理，可从三方面展开：其一……其二……其三……`] }
    case 'title':
      return {
        action,
        candidates: [`论「${base.slice(0, 6)}」`, `${base.slice(0, 4)}小记`, `闲话${base.slice(0, 4)}`],
      }
    default:
      return { action, candidates: [base] }
  }
}

// ===== API 对象 =====

export const aiAssistApi = {
  /** 执行 AI 辅助操作 POST /ai/assist */
  async run(req: AIAssistRequest): Promise<AIAssistResult> {
    if (useMock()) return runAIAssist(req)
    try {
      return await apiPost<AIAssistResult>('/ai/assist', req)
    } catch {
      return runAIAssist(req)
    }
  },
}
