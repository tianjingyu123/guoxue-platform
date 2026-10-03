/**
 * 发布审核 数据层（真连 audit 后端 GET /audit/content-audits/mine·JWT）
 * 「向全平台开放」的五类内容（文章/课程/短视频/直播/帖子）提交后的平台审核台账，
 * 本人视角：审核中 / 已通过 / 已驳回（带原因）。
 */
import { apiGet } from '@/utils/request'

export type AuditFinalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface MyContentAudit {
  id: string
  /** 内容类型：ARTICLE/COURSE/VIDEO/LIVE/POST */
  contentType: string
  contentId: string
  contentTitle: string
  finalStatus: AuditFinalStatus
  rejectReason: string
  createdAt: string
}

/* —— 后端原始响应（仅声明 adapter 实际访问到的字段） —— */
interface RawAuditRecord {
  id: string
  contentType?: string
  contentId?: string
  contentTitle?: string | null
  finalStatus?: string
  rejectReason?: string | null
  createdAt: string
}
interface RawAuditListResp {
  records?: RawAuditRecord[]
  total?: number
}

function adaptRecord(r: RawAuditRecord): MyContentAudit {
  const s = String(r.finalStatus || 'PENDING').toUpperCase()
  return {
    id: r.id,
    contentType: r.contentType ?? '',
    contentId: r.contentId ?? '',
    contentTitle: r.contentTitle ?? '',
    finalStatus: (s === 'APPROVED' || s === 'REJECTED' ? s : 'PENDING') as AuditFinalStatus,
    rejectReason: r.rejectReason ?? '',
    createdAt: r.createdAt,
  }
}

export const contentAuditApi = {
  /** 我的发布审核记录 — GET /audit/content-audits/mine（错误上抛供页面三态） */
  mine: async (params?: { finalStatus?: AuditFinalStatus | 'ALL'; page?: number; pageSize?: number }): Promise<{ records: MyContentAudit[]; total: number }> => {
    const qs: string[] = []
    qs.push(`finalStatus=${params?.finalStatus ?? 'ALL'}`)
    if (params?.page) qs.push(`page=${params.page}`)
    if (params?.pageSize) qs.push(`pageSize=${params.pageSize}`)
    const r = await apiGet<RawAuditListResp>(`/audit/content-audits/mine?${qs.join('&')}`)
    const arr = Array.isArray(r?.records) ? r.records : []
    return { records: arr.map(adaptRecord), total: Number(r?.total) || arr.length }
  },
}
