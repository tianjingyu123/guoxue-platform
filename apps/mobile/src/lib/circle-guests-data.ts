/**
 * 圈子「嘉宾管理」API 层（真连后端，无 mock）
 *
 * 后端端点（前缀 /api/v1，apiGet/apiPut/apiDelete 已自动加 token + 剥信封）：
 *  - GET  /circle-backend/guests                    嘉宾列表（不传 circleId，后端自动取当前登录用户作为圈主/管理员的圈子）
 *  - PUT  /circle-backend/guests/:userId/share-rate 设置分账比例 body {shareRate:0-100}
 *  - DELETE /circles/:circleId/members/:userId      移除成员（需要 circleId）
 *
 * 字段口径以后端 circle-backend.controller.ts getGuests 与 prisma schema 为准：
 *  - shareRate：分账比例（百分比数字，如 30 表示 30%），来自 circleRevenueSplit.splitRate
 *  - totalEarned：嘉宾累计实得收益，来自 circleGuestEarning.earned 求和；
 *    schema 中 earned 为 Decimal(10,2) 注释「嘉宾实得」→ 单位为【元】，直接展示，不做前端二次计算。
 */
import { apiGet, apiPut, apiDelete } from '@/utils/request'

/** 嘉宾用户信息 */
export interface GuestUser {
  id: string
  nickname: string
  avatar: string
}

/** 嘉宾条目（与后端 getGuests 返回结构一致） */
export interface CircleGuest {
  /** circleMember.id */
  id: string
  /** 嘉宾用户ID（分账/移除接口的 :userId） */
  userId: string
  user: GuestUser
  /** 分账比例（百分比数字，0-100） */
  shareRate: number
  /** 累计实得收益（单位：元） */
  totalEarned: number
}

/** 后端原始条目 → 前端 CircleGuest（做空值兜底，避免脏数据导致渲染异常） */
function adaptGuest(g: any): CircleGuest {
  return {
    id: String(g?.id ?? ''),
    userId: String(g?.userId ?? g?.user?.id ?? ''),
    user: {
      id: String(g?.user?.id ?? ''),
      nickname: g?.user?.nickname || '未命名用户',
      avatar: g?.user?.avatar || '',
    },
    shareRate: Number(g?.shareRate) || 0,
    totalEarned: Number(g?.totalEarned) || 0,
  }
}

export const circleGuestsApi = {
  /**
   * 嘉宾列表（后端自动取当前用户作为圈主/管理员的圈子，不接受 circleId 参数）。
   * 失败抛错，由页面捕获走 error 态（不返回假数据）。
   */
  list: async (): Promise<CircleGuest[]> => {
    const res = await apiGet<any>('/circle-backend/guests')
    const arr = Array.isArray(res) ? res : (res?.data ?? res?.guests ?? [])
    return arr.map(adaptGuest)
  },

  /**
   * 设置嘉宾分账比例。
   * @param userId 嘉宾用户ID
   * @param shareRate 0-100 的百分比数字
   */
  setShareRate: (userId: string, shareRate: number): Promise<{ success: boolean }> =>
    apiPut<{ success: boolean }>(`/circle-backend/guests/${userId}/share-rate`, { shareRate }),

  /**
   * 移除嘉宾（从圈子移除该成员）。需要 circleId。
   * @param circleId 圈子ID（页面 onLoad query.id 取得；拿不到则页面应隐藏该操作）
   * @param userId 嘉宾用户ID
   */
  remove: (circleId: string, userId: string): Promise<{ success: boolean }> =>
    apiDelete<{ success: boolean }>(`/circles/${circleId}/members/${userId}`),
}
