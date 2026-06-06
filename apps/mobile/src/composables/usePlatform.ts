/**
 * 平台合规检测 — 多通道分发核心
 *
 * 微信小程序审核期间，通过服务端配置隐藏排盘/算命/风水等敏感功能。
 * H5 和 APP 不受限制，永远返回全部功能可用。
 *
 * 用法：
 *   const { isMiniapp, paipanEnabled, fortuneEnabled } = usePlatform()
 *   onMounted(() => fetchConfig())
 */
import { ref, computed } from 'vue'

export interface MiniappConfig {
  paipanTools: string[]
  paipanEntry: boolean
  fortuneEnabled: boolean
  fengshuiEnabled: boolean
  jiemengEnabled: boolean
  namingEnabled: boolean
  mode: 'review' | 'normal'
  notice: string
  h5Url: string
}

const config = ref<MiniappConfig>({
  paipanTools: [],
  paipanEntry: false,  // ← 审核期间排盘入口关闭
  fortuneEnabled: false,
  fengshuiEnabled: false,
  jiemengEnabled: false,
  namingEnabled: false,
  mode: 'review',
  notice: '更多精彩功能，请在浏览器中打开热卜国学 H5 版本体验',
  h5Url: 'https://m.guoxue.ac.cn',
})

const loading = ref(false)

/** 判断当前运行环境 */
export const platformInfo = {
  /** 是否在微信小程序中 */
  isMiniapp: computed(() => {
    // #ifdef MP-WEIXIN
    return true
    // #endif
    return false
  }),
  /** 是否在 H5 中 */
  isH5: computed(() => {
    // #ifdef H5
    return true
    // #endif
    return false
  }),
  /** 是否在 APP 中 */
  isApp: computed(() => {
    // #ifdef APP-PLUS
    return true
    // #endif
    return false
  }),
}

export function usePlatform() {
  // ── 功能可见性 ──

  /** 排盘工具入口是否显示 */
  const paipanEnabled = computed(() => {
    if (!platformInfo.isMiniapp.value) return true  // H5/APP 永远显示
    return config.value.paipanEntry && config.value.mode === 'normal'
  })

  /** 算命/运势是否显示 */
  const fortuneEnabled = computed(() => {
    if (!platformInfo.isMiniapp.value) return true
    return config.value.fortuneEnabled
  })

  /** 风水是否显示 */
  const fengshuiEnabled = computed(() => {
    if (!platformInfo.isMiniapp.value) return true
    return config.value.fengshuiEnabled
  })

  /** 解梦是否显示 */
  const jiemengEnabled = computed(() => {
    if (!platformInfo.isMiniapp.value) return true
    return config.value.jiemengEnabled
  })

  /** 合婚/起名是否显示 */
  const namingEnabled = computed(() => {
    if (!platformInfo.isMiniapp.value) return true
    return config.value.namingEnabled
  })

  /** 审核模式公告（小程序审核期间展示） */
  const reviewNotice = computed(() => {
    if (!platformInfo.isMiniapp.value || config.value.mode === 'normal') return ''
    return config.value.notice
  })

  /** H5 完整版跳转链接 */
  const h5Url = computed(() => config.value.h5Url)

  // ── 数据获取 ──

  async function fetchConfig() {
    if (!platformInfo.isMiniapp.value) return // H5/APP 不需要请求
    loading.value = true
    try {
      const res = await uni.request({
        url: '/api/v1/system/public/miniapp-config',
        method: 'GET',
      })
      const data = (res.data as any)?.data || res.data
      if (data) config.value = { ...config.value, ...data }
    } catch {
      // 请求失败保持默认安全配置
    } finally {
      loading.value = false
    }
  }

  return {
    config,
    loading,
    paipanEnabled,
    fortuneEnabled,
    fengshuiEnabled,
    jiemengEnabled,
    namingEnabled,
    reviewNotice,
    h5Url,
    fetchConfig,
  }
}
