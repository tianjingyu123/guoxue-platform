// 排盘API调用工具函数

import { API_ENDPOINTS, TOOL_ID_MAP } from "./config"

// API响应类型
export interface ApiResponse<T = unknown> {
  code: number
  data: {
    toolId: string
    result: T
    durationMs: number
  }
  message: string
}

// 通用请求函数
async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Bypass-Tunnel-Reminder": "true",  // 绕过 localtunnel 确认页
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// 计算排盘
export async function calculateTool<T = unknown>(
  toolId: string,
  input: Record<string, unknown>
): Promise<T> {
  const apiToolId = TOOL_ID_MAP[toolId] || toolId
  const url = API_ENDPOINTS.calculate(apiToolId)
  
  const response = await request<T>(url, {
    method: "POST",
    body: JSON.stringify({ input }),
  })

  return response.data.result
}

// 获取Mock数据（开发用）
export async function getMockData<T = unknown>(toolId: string): Promise<T> {
  const apiToolId = TOOL_ID_MAP[toolId] || toolId
  const url = API_ENDPOINTS.mock(apiToolId)
  
  const response = await request<T>(url)
  return response.data.result
}

// 获取输入Schema
export async function getInputSchema(toolId: string) {
  const apiToolId = TOOL_ID_MAP[toolId] || toolId
  const url = API_ENDPOINTS.inputSchema(apiToolId)
  
  const response = await request(url)
  return response.data.result
}

// 获取工具目录
export async function getToolsDirectory() {
  const url = API_ENDPOINTS.directory()
  const response = await request(url)
  return response.data.result
}

// AI分析（需登录）
export async function analyzeResult<T = unknown>(
  toolId: string,
  result: unknown,
  question?: string
): Promise<T> {
  const apiToolId = TOOL_ID_MAP[toolId] || toolId
  const url = API_ENDPOINTS.analyze(apiToolId)
  
  const response = await request<T>(url, {
    method: "POST",
    body: JSON.stringify({ result, question }),
  })

  return response.data.result
}
