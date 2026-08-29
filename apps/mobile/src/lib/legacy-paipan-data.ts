import { apiGet, apiGetOptionalAuth } from "@/utils/request";

export interface LegacyPaipanEntry {
  mode: "legacy" | "native";
  url: string | null;
  attributionReady: boolean;
}

export const legacyPaipanApi = {
  // 普通入口虽然需要登录，但 401 只能由排盘页面显示登录提示，不能触发全局 reLaunch
  // 劫持首页、圈子、发现等游客可访问页面。
  entry: () => apiGetOptionalAuth<LegacyPaipanEntry>("/legacy-paipan/entry"),
  account: () => apiGetOptionalAuth<LegacyPaipanEntry>("/legacy-paipan/account"),
  runtime: () => apiGet<{ mode: "legacy" | "native" }>("/legacy-paipan/runtime"),
  nativeQaAccess: () => apiGet<{ allowed: true }>("/legacy-paipan/native-qa/access"),
  stationEntry: (stationId: string) =>
    apiGet<{ mode: "legacy" | "native"; url: string | null }>(
      `/legacy-paipan/station/${encodeURIComponent(stationId)}/entry`,
    ),
};
