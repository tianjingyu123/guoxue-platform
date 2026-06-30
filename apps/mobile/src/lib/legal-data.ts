// 法律文档数据层
// 后端真源：GET /system/legal/:type（system/legal.controller.ts，操作 LegalDocument 表）
//   - 返回单条 { id, type, version, title, content(Markdown), publishedAt, status } 或 null（公开，无需鉴权）
//   - 后端 type 枚举为 agreement / privacy / community（见 dto/legal.dto.ts）
//   - content 为 Markdown 纯文本，本层适配为结构化 sections 供原生渲染
// ⚠️ 后端能力缺口（诚实降级，详见各方法注释）：
//   - 无「确认协议」写端点（controller 仅 GET / 管理端 POST/PUT/DELETE）→ confirm 本地降级
//   - 无「待确认列表」端点，也无按用户记录确认状态的表 → getPendingConfirms 返回 []
//   - 后端 type 无 child-privacy → 该类型 getDoc 返回 null（页面走空态）

import { apiGet } from '@/utils/request'

// 行内片段（支持加粗）
export interface LegalInline {
  text: string
  bold?: boolean
}

// 内容块：段落 p / 无序列表 ul
export type LegalBlock =
  | { type: 'p'; runs: LegalInline[] }
  | { type: 'ul'; items: string[] }

// 章节（h2，带锚点 id 供目录跳转）
export interface LegalSection {
  id: string
  title: string
  level: number
  blocks: LegalBlock[]
}

export interface LegalDoc {
  type: string
  title: string
  version: string
  effectiveDate: string // 源自后端 publishedAt（YYYY-MM-DD）
  updatedAt?: string
  summary?: string
  sections: LegalSection[]
}

// 目录项
export interface LegalTocItem {
  id: string
  title: string
  level: number
}

// 从文档提取目录
export function extractToc(doc: LegalDoc): LegalTocItem[] {
  return doc.sections.map((s) => ({ id: s.id, title: s.title, level: s.level }))
}

// ============ Markdown → 结构化 sections 适配 ============

// 解析行内加粗 **xxx**
function parseRuns(text: string): LegalInline[] {
  const runs: LegalInline[] = []
  const re = /\*\*([^*]+)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index) })
    runs.push({ text: m[1], bold: true })
    last = m.index + m[0].length
  }
  if (last < text.length) runs.push({ text: text.slice(last) })
  return runs.length ? runs : [{ text }]
}

// 将后端 Markdown content 解析为章节结构
function parseMarkdownSections(md: string): LegalSection[] {
  const lines = (md || '').replace(/\r\n/g, '\n').split('\n')
  const sections: LegalSection[] = []
  let cur: LegalSection | null = null
  let ulItems: string[] | null = null
  let idx = 0

  const ensureSection = (): LegalSection => {
    if (!cur) {
      cur = { id: `sec-${idx++}`, title: '', level: 2, blocks: [] }
      sections.push(cur)
    }
    return cur
  }
  const flushUl = () => {
    if (ulItems && ulItems.length) ensureSection().blocks.push({ type: 'ul', items: ulItems })
    ulItems = null
  }

  for (const raw of lines) {
    const line = raw.trim()
    const heading = line.match(/^(#{1,4})\s+(.*)$/)
    if (heading) {
      flushUl()
      cur = { id: `sec-${idx++}`, title: heading[2].trim(), level: 2, blocks: [] }
      sections.push(cur)
      continue
    }
    const li = line.match(/^[-*]\s+(.*)$/)
    if (li) {
      if (!ulItems) ulItems = []
      ulItems.push(li[1].trim())
      continue
    }
    if (!line) {
      flushUl()
      continue
    }
    flushUl()
    ensureSection().blocks.push({ type: 'p', runs: parseRuns(line) })
  }
  flushUl()
  return sections.filter((s) => s.title || s.blocks.length)
}

// 后端行 → 前端 LegalDoc
function adaptDoc(row: any, type: string): LegalDoc {
  const published = row?.publishedAt ? String(row.publishedAt).slice(0, 10) : ''
  return {
    type,
    title: row?.title ?? '',
    version: row?.version ?? '',
    effectiveDate: published,
    updatedAt: published || undefined,
    sections: parseMarkdownSections(row?.content ?? ''),
  }
}

// 前端类型 → 后端 type 枚举映射（后端无 child-privacy）
const TYPE_MAP: Record<string, string> = {
  'user-agreement': 'agreement',
  'privacy-policy': 'privacy',
  community: 'community',
}

// ============ API 层 ============

export const legalApi = {
  /**
   * 获取法律文档 — GET /system/legal/:type（适配 Markdown → sections）
   * 后端无对应 type（如 child-privacy）→ 返回 null（页面走空态）
   * 网络/服务异常 → 抛出，由页面三态处理（不回退假数据）
   */
  async getDoc(type: string): Promise<LegalDoc | null> {
    const backendType = TYPE_MAP[type]
    if (!backendType) return null
    const row = await apiGet<any>(`/system/legal/${backendType}`)
    if (!row) return null
    return adaptDoc(row, type)
  },

  /**
   * 确认协议 — 诚实降级
   * 后端无「确认协议」写端点（legal.controller 仅 GET 与管理端 CRUD），
   * 也无按用户记录确认状态的表，故此处不发起网络写入，仅作本地确认（当前会话 UI 反馈，不持久化）。
   * 待后端补 POST /system/legal/:type/confirm + 用户确认记录表后再接真实写入。
   */
  async confirm(_type: string): Promise<{ success: boolean; persisted: boolean }> {
    return { success: true, persisted: false }
  },

  /**
   * 需确认协议列表 — 诚实降级
   * 后端无 /system/legal/pending 端点，也无确认状态记录，无从判定 → 返回空数组（不造假）。
   */
  async getPendingConfirms(): Promise<LegalDoc[]> {
    return []
  },
}
