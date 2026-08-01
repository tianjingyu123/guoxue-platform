import { apiGet } from '@/utils/request'

interface AppUpdateInfo {
  version: string
  buildNumber?: string
  changelog?: string
  forceUpdate: boolean
  downloadUrl?: string
}

interface AppUpdateResponse {
  hasUpdate: boolean
  latest: AppUpdateInfo | null
}

const OPTIONAL_DISMISSED_KEY = 'app:update:optional-dismissed'
const NORMAL_CHECK_INTERVAL = 5 * 60 * 1000
const FORCE_CHECK_INTERVAL = 10 * 1000

let checking = false
let lastCheckedAt = 0
let forceUpdateActive = false

function buildMessage(info: AppUpdateInfo): string {
  const changelog = String(info.changelog || '').trim()
  const content = changelog || '新版本已发布，建议立即升级以获得完整功能和安全更新。'
  return content.length > 240 ? `${content.slice(0, 237)}...` : content
}

function openDownload(url: string): void {
  if (!/^(?:https?:\/\/|market:\/\/|itms-apps:\/\/)/i.test(url)) {
    uni.showToast({ title: '下载地址未正确配置，请联系客服', icon: 'none' })
    return
  }

  // #ifdef APP-PLUS
  plus.runtime.openURL(
    url,
    () => uni.showToast({ title: '无法打开应用商店，请稍后重试', icon: 'none' }),
  )
  // #endif
}

function promptUpdate(info: AppUpdateInfo): void {
  const dismissed = String(uni.getStorageSync(OPTIONAL_DISMISSED_KEY) || '')
  if (!info.forceUpdate && dismissed === info.version) return

  forceUpdateActive = info.forceUpdate
  uni.showModal({
    title: info.forceUpdate ? `必须升级至 ${info.version}` : `发现新版本 ${info.version}`,
    content: buildMessage(info),
    showCancel: !info.forceUpdate,
    cancelText: '稍后再说',
    confirmText: '立即升级',
    success: (result) => {
      if (result.confirm) {
        openDownload(String(info.downloadUrl || ''))
      } else if (!info.forceUpdate) {
        uni.setStorageSync(OPTIONAL_DISMISSED_KEY, info.version)
      }
    },
  })
}

/**
 * App 冷/热启动版本检查。
 * 强制更新会持续复检且不展示取消按钮；网络故障时允许启动，避免更新服务抖动导致全量用户被锁死。
 */
export async function checkForAppUpdate(): Promise<void> {
  // #ifdef APP-PLUS
  const now = Date.now()
  const interval = forceUpdateActive ? FORCE_CHECK_INTERVAL : NORMAL_CHECK_INTERVAL
  if (checking || now - lastCheckedAt < interval) return

  checking = true
  lastCheckedAt = now
  try {
    const app = uni.getAppBaseInfo()
    const device = uni.getSystemInfoSync()
    const platform = String(device.platform || '').toLowerCase()
    if (platform !== 'ios' && platform !== 'android') return

    const version = String(app.appVersion || '').trim()
    const buildNumber = String(app.appVersionCode || '').trim()
    if (!version) return

    const query = new URLSearchParams({
      platform,
      version,
      ...(buildNumber ? { buildNumber } : {}),
    })
    const result = await apiGet<AppUpdateResponse>(`/system/version/check?${query.toString()}`)
    if (result.hasUpdate && result.latest) {
      promptUpdate(result.latest)
    } else {
      forceUpdateActive = false
    }
  } catch {
    // 更新检查是启动旁路；接口暂时不可用时不阻断用户使用。
  } finally {
    checking = false
  }
  // #endif
}
