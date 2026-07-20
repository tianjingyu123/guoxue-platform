/**
 * 统一请求封装（替代原型 lib/api-client.ts）
 * 底层 fetch → uni.request；保持 ApiResponse<T> 信封与函数签名不变，后端无感知。
 * 契约见 docs/迁移准备/04-ClaudeCode对接说明.md。
 */
import { getToken, clearToken, getRefreshToken, setToken, setRefreshToken, clearRefreshToken } from './storage'
import { track } from '@/composables/useTrack'

export interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

/**
 * 统一上报 API 失败（旁路埋点，绝不阻塞/改变请求主流程）。
 * 修复的盲区：此前 4xx/5xx/网络失败只转 toast，线上端点批量 500/挂掉前端零观测信号，只能等用户投诉。
 * 现在失败分支旁路发一条 api_error，admin 埋点侧即可观测到接口异常。
 *
 * 三大防护：
 *  1) 防埋点自身成环：埋点批量上报本身走网络（POST /track/batch）。若它失败又触发 api_error → 无限环。
 *     故凡 url 含 '/track' 一律跳过，绝不为埋点请求上报埋点。
 *  2) 防洪峰：后端大面积 500 会瞬时产生海量失败。track.custom 走的是 useTrack 的「队列 + 批量 flush」
 *     （非同步逐条发网络请求），再叠加 20% 采样，进一步压制持续错误风暴下的上报量。
 *  3) 脱敏：只取 path 去掉 query（token/phone 等敏感信息常在 query），避免敏感值进埋点。
 *
 * @param path   apiFetch 收到的相对路径（不含 BASE_URL/PREFIX）
 * @param status HTTP 状态码；网络失败/超时无状态码时传 0
 * @param code   业务信封 code（可选）
 */
function reportApiError(path: string, status: number, code?: number): void {
  try {
    if (!path || path.includes('/track')) return // 防环：埋点自身请求不上报
    if (Math.random() > 0.2) return // 防洪峰：仅 20% 采样（叠加 useTrack 队列批量）
    const cleanPath = path.split('?')[0] // 脱敏：仅保留 path，丢弃 query
    track.custom('api_error', { url: cleanPath, status, code })
  } catch {
    // 埋点异常绝不影响请求主流程
  }
}

// 与原型一致：base + /api/v1 前缀
const BASE_URL = (import.meta as any).env?.VITE_API_URL || ''
const PREFIX = '/api/v1'

// 请求超时（弱网下避免长时间空等；各端默认值偏长，统一收敛为 15s）
const TIMEOUT = 15000
// 登录页（pkg-auth 分包根 + login/index）
const LOGIN_URL = '/pkg-auth/login/index'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'
type UnauthorizedMode = 'redirect' | 'silent'

/**
 * 网络失败文案归一化。
 * uni.request/uploadFile 失败时 errMsg 恒为「request:fail ...」「uploadFile:fail timeout」等原始码，
 * 直接抛给页面会显示裸英文（断网时用户看到「request:fail」）。此处仅把网络类原始码换成友好中文，
 * 其余有语义的 errMsg 原样透传，不破坏后端/业务错误消息。
 */
function friendlyNetError(errMsg: string | undefined, fallback: string): string {
  const raw = errMsg || ''
  if (/:fail|timeout|abort|interrupt|fail$/i.test(raw)) return fallback
  return raw || fallback
}

/**
 * 取当前栈顶页完整路径（含 query），用于登录后回跳。
 * 端差异：H5 端页面实例带 $page.fullPath（已含 query 串）；小程序端只有
 * route（不带斜杠、不含 query）+ options（query 对象），需手动拼回。
 * 取不到（启动早期栈为空等）返回 ''，调用方按"不存"处理。
 */
function getCurrentFullPath(): string {
  try {
    const pages = getCurrentPages()
    const cur = pages[pages.length - 1] as any
    if (!cur) return ''
    // H5：$page.fullPath 已含 query，直接用
    const full = cur.$page?.fullPath
    if (typeof full === 'string' && full) return full.startsWith('/') ? full : `/${full}`
    // 小程序：route + options 拼接
    const route: string = cur.route || ''
    if (!route) return ''
    const opts: Record<string, string> = cur.options || cur.$page?.options || {}
    const qs = Object.keys(opts)
      .map((k) => `${k}=${encodeURIComponent(opts[k])}`)
      .join('&')
    return `/${route}${qs ? `?${qs}` : ''}`
  } catch {
    return ''
  }
}

