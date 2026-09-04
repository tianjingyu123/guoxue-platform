/** 旧排盘分享独立适配：网页只能提出请求，最终由用户选择图片或公开链接。 */
export interface LegacyShareRequest {
  kind: 'page' | 'image' | 'save'
  title: string
  text: string
  url: string
  imageUrl: string
}

export class LegacyShareError extends Error {
  constructor(public code: 'INVALID' | 'BUSY' | 'STALE_PAGE' | 'UNAVAILABLE' | 'IMAGE_FAILED', message: string) {
    super(message)
    this.name = 'LegacyShareError'
  }
}

/** 不包含会话、订单或签名参数的正式排盘入口，所有“页面分享”至少回落到此地址。 */
export const PUBLIC_PAIPAN_SHARE_URL = 'https://api.rebugx.cn/h5/pages/paipan/index'
/** 微信网页卡片需要稳定缩略图；使用随包只读品牌资源，不依赖第三方页面临时图片。 */
export const LEGACY_SHARE_THUMBNAIL = '/static/logo.webp'

/** 宁可提供明确的截图选项，也不把 App 登录入口、签名、订单或会话链接分享出去。 */
export function publicLegacyShareUrl(value: unknown, image = false): string {
  if (typeof value !== 'string' || value.length > 2048) return ''
  if (!image && value === PUBLIC_PAIPAN_SHARE_URL) return value
  const match = value.match(/^https:\/\/((?:www\.)?(?:yrydai\.(?:cn|com)|rebu\.net\.cn))(\/[A-Za-z0-9_./-]*)(?:\?([^#]*))?$/iu)
  if (!match || /(?:^|\/)(?:\.{1,2})(?:\/|$)/u.test(match[2])) return ''
  if (/guoxueApp|app_login|login|oauth|callback|payment|getTrade|token|auth|member|order|trade|\/my\.php/iu.test(match[2])) return ''
  if (image && (!/\.(?:png|jpe?g|webp)$/iu.test(match[2]) || match[3])) return ''
  if (match[3]) {
    const seen = new Set<string>()
    for (const pair of match[3].split('&')) {
      const item = pair.match(/^(id|aid|cid|tid|shareId|type|mod|m|c|a|page)=([A-Za-z0-9_-]{1,100})$/u)
      if (!item || seen.has(item[1])) return ''
      seen.add(item[1])
    }
  }
  return value
}

export function parseLegacyShareBridgeUrl(value: string): LegacyShareRequest | null {
  if (value.length > 24000) return null
  const match = value.match(/^rebu:\/\/legacy-share\?payload=([^&#]+)$/u)
  if (!match) return null
  try {
    const raw = decodeURIComponent(match[1])
    if (raw.length > 6000) return null
    const data = JSON.parse(raw) as Record<string, unknown>
    if (!data || Array.isArray(data) || typeof data !== 'object' || !['page', 'image', 'save'].includes(String(data.kind))) return null
    const text = (v: unknown, max: number) => {
      if (typeof v !== 'string' || /\b(?:access_token|token|authorization|password|secret|signature|sign|key)\s*[:=]/iu.test(v)) return ''
      const printable = Array.from(v.replace(/https?:\/\/\S+/giu, '[链接]'), (char) => {
        const code = char.charCodeAt(0)
        return code < 32 || code === 127 ? ' ' : char
      }).join('')
      return printable.slice(0, max).trim()
    }
    const imageUrl = publicLegacyShareUrl(data.imageUrl, true)
    // 图片接口不得借本地路径、任意域名或签名地址读取文件。
    if ((data.kind === 'image' || data.kind === 'save') && data.imageUrl && !imageUrl) return null
    const kind = data.kind as LegacyShareRequest['kind']
    return {
      kind,
      title: text(data.title, 80) || '排盘分享',
      text: text(data.text, 300),
      // 旧站存在多套分享桥，部分“分享”按钮实际调用 sharePicture。
      // page/image 都保留可打开的公开 H5 卡片，同时保留图片/海报选项；save 仍只保存图片。
      url: publicLegacyShareUrl(data.url) || (kind !== 'save' ? PUBLIC_PAIPAN_SHARE_URL : ''),
      imageUrl,
    }
  } catch { return null }
}

type ShareOutcome = 'requested' | 'saved' | 'copied' | 'cancelled'
type ShareOptions = { canProceed: () => boolean; capture: () => Promise<string> }
let activeShare = false

function assertCurrent(options: ShareOptions) {
  if (!options.canProceed()) throw new LegacyShareError('STALE_PAGE', '页面已切换，请在当前排盘页面重新分享')
}

function cancelled(error: unknown): boolean {
  const e = error as { errMsg?: string; message?: string; errCode?: number; code?: number }
  return e?.errCode === -2 || e?.code === -2 || /cancel|取消/iu.test(String(e?.errMsg || e?.message || ''))
}

function callback<T>(start: (ok: (value: T) => void, fail: (error?: unknown) => void) => void, timeout = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    let done = false
    const timer = timeout ? setTimeout(() => finish(false), timeout) : null
    function finish(ok: boolean, value?: T | unknown) {
      if (done) return
      done = true
      if (timer) clearTimeout(timer)
      if (ok) resolve(value as T)
      else reject(cancelled(value) ? { cancelled: true } : new LegacyShareError('UNAVAILABLE', '分享未完成，请稍后重试'))
    }
    try { start((value) => finish(true, value), (error) => finish(false, error)) } catch { finish(false) }
  })
}

/** 仅清理由本次 SDK 创建的临时图片；不读取目录、不触碰用户相册。 */
function removeTemporaryImage(path: string) {
  if (!path) return
  try {
    plus.io.resolveLocalFileSystemURL(path, (entry) => {
      if (entry.isFile) entry.remove(() => {}, () => {})
    }, () => {})
  } catch { /* 系统会清理缓存，清理失败不重复分享 */ }
}

async function prepareImage(request: LegacyShareRequest, options: ShareOptions): Promise<string> {
  assertCurrent(options)
  let path = ''
  try {
    if (request.imageUrl) {
      const downloaded = await callback<{ statusCode: number; tempFilePath: string }>((ok, fail) => {
        uni.downloadFile({ url: request.imageUrl, timeout: 10000, header: { Accept: 'image/*' }, success: ok, fail })
      }, 12000)
      path = downloaded.tempFilePath
      if (downloaded.statusCode !== 200 || !path) throw new Error('INVALID_IMAGE')
    } else {
      path = await options.capture()
      if (!path) throw new Error('INVALID_CAPTURE')
    }
    assertCurrent(options)
    const file = await callback<{ size: number }>((ok, fail) => uni.getFileInfo({ filePath: path, success: ok, fail }))
    if (!Number.isFinite(file.size) || file.size <= 0 || file.size > 8 * 1024 * 1024) throw new Error('INVALID_IMAGE_SIZE')
    const image = await callback<{ width: number; height: number }>((ok, fail) => uni.getImageInfo({ src: path, success: ok, fail }))
    if (!(image.width > 0 && image.height > 0) || image.width * image.height > 40_000_000) throw new Error('INVALID_IMAGE_DIMENSIONS')
    assertCurrent(options)
    return path
  } catch (error) {
    removeTemporaryImage(path)
    if (error instanceof LegacyShareError && error.code === 'STALE_PAGE') throw error
    throw new LegacyShareError('IMAGE_FAILED', '分享图片准备失败，请返回排盘页重新生成')
  }
}

/** 模块已打包不代表手机已安装微信；只读检测，不触发登录授权或网络分享。 */
async function hasNativeWeixin(): Promise<boolean> {
  try {
    // HTML5+ 的部分声明把 id 写成对象类型；按官方运行时字符串契约进行收窄。
    const services = await callback<Array<{ id?: unknown; nativeClient?: boolean }>>((ok, fail) => {
      plus.share.getServices(ok, fail)
    }, 2000)
    return Array.isArray(services) && services.some((service) => typeof service?.id === 'string' && service.id === 'weixin' && service.nativeClient === true)
  } catch { return false }
}

/** 每次必须由原生菜单选择；取消不复制、不保存、不自动换渠道、不伪报发送成功。 */
export async function shareLegacyPaipan(request: LegacyShareRequest, options: ShareOptions): Promise<ShareOutcome> {
  if (activeShare) throw new LegacyShareError('BUSY', '分享正在处理中')
  assertCurrent(options)
  activeShare = true
  let imagePath = ''
  try {
    if (!['android', 'ios'].includes(uni.getSystemInfoSync().platform)) {
      throw new LegacyShareError('UNAVAILABLE', '请在热卜 App 中使用原生分享')
    }
    let action: 'copy-page' | 'friend-page' | 'timeline-page' | 'friend-image' | 'timeline-image' | 'save' | 'link'
    if (request.kind === 'save') {
      const decision = await callback<{ confirm: boolean }>((ok, fail) => uni.showModal({
        title: '保存排盘图片', content: request.imageUrl ? '将这张排盘图片保存到手机相册？' : '将当前页面的可见内容保存到手机相册？',
        confirmText: '保存图片', success: ok, fail,
      }), 0)
      if (!decision.confirm) return 'cancelled'
      action = 'save'
    } else {
      const source = request.imageUrl ? '图片' : '当前页图片'
      const nativeWeixin = await hasNativeWeixin()
      assertCurrent(options)
      const actions: Array<typeof action> = []
      const items: string[] = []
      if (nativeWeixin && request.url) {
        actions.push('friend-page', 'timeline-page')
        items.push('微信好友（可打开页面）', '朋友圈（可打开页面）')
      }
      if (nativeWeixin) {
        actions.push('friend-image', 'timeline-image')
        items.push(`微信好友（${source}）`, `朋友圈（${source}）`)
      }
      actions.push('save')
      items.push(`保存${source}`)
      if (request.url) { actions.push('link'); items.push('系统分享公开链接') }
      if (request.url) { actions.push('copy-page'); items.push('复制可打开的 H5 页面链接') }
      const decision = await callback<{ tapIndex: number }>((ok, fail) => uni.showActionSheet({ itemList: items, success: ok, fail }), 0)
      if (!Number.isInteger(decision.tapIndex) || decision.tapIndex < 0 || decision.tapIndex >= items.length) return 'cancelled'
      action = actions[decision.tapIndex]
    }
    assertCurrent(options)
    if (action === 'copy-page') {
      await callback<void>((ok, fail) => uni.setClipboardData({ data: request.url, success: () => ok(), fail }), 0)
      return 'copied'
    }
    if (action === 'friend-page' || action === 'timeline-page') {
      await callback<void>((ok, fail) => uni.share({
        provider: 'weixin',
        scene: action === 'timeline-page' ? 'WXSceneTimeline' : 'WXSceneSession',
        type: 0,
        href: request.url,
        title: request.title,
        summary: request.text || '打开热卜排盘',
        imageUrl: LEGACY_SHARE_THUMBNAIL,
        success: () => ok(),
        fail,
      }), 0)
      return 'requested'
    }
    if (action === 'link') {
      // 系统分享只支持 text/image；不得沿用旧公共工具里无效的 type:web。
      await callback<void>((ok, fail) => plus.share.sendWithSystem({
        type: 'text', href: request.url, title: request.title,
        content: `${request.title}\n${request.text ? request.text + '\n' : ''}${request.url}`,
      }, () => ok(), fail), 0)
      return 'requested'
    }
    assertCurrent(options)
    imagePath = await prepareImage(request, options)
    assertCurrent(options)
    if (action === 'save') {
      await callback<void>((ok, fail) => uni.saveImageToPhotosAlbum({ filePath: imagePath, success: () => ok(), fail }), 0)
      return 'saved'
    }
    await callback<void>((ok, fail) => uni.share({
      provider: 'weixin', scene: action === 'timeline-image' ? 'WXSceneTimeline' : 'WXSceneSession',
      type: 2, imageUrl: imagePath, success: () => ok(), fail,
    }), 0)
    return 'requested'
  } catch (error) {
    if ((error as { cancelled?: boolean })?.cancelled) return 'cancelled'
    throw error instanceof LegacyShareError ? error : new LegacyShareError('UNAVAILABLE', '分享未完成，请稍后重试')
  } finally {
    removeTemporaryImage(imagePath)
    activeShare = false
  }
}

/** 只截取发起请求的受信子窗口；不能用全局当前窗口或跨页后的窗口代替。 */
export function captureLegacyShareImage(child: { draw: (...args: any[]) => void }, canProceed: () => boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = `rebu-legacy-share-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const path = `_doc/${id}.jpg`
    let bitmap: PlusNativeObjBitmap | undefined
    let finished = false
    const finish = (success: boolean) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      try { bitmap?.recycle() } catch { /* 只回收本次图片 */ }
      if (success && canProceed()) resolve(path)
      else {
        removeTemporaryImage(path)
        reject(new LegacyShareError(canProceed() ? 'IMAGE_FAILED' : 'STALE_PAGE', '当前页面图片未能生成，请返回排盘页重试'))
      }
    }
    const timer = setTimeout(() => finish(false), 10000)
    try {
      if (!canProceed()) { finish(false); return }
      const Bitmap = plus.nativeObj?.Bitmap
      if (!Bitmap) { finish(false); return }
      bitmap = new Bitmap(id)
      child.draw(bitmap, () => {
        if (finished || !canProceed()) { finish(false); return }
        bitmap?.save(path, { format: 'jpg', quality: 90, overwrite: false }, () => {
          if (finished) { removeTemporaryImage(path); return }
          finish(true)
        }, () => finish(false))
      }, () => finish(false), { check: true })
    } catch { finish(false) }
  })
}
