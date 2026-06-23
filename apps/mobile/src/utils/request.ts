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

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

function buildHeader(custom?: Record<string, string>): Record<string, string> {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...custom,
  }
}

function apiFetch<T>(path: string, method: Method, data?: unknown, header?: Record<string, string>): Promise<T> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${PREFIX}${path}`,
      method,
      data: data as any,
      header: buildHeader(header),
      success: (res) => {
        const body = res.data as ApiResponse<T>
        if (res.statusCode === 401) {
          clearToken()
          reject(new Error('未登录或登录已过期'))
          return
        }
        if (body && body.code === 200) {
          resolve(body.data)
        } else {
          reject(new Error(body?.message || `请求失败(${res.statusCode})`))
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '网络错误')),
    })
  })
}

export const apiGet = <T>(path: string, header?: Record<string, string>) => apiFetch<T>(path, 'GET', undefined, header)
export const apiPost = <T>(path: string, data?: unknown, header?: Record<string, string>) => apiFetch<T>(path, 'POST', data, header)
export const apiPut = <T>(path: string, data?: unknown, header?: Record<string, string>) => apiFetch<T>(path, 'PUT', data, header)
export const apiDelete = <T>(path: string, data?: unknown, header?: Record<string, string>) => apiFetch<T>(path, 'DELETE', data, header)

/* mock 开关：与原型口径统一为「默认开 mock」（!== 'false'） */
export const useMock = () => (import.meta as any).env?.VITE_USE_MOCK !== 'false'
