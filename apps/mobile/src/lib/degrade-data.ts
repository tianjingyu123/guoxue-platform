import { apiGet } from '@/utils/request'

/** 依赖降级状态（O-T2·公开端点 /health/degrade·前端据此展示降级横幅） */
export interface DegradeStatus {
  live: boolean
  im: boolean
  vod: boolean
  ai: boolean
  pay: boolean
}

export const degradeApi = {
  /** 查询降级状态；接口异常时静默返回全 false（降级检测本身绝不能拖垮页面） */
  async getStatus(): Promise<DegradeStatus> {
    try {
      return await apiGet<DegradeStatus>('/health/degrade')
    } catch {
      return { live: false, im: false, vod: false, ai: false, pay: false }
    }
  },
}
