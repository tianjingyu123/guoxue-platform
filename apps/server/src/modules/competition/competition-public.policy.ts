/**
 * 公开赛事边界：演示脚本使用固定前缀，后台可继续核验，任何 C 端公开链路均不得透出。
 */
export const COMPETITION_DEMO_PREFIX = "comp-demo-";

export const PUBLIC_COMPETITION_STATUSES = ["PUBLISHED", "IN_PROGRESS", "FINISHED"] as const;

export function isDemoCompetitionId(id: string): boolean {
  return id.startsWith(COMPETITION_DEMO_PREFIX);
}

export function isPublicCompetitionStatus(status: string): boolean {
  return (PUBLIC_COMPETITION_STATUSES as readonly string[]).includes(status);
}