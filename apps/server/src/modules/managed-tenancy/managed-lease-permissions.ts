/** 当前独立入口的数据库权限；扩展业务时须同时审查字段和授权范围。 */
export const managedLeasePermissions: Record<string, Partial<Record<"select" | "insert" | "update", string[]>>> = {
  User: { select: ["id", "status", "nickname", "phone"] },
  Product: { select: ["id", "title", "intro", "price", "stock", "status", "deletedAt", "updatedAt"], update: ["title", "updatedAt"] },
  Course: { select: ["id", "title", "intro", "price", "auditStatus", "deletedAt"] },
  Circle: { select: ["id", "name", "intro", "ownerId", "status", "deletedAt"], insert: ["*"] },
  VoiceAgentProfile: { select: ["id", "name", "ownerType", "ownerId", "activeVersion", "status"] },
  CircleKnowledge: { select: ["id", "circleId", "scope", "status", "content", "sourceType"] },
  Order: { select: ["id", "userId", "type", "targetId", "quantity", "amount", "status", "paidAt", "createdAt"] },
  ManagedLeaseAftercare: { select: ["*"], insert: ["*"] },
  ManagedLeaseExport: { select: ["*"], insert: ["*"], update: ["downloadedAt"] },
  ManagedLeaseAudit: { select: ["*"], insert: ["*"] },
};
