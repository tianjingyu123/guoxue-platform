/**
 * API 通用响应类型
 * 后端统一响应格式: { code: 200, data: {...}, message: "ok" }
 */

/** 统一 API 响应体 */
export interface ApiResponse<T = any> {
  code: number
  data: T
  message: string
}

/** 分页数据结构 */
export interface PaginatedData<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/** 分页 API 响应体 */
export interface ApiPaginatedResponse<T> {
  code: number
  data: PaginatedData<T>
  message: string
}

/** 计算类工具响应体（排盘工具专用）
 * 后端 POST /api/v1/tools/:toolId/calculate 返回格式：
 * { code: 200, data: { toolId, result, durationMs }, message: "ok" }
 * 排盘数据在 res.data.result 中
 */
export interface CalculateApiResponse<T = any> {
  code: number
  data: {
    toolId: string
    result: T
    durationMs: number
  }
  message: string
}

/** 分页请求参数 */
export interface PaginationParams {
  page?: number
  pageSize?: number
}

/** 排序参数 */
export interface SortParams {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
