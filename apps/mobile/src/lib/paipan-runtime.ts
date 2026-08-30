import { legacyPaipanApi } from "@/lib/legacy-paipan-data";

const MODE_KEY = "paipan:runtime-mode";
const MODE_OBSERVED_AT_KEY = "paipan:runtime-mode-observed-at";
const MODE_SNAPSHOT_TTL_MS = 10 * 60 * 1000;
let pendingRuntimeRequest: Promise<PaipanRuntimeMode> | null = null;

export type PaipanRuntimeMode = "legacy" | "native" | "unknown";

function readModeSnapshot(): PaipanRuntimeMode {
  const mode = uni.getStorageSync(MODE_KEY);
  if (mode !== "legacy" && mode !== "native") return "unknown";
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
      // 探针短暂不可用时只复用十分钟内服务端明确下发的模式。
      // 没有有效快照时保持 unknown，由入口页停在可重试错误态；不得在
      // legacy 正式运营期因网络故障泄露或回退到隔离的新排盘。
      return readModeSnapshot();
    })
    .finally(() => {
      pendingRuntimeRequest = null;
    });
  return pendingRuntimeRequest;
}
