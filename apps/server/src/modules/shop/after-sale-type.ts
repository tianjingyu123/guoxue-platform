/** 售后类型统一口径：兼容历史值，但新数据只写 canonical 值。 */
const DISPUTE_TYPES = new Set(["not_received", "not_as_described", "quality_issue", "other"]);

export function normalizeAfterSaleType(type?: string | null): string {
  const value = String(type ?? "").trim().toLowerCase();
  if (value === "refund") return "refund_only";
  if (value === "return") return "refund_with_return";
  return value;
}

export function isImmediateRefundType(type?: string | null): boolean {
  return normalizeAfterSaleType(type) === "refund_only";
}

export function isReturnRefundType(type?: string | null): boolean {
  return normalizeAfterSaleType(type) === "refund_with_return";
}

export function isRefundAfterSaleType(type?: string | null): boolean {
  return isImmediateRefundType(type) || isReturnRefundType(type);
}

export function isSupportedAfterSaleType(type?: string | null): boolean {
  const value = normalizeAfterSaleType(type);
  return value === "refund_only"
    || value === "refund_with_return"
    || value === "exchange"
    || DISPUTE_TYPES.has(value);
}

export interface AfterSaleLogisticsPayload {
  legacyText?: string;
  returnAddress?: string;
  company?: string;
  logisticsNo?: string;
  inspection?: "ACCEPTED" | "REJECTED";
  quantity?: number;
  remark?: string;
}

export function parseAfterSaleLogistics(raw?: string | null): AfterSaleLogisticsPayload {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "string") return parsed.trim() ? { legacyText: parsed.trim() } : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as AfterSaleLogisticsPayload
      : {};
  } catch {
    const legacyText = raw.trim();
    return legacyText ? { legacyText } : {};
  }
}

export function stringifyAfterSaleLogistics(payload: AfterSaleLogisticsPayload): string {
  return JSON.stringify(payload);
}
