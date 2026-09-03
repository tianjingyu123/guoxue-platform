export interface PendingQueue {
  title: string;
  link: string;
  count: number;
}

/** 失败或异常计数不能被当成零待办。 */
export function readPendingTotal(data: unknown): number | null {
  const value = data as { total?: unknown; data?: { total?: unknown }; items?: unknown };
  const total =
    value?.total ??
    value?.data?.total ??
    (Array.isArray(data) ? data.length : Array.isArray(value?.items) ? value.items.length : null);
  return typeof total === "number" && Number.isSafeInteger(total) && total >= 0 ? total : null;
}

export function summarizePendingQueues(items: PendingQueue[], expanded: boolean) {
  const active = items.filter((item) => item.count > 0).sort((a, b) => b.count - a.count);
  return {
    total: active.reduce((sum, item) => sum + item.count, 0),
    activeCount: active.length,
    idleCount: items.length - active.length,
    visibleItems: expanded ? [...active, ...items.filter((item) => item.count === 0)] : active,
  };
}
