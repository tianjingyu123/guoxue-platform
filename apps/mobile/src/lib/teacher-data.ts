/**
 * 讲师认证（线上课程上传资格）数据层
 * 对接后端 modules/teacher：GET/POST /teacher/certification
 * 线上讲师认证 ≠ 线下驿站签约/研究院特聘（互不排斥，独立记录）
 * 身份核验复用平台实名认证（identityVerified），不重复采集身份证
 */
import { apiGet, apiPost } from '@/utils/request'

export type CertStatus = 'none' | 'pending' | 'approved' | 'rejected'

/** 后端 TeacherCertification 记录（无记录时为 null） */
export interface TeacherCertification {
  id: string
  userId: string
  realName: string
  title?: string | null
  intro?: string | null
  credentials: string[]
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  verifiedTitle?: string | null
  rejectReason?: string | null
  reviewedAt?: string | null
  createdAt: string
}

export interface ApplyCertificationPayload {
  realName: string
  title?: string
  intro?: string
  credentials?: string[]
}

/** 认证页上下文：认证记录 + 是否已实名（实名是申请前置） */
export interface CertificationContext {
  cert: TeacherCertification | null
  status: CertStatus
  identityVerified: boolean
}

function toStatus(cert: TeacherCertification | null): CertStatus {
  if (!cert) return 'none'
  const s = String(cert.status || '').toUpperCase()
  if (s === 'APPROVED') return 'approved'
  if (s === 'PENDING') return 'pending'
  if (s === 'REJECTED') return 'rejected'
  return 'none'
}

export const teacherApi = {
  /** 我的讲师认证记录（无则 null） */
  async getMyCertification(): Promise<TeacherCertification | null> {
    return await apiGet<TeacherCertification | null>('/teacher/certification')
  },

  /** 认证页所需上下文：并行取认证记录与实名状态 */
  async getCertificationContext(): Promise<CertificationContext> {
    const [cert, me] = await Promise.all([
      apiGet<TeacherCertification | null>('/teacher/certification'),
      apiGet<any>('/auth/me'),
    ])
    return {
      cert: cert ?? null,
      status: toStatus(cert ?? null),
      identityVerified: !!me?.identityVerified,
    }
  },

  /** 提交讲师认证申请（后端校验实名前置 + 防重） */
  async applyCertification(payload: ApplyCertificationPayload): Promise<TeacherCertification> {
    return await apiPost<TeacherCertification>('/teacher/certification', payload)
  },
}
