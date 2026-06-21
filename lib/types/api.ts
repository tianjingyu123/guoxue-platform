// API 通用响应类型
export interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

// 分页响应类型
export interface PaginatedResponse<T> {
  code: number
  data: T[]
  total: number
  page: number
  pageSize: number
  message: string
}

// 分页请求参数
export interface PaginationParams {
  page?: number
  pageSize?: number
}
