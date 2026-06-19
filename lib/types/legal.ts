// 法律文档类型定义

// 文档类型
export type LegalDocType = 'user-agreement' | 'privacy-policy' | 'community-rules' | 'refund-policy' | 'copyright'

// 法律文档
export interface LegalDocument {
  id: number
  type: LegalDocType
  title: string
  // 版本
  version: string
  // 生效日期
  effectiveDate: string
  // 更新日期
  updatedAt: string
  // 富文本内容
  htmlContent: string
  // 是否需要确认
  requireConfirm: boolean
  // 用户是否已确认
  hasConfirmed?: boolean
  // 确认时间
  confirmedAt?: string
}

// 文档目录项
export interface LegalDocTocItem {
  id: string
  title: string
  level: number
}

// 文档列表项
export interface LegalDocListItem {
  type: LegalDocType
  title: string
  version: string
  updatedAt: string
  requireConfirm: boolean
  hasConfirmed: boolean
}
