import { createHash } from "crypto";

export interface DistributionScope {
  applicationId: string;
  platform: string;
  channelId: string;
}
export const LEGACY_APPLICATION = "rebu";
export const LEGACY_CHANNEL = "legacy";

/** 历史无渠道请求只进入 legacy 槽，显式未知标识不猜测商店。 */
export function versionScope(
  value: Partial<DistributionScope> & { platform: string },
): DistributionScope {
  return {
    applicationId: value.applicationId || LEGACY_APPLICATION,
    platform: value.platform,
    channelId: value.channelId || LEGACY_CHANNEL,
  };
}

export function distributionKey(scope: DistributionScope): string {
  return [scope.applicationId, scope.platform, scope.channelId].join(":");
}

export function inRollout(
  scope: string,
  userId: string | undefined,
  percentage = 100,
  targets: string[] = [],
): boolean {
  if (userId && targets.includes(userId)) return true;
  if (percentage >= 100) return true;
  if (!userId || percentage <= 0) return false;
  return (
    parseInt(
      createHash("sha256")
        .update(scope + ":" + userId)
        .digest("hex")
        .slice(0, 8),
      16,
    ) %
      100 <
    percentage
  );
}
