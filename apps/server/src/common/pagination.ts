/** 安全分页参数：限制 pageSize 上限防止数据库过载 */
export function safePagination(page?: number | string, pageSize?: number | string, maxPageSize = 100) {
  const p = Math.max(1, +(page || 1))
  const ps = Math.min(maxPageSize, Math.max(1, +(pageSize || 20)))
  return { page: p, pageSize: ps, skip: (p - 1) * ps }
}

/** 标准分页响应类型 */
export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  /** 内部标记 — ResponseInterceptor 据此提取分页元数据到顶层 */
  _paginated: true;
}

/**
 * 创建标准分页响应
 *
 * ResponseInterceptor 检测到 _paginated 标记后自动转换为：
 *   { code: 200, data: rows, pagination: { total, page, pageSize }, message: "ok" }
 *
 * 使用示例：
 *   const { skip, page, pageSize } = safePagination(q.page, q.pageSize);
 *   const [rows, total] = await Promise.all([...findMany({ skip, take: pageSize }), ...count()]);
 *   return paginated(rows, total, page, pageSize);
 */
export function paginated<T>(rows: T[], total: number, page: number, pageSize: number): PaginatedResult<T> {
  return { rows, total, page, pageSize, _paginated: true as const };
}
