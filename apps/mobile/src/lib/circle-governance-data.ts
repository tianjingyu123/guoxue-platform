/**
 * 圈子治理 数据层（真连后端 /circle-governance/*·JWT·2026-07-10 治理体系 commit 29c9a720）
 * 封装前端三页（rules/roles/sanction-notice）用到的端点；字段口径以
 * apps/server/src/modules/circle/governance/circle-governance.{controller,dto,constants}.ts 为准。
 *
 * 端点（前缀 /api/v1 由 request 层拼接）：
 *  成员侧：GET my-sanctions / POST violations/:id/appeal / GET :circleId/rules（公开读）
 *  圈主侧：POST|PUT|DELETE :circleId/rules(/:ruleId) / PUT :circleId/rules/reorder /
 *          POST :circleId/rules/apply-template / GET|PUT :circleId/config /
 *          GET|PUT :circleId/permission-matrix / GET :circleId/violations / GET :circleId/log
 *  （平台仲裁 admin/appeals 属后台端·移动端不封装）
 */
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/request'

// ───────── 类型 ─────────

export type ViolationType = 'WARNING' | 'MUTE' | 'REMOVE'
export type ViolationStatus = 'ACTIVE' | 'EXPIRED' | 'LIFTED' | 'REVOKED'
export type AppealStatus = 'PENDING' | 'UPHELD' | 'REJECTED'

/** 圈规条文（CircleRule） */
export interface CircleRuleItem {
  id: string
  text: string
  sortOrder: number
  /** 官方模板幂等键（null=圈主自建条文） */
  templateKey: string | null
  /** 非空=手动改过·模板套用不覆盖 */
  editedAt: string | null
}

/** 治理配置（生效值·未落库时后端回落默认） */
export interface GovernanceConfig {
  requireRuleAck: boolean
  warningThreshold: number
  warningResetDays: number
  muteDays: number
  removeBanRejoin: boolean
  newMemberReviewEnabled: boolean
  newMemberReviewDays: number
  sensitiveWordsEnabled: boolean
  sensitiveWords: string[]
  postIntervalSeconds: number
  reportAutoHideEnabled: boolean
  reportAutoHideThreshold: number
}

/** 权限矩阵行（后端整表返回·locked=金锁仅圈主） */
export interface PermissionRow {
  key: string
  label: string
  group: string
  locked: boolean
  values: Record<string, boolean>
}
export interface PermissionMatrix {
  roles: string[]
  permissions: PermissionRow[]
}

/** 圈内治理记录（成员可查·昵称打码·无证据/说明） */
export interface GovernanceLogItem {
  id: string
  memberMasked: string
  type: ViolationType
  status: ViolationStatus
  ruleText: string | null
  auto: boolean
  createdAt: string
}

/** 管理侧违规记录（完整明细+申诉状态） */
export interface ViolationRecord {
  id: string
  userId: string
  type: ViolationType
  status: ViolationStatus
  ruleText: string | null
  reason: string | null
  evidence: string | null
  auto: boolean
  strikeCount: number
  createdAt: string
  expiresAt: string | null
  user: { id: string; nickname: string; avatar: string } | null
  appealStatus: AppealStatus | null
}

/** 我的处理通知（被处理者视角·含累计进度与申诉状态） */
export interface MySanction {
  id: string
  circleId: string
  circleName: string
  type: ViolationType
  status: ViolationStatus
  ruleText: string | null
  reason: string | null
  evidence: string | null
  auto: boolean
  strikeCount: number
  warningThreshold: number
  createdAt: string
  expiresAt: string | null
  appeal: {
    id: string
    status: AppealStatus
    resolution: string | null
    createdAt: string
    resolvedAt: string | null
  } | null
  /** 72h 内·未申诉过·未撤销 → 可申诉 */
  appealable: boolean
}

/* —— 后端原始响应（仅声明 adapter 实际访问到的字段） —— */
interface RawRule {
  id?: string
  text?: string
  sortOrder?: number
  templateKey?: string | null
  editedAt?: string | null
}
interface RawSanction {
  id?: string
  circleId?: string
  circleName?: string
  type?: string
  status?: string
  ruleText?: string | null
  reason?: string | null
  evidence?: string | null
  auto?: boolean
  strikeCount?: number
  warningThreshold?: number
  createdAt?: string
  expiresAt?: string | null
  appeal?: MySanction['appeal']
  appealable?: boolean
}

function adaptRule(r: RawRule): CircleRuleItem {
  return {
    id: String(r?.id ?? ''),
    text: r?.text ?? '',
    sortOrder: Number(r?.sortOrder) || 0,
    templateKey: r?.templateKey ?? null,
    editedAt: r?.editedAt ?? null,
  }
}

