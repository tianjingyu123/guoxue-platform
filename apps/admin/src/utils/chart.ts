/** 页面层使用的稳定图表配置边界；第三方 ECharts 类型只在渲染器内部转换。 */
export type ChartOption = Record<string, unknown>

export interface ChartTooltipDatum {
  name: string
  value: unknown
  percent?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 将 ECharts 单项/多项 tooltip 参数收敛为首个可展示数据项。 */
export function firstChartTooltipDatum(params: unknown): ChartTooltipDatum {
  const candidate = Array.isArray(params) ? params[0] : params
  if (!isRecord(candidate)) return { name: '', value: 0 }
  return {
    name: typeof candidate.name === 'string' ? candidate.name : '',
    value: candidate.value,
    percent: typeof candidate.percent === 'number' ? candidate.percent : undefined,
  }
}