/**
 * 401 统一处理：清 token + 跳登录页。
 * 用 _redirecting 去重，避免多请求并发返回 401 时重复 reLaunch。
 * 跳转前把当前页完整路径存入 login:redirect（登录页读取后回跳），
 * 当前页就是登录/鉴权页或取不到路径时不存，避免登录成功后又跳回登录页。
 */
let _redirecting = false
function handleUnauthorized() {
  clearToken()
  clearRefreshToken()
  if (_redirecting) return
  _redirecting = true
  try {
    const from = getCurrentFullPath()
    if (from && !from.startsWith('/pkg-auth/')) {
      uni.setStorageSync('login:redirect', from)
    }
  } catch {
    // 记录回跳路径失败不影响跳登录主流程
  }
  uni.reLaunch({
    url: LOGIN_URL,
    complete: () => {
      setTimeout(() => {
        _redirecting = false
      }, 1500)
    },
  })
}

/**
 * 可选登录请求的会话过期只清理无效凭证，不劫持当前公开页面；调用方随后匿名重试一次。
 * 主动操作和受保护页面仍走 handleUnauthorized，保持登录回跳能力不变。
 */
function handleAuthExpired(mode: UnauthorizedMode) {
  if (mode === 'redirect') {
    handleUnauthorized()
    return
  }
  clearToken()
  clearRefreshToken()
}

/**
 * 认证入口接口（登录/发码/注册/找回密码）的 401 是业务错误（验证码/密码/账号错），
 * 应由页面自行 toast 提示，绝不能触发全局"未登录"跳转——否则登录页 reLaunch 闪退、
 * 页面设置的错误提示被冲掉（用户现象："输错闪一下就退出、没提示"）。
 */
function isAuthEntryPath(path: string): boolean {
  return /(auth\/login|auth\/send-code|auth\/register|auth\/reset-password|login\/sms|login\/wechat|login\/password)/.test(path)
}

/**
 * access token(2h)过期时，用 refreshToken(30天)无感换取新 token，避免频繁重新短信登录(降成本)。
 * 并发去重：多个请求同时 401 时只发一次刷新、共享结果。返回是否刷新成功。
 */
/**
 * 刷新结果三态（修复"链接服务器超时被误退出登录"）：
 * - 'ok'          刷新成功，重试原请求
 * - 'auth-fail'   refreshToken 缺失/失效（真·登录过期）→ 才清登录态跳登录
 * - 'network-fail' 刷新请求网络失败/超时（瞬时）→ 绝不退出登录，原请求走网络错误由页面重试
 */
export type RefreshResult = 'ok' | 'auth-fail' | 'network-fail'
let _refreshing: Promise<RefreshResult> | null = null
export function refreshAccessToken(): Promise<RefreshResult> {
  if (_refreshing) return _refreshing
  _refreshing = new Promise<RefreshResult>((resolve) => {
    const done = (r: RefreshResult) => { _refreshing = null; resolve(r) }
    const rt = getRefreshToken()
    if (!rt) { done('auth-fail'); return } // 无 refreshToken = 真未登录
    uni.request({
      url: `${BASE_URL}${PREFIX}/auth/refresh`,
      method: 'POST',
      data: { refreshToken: rt },
      header: { 'Content-Type': 'application/json' },
      timeout: TIMEOUT,
      success: (res) => {
        const body = res.data as ApiResponse<{ accessToken?: string; refreshToken?: string }>
        // 🔴 后端 /auth/refresh、/auth/handoff/exchange 是 POST 接口，NestJS 默认返回 HTTP 201。
        // 此处原写死 statusCode===200 → 续期实际成功(code=200+新token)却被判失败 → 清 token 踢下线，
        // 这正是"用一两小时(access 2h到期续期时)就自动退出、反复改 refresh 却没根治"的真凶(2026-07-18 生产实测确认)。
        if ((res.statusCode === 200 || res.statusCode === 201) && body?.code === 200 && body.data?.accessToken) {
          setToken(body.data.accessToken)
          if (body.data.refreshToken) setRefreshToken(body.data.refreshToken)
          done('ok')
        } else {
          // 服务端明确拒绝（refreshToken 过期/无效）→ 真登录过期
          done('auth-fail')
        }
      },
      // 网络失败/超时：瞬时问题，不判定为登录过期（此前 fail 返 false 导致超时即被退出）
      fail: () => done('network-fail'),
    })
  })
  return _refreshing
}

/**
 * 跨端无感登录握手就绪门：默认已就绪（不阻塞正常启动）。
 * App.vue 若在 URL 检测到一次性握手码，调用 beginAuthHandoff() 临时"上闩"，
 * 换取会话完成后放行——避免握手完成前的业务请求带着空/旧 token 打出去 401。
 */
