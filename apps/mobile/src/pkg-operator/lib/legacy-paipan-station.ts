import { apiGet, apiPost } from "@/utils/request";

export interface LegacyStationSyncState {
  state: "SYNCED" | "PENDING_AUTHORIZATION" | "FAILED" | "PENDING";
  referralUrl: string | null;
  authorizationUrl: string | null;
}

export const legacyStationPaipanApi = {
  getState: () => apiGet<LegacyStationSyncState>("/legacy-paipan/station-sync/me"),
  retry: () => apiPost<LegacyStationSyncState>("/legacy-paipan/station-sync/me/retry"),
};
