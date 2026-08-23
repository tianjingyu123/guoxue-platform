import { apiGet } from "@/utils/request";

export interface LegacyPaipanEntry {
  mode: "legacy" | "native";
  url: string | null;
  attributionReady: boolean;
}

export const legacyPaipanApi = {
  entry: () => apiGet<LegacyPaipanEntry>("/legacy-paipan/entry"),
  account: () => apiGet<LegacyPaipanEntry>("/legacy-paipan/account"),
  runtime: () => apiGet<{ mode: "legacy" | "native" }>("/legacy-paipan/runtime"),
  nativeQaAccess: () => apiGet<{ allowed: true }>("/legacy-paipan/native-qa/access"),
  stationEntry: (stationId: string) =>
    apiGet<{ mode: "legacy" | "native"; url: string | null }>(
      `/legacy-paipan/station/${encodeURIComponent(stationId)}/entry`,
    ),
};
