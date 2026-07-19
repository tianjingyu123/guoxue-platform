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

/* —— 后端原始响应类型（容错适配用，字段宽松全 optional，仅声明 adapter 实际访问到的字段，不 export） —— */
/** 后端法律文档原始响应（GET /system/legal/:type，LegalDocument 表） */
interface RawLegalRow {
  publishedAt?: string | null
  title?: string
  version?: string
  content?: string
}

// 后端行 → 前端 LegalDoc
function adaptDoc(row: RawLegalRow, type: string): LegalDoc {
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
  // 驿站经营 SOP 手册（B 端经营指引，种子 legal-documents.seed.ts 入库，GET 端点对 type 无枚举限制）
  sop_offline: 'sop_offline',
}

// ============ 儿童隐私保护声明（静态合规文本兜底） ============
// 后端 legal type 枚举无 child-privacy（仅 agreement/privacy/community），getDoc 恒返回 null 致页面空白。
// 儿童隐私保护声明属法定必备合规文本（《儿童个人信息网络保护规定》），此处内置标准正文兜底，
// 非伪造业务数据；后端补 child-privacy 文档后自动以后端为准（见 getDoc）。
const p = (text: string): LegalBlock => ({ type: 'p', runs: [{ text }] })
const ul = (items: string[]): LegalBlock => ({ type: 'ul', items })

const CHILD_PRIVACY_DOC: LegalDoc = {
  type: 'child-privacy',
  title: '儿童隐私保护声明',
  version: '1.0',
  effectiveDate: '2026-01-01',
  sections: [
    {
      id: 'intro', title: '一、引言', level: 2, blocks: [
        p('本平台深知儿童个人信息保护的重要性，严格遵守《中华人民共和国未成年人保护法》《儿童个人信息网络保护规定》《中华人民共和国个人信息保护法》等法律法规。本声明中的"儿童"指不满十四周岁的未成年人。'),
        p('如您是儿童用户，请务必在监护人的陪同和指导下阅读本声明，并在监护人同意后使用本平台的相关功能。'),
      ],
    },
    {
      id: 'collect', title: '二、我们如何收集和使用儿童个人信息', level: 2, blocks: [
        p('我们仅在为您提供服务所必需且征得监护人同意的前提下，收集儿童个人信息。收集范围可能包括：'),
        ul(['注册与登录所必需的账号信息（如手机号、昵称）；', '为提供内容服务所必需的学习记录与偏好；', '为保障账号与内容安全所必需的设备与日志信息。']),
        p('我们不会收集与所提供服务无关的儿童个人信息，也不会超出监护人同意的范围使用。'),
      ],
    },
    {
      id: 'consent', title: '三、监护人的同意与选择', level: 2, blocks: [
        p('在收集、使用、转移、披露儿童个人信息前，我们会以显著、清晰的方式征得儿童监护人的同意。监护人有权访问、更正、删除儿童个人信息，并可撤回同意或注销账号。'),
        p('若您作为监护人不同意本声明内容，请停止儿童对相关功能的使用；继续使用将视为您已同意本声明。'),
      ],
    },
    {
      id: 'storage', title: '四、儿童个人信息的存储与保护', level: 2, blocks: [
        p('我们采取加密传输、访问权限控制、最小化存储等技术与管理措施保护儿童个人信息安全，存储期限不超过实现收集目的所必需的最短时间，法律法规另有规定的除外。'),
        p('一旦发生或可能发生儿童个人信息安全事件，我们将依法及时启动应急预案并告知监护人。'),
      ],
    },
    {
      id: 'share', title: '五、对外提供', level: 2, blocks: [
        p('除征得监护人另行同意或法律法规另有规定外，我们不会向任何第三方共享、转让、公开披露儿童个人信息。因业务确需委托第三方处理的，我们将对受托方进行严格评估并要求其履行同等保护义务。'),
      ],
    },
    {
      id: 'contact', title: '六、如何联系我们', level: 2, blocks: [
        p('监护人如对儿童个人信息处理有任何疑问、意见或需行使相关权利，可通过本页"监护人联系方式"与我们取得联系，我们将在核实身份后及时处理。'),
      ],
    },
  ],
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
    // 后端无对应 type 时：儿童隐私声明用内置合规文本兜底，其余仍返回 null 走空态
    if (!backendType) return type === 'child-privacy' ? CHILD_PRIVACY_DOC : null
    const row = await apiGet<RawLegalRow | null>(`/system/legal/${backendType}`)
    if (!row) return type === 'child-privacy' ? CHILD_PRIVACY_DOC : null
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
