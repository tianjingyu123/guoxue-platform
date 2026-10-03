const QUALIFICATION: Record<string, string> = { DRAFT: '待提交', PENDING: '待审核', APPROVED: '已通过', REJECTED: '已驳回', EXPIRED: '已过期' }
const RISK: Record<string, string> = { LOW: '低风险', MEDIUM: '中风险', HIGH: '高风险', BLOCKED: '已阻断' }
export function qualificationLabel(value?: string) { return QUALIFICATION[value ?? ''] ?? '待确认' }
export function riskLabel(value?: string) { return RISK[value ?? ''] ?? '待确认' }
