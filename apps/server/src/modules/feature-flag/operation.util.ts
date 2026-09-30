import { inRollout, DistributionScope } from "../system/distribution.util";
import { createHash } from "crypto";

export type OperationState = "UNOPENED" | "OPEN" | "MAINTENANCE" | "READ_ONLY";
export interface OperationRule extends DistributionScope {
  state: OperationState;
  percentage?: number;
  targetUserIds?: string[];
  minNativeBuild?: string;
  maxNativeBuild?: string;
}
const severity: Record<OperationState, number> = {
  OPEN: 0,
  READ_ONLY: 1,
  MAINTENANCE: 2,
  UNOPENED: 3,
};
export function narrowState(a: OperationState, b: OperationState): OperationState {
  return severity[a] >= severity[b] ? a : b;
}
export function evaluateOperation(
  flag: {
    key: string;
    enabled: boolean;
    percentage: number;
    targetUserIds: string[];
    operationState?: string;
    emergencyDisabled?: boolean;
    scopeRules?: unknown;
  },
  userId?: string,
  scope?: DistributionScope | null,
  nativeBuild?: string,
): OperationState {
  if (!flag.enabled || flag.emergencyDisabled) return "UNOPENED";
  let state: OperationState =
    flag.operationState && flag.operationState in severity
      ? (flag.operationState as OperationState)
      : "OPEN";
  // 保留既有 FeatureFlag 的 userId:key MD5 灰度桶，升级不重新抽签。
  const inGlobalRollout =
    (userId && flag.targetUserIds.includes(userId)) ||
    flag.percentage === 100 ||
    (userId &&
      parseInt(
        createHash("md5")
          .update(userId + ":" + flag.key)
          .digest("hex")
          .slice(0, 8),
        16,
      ) %
        100 <
        flag.percentage);
  if (!inGlobalRollout) return "UNOPENED";
  const rules = Array.isArray(flag.scopeRules) ? (flag.scopeRules as OperationRule[]) : [];
  // 未登记客户端无法利用删渠道头逃过限制；历史客户端取所有渠道规则的保守交集。
  const matching = rules.filter(
    (r) =>
      !scope ||
      (r.applicationId === scope.applicationId &&
        r.platform === scope.platform &&
        r.channelId === scope.channelId),
  );
  for (const rule of matching) {
    state = narrowState(state, rule.state);
    if (!inRollout(flag.key + ":" + rule.channelId, userId, rule.percentage, rule.targetUserIds))
      return "UNOPENED";
    if (rule.minNativeBuild || rule.maxNativeBuild) {
      if (!nativeBuild || !/^\d+$/.test(nativeBuild)) return "UNOPENED";
      if (rule.minNativeBuild && BigInt(nativeBuild) < BigInt(rule.minNativeBuild))
        return "UNOPENED";
      if (rule.maxNativeBuild && BigInt(nativeBuild) > BigInt(rule.maxNativeBuild))
        return "UNOPENED";
    }
  }
  return state;
}
