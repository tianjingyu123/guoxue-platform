import { Prisma, PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import { check } from "./managed-policy";

type Row = { id: string } & Record<string, unknown>;
type Loader = (tx: Prisma.TransactionClient, cursor?: string) => Promise<Row[]>;
const batch = (cursor?: string) => ({ take: 500, orderBy: { id: "asc" as const }, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
export function canonicalExportJson(value: Prisma.JsonValue): string {
  if (Array.isArray(value)) return "[" + value.map(canonicalExportJson).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.keys(value).filter(key => value[key] !== undefined).sort().map(key => JSON.stringify(key) + ":" + canonicalExportJson(value[key]!)).join(",") + "}";
  return JSON.stringify(value);
}
const loaders: Record<string, Loader> = {
  users: (tx, cursor) => tx.user.findMany({ ...batch(cursor), select: { id: true, nickname: true, phone: true } }),
  products: (tx, cursor) => tx.product.findMany({ ...batch(cursor), select: { id: true,userId:true, title: true, intro: true,detail:true,images:true, price: true, stock: true, status: true,deletedAt:true } }),
  courses: (tx, cursor) => tx.course.findMany({ ...batch(cursor), select: { id: true,userId:true, title: true, intro: true,cover:true,validityDays:true, price: true, auditStatus: true,deletedAt:true } }),
  chapters: (tx, cursor) => tx.courseChapter.findMany({ ...batch(cursor), select: { id: true, courseId: true, title: true, content: true, duration: true, sortOrder: true, freeTrial: true } }),
  progress: (tx, cursor) => tx.courseProgress.findMany({ ...batch(cursor), select: { id: true, userId: true, courseId: true, chapterId: true, progress: true, completed: true, updatedAt: true } }),
  circles: (tx, cursor) => tx.circle.findMany({ ...batch(cursor), select: { id: true, name: true, intro: true, ownerId: true, status: true } }),
  orders: (tx, cursor) => tx.order.findMany({ ...batch(cursor), select: { id: true, userId: true, type: true, targetId: true, quantity: true, amount: true, status: true, paidAt: true, createdAt: true } }),
  knowledge: (tx, cursor) => tx.circleKnowledge.findMany({ ...batch(cursor), where: { scope: "circle" }, select: { id: true, circleId: true, sourceType: true, status: true, content: true } }),
  members:(tx,cursor)=>tx.circleMember.findMany({...batch(cursor),select:{id:true,circleId:true,userId:true,role:true,joinedAt:true,expireAt:true}}),
  posts:(tx,cursor)=>tx.post.findMany({...batch(cursor),select:{id:true,circleId:true,userId:true,title:true,content:true,status:true,createdAt:true,updatedAt:true}}),
  agents:(tx,cursor)=>tx.voiceAgentProfile.findMany({...batch(cursor),select:{id:true,ownerType:true,ownerId:true,name:true,persona:true,status:true,activeVersion:true}}),
  addresses:(tx,cursor)=>tx.shippingAddress.findMany({...batch(cursor),select:{id:true,userId:true,name:true,phone:true,province:true,city:true,district:true,detail:true,isDefault:true}}),
};
export const managedExportCollections=[...Object.keys(loaders),"aftercare","assets","origins","orderOrigins","postOrigins","joinRequests","mutes","chatSessions","chatMessages","audit"];

/** 维护退出采用服务端固定字段、游标分页和一致性快照；不收客户端SQL、路径或字段名单。 */
export async function createPagedLeaseExport(db: PrismaClient, input: { customerId: string; applicationId: string; userId: string; revision: number; tokenHash: string; expiresAt: Date }, reauthorize: () => Promise<unknown>) {
  return db.$transaction(async tx => {
    const row = await tx.managedLeaseExport.create({ data: { customerId: input.customerId, userId: input.userId, tokenHash: input.tokenHash, expiresAt: input.expiresAt, manifest: {} }, select: { id: true } });
    const collections: Record<string, { rows: number; pages: Array<{ page: number; rows: number; sha256: string }> }> = {};
    let totalRows = 0, totalBytes = 0;
    const scopedLoaders: Record<string, Loader> = { ...loaders,
      aftercare: (client, cursor) => client.managedLeaseAftercare.findMany({ ...batch(cursor), where: { customerId: input.customerId }, select: { id: true, userId: true, orderId: true, reason: true, status: true, createdAt: true } }),
      assets:(client,cursor)=>client.managedLeaseAsset.findMany({...batch(cursor),take:1,where:{customerId:input.customerId},select:{id:true,applicationId:true,userId:true,contentType:true,size:true,sha256:true,dataBase64:true,createdAt:true}}),
      origins:(client,cursor)=>client.managedLeaseResource.findMany({...batch(cursor),where:{customerId:input.customerId},select:{id:true,applicationId:true,kind:true,resourceId:true,creatorId:true,revision:true,createdAt:true}}),
      orderOrigins:async(client,cursor)=>(await client.managedLeaseOrder.findMany({take:500,orderBy:{orderId:"asc"},...(cursor?{cursor:{orderId:cursor},skip:1}:{}),where:{customerId:input.customerId},select:{orderId:true,applicationId:true,userId:true,createdAt:true}})).map(row=>({id:row.orderId,...row})),
      postOrigins:(client,cursor)=>client.managedLeasePostRequest.findMany({...batch(cursor),where:{customerId:input.customerId},select:{id:true,postId:true,applicationId:true,userId:true,createdAt:true}}),
      joinRequests:(client,cursor)=>client.managedLeaseJoinRequest.findMany({...batch(cursor),where:{customerId:input.customerId},select:{id:true,applicationId:true,circleId:true,userId:true,status:true,reason:true,reviewedBy:true,reviewedAt:true,createdAt:true}}),
      mutes:(client,cursor)=>client.managedLeaseCircleMute.findMany({...batch(cursor),where:{customerId:input.customerId},select:{id:true,circleId:true,userId:true,until:true,reason:true,moderatedBy:true}}),
      chatSessions:(client,cursor)=>client.managedLeaseChatSession.findMany({...batch(cursor),where:{customerId:input.customerId},select:{id:true,applicationId:true,userId:true,agentId:true,circleId:true,createdAt:true}}),
      chatMessages:(client,cursor)=>client.managedLeaseChatMessage.findMany({...batch(cursor),where:{session:{customerId:input.customerId}},select:{id:true,sessionId:true,sequence:true,userText:true,assistantText:true,state:true,failureCode:true,createdAt:true,finishedAt:true}}),
      audit:(client,cursor)=>client.managedLeaseAudit.findMany({...batch(cursor),where:{customerId:input.customerId},select:{id:true,userId:true,action:true,entityId:true,reason:true,createdAt:true}}),
    };
    for (const [collection, load] of Object.entries(scopedLoaders)) {
      let cursor: string | undefined, page = 0;
      const meta: { rows: number; pages: Array<{ page: number; rows: number; sha256: string }> } = { rows: 0, pages: [] };
      collections[collection] = meta;
      for (;;) {
        const records = await load(tx, cursor);
        if (!records.length) break;
        totalRows += records.length; meta.rows += records.length;
        check(totalRows <= 100000, "导出超过受控快照行数上限，须安排维护迁出，不截断数据");
        const payload = records.map(record => collection === "users" ? { ...record, phone: record.phone ? "***" + String(record.phone).slice(-4) : null } : record);
        const serialized = JSON.stringify(payload), bytes = Buffer.byteLength(serialized);
        totalBytes += bytes;
        check(bytes <= 2 * 1024 * 1024 && totalBytes <= 128 * 1024 * 1024, "导出超过受控快照体积上限，须安排维护迁出，不截断数据");
        const sha256 = createHash("sha256").update(canonicalExportJson(JSON.parse(serialized) as Prisma.JsonValue)).digest("hex");
        await tx.managedLeaseExportPage.create({ data: { exportId: row.id, collection, page, payload: JSON.parse(serialized) as Prisma.InputJsonValue, sha256 } });
        meta.pages.push({ page, rows: records.length, sha256 });
        cursor = records[records.length - 1].id; page++;
      }
    }
    const manifest = { version: 3, format: "managed-json-pages", hashEncoding: "UTF-8 JSON，递归按键排序，不加空白，数组保留顺序", customerId: input.customerId, applicationId: input.applicationId, revision: input.revision, createdAt: new Date().toISOString(), pageSize: 500,pageSizes:{assets:1}, totalRows, totalBytes, collections, omitted: ["认证凭据、独立密码摘要、令牌与平台角色", "global知识与智能体内部指令", "外部COS媒体、语音二进制及供应商会话标识", "请求幂等键和请求摘要", "用户手机号已脱敏；收货地址保留履约字段"] };
    await tx.managedLeaseExport.update({ where: { id: row.id }, data: { manifest: manifest as Prisma.InputJsonValue } });
    await tx.managedLeaseAudit.create({ data: { customerId: input.customerId, userId: input.userId, action: "REQUEST_PAGED_EXPORT", entityId: row.id } });
    await reauthorize();
    return { id: row.id, expiresAt: input.expiresAt, manifest };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 60000 });
}
