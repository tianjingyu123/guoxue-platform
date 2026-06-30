/**
 * 圈主助理·知识库 数据层
 * 真连后端知识库 CRUD + 候选审核（circle-knowledge.controller，均需圈主权限）。
 * 后端知识条目是 RAG 文本块（content + sourceType），无原型臆想的 title/summary/tags；
 * title/summary 由 content 派生，tags 不展示（不造假）。
 */
import { apiGet, apiPost, apiDelete } from '@/utils/request'

export interface KnowledgeItem {
  id: string
  title: string          // 由 content 首行派生
  summary: string        // 由 content 截断派生
  content: string        // 知识块全文
  sourceLabel: string    // 来源类型中文
  createdAt: string
  qualityScore?: number  // 已入库：质量分
  similarityScore?: number // 候选：与已有内容相似度
}

const SOURCE_LABEL: Record<string, string> = {
  article: '文章', post: '帖子', course: '课程', file: '文件', manual: '手动添加', free_text: '文本',
}

function deriveTitle(content: string): string {
  const first = (content.split('\n')[0] || '').trim()
  return first.length > 24 ? first.slice(0, 24) + '…' : (first || '知识条目')
}

function adapt(k: any): KnowledgeItem {
  const content = k.content || ''
  return {
    id: k.id,
    title: deriveTitle(content),
    summary: content.length > 80 ? content.slice(0, 80) + '…' : content,
    content,
    sourceLabel: SOURCE_LABEL[k.sourceType] || '其他',
    createdAt: k.addedAt || k.createdAt || '',
    qualityScore: typeof k.qualityScore === 'number' ? k.qualityScore : undefined,
    similarityScore: typeof k.similarityScore === 'number' ? k.similarityScore : undefined,
  }
}

function pickArray(res: any): any[] {
  return Array.isArray(res) ? res : (res?.items ?? res?.data ?? res?.list ?? [])
}

export const knowledgeApi = {
  /** 已入库知识条目 — GET /circles/:id/knowledge */
  list: async (circleId: string): Promise<KnowledgeItem[]> => {
    try {
      return pickArray(await apiGet<any>(`/circles/${circleId}/knowledge?pageSize=50`)).map(adapt)
    } catch { return [] }
  },
  /** 待审核候选 — GET /circles/:id/knowledge/candidates */
  candidates: async (circleId: string): Promise<KnowledgeItem[]> => {
    try {
      return pickArray(await apiGet<any>(`/circles/${circleId}/knowledge/candidates?pageSize=50`)).map(adapt)
    } catch { return [] }
  },
  /** 确认候选入库 */
  confirm: (circleId: string, id: string) =>
    apiPost(`/circles/${circleId}/knowledge/candidates/${id}/confirm`),
  /** 拒绝候选 */
  reject: (circleId: string, id: string) =>
    apiPost(`/circles/${circleId}/knowledge/candidates/${id}/reject`),
  /** 手动添加知识条目 — POST /circles/:id/knowledge */
  add: (circleId: string, content: string) =>
    apiPost(`/circles/${circleId}/knowledge`, { sourceType: 'manual', content }),
  /** 删除知识条目 — DELETE /circles/:id/knowledge/:id */
  remove: (circleId: string, id: string) =>
    apiDelete(`/circles/${circleId}/knowledge/${id}`),
}
