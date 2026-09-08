/** 排盘分享独立适配：仅分享当前公开页面，或生成指向同一页面的二维码海报。 */
export interface LegacyShareRequest {
  kind: 'page' | 'image' | 'save'
  title: string
  text: string
  url: string
  imageUrl: string
}

export class LegacyShareError extends Error {
  constructor(public code: 'INVALID' | 'BUSY' | 'STALE_PAGE' | 'UNAVAILABLE', message: string) {
    super(message)
    this.name = 'LegacyShareError'
  }
}

/** 只使用构建绑定的公开入口；第三方网页不能决定正式/预发布环境。 */
const publicH5Base = String(import.meta.env.VITE_PUBLIC_H5_URL || '').replace(/\/+$/, '')
if (!/^https:\/\/[^/?#@:]+(?:\/[^?#]*)?$/u.test(publicH5Base)) throw new Error('PUBLIC_H5_SHARE_CONFIG_INVALID')
export const PUBLIC_PAIPAN_SHARE_URL = `${publicH5Base}/pages/paipan/index`
/** 微信网页卡片需要稳定缩略图；使用随包只读品牌资源，不依赖第三方页面临时图片。 */
export const LEGACY_SHARE_THUMBNAIL = '/static/logo.webp'

/** 无公开地址就停止，不能把 App 登录入口、签名、订单或会话链接分享出去。 */
export function publicLegacyShareUrl(value: unknown, image = false): string {
  if (typeof value !== 'string' || value.length > 2048) return ''
  if (!image && value === PUBLIC_PAIPAN_SHARE_URL) return value
  const match = value.match(/^https:\/\/((?:www\.)?(?:yrydai\.(?:cn|com)|rebu\.net\.cn))(\/[A-Za-z0-9_./-]*)(?:\?([^#]*))?$/iu)
  if (!match || /(?:^|\/)(?:\.{1,2})(?:\/|$)/u.test(match[2])) return ''
  if (/guoxueApp|app_login|login|oauth|callback|payment|getTrade|token|auth|member|order|trade|\/my\.php/iu.test(match[2])) return ''
  if (image && (!/\.(?:png|jpe?g|webp)$/iu.test(match[2]) || match[3])) return ''
  const resultPage = !image && (match[2] === '/app_p1.php' || match[2] === '/p1.php')
  const publicPairs: string[] = []
  if (match[3]) {
    const seen = new Set<string>()
    for (const pair of match[3].split('&')) {
      if (resultPage) {
        const entry = pair.match(/^([A-Za-z]+)=(.*)$/u)
        if (!entry || seen.has(entry[1])) return ''
        seen.add(entry[1])
        let decoded: string
        try { decoded = decodeURIComponent(entry[2].replace(/\+/g, ' ')) } catch { return '' }
        const key = entry[1]
        // ruid 是推广用户标识，不参与当前盘面重建；不外发。
        if (key === 'ruid' && /^\d{0,20}$/.test(decoded)) continue
        const valid = ['dateTime', 'realTime'].includes(key)
          ? /^[0-9 T:./-]{0,32}$/.test(decoded)
          : ['ziXuan', 'ju'].includes(key)
            ? /^-?\d{0,10}$/.test(decoded) && decoded !== '-'
            : ['id', 'type', 'mod', 'act'].includes(key) && /^[A-Za-z0-9_-]{0,100}$/.test(decoded)
        if (!valid) return ''
        publicPairs.push(pair)
        continue
      }
      const item = pair.match(/^(id|aid|cid|tid|shareId|type|mod|act|m|c|a|page)=([A-Za-z0-9_-]{1,100})$/u)
      if (!item || seen.has(item[1])) return ''
      seen.add(item[1])
    }
  }
  if (resultPage) return `https://${match[1]}/p1.php${publicPairs.length ? '?' + publicPairs.join('&') : ''}`
  // 原版 APK 分享前会移除 app_；这里只转换已取证的工具页面，不改参数或其他路径。
  if (!image && match[2] === '/app_tool.php') {
    return value.replace('/app_tool.php', '/tool.php')
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
      // 兼容原站图片接口名称，但只保留当前公开链接；缺少链接时由原生层明确阻断。
      url: publicLegacyShareUrl(data.url),
      imageUrl,
    }
  } catch { return null }
}

export interface LegacyPosterPayload {
  url: string
  title: string
  description: string
  isToolEntry: boolean
}

let pendingPoster: { payload: LegacyPosterPayload; expiresAt: number } | null = null

/** 海报页一次性交接：不落盘，不把页面链接或用户摘要放进导航参数。 */
export function stageLegacyPoster(request: LegacyShareRequest): boolean {
  pendingPoster = null
  const safe = parseLegacyShareBridgeUrl('rebu://legacy-share?payload=' + encodeURIComponent(JSON.stringify(request)))
  if (!safe?.url || safe.url === PUBLIC_PAIPAN_SHARE_URL || request.kind === 'save') return false
  const isToolEntry = safe.url === PUBLIC_PAIPAN_SHARE_URL
  pendingPoster = {
    expiresAt: Date.now() + 15_000,
    payload: {
      url: safe.url,
      title: isToolEntry ? '热卜排盘工具' : safe.title,
      description: isToolEntry ? '扫码打开排盘工具入口，不包含当前排盘结果。' : safe.text,
      isToolEntry,
    },
  }
  return true
}

export function consumeLegacyPoster(): LegacyPosterPayload | null {
  const pending = pendingPoster
  pendingPoster = null
  if (!pending || pending.expiresAt <= Date.now()) return null
  return { ...pending.payload }
}

type ShareOutcome = 'requested' | 'cancelled'
type ShareOptions = { canProceed: () => boolean }
let activeShare = false
let nativeShareReturn: { hidden: boolean; finish: () => void } | null = null

/** 微信可能不回调分享结果；只将返回视为本次交互结束，不视为发送成功。 */
export function notifyLegacyShareVisibility(visible: boolean): void {
  const pending = nativeShareReturn
  if (!pending) return
  if (!visible) pending.hidden = true
  else if (pending.hidden) pending.finish()
}

/** 原页面销毁时结束等待，避免重新进入页面后仍持有全局分享锁。 */
export function abandonLegacyShare(): void {
  nativeShareReturn?.finish()
}

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

/** 四项菜单仅处理当前页面；取消不外发、不自动换渠道、不伪报发送成功。 */
export async function shareLegacyPaipan(request: LegacyShareRequest, options: ShareOptions): Promise<ShareOutcome> {
  if (activeShare) throw new LegacyShareError('BUSY', '分享正在处理中')
  assertCurrent(options)
  activeShare = true
  try {
    if (!['android', 'ios'].includes(uni.getSystemInfoSync().platform)) {
      throw new LegacyShareError('UNAVAILABLE', '请在热卜 App 中使用原生分享')
    }
    const safeUrl = publicLegacyShareUrl(request.url)
    if (!safeUrl || safeUrl === PUBLIC_PAIPAN_SHARE_URL) {
      throw new LegacyShareError('UNAVAILABLE', '当前页面暂未提供可打开的分享链接，无法分享；不会替换为图片或首页')
    }
    // 最终外发也必须使用过滤后的地址，不能仅校验后仍发原始 App URL。
    request = { ...request, url: safeUrl }
    let action: 'friend-page' | 'timeline-page' | 'poster' | 'more'
    if (request.kind === 'save') {
      throw new LegacyShareError('UNAVAILABLE', '不再提供页面图片分享，请使用当前页面链接分享')
    } else {
      const actions: Array<typeof action> = ['friend-page', 'timeline-page', 'poster', 'more']
      const items = ['发给微信好友', '发朋友圈', '生成二维码海报', '更多平台']
      const decision = await callback<{ tapIndex: number }>((ok, fail) => uni.showActionSheet({ itemList: items, success: ok, fail }), 0)
      if (!Number.isInteger(decision.tapIndex) || decision.tapIndex < 0 || decision.tapIndex >= items.length) return 'cancelled'
      action = actions[decision.tapIndex]
    }
    assertCurrent(options)
    if (action === 'more') {
      // 当前包仅配置微信。系统文本分享无法保证生成网页卡片，不能拿它冒充更多卡片渠道。
      // 新渠道必须完成独立SDK接入与接收方卡片验收后才可加入此分支。
      throw new LegacyShareError('UNAVAILABLE', '当前版本尚未接入其他网页卡片分享平台，请选择微信好友、朋友圈或二维码海报')
    }
    if (action === 'poster') {
      if (!stageLegacyPoster(request)) throw new LegacyShareError('INVALID', '缺少可分享的页面链接')
      try {
        await callback<void>((ok, fail) => uni.navigateTo({
          url: '/pkg-circle/common/share-poster/index?source=paipan', success: () => ok(), fail,
        }), 0)
      } catch (error) {
        consumeLegacyPoster()
        throw error
      }
      return 'requested'
    }
    if (action === 'friend-page' || action === 'timeline-page') {
      const nativeWeixin = await hasNativeWeixin()
      assertCurrent(options)
      if (!nativeWeixin) throw new LegacyShareError('UNAVAILABLE', '请先安装微信，或选择生成二维码海报')
      await callback<void>((ok, fail) => {
        nativeShareReturn = { hidden: false, finish: () => fail({ errCode: -2 }) }
        uni.share({
        provider: 'weixin',
        scene: action === 'timeline-page' ? 'WXSceneTimeline' : 'WXSceneSession',
        type: 0,
        href: request.url,
        title: request.title,
        summary: request.text || '打开当前排盘页面',
        imageUrl: LEGACY_SHARE_THUMBNAIL,
        success: () => ok(),
        fail,
        })
      }, 60_000)
      return 'requested'
    }
    return 'cancelled'
  } catch (error) {
    if ((error as { cancelled?: boolean })?.cancelled) return 'cancelled'
    throw error instanceof LegacyShareError ? error : new LegacyShareError('UNAVAILABLE', '分享未完成，请稍后重试')
  } finally {
    nativeShareReturn = null
    activeShare = false
  }
}
