import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { coinApi } from '@/api'

/** 虚拟币交易记录 */
export interface CoinTransaction {
  id: string
  type: 'RECHARGE' | 'SPEND' | 'REFUND'
  scene: string
  amountCoin: number
  balanceAfter: number
  description?: string
  refId?: string
  createdAt: string
}

/** 充值档位 */
export interface CoinTier {
  id: string
  /** 人民币金额（元） */
  amount: number
  /** 赠送虚拟币数 */
  coin: number
  /** 额外赠送（可选） */
  bonus?: number
  /** 角标文案，如"热卖" */
  badge?: string
}

export const useCoinStore = defineStore('coin', () => {
  // ========== State ==========
  /** 虚拟币余额 */
  const balance = ref(0)
  /** 加载中 */
  const loading = ref(false)
  /** 充值档位列表 */
  const tiers = ref<CoinTier[]>([])
  /** 交易记录列表 */
  const transactions = ref<CoinTransaction[]>([])
  /** 错误信息 */
  const error = ref<string | null>(null)

  // ========== Getters ==========
  /** 格式化余额文案（如 "剩余 1280 币"） */
  const formattedBalance = computed(() => {
    return `剩余 ${balance.value} 币`
  })

  /** 折合人民币（按 100 币 = 1 元） */
  const balanceInYuan = computed(() => {
    return (balance.value / 100).toFixed(2)
  })

  /** 余额不足判断 */
  const isLowBalance = computed(() => balance.value < 100)

  // ========== Actions ==========

  /** 获取余额 */
  async function fetchBalance() {
    loading.value = true
    error.value = null
    try {
      const res: any = await coinApi.getBalance()
      balance.value = typeof res === 'number' ? res : (res.balance ?? res.coin ?? 0)
    } catch (e: any) {
      error.value = e.errMsg || e.message || '获取余额失败'
      uni.showToast({ title: error.value!, icon: 'none' })
    } finally {
      loading.value = false
    }
  }

  /** 获取充值档位 */
  async function fetchTiers() {
    loading.value = true
    error.value = null
    try {
      const res: any = await coinApi.getTiers()
      if (Array.isArray(res)) {
        tiers.value = res as CoinTier[]
      } else if (res.list || res.tiers) {
        tiers.value = (res.list || res.tiers) as CoinTier[]
      }
    } catch (e: any) {
      error.value = e.errMsg || e.message || '获取充值档位失败'
      uni.showToast({ title: error.value!, icon: 'none' })
    } finally {
      loading.value = false
    }
  }

  /** 获取交易记录 */
  async function fetchTransactions(page: number = 1, pageSize: number = 20, type?: string, scene?: string) {
    loading.value = true
    error.value = null
    try {
      const res: any = await coinApi.getTransactions(page, pageSize, type, scene)
      const raw: any[] = res.list || res.items || res.data || res || []
      const mapped: CoinTransaction[] = raw
        .filter((t: any) => t && t.id)
        .map((t: any) => ({
          id: t.id,
          type: t.type,
          scene: t.scene,
          amountCoin: t.amountCoin ?? t.amount ?? 0,
          balanceAfter: t.balanceAfter ?? 0,
          description: t.description,
          refId: t.refId,
          createdAt: t.createdAt,
        }))
      transactions.value = mapped
      return mapped
    } catch (e: any) {
      error.value = e.errMsg || e.message || '获取交易记录失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      return []
    } finally {
      loading.value = false
    }
  }

  /** 消费虚拟币 */
  async function spendCoin(data: { amountCoin: number; scene: string; refId?: string; description?: string }) {
    loading.value = true
    error.value = null
    try {
      const res: any = await coinApi.spend(data)
      // 扣减本地余额
      balance.value -= data.amountCoin
      if (balance.value < 0) balance.value = 0
      return res
    } catch (e: any) {
      error.value = e.errMsg || e.message || '消费失败'
      uni.showToast({ title: error.value!, icon: 'none' })
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    // state
    balance,
    loading,
    tiers,
    transactions,
    error,
    // getters
    formattedBalance,
    balanceInYuan,
    isLowBalance,
    // actions
    fetchBalance,
    fetchTiers,
    fetchTransactions,
    spendCoin,
  }
})
