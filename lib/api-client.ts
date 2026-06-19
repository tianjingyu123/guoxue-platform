import type { ApiResponse } from './types/api'

// API 基础配置
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
const API_PREFIX = '/api/v1'
// Mock 模式开关：
// - 默认开启（演示/前端联调阶段，所有页面展示模拟数据）
// - 后端对接完成后，在环境变量中设置 NEXT_PUBLIC_USE_MOCK=false 切换到真实接口
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'

// 获取完整 API URL
function getApiUrl(path: string): string {
  return `${BASE_URL}${API_PREFIX}${path}`
}

// 获取认证 token
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

// 统一请求选项
interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: Record<string, unknown> | FormData
  requireAuth?: boolean
}

/**
 * 统一 API 请求封装
 * - 自动拼接 /api/v1 前缀
 * - 自动处理 JSON 请求头和响应解析
 * - 请求失败时返回错误响应，不抛异常
 */
export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { body, requireAuth = false, headers: customHeaders, ...restOptions } = options

  // 构建请求头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders as Record<string, string>,
  }

  // 添加认证头
  if (requireAuth) {
    const token = getAuthToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  // 处理 FormData
  if (body instanceof FormData) {
    delete headers['Content-Type'] // 让浏览器自动设置
  }

  try {
    const response = await fetch(getApiUrl(path), {
      ...restOptions,
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    })

    // 尝试解析 JSON 响应
    const data = await response.json()

    if (!response.ok) {
      return {
        code: response.status,
        data: null as T,
        message: data.message || `请求失败: ${response.status}`,
      }
    }

    return {
      code: data.code ?? 200,
      data: data.data ?? data,
      message: data.message || 'success',
    }
  } catch (error) {
    return {
      code: -1,
      data: null as T,
      message: error instanceof Error ? error.message : '网络请求失败',
    }
  }
}

/**
 * GET 请求
 */
export function apiGet<T>(path: string, params?: Record<string, unknown>, options?: Omit<FetchOptions, 'method' | 'body'>) {
  let url = path
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })
    const queryString = searchParams.toString()
    if (queryString) {
      url = `${path}?${queryString}`
    }
  }
  return apiFetch<T>(url, { ...options, method: 'GET' })
}

/**
 * POST 请求
 */
export function apiPost<T>(path: string, body?: Record<string, unknown>, options?: Omit<FetchOptions, 'method' | 'body'>) {
  return apiFetch<T>(path, { ...options, method: 'POST', body })
}

/**
 * PUT 请求
 */
export function apiPut<T>(path: string, body?: Record<string, unknown>, options?: Omit<FetchOptions, 'method' | 'body'>) {
  return apiFetch<T>(path, { ...options, method: 'PUT', body })
}

/**
 * DELETE 请求
 */
export function apiDelete<T>(path: string, options?: Omit<FetchOptions, 'method' | 'body'>) {
  return apiFetch<T>(path, { ...options, method: 'DELETE' })
}

/**
 * 检查是否使用 Mock 数据
 */
export function useMock(): boolean {
  return USE_MOCK
}

/**
 * 获取 API 配置信息（调试用）
 */
export function getApiConfig() {
  return {
    baseUrl: BASE_URL,
    apiPrefix: API_PREFIX,
    useMock: USE_MOCK,
  }
}
