import { legacyPaipanApi } from "@/lib/legacy-paipan-data";

const MODE_KEY = "paipan:runtime-mode";
const MODE_OBSERVED_AT_KEY = "paipan:runtime-mode-observed-at";
const LEGACY_SNAPSHOT_TTL_MS = 10 * 60 * 1000;
let pendingRuntimeRequest: Promise<PaipanRuntimeMode> | null = null;

export type PaipanRuntimeMode = "legacy" | "native" | "unknown";

function readModeSnapshot(): PaipanRuntimeMode {
  const mode = uni.getStorageSync(MODE_KEY);
  if (mode !== "legacy" && mode !== "native") return "unknown";
  if (mode === "native") return mode;

  const observedAt = Number(uni.getStorageSync(MODE_OBSERVED_AT_KEY));
  if (!Number.isFinite(observedAt) || Date.now() - observedAt > LEGACY_SNAPSHOT_TTL_MS) {
    return "unknown";
  }
  return mode;
}

export function hydratePaipanRuntime(): Promise<PaipanRuntimeMode> {
  if (pendingRuntimeRequest) return pendingRuntimeRequest;
  pendingRuntimeRequest = legacyPaipanApi
    .runtime()
    .then((result) => {
      const mode = result.mode === "native" ? "native" : "legacy";
      uni.setStorageSync(MODE_KEY, mode);
      uni.setStorageSync(MODE_OBSERVED_AT_KEY, Date.now());
      return mode;
    })
    .catch(() => {
      // 运行模式探针短暂不可用时，不得把整个排盘导航永久污染成旧版。
      // 只复用十分钟内服务端明确下发的 legacy；其余情况保持平台原生主路径，
      // 具体工具的数据请求再按各自错误态诚实提示。
      return readModeSnapshot();
    })
    .finally(() => {
      pendingRuntimeRequest = null;
    });
  return pendingRuntimeRequest;
}
