/**
 * 分享工具 - 环境检测 + 双轨分享
 *
 * 支持微信小程序 (MP-WEIXIN) 和 H5 浏览器两种环境，
 * 根据编译条件自动选择对应的分享方式。
 */

/** 分享配置 */
export interface ShareConfig {
  title: string
  desc: string
  image?: string
  path: string
  h5Url: string
}

/**
 * 是否为微信小程序环境（运行时检测）
 */
export function isMiniProgram(): boolean {
  // #ifdef MP-WEIXIN
  return true
  // #endif
  // #ifndef MP-WEIXIN
  return false
  // #endif
}

/**
 * 设置分享
 *
 * 微信小程序: 通过 wx.showShareMenu 或 onShareAppMessage
 * H5: 通过 Web Share API 或回退到剪贴板
 */
export function setupShare(config: ShareConfig) {
  const { title, desc, image, path, h5Url } = config

  // #ifdef MP-WEIXIN
  // 微信小程序：设置右上角转发菜单
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline'],
  })

  // 页面 onShareAppMessage 由各页面自行实现，此处提供工具函数
  return {
    title,
    path,
    imageUrl: image || '',
    desc,
  }
  // #endif

  // #ifdef H5
  // H5 环境：优先使用原生 Web Share API
  if (navigator.share) {
    navigator.share({
      title,
      text: desc,
      url: h5Url,
    }).catch(() => {
      // 用户取消分享，不做处理
    })
  } else {
    // 降级方案：复制链接到剪贴板
    uni.setClipboardData({
      data: h5Url,
      success: () => {
        uni.showToast({ title: '链接已复制', icon: 'success' })
      },
      fail: () => {
        uni.showToast({ title: '复制失败，请手动复制', icon: 'none' })
      },
    })
  }
  // #endif

  // #ifdef APP-PLUS
  // App 端：使用 uni.share API
  uni.share({
    provider: 'weixin',
    type: 0,
    title,
    scene: 'WXSceneSession',
    imageUrl: image,
    summary: desc,
    href: h5Url,
    success: () => {
      uni.showToast({ title: '分享成功', icon: 'success' })
    },
    fail: () => {
      uni.showToast({ title: '分享失败', icon: 'none' })
    },
  })
  // #endif
}

/**
 * 生成分享链接（H5 fallback）
 */
export function generateShareUrl(baseUrl: string, params: Record<string, string>): string {
  const query = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  return query ? `${baseUrl}?${query}` : baseUrl
}
