/**
 * 全平台统一评论数据层 —— components/comment/* 组件配套
 *
 * 端点（均已亲核后端源码 apps/server/src/modules）：
 * - 读列表  GET  /comment?targetType=&targetId=&page=&pageSize=
 *           comment.controller.ts @Get() → findByTarget 返回 { data, total, page, pageSize }，
 *           楼中楼在 replies 里递归嵌套（仅顶级评论参与分页）。
 * - 计数    GET  /comment/count?targetType=&targetId=
 * - 发评论  POST /comment  body={ targetType, targetId, content, parentId? }（CreateCommentDto，
 *           服务端发布后立即失效列表缓存·含敏感词审核，被拒会 throw 业务错误消息）。
 * - 点赞    POST /interaction/like  body={ targetType:'COMMENT', targetId }
 *           真 toggle（返回 { liked }）·对齐 lib/post-detail-data.ts:321 现有模式；
 *           不用 POST /comment/:id/like —— 那个只增不减（comment.service.like 无取消逻辑）。
 * - 点赞态  GET  /interaction/like/check?targetType=COMMENT&targetIds=a,b
 *           逗号分隔·返回已赞 targetId 字符串数组·需登录（未登录别调，会触发全局 401 跳转）。
 */
import { apiGet, apiGetOptionalAuth, apiPost } from '@/utils/request'

/** 常用 targetType（后端 comment 模块是通用字符串字段，允许业务扩展新类型） */
export type CommentTargetType =
  | 'POST'
  | 'ARTICLE'
  | 'VIDEO'
  | 'CLASSIC_BOOK'
  | 'COURSE'
  | 'EBOOK'
  | (string & {})

export interface CommentUser {
  id: string
  nickname: string
  avatar: string
}

export interface CommentItem {
  id: string
  user: CommentUser
  content: string
  /** 原始 ISO 时间（展示时用 formatCommentTime 转相对时间） */
  createdAt: string
  likeCount: number
  isLiked: boolean
  /** 子回复（深层楼中楼已拍平为一级·同 pkg-video/detail flatReplies 展示口径） */
  replies: CommentItem[]
  isPinned?: boolean
  /** 拍平时记录「回复了哪个楼中楼」的昵称（直接回复顶级评论时为空） */
  replyToName?: string
}

export interface CommentPage {
  items: CommentItem[]
  total: number
  page: number
  pageSize: number
}

/* —— 后端原始结构（宽松 optional·字段名对齐 lib/post-detail-data.ts 的 RawComment/RawReply） —— */
interface RawUserLite {
  id?: string
  nickname?: string
  avatar?: string
}
interface RawCommentNode {
  id?: string
  content?: string
  user?: RawUserLite | null
  userId?: string
  createdAt?: string | null
  likeCount?: number
  likes?: number
  isPinned?: boolean
  isTop?: boolean
  replies?: RawCommentNode[]
}
interface RawListEnvelope {
  data?: RawCommentNode[]
  items?: RawCommentNode[]
  comments?: RawCommentNode[]
  total?: number
  page?: number
  pageSize?: number
}

/** 单节点归一（不处理 replies） */
function adaptOne(c: RawCommentNode): CommentItem {
  return {
    id: c.id || '',
    user: {
      id: c.user?.id ?? c.userId ?? '',
      nickname: c.user?.nickname ?? '匿名',
      avatar: c.user?.avatar ?? '',
    },
    content: c.content ?? '',
    createdAt: c.createdAt ?? '',
    likeCount: c.likeCount ?? c.likes ?? 0,
    isLiked: false, // 列表接口不含当前用户点赞态 → 由 checkCommentsLiked 批量补种
    isPinned: c.isPinned ?? c.isTop ?? false,
    replies: [],
  }
}

/**
 * 深层楼中楼拍平为一级列表（小红书式：子回复统一缩进小头像列）。
 * 二级以下的回复带 replyToName（"回复 @xx"），一级回复不带。
 */
function flattenReplies(nodes: RawCommentNode[] | undefined, out: CommentItem[] = [], parentName?: string): CommentItem[] {
  if (!Array.isArray(nodes)) return out
  for (const n of nodes) {
    const item = adaptOne(n)
    if (parentName) item.replyToName = parentName
    out.push(item)
    flattenReplies(n.replies, out, item.user.nickname)
  }
  return out
}

