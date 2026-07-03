// ===== T3 供给侧定价顾问数据层 —— 真连后端 GET /pricing/reference =====
// 定位：服务对象=定价者（讲师/商家），仅按【商品类目维度】聚合同类市场价格分布。
// R2 合规：绝不含任何购买者/用户画像/消费能力维度；定价权完全在用户手中。
import { apiGet } from '@/utils/request'

/** 业务类型（与后端 PricingBizType 一致） */
export type PricingBizType = 'COURSE' | 'PRODUCT'

/** 当前拟定价相对区间的位置提示 */
export type CurrentPriceHint = 'OFFERED_HIGH' | 'OFFERED_LOW' | 'IN_RANGE' | null

/** 价格分布（样本≥5 才有值，否则 null） */
export interface PriceDistribution {
  avg: number
  median: number
  min: number
  max: number
  p25: number
  p75: number
}

export interface PriceBand {
  min: number
  max: number
}

export interface PricingReference {
  bizType: PricingBizType
  category: { level1: string; level2?: string }
  sampleSize: number
  distribution: PriceDistribution | null
  qualityBand: PriceBand | null
  salesBand: PriceBand | null
  suggestion: { range: [number, number] | null; text: string }
  currentPriceHint: CurrentPriceHint
  disclaimer: string
}

export const pricingApi = {
  /**
   * 同类目定价参考（登录·定价者）。
   * @param params.categoryLevel1 一级品类（必填）
   * @param params.currentPrice 当前拟定价（可选，用于区间位置提示）
   */
  getReference(params: {
    bizType: PricingBizType
    categoryLevel1: string
    categoryLevel2?: string
    currentPrice?: number
  }): Promise<PricingReference> {
    const q = new URLSearchParams()
    q.set('bizType', params.bizType)
    q.set('categoryLevel1', params.categoryLevel1)
    if (params.categoryLevel2) q.set('categoryLevel2', params.categoryLevel2)
    if (params.currentPrice != null && !Number.isNaN(params.currentPrice)) {
      q.set('currentPrice', String(params.currentPrice))
    }
    return apiGet<PricingReference>(`/pricing/reference?${q.toString()}`)
  },
}

/** 位置提示的展示映射（文案 + 配色） */
export const priceHintConfig: Record<Exclude<CurrentPriceHint, null>, { label: string; color: string; bg: string }> = {
  OFFERED_HIGH: { label: '高于多数同类', color: '#b45309', bg: '#fef3c7' },
  OFFERED_LOW: { label: '低于多数同类', color: '#1d4ed8', bg: '#dbeafe' },
  IN_RANGE: { label: '在合理区间', color: '#15803d', bg: '#dcfce7' },
}
