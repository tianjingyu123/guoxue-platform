import { api } from "@/api";

let currentMode: "legacy" | "native" = "legacy";

export async function refreshPaipanMode(): Promise<"legacy" | "native"> {
  try {
    const { data } = await api.get<{ mode?: string }>("/legacy-paipan/runtime");
    currentMode = data?.mode === "native" ? "native" : "legacy";
  } catch {
    currentMode = "legacy";
  }
  return currentMode;
}

export function isNativePaipanEnabled(): boolean {
  return currentMode === "native";
}
