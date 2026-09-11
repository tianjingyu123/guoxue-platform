import { apiGet, apiGetOptionalAuth } from "@/utils/request";

export interface LegacyPaipanEntry {
  mode: "legacy" | "native";
  url: string | null;
  attributionReady: boolean;
}

const LEGACY_ENTRY_HANDOFF_TTL_MS = 15_000;
let pendingLegacyEntry: { entry: LegacyPaipanEntry; expiresAt: number; contextKey: string } | null = null;

/**
 * 排盘入口页与原生 WebView 承接页之间的一次性交接。
 * 只保存在当前 JS 进程内，不写缓存、不拼进路由，也不会把完整签名 URL 暴露到日志。
 */
export function stageLegacyPaipanEntry(entry: LegacyPaipanEntry, context: LegacyPaipanContext = { target: "tool", stationId: "" }) {
  pendingLegacyEntry = {
    entry,
    contextKey: legacyPaipanContextPath(context),
    expiresAt: Date.now() + LEGACY_ENTRY_HANDOFF_TTL_MS,
  };
}

export function consumeLegacyPaipanEntry(context: LegacyPaipanContext = { target: "tool", stationId: "" }): LegacyPaipanEntry | null {
  const pending = pendingLegacyEntry;
  pendingLegacyEntry = null;
  if (!pending || pending.expiresAt < Date.now() || pending.contextKey !== legacyPaipanContextPath(context)) return null;
  return pending.entry;
}

export const legacyPaipanApi = {
  // 普通入口虽然需要登录，但 401 只能由排盘页面显示登录提示，不能触发全局 reLaunch
  // 劫持首页、圈子、发现等游客可访问页面。
  entry: () => apiGetOptionalAuth<LegacyPaipanEntry>("/legacy-paipan/entry"),
  account: () => apiGetOptionalAuth<LegacyPaipanEntry>("/legacy-paipan/account"),
  runtime: () => apiGet<{ mode: "legacy" | "native" }>("/legacy-paipan/runtime"),
  nativeQaAccess: () => apiGet<{ allowed: true }>("/legacy-paipan/native-qa/access"),
  stationEntry: (stationId: string) =>
    apiGetOptionalAuth<{ mode: "legacy" | "native"; url: string | null }>(
      `/legacy-paipan/station/${encodeURIComponent(stationId)}/entry`,
    ),
};

/** 只保存入口类型与分站标识，不把签名地址或用户凭据放入回跳路径。 */
export interface LegacyPaipanContext { target: "tool" | "account" | "station"; stationId: string }
export function readLegacyPaipanContext(query: Record<string, unknown> = {}): LegacyPaipanContext {
  const target = query.target === "station" || query.target === "account" ? query.target : "tool";
  return { target, stationId: target === "station" && typeof query.stationId === "string" ? query.stationId : "" };
}
export function legacyPaipanContextPath(context: LegacyPaipanContext): string {
  const query = context.target === "station" ? "?target=station&stationId=" + encodeURIComponent(context.stationId)
    : context.target === "account" ? "?target=account" : "";
  return "/pkg-common/legacy-paipan/index" + query;
}
export function requestLegacyPaipanEntry(context: LegacyPaipanContext) {
  if (context.target === "station") {
    if (!context.stationId) return Promise.reject(new Error("分站入口缺少标识，请返回原分站重试"));
    return legacyPaipanApi.stationEntry(context.stationId);
  }
  return context.target === "account" ? legacyPaipanApi.account() : legacyPaipanApi.entry();
}
