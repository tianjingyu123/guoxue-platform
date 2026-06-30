/**
 * 圈子后台管理 API 层（manage.vue 专用）
 * 全部真连后端 /api/v1/circles/*；apiGet/apiPost/apiPut/apiDelete 已自动加 token + 剥信封。
 * 后端响应 data 可能为数组或 {xxx,total} 形式，本层统一兼容解析为前端视图模型。
 *
 * 字段映射要点：
 * - 成员 role 后端大写枚举（OWNER/PARTNER/ADMIN/GUEST/VOLUNTEER/MEMBER）→ 前端归一为 owner/admin/member
 * - 帖子 isPinned 对应后端 isTop
 * - 后端 Post 模型无点赞数/评论数字段、listMembers 不返回发帖数 → 这些字段不提供，页面降级隐藏
 */
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/request'

// ─── 视图模型类型 ───
export type ManageRole = 'owner' | 'admin' | 'member'

/** 概览数据（仅暴露后端真实可得字段；无真实来源的指标不提供，页面隐藏） */
export interface CircleOverview {
  id: string
  name: string
  intro: string
  cover: string
  category: string // categoryLevel1
  memberCount: number
  postCount: number
  /** 加入是否需圈主审批（仅免费圈生效） */
  needApproval: boolean
}

export interface ManageMember {
  /** 成员记录 id（circleMember.id） */
  id: string
  /** 用户 id（写操作 PUT/DELETE 用的就是它） */
  userId: string
  name: string
  avatar: string
  role: ManageRole
  /** 后端原始大写角色，用于判断 owner 不可操作等 */
  rawRole: string
  joinedAt: string // YYYY-MM-DD
}

export interface ManagePost {
  id: string
  content: string
  author: { id: string; name: string; avatar: string }
  createdAt: string // YYYY-MM-DD
  isPinned: boolean
  isEssence: boolean
}

export interface CircleSettings {
  name: string
  intro: string
  category: string
}

// ─── 工具 ───
/** 后端大写角色 → 前端三态 */
function adaptRole(raw?: string): ManageRole {
  const r = (raw || '').toUpperCase()
  if (r === 'OWNER') return 'owner'
  if (r === 'ADMIN') return 'admin'
  return 'member'
}

/** ISO 时间 → YYYY-MM-DD */
function fmtDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/* —— 后端原始响应类型（容错适配用，字段宽松全 optional，仅声明 adapter 实际访问到的字段） —— */
interface RawManageCircle {
  id?: string | number
  name?: string
  intro?: string
  description?: string
  cover?: string
  categoryLevel1?: string
  memberCount?: number | string
  postCount?: number | string
  needApproval?: boolean
}
/** GET /circles/:id 可能直接是圈子对象，也可能包一层 {circle} */
interface RawManageOverview extends RawManageCircle { circle?: RawManageCircle }
/** GET /circles/:id/announcement */
interface RawAnnouncementResp { content?: string }
/** 后端成员项 */
interface RawManageMember {
  id?: string | number
  userId?: string
  user?: { id?: string; nickname?: string; avatar?: string } | null
  role?: string
  joinedAt?: string
}
/** /circles/:id/members 响应（可能裸数组，由 Array.isArray 运行时分流） */
interface RawManageMembersResp { members?: RawManageMember[]; data?: RawManageMember[] }
/** 后端帖子项 */
interface RawManagePost {
  id?: string | number
  content?: string
  title?: string
  user?: { id?: string; nickname?: string; avatar?: string } | null
  userId?: string
  createdAt?: string
  isTop?: boolean
  isEssence?: boolean
}
/** /circles/:id/posts 响应（可能裸数组，由 Array.isArray 运行时分流） */
interface RawManagePostsResp { posts?: RawManagePost[]; data?: RawManagePost[] }

