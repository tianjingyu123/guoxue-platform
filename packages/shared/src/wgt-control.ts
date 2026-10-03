/** 信任根授权和环境证据的签名格式；私钥不进入应用或后台。 */
export function canonicalWgtControl(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalWgtControl).join(",") + "]";
  return (
    "{" +
    Object.keys(value as object)
      .sort()
      .map(
        (key) =>
          JSON.stringify(key) + ":" + canonicalWgtControl((value as Record<string, unknown>)[key]),
      )
      .join(",") +
    "}"
  );
}
export interface SignedWgtControl {
  payload: Record<string, unknown>;
  signature: string;
}
export const NATIVE_RECOVERY_CASES = [
  "tamper",
  "truncate",
  "expired",
  "wrong-base",
  "cross-channel",
  "offline",
  "process-kill",
  "bad-js",
  "consecutive-crash",
  "interrupted-switch",
  "payment",
  "live",
  "recording",
  "upload",
] as const;
/** 当前会调用 Native.js 的 WGT 方案按已核验条款保守禁用；规则变更需重新评审代码。 */
export const WGT_PROTOCOL_BLOCKED_CHANNELS: readonly string[] = [
  "oppo",
  "honor",
  "samsung",
  "google-play",
  "app-store",
];
