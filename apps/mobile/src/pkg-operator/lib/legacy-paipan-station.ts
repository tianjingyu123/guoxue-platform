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

/** 用户完成旧站授权后状态不会主动推回，站长再次进入时先复核，避免重复授权。 */
export async function resolveOwnerPaipanState(api = legacyStationPaipanApi): Promise<LegacyStationSyncState> {
  const state = await api.getState();
  return state.state === "SYNCED" ? state : api.retry();
}