export const circleManageApi = {
  /** 概览/设置基本信息 — GET /circles/:id */
  getOverview: async (id: string): Promise<CircleOverview> => {
    const res = await apiGet<RawManageOverview>(`/circles/${id}`)
    const c: RawManageCircle = res?.circle ?? res ?? {}
    return {
      id: String(c.id ?? id),
      name: c.name ?? '',
      intro: c.intro ?? c.description ?? '',
      cover: c.cover ?? '',
      category: c.categoryLevel1 ?? '',
      memberCount: Number(c.memberCount) || 0,
      postCount: Number(c.postCount) || 0,
      needApproval: !!c.needApproval,
    }
  },

  /** 公告 — GET /circles/:id/announcement → {content,...} */
  getAnnouncement: async (id: string): Promise<string> => {
    const res = await apiGet<RawAnnouncementResp>(`/circles/${id}/announcement`)
    return res?.content ?? ''
  },

  /** 成员列表 — GET /circles/:id/members → {members:[...],total} */
  getMembers: async (id: string): Promise<ManageMember[]> => {
    const res = await apiGet<RawManageMembersResp>(`/circles/${id}/members?pageSize=50`)
    const arr: RawManageMember[] = Array.isArray(res) ? res : (res?.members ?? res?.data ?? [])
    return arr.map((m): ManageMember => ({
      id: String(m.id ?? m.userId ?? ''),
      userId: String(m.userId ?? m.user?.id ?? ''),
      name: m.user?.nickname ?? '匿名',
      avatar: m.user?.avatar ?? '',
      role: adaptRole(m.role),
      rawRole: (m.role || 'MEMBER').toUpperCase(),
      joinedAt: fmtDate(m.joinedAt),
    }))
  },

  /** 帖子列表 — GET /circles/:id/posts → {posts:[...],total}
   *  注：后端 Post 模型无点赞数/评论数字段，故视图模型不含 likes/comments */
  getPosts: async (id: string): Promise<ManagePost[]> => {
    const res = await apiGet<RawManagePostsResp>(`/circles/${id}/posts?pageSize=50`)
    const arr: RawManagePost[] = Array.isArray(res) ? res : (res?.posts ?? res?.data ?? [])
    return arr.map((p): ManagePost => ({
      id: String(p.id ?? ''),
      content: (p.content ?? p.title ?? '').toString(),
      author: {
        id: String(p.user?.id ?? p.userId ?? ''),
        name: p.user?.nickname ?? '匿名',
        avatar: p.user?.avatar ?? '',
      },
      createdAt: fmtDate(p.createdAt),
      isPinned: !!p.isTop,
      isEssence: !!p.isEssence,
    }))
  },

  // ─── 写操作 ───
  /** 设角色 — PUT /circles/:id/members/:userId/role，body {role:'ADMIN'|'MEMBER'} */
  setMemberRole: (id: string, userId: string, role: 'ADMIN' | 'MEMBER') =>
    apiPut<void>(`/circles/${id}/members/${userId}/role`, { role }),

  /** 移除成员 — DELETE /circles/:id/members/:userId */
  removeMember: (id: string, userId: string) =>
    apiDelete<void>(`/circles/${id}/members/${userId}`),

  /** 切换置顶 — POST /circles/:id/posts/:postId/top（返回更新后帖子，含 isTop） */
  toggleTop: (id: string, postId: string) =>
    apiPost<RawManagePost>(`/circles/${id}/posts/${postId}/top`),

  /** 切换精华 — POST /circles/:id/posts/:postId/essence（返回更新后帖子，含 isEssence） */
  toggleEssence: (id: string, postId: string) =>
    apiPost<RawManagePost>(`/circles/${id}/posts/${postId}/essence`),

  /** 删帖 — DELETE /circles/:id/posts/:postId */
  deletePost: (id: string, postId: string) =>
    apiDelete<void>(`/circles/${id}/posts/${postId}`),

  /** 存公告 — PUT /circles/:id/announcement，body {content} */
  saveAnnouncement: (id: string, content: string) =>
    apiPut<void>(`/circles/${id}/announcement`, { content }),

  /** 存设置 — PUT /circles/:id，body 仅含 UpdateCircleDto 支持的字段（name/intro/needApproval）
   *  注：圈子分类(categoryLevel1) 与 圈规(rules) 后端 UpdateCircleDto 无对应字段，故不提交 */
  saveSettings: (id: string, data: { name: string; intro: string; needApproval?: boolean }) =>
    apiPut<void>(`/circles/${id}`, data),
}
