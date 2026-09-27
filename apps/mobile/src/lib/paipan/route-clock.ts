/** 路由时间参数允许 0：不能用 `Number(raw) || default` 把午夜误改成其他时刻。 */
export function routeClockPart(raw: string | undefined, fallback: number, max: number): number {
  if (raw === undefined || raw.trim() === '') return fallback
  const value = Number(raw)
  return Number.isInteger(value) && value >= 0 && value <= max ? value : fallback
}
