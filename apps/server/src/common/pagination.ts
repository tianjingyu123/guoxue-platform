/**
 * 分页「无上限」标记（坏味道 P2-4）。
 * 用于后台/财务/导出类端点：需保留「加载全部」能力，故不钳 pageSize 上限，
 * 仅归一化 NaN/负数（修 skip:NaN/负数进 Prisma 抛 500）。用法：
 *   safePagination(page, pageSize, NO_PAGE_LIMIT)  // 零契约·仅修 500·上限不变
 * 用户端列表用默认 100 上限（防大页拖库）；此常量仅供确需大页的后台端点。
 */
export const NO_PAGE_LIMIT = Number.MAX_SAFE_INTEGER;

/** 安全分页参数：归一化非法/NaN/负数输入，限制 pageSize 上限防止数据库过载 */
export function safePagination(page?: number | string, pageSize?: number | string, maxPageSize = 100) {
  // Number.isFinite 兜住非数字串（如 "abc" → NaN）与缺省 → 回退默认；有限值再钳位下限/上限，
  // 避免 skip:NaN 或负数 skip 直进 Prisma 抛 PrismaClientValidationError
  const rawP = Number(page)
  const rawPs = Number(pageSize)
  const p = Number.isFinite(rawP) ? Math.max(1, Math.floor(rawP)) : 1
  const ps = Number.isFinite(rawPs) ? Math.min(maxPageSize, Math.max(1, Math.floor(rawPs))) : 20
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
