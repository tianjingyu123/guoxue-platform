/**
 * 统一请求封装（替代原型 lib/api-client.ts）
 * 底层 fetch → uni.request；保持 ApiResponse<T> 信封与函数签名不变，后端无感知。
 * 契约见 docs/迁移准备/04-ClaudeCode对接说明.md。
 */
import { getToken, clearToken } from './storage'

export interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

// 与原型一致：base + /api/v1 前缀
const BASE_URL = (import.meta as any).env?.VITE_API_URL || ''
const PREFIX = '/api/v1'

// 请求超时（弱网下避免长时间空等；各端默认值偏长，统一收敛为 15s）
const TIMEOUT = 15000
// 登录页（pkg-auth 分包根 + login/index）
const LOGIN_URL = '/pkg-auth/login/index'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

/**
 * 401 统一处理：清 token + 跳登录页。
 * 用 _redirecting 去重，避免多请求并发返回 401 时重复 reLaunch。
 */
let _redirecting = false
function handleUnauthorized() {
  clearToken()
  if (_redirecting) return
  _redirecting = true
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
 * 认证入口接口（登录/发码/注册/找回密码）的 401 是业务错误（验证码/密码/账号错），
 * 应由页面自行 toast 提示，绝不能触发全局"未登录"跳转——否则登录页 reLaunch 闪退、
 * 页面设置的错误提示被冲掉（用户现象："输错闪一下就退出、没提示"）。
 */
function isAuthEntryPath(path: string): boolean {
  return /(auth\/login|auth\/send-code|auth\/register|auth\/reset-password|login\/sms|login\/wechat|login\/password)/.test(path)
}

function buildHeader(custom?: Record<string, string>): Record<string, string> {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...custom,
  }
}

function apiFetch<T>(path: string, method: Method, data?: unknown, header?: Record<string, string>, _retried = false): Promise<T> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${PREFIX}${path}`,
      method,
      data: data as any,
      header: buildHeader(header),
      timeout: TIMEOUT,
      success: (res) => {
        const body = res.data as ApiResponse<T>
        if (res.statusCode === 401) {
          if (isAuthEntryPath(path)) {
            // 登录/发码等入口的 401 = 账号/验证码/密码错误，交给页面提示，不跳转
            reject(new Error(body?.message || '账号或验证码错误'))
          } else {
            handleUnauthorized()
            reject(new Error('未登录或登录已过期'))
          }
          return
        }
        if (body && body.code === 200) {
          resolve(body.data)
        } else {
          reject(new Error(body?.message || `请求失败(${res.statusCode})`))
        }
      },
      fail: (err) => {
        // 幂等 GET 网络失败/超时自动重试一次，吸收瞬时抖动
        if (method === 'GET' && !_retried) {
          resolve(apiFetch<T>(path, method, data, header, true))
          return
        }
        reject(new Error(err.errMsg || '网络错误'))
      },
    })
  })
}

export const apiGet = <T>(path: string, header?: Record<string, string>) => apiFetch<T>(path, 'GET', undefined, header)

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
          handleUnauthorized()
          reject(new Error('未登录或登录已过期'))
          return
        }
        if (body && body.code === 200) {
          const items = Array.isArray(body.data) ? body.data : []
          const p = body.pagination
          resolve({ items, total: p?.total ?? items.length, page: p?.page ?? 1, pageSize: p?.pageSize ?? items.length })
        } else {
          reject(new Error(body?.message || `请求失败(${res.statusCode})`))
        }
      },
      fail: (err) => {
        // 幂等分页 GET 同样重试一次
        if (!_retried) {
          resolve(apiGetPaged<T>(path, header, true))
          return
        }
        reject(new Error(err.errMsg || '网络错误'))
      },
    })
  })
}
export const apiPost = <T>(path: string, data?: unknown, header?: Record<string, string>) => apiFetch<T>(path, 'POST', data, header)
export const apiPut = <T>(path: string, data?: unknown, header?: Record<string, string>) => apiFetch<T>(path, 'PUT', data, header)
export const apiDelete = <T>(path: string, data?: unknown, header?: Record<string, string>) => apiFetch<T>(path, 'DELETE', data, header)

/**
 * 上传单张图片 — POST /upload/image（multipart，字段名 file，需登录）
 * 返回图片可访问 URL（后端 UploadResult.url）。
 */
export function uploadImage(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const token = getToken()
    uni.uploadFile({
      url: `${BASE_URL}${PREFIX}/upload/image`,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        if (res.statusCode === 401) {
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
      fail: (err) => reject(new Error(err.errMsg || '上传失败')),
    })
  })
}

/**
 * 上传视频 — POST /upload/video（multipart，字段名 file，需登录，最大 200MB）
 * @param filePath uni.chooseVideo 返回的 tempFilePath
 * @param onProgress 上传进度回调（0-100）
 * 返回视频可访问 URL（后端 UploadResult.url）。
 */
export function uploadVideo(filePath: string, onProgress?: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const token = getToken()
    const task = uni.uploadFile({
      url: `${BASE_URL}${PREFIX}/upload/video`,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        if (res.statusCode === 401) {
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
      fail: (err) => reject(new Error(err.errMsg || '上传失败')),
    })
    if (onProgress && task && typeof task.onProgressUpdate === 'function') {
      task.onProgressUpdate((p: { progress: number }) => onProgress(p.progress))
    }
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
