// 统一时间格式化工具（中式格式·全站复用）
// 列表/详情统一 "YYYY-MM-DD HH:mm"，日期列用 formatDate "YYYY-MM-DD"
// 无效或空值统一返回 "—"，杜绝 ISO 生肉/斜杠美式格式直出。

function toDate(t: string | number | Date | null | undefined): Date | null {
  if (t === null || t === undefined || t === '') return null
  const d = t instanceof Date ? t : new Date(t)
  return Number.isNaN(d.getTime()) ? null : d
}

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n)
}

/** 中式日期时间 "YYYY-MM-DD HH:mm"，无效返回 "—" */
export function formatDateTime(t: string | number | Date | null | undefined): string {
  const d = toDate(t)
  if (!d) return '—'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 中式日期 "YYYY-MM-DD"（无时分），无效返回 "—" */
export function formatDate(t: string | number | Date | null | undefined): string {
  const d = toDate(t)
  if (!d) return '—'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
