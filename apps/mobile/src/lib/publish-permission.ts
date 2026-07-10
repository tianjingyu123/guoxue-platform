/**
 * 短视频发布权限判断 — P0 临时口径
 * 依据 docs/design/发布权限与实名认证体系-20260711.md（第三节 全平台发布权走圈子授权 / 第七节 P0 分期）。
 *
 * 临时口径（后端 CirclePublishGrant 授权表尚未建）：
 * - 放行：平台管理员（SUPER_ADMIN/OPERATION_ADMIN）、圈主（含官方圈圈主）——
 *   由 /auth/me 的 roles[].roleType（CIRCLE_OWNER）或 /circles/my 中 role=owner 判定；
 * - 其余用户 → 返回 false，调用方弹「开通发布权限」引导层；
 * - 任一数据拿不到（未登录 401 / 网络失败）→ 降级放行（不把能发的人挡死，
 *   发布页自身仍有登录/后端校验兜底）。
 *
 * TODO(P1): CirclePublishGrant 授权接口上线后，替换本口径为真授权查询
 *          （按申请范围 video/live/course 校验授权状态与实名级别）。
 */
import { apiGet } from '@/utils/request'
import { circleApi } from '@/lib/circle-data'

/** /auth/me 中本判断实际访问的字段（roles 由后端 getProfile 合并注入） */
interface RawMeRoles {
  roles?: Array<{ roleType?: string }>
}

/** 平台侧直接放行的角色 */
const PASS_ROLES = ['SUPER_ADMIN', 'OPERATION_ADMIN', 'CIRCLE_OWNER']

/**
 * 是否具备短视频发布权限（P0 临时口径，见文件头注释）。
 * @returns true=放行进发布页；false=弹引导层
 */
export async function checkVideoPublishPermission(): Promise<boolean> {
  try {
    const me = await apiGet<RawMeRoles>('/auth/me')
    const roles = (me?.roles ?? []).map((r) => String(r?.roleType || '').toUpperCase())
    if (roles.some((r) => PASS_ROLES.includes(r))) return true

    // roles 无 CIRCLE_OWNER 时再查一遍我的圈子（兼容角色表未回填的存量圈主）
    const mine = await circleApi.getMyCircles()
    return mine.some((c) => c.role === 'owner')
  } catch {
    // 拿不到数据（未登录/网络异常）→ 降级放行，别把能发的人挡死
    return true
  }
}
