import { api, type AdminRequestConfig } from "@/api";

let currentMode: "legacy" | "native" = "legacy";
let verifiedToken: string | null = null;
let requestSequence = 0;
const quietProbe: AdminRequestConfig = { silentError: true };

export function clearNativePreviewState(): void {
  requestSequence++;
  currentMode = "legacy";
  verifiedToken = null;
}

export async function refreshPaipanMode(): Promise<"legacy" | "native"> {
  const token = localStorage.getItem("token");
  const sequence = ++requestSequence;
  currentMode = "legacy";
  verifiedToken = null;
  if (!token) return "legacy";
  try {
    const { data } = await api.get<{ allowed?: boolean }>("/legacy-paipan/native-qa/access", quietProbe);
    if (sequence !== requestSequence || localStorage.getItem("token") !== token) return "legacy";
    currentMode = data?.allowed === true ? "native" : "legacy";
    verifiedToken = token;
  } catch {
    if (sequence === requestSequence) currentMode = "legacy";
    return "legacy";
  }
  return currentMode;
}

export function isNativePaipanEnabled(): boolean {
  return currentMode === "native" && !!verifiedToken && localStorage.getItem("token") === verifiedToken;
}

/** 管理资格独立于使用开关，服务端仍实时检查有效超级管理员。 */
export async function canManageNativePreview(): Promise<boolean> {
  const token = localStorage.getItem("token");
  if (!token) return false;
  try {
    const { data } = await api.get("/system/native-paipan-preview", quietProbe);
    return localStorage.getItem("token") === token && typeof data?.enabled === "boolean" &&
      typeof data?.revision === "string" && /^[a-f0-9]{64}$/.test(data.revision);
  } catch { return false; }
}
