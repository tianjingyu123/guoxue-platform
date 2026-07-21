import { BRAND } from '@/lib/brand'

export interface ShareLinkOptions {
  title?: string
  text?: string
  url?: string
}

/** 生成当前页面的正式 H5 链接；H5 保留浏览器完整 query，App/小程序从页面栈重建。 */
export function getCurrentShareUrl(): string {
  if (typeof window !== 'undefined' && window.location?.href) return window.location.href
  const pages = getCurrentPages()
  const current = pages[pages.length - 1] as unknown as {
    route?: string
    options?: Record<string, string | number | boolean | undefined | null>
  }
  const route = String(current?.route || 'pages/index/index').replace(/^\//, '')
  const query = Object.entries(current?.options || {})
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
  const base = (BRAND.h5Url || 'https://api.rebugx.cn/h5/').replace(/\/$/, '')
  return `${base}/${route}${query ? `?${query}` : ''}`
}

function copyLink(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    uni.setClipboardData({
      data: url,
      success: () => {
        uni.showToast({ title: '链接已复制', icon: 'none' })
        resolve(true)
      },
      fail: () => {
        uni.showToast({ title: '复制失败，请稍后重试', icon: 'none' })
        resolve(false)
      },
    })
  })
}

/**
 * 优先调用浏览器系统分享；不支持时复制正式链接。
 * 用户主动取消系统分享不伪报成功，也不强行回退剪贴板。
 */
export async function shareLink(options: ShareLinkOptions = {}): Promise<boolean> {
  const url = options.url || getCurrentShareUrl()
  if (!url) {
    uni.showToast({ title: '分享链接生成失败', icon: 'none' })
    return false
  }
  if (typeof navigator !== 'undefined') {
    const nav = navigator as Navigator & {
      share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>
    }
    if (typeof nav.share === 'function') {
      try {
        await nav.share({ title: options.title, text: options.text, url })
        return true
      } catch (error) {
        if ((error as { name?: string })?.name === 'AbortError') return false
        // 系统分享异常时回退复制，保证用户仍能完成动作。
      }
    }
  }
  return copyLink(url)
}
