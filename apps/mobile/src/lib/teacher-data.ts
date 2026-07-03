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

/** 后端 /auth/me 原始响应（此处仅取实名核验字段，宽松 optional） */
interface RawAuthMe { identityVerified?: boolean }

// ═══════════ 讲师公开主页（GET /teachers/:userId/profile·公开·仅 APPROVED 讲师） ═══════════

export interface TeacherProfileCourse {
  id: string
  title: string
  cover: string
  price: number
  studentCount: number
  type?: string
}

export interface TeacherProfileStation {
  id: string
  name: string
  city: string
  cover: string
  type?: string | null
}

export interface TeacherPublicProfile {
  userId: string
  nickname: string
  avatar: string
  verifiedTitle: string
  intro: string
  stats: { courseCount: number; studentCount: number; avgRating?: number; reviewCount?: number }
  courses: TeacherProfileCourse[]
  offlineStations: TeacherProfileStation[]
}

/** 后端原始响应（Decimal price 序列化为字符串，宽松 optional 防御） */
interface RawTeacherProfile {
  userId?: string
  nickname?: string | null
  avatar?: string | null
  verifiedTitle?: string | null
  intro?: string | null
  stats?: { courseCount?: number; studentCount?: number; avgRating?: number; reviewCount?: number }
  courses?: Array<{ id?: string; title?: string; cover?: string | null; price?: number | string; studentCount?: number; type?: string }>
  offlineStations?: Array<{ id?: string; name?: string; city?: string; cover?: string | null; type?: string | null }>
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
      apiGet<RawAuthMe>('/auth/me'),
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

  /** 讲师公开主页（无需登录；未认证/不存在后端 404，错误向上抛给页面走错误态） */
  async getPublicProfile(userId: string): Promise<TeacherPublicProfile> {
    const raw = await apiGet<RawTeacherProfile>(`/teachers/${userId}/profile`)
    return {
      userId: raw.userId || userId,
      nickname: raw.nickname || '讲师',
      avatar: raw.avatar || '',
      verifiedTitle: raw.verifiedTitle || '认证讲师',
      intro: raw.intro || '',
      stats: {
        courseCount: Number(raw.stats?.courseCount ?? 0),
        studentCount: Number(raw.stats?.studentCount ?? 0),
        // 后端无评价时省略 avgRating，此处原样保留省略语义（页面 v-if 隐藏评分位）
        ...(raw.stats?.avgRating != null ? { avgRating: Number(raw.stats.avgRating), reviewCount: Number(raw.stats.reviewCount ?? 0) } : {}),
      },
      courses: (raw.courses || []).map((c) => ({
        id: c.id || '',
        title: c.title || '',
        cover: c.cover || '',
        price: Number(c.price ?? 0),
        studentCount: Number(c.studentCount ?? 0),
        type: c.type,
      })),
      offlineStations: (raw.offlineStations || []).map((s) => ({
        id: s.id || '',
        name: s.name || '',
        city: s.city || '',
        cover: s.cover || '',
        type: s.type,
      })),
    }
  },
}
