import { legacyPaipanApi } from "@/lib/legacy-paipan-data";

const MODE_KEY = "paipan:runtime-mode";
const MODE_OBSERVED_AT_KEY = "paipan:runtime-mode-observed-at";
const MODE_SNAPSHOT_TTL_MS = 10 * 60 * 1000;
let pendingRuntimeRequest: Promise<PaipanRuntimeMode> | null = null;

export type PaipanRuntimeMode = "legacy" | "native" | "unknown";

function readModeSnapshot(): PaipanRuntimeMode {
  const mode = uni.getStorageSync(MODE_KEY);
  // native 必须由本次服务端探针明确确认；旧快照不能在回切 legacy 后继续展示新排盘。
  if (mode !== "legacy") return "unknown";
  const observedAt = Number(uni.getStorageSync(MODE_OBSERVED_AT_KEY));
  if (!Number.isFinite(observedAt) || Date.now() - observedAt > MODE_SNAPSHOT_TTL_MS) {
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
      // 探针短暂不可用时只复用十分钟内的 legacy 快照。
      // native 无论快照多新都必须重新得到服务端确认，避免模式回切后泄露新入口。
      return readModeSnapshot();
    })
    .finally(() => {
      pendingRuntimeRequest = null;
    });
  return pendingRuntimeRequest;
}
