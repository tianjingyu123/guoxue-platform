import { apiGet, apiPost } from '@/utils/request'

export type CirclePublishScope = 'SHORT_VIDEO' | 'LIVE' | 'COURSE'
export type IdentityLevel = 'NONE' | 'L1' | 'L2'

export interface PublishProgressItem {
  current: number
  required: number
  passed: boolean
}

export interface CirclePublishStatus {
  id: string
  name: string
  status: string
  progress: {
    operatingDays: PublishProgressItem
    members: PublishProgressItem
    works: PublishProgressItem
    recentWorks: PublishProgressItem
  }
  regularEligible: boolean
  identityReady: boolean
  requiredIdentityLevel: IdentityLevel
  canPublish: boolean
  activeGrant: {
    id: string
    scopes: CirclePublishScope[]
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FROZEN' | 'REVOKED'
    channel: 'REGULAR' | 'FAST_TRACK'
    rejectReason?: string | null
    createdAt: string
  } | null
}

export interface CirclePublishGrantStatus {
  isPlatformAdmin: boolean
  canPublish: boolean
  requestedScopes: CirclePublishScope[]
  identityLevel: IdentityLevel
  circles: CirclePublishStatus[]
}

export interface ApplyCirclePublishGrantInput {
  circleId: string
  scopes: CirclePublishScope[]
  channel?: 'REGULAR' | 'FAST_TRACK'
  externalPlatform?: string
  externalProfileUrl?: string
  externalFollowerCount?: number
  evidenceUrls?: string[]
}

export function getCirclePublishGrantStatus(scope: CirclePublishScope) {
  return apiGet<CirclePublishGrantStatus>(`/circle-publish-grants/status?scope=${scope}`)
}

export function applyCirclePublishGrant(input: ApplyCirclePublishGrantInput) {
  return apiPost('/circle-publish-grants/apply', input)
}

/**
 * 发布资格只控制投稿，不控制普通浏览；网络异常不能误报有权限。
 * 真实权限由服务端二次校验，前端只负责提前给出清晰引导。
 */
export async function checkVideoPublishPermission(circleId?: string): Promise<boolean> {
  return checkCirclePublishPermission('SHORT_VIDEO', circleId)
}

export async function checkCirclePublishPermission(capability: 'SHORT_VIDEO' | 'LIVE', circleId?: string): Promise<boolean> {
  try {
    if (circleId) {
      const status = await apiGet<{ circleId: string; capability: string; canPublish: boolean }>(
        `/circle-capabilities/circles/${encodeURIComponent(circleId)}/use-status?capability=${capability}`,
      )
      if (status.circleId !== circleId || status.capability !== capability) return false
      if (status.canPublish === true) return true
    }
    // 无圈子只有平台管理员能投稿；旧圈级批准不能作为新独立能力的替代凭证。
    const status = await getCirclePublishGrantStatus(capability)
    return status.isPlatformAdmin === true
  } catch {
    return false
  }
}