let _authReady: Promise<void> = Promise.resolve()
export function beginAuthHandoff(): () => void {
  let release!: () => void
  _authReady = new Promise<void>((r) => { release = r })
  return release
}

/**
 * 用一次性握手码换取新会话（直连后端·不走 apiFetch 以免自等门）。
 * 安全：握手码由后端登录态签发、60s 单次，URL 里不再出现可复用的 bearer token。
 */
export function exchangeHandoff(code: string): Promise<boolean> {
  return new Promise((resolve) => {
    uni.request({
      url: `${BASE_URL}${PREFIX}/auth/handoff/exchange`,
      method: 'POST',
      data: { code },
      header: { 'Content-Type': 'application/json' },
      timeout: TIMEOUT,
      success: (res) => {
        const body = res.data as ApiResponse<{ accessToken?: string; refreshToken?: string }>
        // 🔴 后端 /auth/refresh、/auth/handoff/exchange 是 POST 接口，NestJS 默认返回 HTTP 201。
        // 此处原写死 statusCode===200 → 续期实际成功(code=200+新token)却被判失败 → 清 token 踢下线，
        // 这正是"用一两小时(access 2h到期续期时)就自动退出、反复改 refresh 却没根治"的真凶(2026-07-18 生产实测确认)。
        if ((res.statusCode === 200 || res.statusCode === 201) && body?.code === 200 && body.data?.accessToken) {
          setToken(body.data.accessToken)
          if (body.data.refreshToken) setRefreshToken(body.data.refreshToken)
          resolve(true)
        } else resolve(false)
      },
      fail: () => resolve(false),
    })
  })
}

function buildHeader(custom?: Record<string, string>): Record<string, string> {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...custom,
  }
}

function apiFetch<T>(path: string, method: Method, data?: unknown, header?: Record<string, string>, _retried = false, timeoutMs: number = TIMEOUT, unauthorizedMode: UnauthorizedMode = 'redirect'): Promise<T> {
  return new Promise((resolve, reject) => {
    // 等待握手就绪门（正常启动立即通过；仅在 URL 握手码换会话期间短暂等待）
    _authReady.then(() => {
    uni.request({
      url: `${BASE_URL}${PREFIX}${path}`,
      method,
      data: data as any,
      header: buildHeader(header),
      timeout: timeoutMs,
      success: (res) => {
        const body = res.data as ApiResponse<T>
        if (res.statusCode === 401) {
          if (isAuthEntryPath(path)) {
            // 登录/发码等入口的 401 = 账号/验证码/密码错误，交给页面提示，不跳转
            reject(new Error(body?.message || '账号或验证码错误'))
          } else if (!_retried) {
            // access 过期：用 refreshToken 无感换新 token 后重试原请求(30天免登录，降短信成本)；
            // 仅当 refreshToken 真失效(auth-fail)才退出；刷新时网络超时(network-fail)不退出，避免"链接超时被误退出"。
            refreshAccessToken().then((r) => {
              if (r === 'ok') resolve(apiFetch<T>(path, method, data, header, true, timeoutMs, unauthorizedMode))
              else if (r === 'network-fail') reject(new Error('网络连接超时，请稍后重试'))
              else if (unauthorizedMode === 'silent') {
                // 清掉无效凭证后匿名重试：OptionalAuth 公开端点继续返回游客内容；
                // 真正私有端点再次 401 后静默 reject，不循环、不跳登录。
                handleAuthExpired(unauthorizedMode)
                resolve(apiFetch<T>(path, method, data, header, true, timeoutMs, unauthorizedMode))
              } else {
                handleAuthExpired(unauthorizedMode)
                reject(new Error('未登录或登录已过期'))
              }
            })
          } else {
            handleAuthExpired(unauthorizedMode)
            reject(new Error('未登录或登录已过期'))
          }
          return
        }
        if (body && body.code === 200) {
          resolve(body.data)
        } else {
          reportApiError(path, res.statusCode, body?.code) // 旁路：上报 4xx/5xx 等非成功响应
          reject(new Error(body?.message || `请求失败(${res.statusCode})`))
        }
      },
      fail: (err) => {
        // 幂等 GET 网络失败/超时自动重试一次，吸收瞬时抖动
        if (method === 'GET' && !_retried) {
          resolve(apiFetch<T>(path, method, data, header, true, timeoutMs, unauthorizedMode))
          return
        }
        reportApiError(path, 0) // 旁路：网络失败/超时（重试后仍失败），status=0
        reject(new Error(friendlyNetError(err.errMsg, '网络连接失败，请检查网络后重试')))
      },
    })
    })
  })
}

