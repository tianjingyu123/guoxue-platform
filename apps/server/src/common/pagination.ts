/** 安全分页参数：限制 pageSize 上限防止数据库过载 */
export function safePagination(page?: number | string, pageSize?: number | string, maxPageSize = 100) {
  const p = Math.max(1, +(page || 1))
  const ps = Math.min(maxPageSize, Math.max(1, +(pageSize || 20)))
  return { page: p, pageSize: ps, skip: (p - 1) * ps }
}