function adaptSanction(v: RawSanction): MySanction {
  const type = (v?.type === 'MUTE' || v?.type === 'REMOVE' ? v.type : 'WARNING') as ViolationType
  const s = String(v?.status || 'ACTIVE')
  const status = (['ACTIVE', 'EXPIRED', 'LIFTED', 'REVOKED'].includes(s) ? s : 'ACTIVE') as ViolationStatus
  return {
    id: String(v?.id ?? ''),
    circleId: String(v?.circleId ?? ''),
    circleName: v?.circleName || '圈子',
    type,
    status,
    ruleText: v?.ruleText ?? null,
    reason: v?.reason ?? null,
    evidence: v?.evidence ?? null,
    auto: !!v?.auto,
    strikeCount: Number(v?.strikeCount) || 0,
    warningThreshold: Number(v?.warningThreshold) || 3,
    createdAt: v?.createdAt ?? '',
    expiresAt: v?.expiresAt ?? null,
    appeal: v?.appeal ?? null,
    appealable: !!v?.appealable,
  }
}

// ───────── API ─────────

export const circleGovernanceApi = {
  // —— 成员侧 ——

  /** 我的处理通知（跨圈·完整明细+累计进度+申诉状态） */
  mySanctions: async (circleId?: string): Promise<MySanction[]> => {
    const qs = circleId ? `?circleId=${circleId}` : ''
    const r = await apiGet<RawSanction[]>(`/circle-governance/my-sanctions${qs}`)
    return (Array.isArray(r) ? r : []).map(adaptSanction)
  },

  /** 发起申诉（72h 内·每处理仅一次·平台仲裁 48h 答复） */
  createAppeal: (violationId: string, content: string) =>
    apiPost<{ appeal: { id: string; status: AppealStatus; createdAt: string }; replyHours: number }>(
      `/circle-governance/violations/${violationId}/appeal`,
      { content },
    ),

  /** 圈规条文列表（公开读·成员/加入预览可见） */
  getRules: async (circleId: string): Promise<{ rules: CircleRuleItem[]; requireRuleAck: boolean }> => {
    const r = await apiGet<{ rules?: RawRule[]; requireRuleAck?: boolean }>(`/circle-governance/${circleId}/rules`)
    return {
      rules: (Array.isArray(r?.rules) ? r.rules : []).map(adaptRule),
      requireRuleAck: !!r?.requireRuleAck,
    }
  },

  // —— 圈主侧：圈规 CRUD 与模板 ——

  createRule: (circleId: string, text: string) =>
    apiPost<CircleRuleItem>(`/circle-governance/${circleId}/rules`, { text }),

  updateRule: (circleId: string, ruleId: string, text: string) =>
    apiPut<CircleRuleItem>(`/circle-governance/${circleId}/rules/${ruleId}`, { text }),

  deleteRule: (circleId: string, ruleId: string) =>
    apiDelete<{ success: boolean }>(`/circle-governance/${circleId}/rules/${ruleId}`),

  reorderRules: (circleId: string, ruleIds: string[]) =>
    apiPut<{ success: boolean }>(`/circle-governance/${circleId}/rules/reorder`, { ruleIds }),

  /** 官方模板一键套用（幂等·手改过的条目跳过不覆盖） */
  applyTemplate: (circleId: string) =>
    apiPost<{ success: boolean; created: number; updated: number; skipped: number }>(
      `/circle-governance/${circleId}/rules/apply-template`,
    ),

  // —— 圈主侧：治理配置与权限矩阵 ——

  getConfig: (circleId: string) => apiGet<GovernanceConfig>(`/circle-governance/${circleId}/config`),

  updateConfig: (circleId: string, patch: Partial<GovernanceConfig>) =>
    apiPut<GovernanceConfig>(`/circle-governance/${circleId}/config`, patch),

  getPermissionMatrix: (circleId: string) =>
    apiGet<PermissionMatrix>(`/circle-governance/${circleId}/permission-matrix`),

  /** 保存矩阵覆盖位（锁定项后端静默忽略·资金/移出永远仅圈主） */
  updatePermissionMatrix: (circleId: string, permissions: Record<string, Record<string, boolean>>) =>
    apiPut<PermissionMatrix>(`/circle-governance/${circleId}/permission-matrix`, { permissions }),

  // —— 记录留痕 ——

  /** 管理侧违规处理记录（完整明细·需 member.discipline 权限） */
  listViolations: async (circleId: string, page = 1, pageSize = 50, status?: string) => {
    const qs = [`page=${page}`, `pageSize=${pageSize}`]
    if (status) qs.push(`status=${status}`)
    return apiGet<{ items: ViolationRecord[]; total: number; page: number; pageSize: number }>(
      `/circle-governance/${circleId}/violations?${qs.join('&')}`,
    )
  },

  /** 圈内治理记录（成员可查·匿名留痕·REVOKED 不展示） */
  getLog: (circleId: string, page = 1, pageSize = 20) =>
    apiGet<{ items: GovernanceLogItem[]; total: number; page: number; pageSize: number }>(
      `/circle-governance/${circleId}/log?page=${page}&pageSize=${pageSize}`,
    ),
}