export const apiGet = <T>(path: string, header?: Record<string, string>) => apiFetch<T>(path, 'GET', undefined, header)
/** 公开页面的个性化增强读取：会尝试无感续期，确认失效后仅清凭证、不跳登录。 */
export const apiGetOptionalAuth = <T>(path: string, header?: Record<string, string>) =>
  apiFetch<T>(path, 'GET', undefined, header, false, TIMEOUT, 'silent')

/**
 * 分页 GET：后端 ResponseInterceptor 把 { items, total, page, pageSize } 转为
 * { code, data: items, pagination: {...} }，而 apiGet 只回 data 会丢失 total。
 * 此助手保留分页信息，返回 { items, total, page, pageSize }。
 */
export function apiGetPaged<T>(path: string, header?: Record<string, string>, _retried = false): Promise<{ items: T[]; total: number; page: number; pageSize: number }> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${PREFIX}${path}`,
      method: 'GET',
      header: buildHeader(header),
      timeout: TIMEOUT,
      success: (res) => {
        const body = res.data as ApiResponse<T[]> & { pagination?: { total: number; page: number; pageSize: number } }
        if (res.statusCode === 401) {
          // 与 apiFetch 同款无感续期（此前直接登出是「几小时就要重新登录」的真凶之一：
          // access 2h 过期后碰到任何分页列表页即被踢，refreshToken 30 天形同虚设——董事长 2026-07-11 反馈修复）
          if (!_retried) {
            refreshAccessToken().then((r) => {
              if (r === 'ok') resolve(apiGetPaged<T>(path, header, true))
              else if (r === 'network-fail') reject(new Error('网络连接超时，请稍后重试'))
              else { handleUnauthorized(); reject(new Error('未登录或登录已过期')) }
            })
          } else {
            handleUnauthorized()
            reject(new Error('未登录或登录已过期'))
          }
          return
        }
        if (body && body.code === 200) {
          const items = Array.isArray(body.data) ? body.data : []
          const p = body.pagination
          resolve({ items, total: p?.total ?? items.length, page: p?.page ?? 1, pageSize: p?.pageSize ?? items.length })
        } else {
          reportApiError(path, res.statusCode, body?.code) // 旁路：上报分页接口非成功响应
          reject(new Error(body?.message || `请求失败(${res.statusCode})`))
        }
      },
      fail: (err) => {
        // 幂等分页 GET 同样重试一次
        if (!_retried) {
          resolve(apiGetPaged<T>(path, header, true))
          return
        }
        reportApiError(path, 0) // 旁路：分页 GET 网络失败/超时，status=0
        reject(new Error(friendlyNetError(err.errMsg, '网络连接失败，请检查网络后重试')))
      },
    })
  })
}
export const apiPost = <T>(path: string, data?: unknown, header?: Record<string, string>, timeoutMs?: number) => apiFetch<T>(path, 'POST', data, header, false, timeoutMs)
export const apiPut = <T>(path: string, data?: unknown, header?: Record<string, string>) => apiFetch<T>(path, 'PUT', data, header)
export const apiDelete = <T>(path: string, data?: unknown, header?: Record<string, string>) => apiFetch<T>(path, 'DELETE', data, header)
/** 公开页面的非关键自动写入（如阅读进度、负反馈）：失效时静默降级。 */
export const apiPostOptionalAuth = <T>(path: string, data?: unknown, header?: Record<string, string>, timeoutMs?: number) =>
  apiFetch<T>(path, 'POST', data, header, false, timeoutMs, 'silent')
export const apiPutOptionalAuth = <T>(path: string, data?: unknown, header?: Record<string, string>) =>
  apiFetch<T>(path, 'PUT', data, header, false, TIMEOUT, 'silent')

/**
 * 上传单张图片 — POST /upload/image（multipart，字段名 file，需登录）
 * 返回图片可访问 URL（后端 UploadResult.url）。
 */
export function uploadImage(filePath: string, _retried = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const token = getToken()
    uni.uploadFile({
      url: `${BASE_URL}${PREFIX}/upload/image`,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      // 弱网下防止长时间挂起：图片上传 60s 超时（视频不设，见 uploadVideo）
      timeout: 60000,
      success: (res) => {
        if (res.statusCode === 401) {
          if (!_retried) {
            refreshAccessToken().then((r) => {
              if (r === 'ok') resolve(uploadImage(filePath, true))
              else if (r === 'network-fail') reject(new Error('网络连接超时，请稍后重试'))
              else { handleUnauthorized(); reject(new Error('未登录或登录已过期')) }
            })
            return
          }
          handleUnauthorized()
          reject(new Error('未登录或登录已过期'))
          return
        }
        try {
          const body = JSON.parse(res.data) as ApiResponse<{ url: string }>
          if (body && body.code === 200 && body.data?.url) {
            resolve(body.data.url)
          } else {
            reject(new Error(body?.message || `上传失败(${res.statusCode})`))
          }
        } catch (e) {
          reject(new Error('上传响应解析失败'))
        }
      },
      fail: (err) => reject(new Error(friendlyNetError(err.errMsg, '上传失败，请检查网络后重试'))),
    })
  })
}

/**
 * 上传视频 — POST /upload/video（multipart，字段名 file，需登录，最大 200MB）
 * @param filePath uni.chooseVideo 返回的 tempFilePath
 * @param onProgress 上传进度回调（0-100）
 * 返回视频可访问 URL（后端 UploadResult.url）。
 */
export function uploadVideo(filePath: string, onProgress?: (percent: number) => void, _retried = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const token = getToken()
    const task = uni.uploadFile({
      url: `${BASE_URL}${PREFIX}/upload/video`,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        if (res.statusCode === 401) {
          if (!_retried) {
            refreshAccessToken().then((r) => {
              if (r === 'ok') resolve(uploadVideo(filePath, onProgress, true))
              else if (r === 'network-fail') reject(new Error('网络连接超时，请稍后重试'))
              else { handleUnauthorized(); reject(new Error('未登录或登录已过期')) }
            })
            return
          }
          handleUnauthorized()
          reject(new Error('未登录或登录已过期'))
          return
        }
        try {
          const body = JSON.parse(res.data) as ApiResponse<{ url: string }>
          if (body && body.code === 200 && body.data?.url) {
            resolve(body.data.url)
          } else {
            reject(new Error(body?.message || `上传失败(${res.statusCode})`))
          }
        } catch (e) {
          reject(new Error('上传响应解析失败'))
        }
      },
      fail: (err) => reject(new Error(friendlyNetError(err.errMsg, '上传失败，请检查网络后重试'))),
    })
    if (onProgress && task && typeof task.onProgressUpdate === 'function') {
      task.onProgressUpdate((p: { progress: number }) => onProgress(p.progress))
    }
  })
}

/**
 * 上传文档附件 — POST /upload/file（multipart，字段名 file，需登录，最大 50MB）
 * 支持 PDF/Word/Excel/PPT/TXT/ZIP（帖子文件卡用）。返回文件可访问 URL。
 */
export function uploadDocument(filePath: string, _retried = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const token = getToken()
    uni.uploadFile({
      url: `${BASE_URL}${PREFIX}/upload/file`,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      // 弱网下防止长时间挂起：文档附件（≤50MB）60s 超时
      timeout: 60000,
      success: (res) => {
        if (res.statusCode === 401) {
          if (!_retried) {
            refreshAccessToken().then((r) => {
              if (r === 'ok') resolve(uploadDocument(filePath, true))
              else if (r === 'network-fail') reject(new Error('网络连接超时，请稍后重试'))
              else { handleUnauthorized(); reject(new Error('未登录或登录已过期')) }
            })
            return
          }
          handleUnauthorized()
          reject(new Error('未登录或登录已过期'))
          return
        }
        try {
          const body = JSON.parse(res.data) as ApiResponse<{ url: string }>
          if (body && body.code === 200 && body.data?.url) {
            resolve(body.data.url)
          } else {
            reject(new Error(body?.message || `上传失败(${res.statusCode})`))
          }
        } catch (e) {
          reject(new Error('上传响应解析失败'))
        }
      },
      fail: (err) => reject(new Error(friendlyNetError(err.errMsg, '上传失败，请检查网络后重试'))),
    })
  })
}

/** 选择并上传单张图片，返回 URL（封装 uni.chooseImage + uploadImage） */
export function chooseAndUploadImage(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      success: async (res: any) => {
        const path = Array.isArray(res.tempFilePaths) ? res.tempFilePaths[0] : res.tempFilePaths
        if (!path) {
          reject(new Error('未选择图片'))
          return
        }
        try {
          resolve(await uploadImage(path))
        } catch (e) {
          reject(e)
        }
      },
      fail: () => reject(new Error('已取消')),
    })
  })
}

/* mock 开关：默认开启 mock 模式，VITE_USE_MOCK=false 时关闭 */
const _MOCK_ENABLED = (import.meta as any).env?.VITE_USE_MOCK !== 'false'
export const useMock = () => _MOCK_ENABLED