/** 后端评论节点（含递归 replies）→ 前端 CommentItem（replies 已拍平一级） */
export function adaptComment(c: RawCommentNode): CommentItem {
  const item = adaptOne(c)
  item.replies = flattenReplies(c.replies)
  return item
}

/** 评论列表（仅顶级分页·楼中楼全量随行返回） */
export async function fetchComments(
  targetType: CommentTargetType,
  targetId: string,
  opts?: { page?: number; pageSize?: number },
): Promise<CommentPage> {
  const qs = [`targetType=${encodeURIComponent(targetType)}`, `targetId=${encodeURIComponent(targetId)}`]
  if (opts?.page) qs.push(`page=${opts.page}`)
  if (opts?.pageSize) qs.push(`pageSize=${opts.pageSize}`)
  const r = await apiGet<RawCommentNode[] | RawListEnvelope>(`/comment?${qs.join('&')}`)
  const env: RawListEnvelope | null = Array.isArray(r) ? null : (r ?? null)
  const arr: RawCommentNode[] = Array.isArray(r) ? r : (env?.data ?? env?.items ?? env?.comments ?? [])
  const items = arr.map(adaptComment)
  return {
    items,
    total: env?.total ?? items.length,
    page: env?.page ?? opts?.page ?? 1,
    pageSize: env?.pageSize ?? opts?.pageSize ?? items.length,
  }
}

/** 评论总数（含楼中楼与否以后端口径为准·失败兜底 0 不阻断页面） */
export async function fetchCommentCount(targetType: CommentTargetType, targetId: string): Promise<number> {
  try {
    const r = await apiGet<number | { count?: number }>(
      `/comment/count?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`,
    )
    return typeof r === 'number' ? r : (r?.count ?? 0)
  } catch {
    return 0
  }
}

/**
 * 发评论/回复（需登录）。parentId 传被回复的那条评论 id（顶级或楼中楼均可，
 * 后端校验 parent 与 targetType/targetId 匹配并存成嵌套树）。
 * 返回落库后的评论（含 user）；审核拒绝/禁言会 reject 带业务文案。
 */
export async function createComment(
  targetType: CommentTargetType,
  targetId: string,
  content: string,
  parentId?: string,
): Promise<CommentItem> {
  const raw = await apiPost<RawCommentNode | null>('/comment', {
    targetType,
    targetId,
    content,
    ...(parentId ? { parentId } : {}),
  })
  return adaptComment(raw ?? {})
}

/** 评论点赞/取消（真 toggle·需登录）。返回 { liked } 供乐观更新校准。 */
export function toggleCommentLike(commentId: string): Promise<{ liked?: boolean } | null> {
  return apiPost<{ liked?: boolean } | null>('/interaction/like', { targetType: 'COMMENT', targetId: commentId })
}

/**
 * 批量查询当前用户已赞的评论 id（需登录·调用方自行确认有 token）。
 * 后端返回已赞 targetId 字符串数组；兼容对象数组/字典等其他形态（同 post-detail-data.checkPostLiked 口径）。
 * 失败静默返回 []，绝不阻断列表渲染。
 */
export async function checkCommentsLiked(ids: string[]): Promise<string[]> {
  if (!ids.length) return []
  try {
    const r = await apiGetOptionalAuth<unknown>(
      `/interaction/like/check?targetType=COMMENT&targetIds=${ids.map((i) => encodeURIComponent(i)).join(',')}`,
    )
    const data = r && typeof r === 'object' && 'data' in (r as object) ? (r as { data?: unknown }).data : r
    if (Array.isArray(data)) {
      return data.map((x) => {
        const o = x as { targetId?: string; id?: string } | string
        return String((o as { targetId?: string })?.targetId ?? (o as { id?: string })?.id ?? o)
      })
    }
    if (data && typeof data === 'object') {
      const dict = data as Record<string, unknown>
      return Object.keys(dict).filter((k) => !!dict[k])
    }
    return []
  } catch {
    return []
  }
}

/** ISO → 相对时间（同 lib/post-detail-data.ts relTime 口径） */
export function formatCommentTime(iso?: string | null): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return String(iso)
  const diff = Date.now() - t
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}小时前`
  const day = Math.floor(hour / 24)
  if (day < 7) return `${day}天前`
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/** 计数格式化：≥1万 显示 x.x万 */
export function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, '')}万`
  return String(n)
}
