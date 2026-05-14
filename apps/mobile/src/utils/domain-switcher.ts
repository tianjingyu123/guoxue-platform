/**
 * 域名故障切换工具
 *
 * 配置多个备用域名，当主域名不可用时自动切换到下一个可用域名。
 * 适用于移动端网络环境复杂、域名解析可能失败的场景。
 */

/** 域名列表（按优先级排列） */
const DOMAINS = [
  'api.guoxue.com',
  'api2.guoxue.com',
  'api3.guoxue.com',
] as const

/** 默认协议 */
const DEFAULT_PROTOCOL = 'https'

/** 请求超时时间（毫秒） */
const TIMEOUT = 8000

/** 缓存当前可用域名的索引 */
let currentDomainIndex = 0

/** 缓存失败的域名索引（避免短时间内重复尝试） */
const failedDomains = new Set<number>()

/**
 * 获取当前基准 URL
 */
export function getBaseUrl(): string {
  return `${DEFAULT_PROTOCOL}://${DOMAINS[currentDomainIndex]}/api/v1`
}

/**
 * 获取所有备用域名 URL
 */
export function getAllBaseUrls(): string[] {
  return DOMAINS.map((d) => `${DEFAULT_PROTOCOL}://${d}/api/v1`)
}

/**
 * 带故障切换的 fetch 请求
 *
 * 依次尝试每个未失败的域名，第一个成功响应的域名将被缓存为当前域名。
 *
 * @param path - API 路径（如 /bounty/list）
 * @param options - fetch 选项
 * @returns 成功响应
 */
export async function fetchWithFallback(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  // 优先从上次成功的域名开始
  const startIndex = currentDomainIndex
  const totalDomains = DOMAINS.length

  for (let i = 0; i < totalDomains; i++) {
    const idx = (startIndex + i) % totalDomains

    // 跳过已确认失败的域名（除非所有域名都失败了）
    if (failedDomains.size < totalDomains && failedDomains.has(idx)) {
      continue
    }

    const url = `${DEFAULT_PROTOCOL}://${DOMAINS[idx]}${path}`
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT)

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        // 切换成功，更新当前域名
        currentDomainIndex = idx
        failedDomains.delete(idx)
        return response
      }

      // 服务器返回错误状态码，当前域名记入失败
      failedDomains.add(idx)
    } catch {
      // 网络错误，当前域名记入失败
      failedDomains.add(idx)
    }
  }

  // 所有域名都失败，抛异常
  throw new Error('所有 API 域名均不可用，请检查网络连接')
}

/**
 * 重置故障切换状态（可用于网络恢复后重试）
 */
export function resetFallbackState(): void {
  currentDomainIndex = 0
  failedDomains.clear()
}

/**
 * 检查当前域名是否可用（轻量级健康检查）
 */
export async function checkHealth(): Promise<{ ok: boolean; domain: string }> {
  try {
    const res = await fetchWithFallback('/health')
    return { ok: res.ok, domain: DOMAINS[currentDomainIndex] }
  } catch {
    return { ok: false, domain: DOMAINS[currentDomainIndex] }
  }
}
