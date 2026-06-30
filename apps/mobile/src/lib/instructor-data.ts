/** 讲师公开详情数据 - 真连后端 users 模块 */
// 真源说明：后端无"讲师公开详情"聚合端点，讲师本质是课程作者(User)。
// 入口 /instructor/:id 的 id = course.instructor.id = User.id（见 pkg-course/detail）。
// 真连可用端点（均需登录 JwtAuthGuard）：
//   GET /users/:id            → { id, nickname, avatar, bio, ... }
//   GET /users/:id/stats      → { courses, followers, articles, circles, ... }
//   GET /users/:id/is-following → { following }
// 后端无公开数据源的字段（title/level/verified/specialties/rating/教学经历/
// 资质证书/讲师课程列表/评价）→ 一律留空，由页面 v-if 诚实降级，绝不回退假 mock。
import { apiGet } from '@/utils/request'

export interface InstructorCertificate { name: string; issuer: string; year: string }
export interface InstructorFeaturedCourse {
  id: string
  title: string
  cover: string
  studentCount: string
  rating: number
}
export interface InstructorReview {
  id: string
  user: { id: string; name: string; avatar: string }
  rating: number
  content: string
  time: string
}
export interface InstructorDetail {
  id: string
  name: string
  avatar: string
  isFollowing: boolean
  /** 关注者数（真实，来自 users/:id/stats.followers） */
  followerCount: number
  /** 课程数（真实，来自 users/:id/stats.courses） */
  courseCount: number
  /** 个人简介（真实，来自 user.bio，可能为空） */
  introduction: string
  // ── 以下字段后端无公开数据源，恒为空/undefined，页面 v-if 降级 ──
  title?: string
  level?: 'gold' | 'silver' | 'normal'
  verified?: boolean
  specialties: string[]
  rating?: number
  reviewCount?: number
  education: string[]
  experience: string[]
  certificates: InstructorCertificate[]
  featuredCourses: InstructorFeaturedCourse[]
  reviews: InstructorReview[]
}

/** 讲师等级标签 */
export function getInstructorLevelLabel(level: InstructorDetail['level']): string {
  return { gold: '金牌讲师', silver: '银牌讲师', normal: '认证讲师' }[level || 'normal'] || '认证讲师'
}
/** 讲师等级配色（返回 {color,bg}） */
export function getInstructorLevelStyle(level: InstructorDetail['level']): { color: string; bg: string } {
  const map = {
    gold: { color: '#B45309', bg: '#FEF3C7' },
    silver: { color: '#475569', bg: '#E2E8F0' },
    normal: { color: '#C41E3A', bg: '#FBE8EA' },
  }
  return map[level || 'normal'] || map.normal
}

// ============ API 层 ============

interface UserBasic { id: string; nickname?: string; avatar?: string; bio?: string }
interface UserStats { courses?: number; followers?: number }

export const instructorApi = {
  /**
   * 获取讲师（课程作者）公开详情。
   * 主请求 users/:id 失败（404/401）直接抛出，页面走错误态；
   * 辅助的 stats / is-following 失败则降级为 0 / 未关注，不阻断主资料展示。
   */
  async getDetail(id: string): Promise<InstructorDetail> {
    const [user, stats, follow] = await Promise.all([
      apiGet<UserBasic>(`/users/${id}`),
      apiGet<UserStats>(`/users/${id}/stats`).catch(() => null),
      apiGet<{ following: boolean }>(`/users/${id}/is-following`).catch(() => null),
    ])
    return {
      id: user.id,
      name: user.nickname || '讲师',
      avatar: user.avatar || '',
      introduction: user.bio || '',
      followerCount: stats?.followers ?? 0,
      courseCount: stats?.courses ?? 0,
      isFollowing: !!follow?.following,
      // 后端无来源 → 空，页面降级
      specialties: [],
      education: [],
      experience: [],
      certificates: [],
      featuredCourses: [],
      reviews: [],
    }
  },
}
