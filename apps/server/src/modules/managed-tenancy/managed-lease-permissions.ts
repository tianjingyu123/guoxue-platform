/** 当前独立入口的数据库权限；扩展业务时须同时审查字段和授权范围。 */
export const managedLeasePermissions: Record<string, Partial<Record<"select" | "insert" | "update", string[]>>> = {
  // PostgreSQL 行锁需要一列 UPDATE 权限；围栏自身触发器始终拒绝客户写入。
  ManagedLeaseWriteFence:{select:["*"],update:["updatedAt"]},
  User: { select: ["id", "status", "nickname", "phone", "deletedAt"], insert: ["id", "nickname", "updatedAt"] },
  ManagedLeaseIdentity: { select: ["*"], insert: ["id", "userId", "username", "passwordHash", "updatedAt"], update: ["passwordHash", "revision", "updatedAt"] },
  ManagedLeaseRefresh: { select: ["*"], insert: ["*"], update: ["revokedAt"] },
  ManagedLeaseLoginThrottle: { select: ["*"], insert: ["*"], update: ["*"] },
  Product: { select: ["id", "title", "intro", "detail", "images", "price", "originalPrice", "stock", "status", "deletedAt", "updatedAt", "userId", "supplierType", "freightTemplateId"], insert:["id","userId","title","intro","detail","images","price","stock","updatedAt"], update: ["title", "intro", "detail", "images", "price", "stock", "status", "updatedAt"] },
  ProductSku: { select:["*"] },
  Course: { select: ["id", "title", "intro", "price", "originalPrice", "auditStatus", "deletedAt", "userId", "validityDays", "cover"], insert:["id","userId","title","intro","price","validityDays","cover","type","updatedAt"], update:["title","intro","price","validityDays","cover","auditStatus","updatedAt"] },
  CourseChapter: { select: ["id", "courseId", "title", "content", "mediaUrl", "duration", "sortOrder", "freeTrial"], insert:["id","courseId","title","content","sortOrder","freeTrial"], update:["title","content","sortOrder","freeTrial"] },
  CourseProgress: { select: ["id", "userId", "courseId", "chapterId", "progress", "completed", "updatedAt"], insert: ["id", "userId", "courseId", "chapterId", "progress", "completed", "updatedAt"], update: ["progress", "completed", "updatedAt"] },
  Circle: { select: ["id", "name", "intro", "ownerId", "status", "deletedAt", "type", "needApproval", "memberCount", "postCount", "price"], insert: ["*"], update:["name","intro","status","needApproval","memberCount","postCount","updatedAt"] },
  CircleMember: {select:["id","circleId","userId","role","joinedAt","expireAt"],insert:["id","circleId","userId","role","joinedAt","expireAt"],update:["role","expireAt"]},
  Post: {select:["id","circleId","userId","title","content","status","createdAt","updatedAt"],insert:["id","circleId","userId","title","content","status","updatedAt"],update:["title","content","status","updatedAt"]},
  VoiceAgentProfile: { select: ["id", "name", "persona", "ownerType", "ownerId", "activeVersion", "status"],insert:["id","ownerType","ownerId","name","persona","prompt","voiceId","updatedAt"],update:["name","persona","status","activeVersion","updatedAt"] },
  CircleKnowledge: { select: ["id", "circleId", "scope", "status", "content", "sourceType"] },
  Order: { select: ["*"],insert:["*"],update:["status","updatedAt"] },
  ShippingAddress: { select:["*"],insert:["*"],update:["name","phone","province","city","district","detail","isDefault","updatedAt"] },
  FlashSaleItem: {select:["*"],update:["sold","updatedAt"]},FlashSale:{select:["*"]},GroupBuy:{select:["*"]},DiscountActivity:{select:["*"]},FreightTemplate:{select:["*"]},
  FreeCourseEnrollmentNotice:{select:["*"],insert:["*"]},
  ManagedLeaseResource: {select:["*"],insert:["id","customerId","applicationId","kind","resourceId","creatorId"],update:["revision"]},
  ManagedLeaseAsset: {select:["*"],insert:["*"]},
  ManagedLeaseOrder: {select:["*"],insert:["*"]},
  ManagedLeaseJoinRequest: {select:["*"],insert:["*"],update:["status","reason","reviewedBy","reviewedAt"]},
  ManagedLeasePostRequest: {select:["*"],insert:["*"]},
  ManagedLeaseCircleMute: {select:["*"],insert:["*"],update:["until","reason","moderatedBy"]},
  ManagedLeaseChatSession: {select:["*"],insert:["*"],update:["nextSequence"]},
  ManagedLeaseChatMessage: {select:["*"],insert:["*"],update:["assistantText","state","failureCode","providerRequestId","finishedAt"]},
  ManagedLeaseAftercare: { select: ["*"], insert: ["*"] },
  ManagedLeaseExport: { select: ["*"], insert: ["*"], update: ["downloadedAt", "manifest"] },
  ManagedLeaseExportPage: { select: ["*"], insert: ["*"] },
  ManagedLeaseAudit: { select: ["*"], insert: ["*"] },
};

/** 新独立数据库的最低列权限；调用者先核对实际维护身份，不能用于平台共享库。 */
export function managedLeaseGrantSql(role:string){
  if(!/^[a-zA-Z][a-zA-Z0-9_]{0,62}$/.test(role))throw new Error("运行角色标识无效");
  return `GRANT USAGE ON SCHEMA public TO "${role}"; REVOKE ALL ON ALL TABLES IN SCHEMA public FROM "${role}"; REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM "${role}";\n`+Object.entries(managedLeasePermissions).flatMap(([table,operations])=>Object.entries(operations).map(([operation,columns])=>`GRANT ${operation.toUpperCase()}${columns.includes('*')?'':' ('+columns.map(column=>'"'+column+'"').join(',')+')'} ON public."${table}" TO "${role}";`)).join("\n");
}
