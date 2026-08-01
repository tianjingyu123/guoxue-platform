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
 * 权限接口或网络异常时一律关闭全平台发布，圈内发布仍可正常使用。
 * 真实权限由服务端二次校验，前端只负责提前给出清晰引导。
 */
export async function checkVideoPublishPermission(circleId?: string): Promise<boolean> {
  try {
    const status = await getCirclePublishGrantStatus('SHORT_VIDEO')
    if (status.isPlatformAdmin) return true
    if (circleId) return !!status.circles.find((circle) => circle.id === circleId)?.canPublish
    return status.canPublish
  } catch {
    return false
  }
}
