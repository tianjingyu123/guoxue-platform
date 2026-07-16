/**
 * 金额显示格式化工具
 *
 * 背景：后端部分价格字段是 Float（非 Decimal），序列化成 number 时会带浮点误差，
 * 前端直接展示就出现 "59.6999999"、"49.900000001" 这类多位小数。
 *
 * formatPrice：消除浮点误差、最多保留 2 位小数、返回 number（便于继续和 ¥ 拼接或参与展示）。
 * 仅用于「钱」的显示点，切勿用于数量/时长/评分/积分数量等非金额字段。
 */
export const formatPrice = (n: unknown): number => {
  // Number(n ?? 0) 仅防 null/undefined，非数字串（如 Number("abc")=NaN）会渲染出「¥NaN」，用 isNaN 兜底为 0
  const v = Number(n ?? 0)
  return Number.isNaN(v) ? 0 : Math.round(v * 100) / 100
}
