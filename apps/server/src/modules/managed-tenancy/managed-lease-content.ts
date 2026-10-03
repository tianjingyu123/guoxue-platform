import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import { createHash, randomUUID } from "crypto";

export type ManagedContentKind = "product" | "course" | "circle" | "agent";
export type ManagedContentActor = { customerId: string; applicationId: string; userId: string };
export const managedAssetPath = (id: string) => `/api/v1/lease/assets/${id}`;
export function contentBody(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) throw new BadRequestException("内容字段无效，不接受主体、角色、归属或资金参数");
  return value as Record<string, unknown>;
}
export function contentText(value: unknown, max: number, empty = false): string {
  if (typeof value !== "string" || (!empty && !value.trim()) || value.length > max || /[<>]/.test(value) || Array.from(value).some(char => (char.charCodeAt(0) < 32 && ![9,10,13].includes(char.charCodeAt(0))) || char.charCodeAt(0) === 127)) throw new BadRequestException("文本须为规定长度的纯文本");
  return value.trim();
}
export function contentId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(value)) throw new BadRequestException("资源标识无效"); return value;
}
function price(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1000000 || Math.abs(value * 100 - Math.round(value * 100)) > 0.000001) throw new BadRequestException("价格须为最多两位小数的非负金额"); return value;
}
function integer(value: unknown, max: number) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > max) throw new BadRequestException("数量或期限无效"); return value;
}

/** 内容写入只在固定客户库；资源来源按应用不可变，旧合同白名单仍单独保留。 */
export class ManagedLeaseContentService {
  constructor(private readonly db: PrismaClient, private readonly actor: ManagedContentActor) {}
  async ownedIds(kind: ManagedContentKind) {
    const rows = await this.db.managedLeaseResource.findMany({ where: { customerId: this.actor.customerId, applicationId: this.actor.applicationId, kind }, select: { resourceId: true }, take: 5001 });
    if (rows.length > 5000) throw new BadRequestException("应用资源超过当前候选容量，请安排维护扩容，不能截断授权");
    return rows.map(row => row.resourceId);
  }
  async lockOwned(tx: Prisma.TransactionClient, kind: ManagedContentKind, id: string, expectedRevision: unknown) {
    contentId(id);
    const rows = await tx.$queryRaw<Array<{ id: string; revision: number }>>`SELECT id,revision FROM "ManagedLeaseResource" WHERE "customerId"=${this.actor.customerId} AND "applicationId"=${this.actor.applicationId} AND kind=${kind} AND "resourceId"=${id} FOR UPDATE`;
    if (!rows[0]) throw new NotFoundException("当前应用没有此自建资源管理权");
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== rows[0].revision) throw new ConflictException("内容已被修改，请刷新后重试");
    return rows[0];
  }
  async registerOwned(tx: Prisma.TransactionClient, kind: ManagedContentKind, resourceId: string) {
    await tx.$executeRaw`INSERT INTO "ManagedLeaseResource" (id,"customerId","applicationId",kind,"resourceId","creatorId") VALUES (${randomUUID()},${this.actor.customerId},${this.actor.applicationId},${kind},${resourceId},${this.actor.userId})`;
  }
  private async audit(tx: Prisma.TransactionClient, action: string, entityId: string, reauthorize: () => Promise<unknown>, reason?: string) {
    await tx.managedLeaseAudit.create({ data: { customerId: this.actor.customerId, userId: this.actor.userId, action, entityId, reason } });
    await reauthorize();
  }
  async uploadAsset(value: unknown, reauthorize: () => Promise<unknown>) {
    const body = contentBody(value, ["contentType", "dataBase64"]);
    if (!["image/png", "image/jpeg"].includes(body.contentType as string) || typeof body.dataBase64 !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.dataBase64) || body.dataBase64.length > 700000) throw new BadRequestException("附件仅支持有大小限制的PNG/JPEG，不接受URL、路径或SVG");
    const data = Buffer.from(body.dataBase64, "base64");
    if (data.length < 12 || data.length > 512 * 1024 || data.toString("base64") !== body.dataBase64 || (body.contentType === "image/png" ? !data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : data[0] !== 255 || data[1] !== 216 || data[data.length-2] !== 255 || data[data.length-1] !== 217)) throw new BadRequestException("附件编码、字节签名或大小无效");
    return this.db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`managed-assets:${this.actor.customerId}`},0))`;
      const bytes = await tx.managedLeaseAsset.aggregate({ where: { customerId: this.actor.customerId }, _sum: { size: true } });
      if ((bytes._sum.size || 0) + data.length > 64 * 1024 * 1024) throw new ForbiddenException("当前附件存储技术上限已达到，请安排维护扩容");
      const row = await tx.managedLeaseAsset.create({ data: { ...this.actor, id: randomUUID(), contentType: body.contentType as string, size: data.length, sha256: createHash("sha256").update(data).digest("hex"), dataBase64: body.dataBase64 as string }, select: { id: true, size: true, sha256: true, contentType: true } });
      await this.audit(tx, "UPLOAD_LOCAL_ASSET", row.id, reauthorize);
      return { ...row, url: managedAssetPath(row.id) };
    });
  }
  private async assetUrls(tx: Prisma.TransactionClient, value: unknown) {
    if (!Array.isArray(value) || value.length > 6 || value.some(item => typeof item !== "string") || new Set(value).size !== value.length) throw new BadRequestException("附件列表无效，最多六个本应用附件");
    const ids = value.map(contentId);
    const rows = await tx.managedLeaseAsset.findMany({ where: { id: { in: ids }, customerId: this.actor.customerId, applicationId: this.actor.applicationId }, select: { id: true } });
    if (rows.length !== ids.length) throw new ForbiddenException("附件不属于本应用");
    return ids.map(managedAssetPath);
  }
  async createProduct(value: unknown, reauthorize: () => Promise<unknown>) {
    const body = contentBody(value, ["title","intro","detail","price","stock","assetIds"]);
    const data = { title: contentText(body.title,120), intro: contentText(body.intro ?? "",1000,true), detail: contentText(body.detail,12000), price: price(body.price), stock: integer(body.stock ?? 0,1000000) };
    return this.db.$transaction(async tx => {
      const id = randomUUID(), images = await this.assetUrls(tx,body.assetIds ?? []);
      await tx.$executeRaw`INSERT INTO "Product" (id,"userId",title,intro,detail,price,stock,images,"updatedAt") VALUES (${id},${this.actor.userId},${data.title},${data.intro},${data.detail},${data.price},${data.stock},${images},${new Date()})`;
      await this.registerOwned(tx,"product",id); await this.audit(tx,"CREATE_OWN_PRODUCT",id,reauthorize);
      return { id, ...data, images, status: "PENDING", revision: 1 };
    });
  }
  async editProduct(id: string, value: unknown, reauthorize: () => Promise<unknown>) {
    const body = contentBody(value,["title","intro","detail","price","stock","assetIds","revision"]);
    const title = contentText(body.title,120), intro = contentText(body.intro ?? "",1000,true), detail = contentText(body.detail,12000), amount = price(body.price), stock = integer(body.stock,1000000);
    return this.db.$transaction(async tx => {
      const origin = await this.lockOwned(tx,"product",id,body.revision), images = await this.assetUrls(tx,body.assetIds ?? []);
      const changed = await tx.product.updateMany({ where: { id, deletedAt: null }, data: { title,intro,detail,price: amount,stock,images,status:"PENDING" } });
      if (changed.count !== 1) throw new NotFoundException("商品不存在");
      await tx.managedLeaseResource.update({ where:{id:origin.id},data:{revision:{increment:1}} });
      await this.audit(tx,"EDIT_OWN_PRODUCT",id,reauthorize);
      return { id,revision:origin.revision+1,status:"PENDING" };
    });
  }
  async publishProduct(id: string, value: unknown, reauthorize: () => Promise<unknown>) {
    const body = contentBody(value,["revision","status","reason"]), reason = contentText(body.reason,500);
    if (!["ON_SALE","OFF_SHELF"].includes(body.status as string) || reason.length < 2) throw new BadRequestException("须选择上架/下架并提供人工审核依据");
    return this.db.$transaction(async tx => {
      const origin = await this.lockOwned(tx,"product",id,body.revision);
      const product = await tx.product.findFirst({where:{id,deletedAt:null},select:{images:true}});
      if (!product) throw new NotFoundException("商品不存在");
      if (body.status === "ON_SALE" && !product.images.length) throw new BadRequestException("上架前必须上传本应用商品图");
      await tx.product.updateMany({ where:{id,deletedAt:null},data:{status:body.status as string} });
      await tx.managedLeaseResource.update({ where:{id:origin.id},data:{revision:{increment:1}} });
      await this.audit(tx,"REVIEW_OWN_PRODUCT",id,reauthorize,reason);
      return {id,status:body.status,revision:origin.revision+1};
    });
  }
  async createCourse(value: unknown, reauthorize: () => Promise<unknown>) {
    const body=contentBody(value,["title","intro","price","validityDays","assetIds"]),title=contentText(body.title,120),intro=contentText(body.intro??"",2000,true),amount=price(body.price??0),days=integer(body.validityDays??0,36500);
    return this.db.$transaction(async tx=>{
      const id=randomUUID(),assets=await this.assetUrls(tx,body.assetIds??[]);
      await tx.$executeRaw`INSERT INTO "Course" (id,"userId",title,intro,price,"validityDays",cover,type,"updatedAt") VALUES (${id},${this.actor.userId},${title},${intro},${amount},${days},${assets[0]??null},'TEXT',${new Date()})`;
      await this.registerOwned(tx,"course",id);await this.audit(tx,"CREATE_OWN_COURSE",id,reauthorize);
      return {id,title,intro,price:amount,validityDays:days,auditStatus:"PENDING",revision:1};
    });
  }
  async saveChapter(courseId: string, value: unknown, reauthorize: () => Promise<unknown>) {
    const body=contentBody(value,["id","title","content","sortOrder","freeTrial","revision"]),title=contentText(body.title,120),content=contentText(body.content,30000),sort=integer(body.sortOrder??0,10000);
    if(typeof body.freeTrial!=="boolean")throw new BadRequestException("试看标记无效");
    return this.db.$transaction(async tx=>{
      const origin=await this.lockOwned(tx,"course",courseId,body.revision);
      const id=body.id?contentId(body.id):randomUUID();
      if(body.id){const updated=await tx.courseChapter.updateMany({where:{id,courseId},data:{title,content,sortOrder:sort,freeTrial:body.freeTrial as boolean}});if(updated.count!==1)throw new NotFoundException("本课程章节不存在");}
      else {if(await tx.courseChapter.count({where:{courseId}})>=500)throw new ForbiddenException("当前课程章节技术上限为500，需维护扩容");await tx.$executeRaw`INSERT INTO "CourseChapter" (id,"courseId",title,content,"sortOrder","freeTrial") VALUES (${id},${courseId},${title},${content},${sort},${body.freeTrial as boolean})`;}
      const courseChanged=await tx.course.updateMany({where:{id:courseId,deletedAt:null},data:{auditStatus:"PENDING"}});
      if(courseChanged.count!==1)throw new NotFoundException("课程不存在");
      await tx.managedLeaseResource.update({where:{id:origin.id},data:{revision:{increment:1}}});
      await this.audit(tx,"EDIT_OWN_CHAPTER",id,reauthorize);return {id,courseId,revision:origin.revision+1,auditStatus:"PENDING"};
    });
  }
  async publishCourse(id: string, value: unknown, reauthorize: () => Promise<unknown>) {
    const body=contentBody(value,["revision","status","reason"]),reason=contentText(body.reason,500);
    if(!["APPROVED","DRAFT"].includes(body.status as string)||reason.length<2)throw new BadRequestException("课程状态或人工审核依据无效");
    return this.db.$transaction(async tx=>{
      const origin=await this.lockOwned(tx,"course",id,body.revision);
      if(body.status==='APPROVED'&&await tx.courseChapter.count({where:{courseId:id}})===0)throw new BadRequestException("课程至少需要一个章节");
      const changed=await tx.course.updateMany({where:{id,deletedAt:null},data:{auditStatus:body.status as string}});if(changed.count!==1)throw new NotFoundException("课程不存在");
      await tx.managedLeaseResource.update({where:{id:origin.id},data:{revision:{increment:1}}});await this.audit(tx,"REVIEW_OWN_COURSE",id,reauthorize,reason);
      return {id,auditStatus:body.status,revision:origin.revision+1};
    });
  }
  async editCourse(id: string, value: unknown, reauthorize: () => Promise<unknown>) {
    const body=contentBody(value,["title","intro","price","validityDays","assetIds","revision"]);
    const title=contentText(body.title,120),intro=contentText(body.intro??"",2000,true),amount=price(body.price),days=integer(body.validityDays,36500);
    return this.db.$transaction(async tx=>{
      const origin=await this.lockOwned(tx,"course",id,body.revision),assets=await this.assetUrls(tx,body.assetIds??[]);
      const changed=await tx.course.updateMany({where:{id,deletedAt:null},data:{title,intro,price:amount,validityDays:days,cover:assets[0]??null,auditStatus:"PENDING"}});
      if(changed.count!==1)throw new NotFoundException("课程不存在");
      await tx.managedLeaseResource.update({where:{id:origin.id},data:{revision:{increment:1}}});
      await this.audit(tx,"EDIT_OWN_COURSE",id,reauthorize);return {id,revision:origin.revision+1,auditStatus:"PENDING"};
    });
  }
  async chapters(id: string) {
    const origin=await this.db.managedLeaseResource.findFirst({where:{customerId:this.actor.customerId,applicationId:this.actor.applicationId,kind:"course",resourceId:contentId(id)},select:{revision:true}});
    if(!origin)throw new NotFoundException("本应用课程不存在");
    const items=await this.db.courseChapter.findMany({where:{courseId:id},select:{id:true,title:true,content:true,sortOrder:true,freeTrial:true},orderBy:[{sortOrder:"asc"},{id:"asc"}],take:501});
    if(items.length>500)throw new BadRequestException("课程章节超过当前读取上限");return {revision:origin.revision,items};
  }
  async publishCircle(id: string, value: unknown, reauthorize: () => Promise<unknown>) {
    const body=contentBody(value,["revision","status","needApproval","reason"]),reason=contentText(body.reason,500);
    if(!["ACTIVE","DISABLED"].includes(body.status as string)||typeof body.needApproval!=="boolean"||reason.length<2)throw new BadRequestException("圈子状态或审核配置无效");
    return this.db.$transaction(async tx=>{
      const origin=await this.lockOwned(tx,"circle",id,body.revision);
      const circle=await tx.circle.findFirst({where:{id,deletedAt:null},select:{type:true}});
      if(!circle)throw new NotFoundException("圈子不存在");
      if(body.status==="ACTIVE"&&circle.type!=="FREE")throw new ForbiddenException("付费圈须先通过本客户支付与履约核验");
      await tx.circle.updateMany({where:{id,deletedAt:null},data:{status:body.status as "ACTIVE"|"DISABLED",needApproval:body.needApproval as boolean}});
      await tx.managedLeaseResource.update({where:{id:origin.id},data:{revision:{increment:1}}});await this.audit(tx,"REVIEW_OWN_CIRCLE",id,reauthorize,reason);
      return {id,status:body.status,needApproval:body.needApproval,revision:origin.revision+1};
    });
  }
  async createAgent(value: unknown, reauthorize: () => Promise<unknown>, circleIds: string[]) {
    const body=contentBody(value,["name","persona","circleId"]),name=contentText(body.name,120),persona=contentText(body.persona,2000);
    const circleId=body.circleId?contentId(body.circleId):null;
    if(circleId&&!circleIds.includes(circleId))throw new ForbiddenException("智能体所属圈子未授权");
    return this.db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`managed-agent:${this.actor.customerId}:${this.actor.applicationId}`},0))`;
      if(circleId&&!await tx.circle.findFirst({where:{id:circleId,deletedAt:null,status:"ACTIVE"},select:{id:true}}))throw new NotFoundException("所属圈子未启用");
      const ownerType=circleId?"circle":"managed",ownerId=circleId??this.actor.applicationId;
      if(await tx.voiceAgentProfile.findFirst({where:{ownerType,ownerId},select:{id:true}}))throw new ConflictException("该应用或圈子已有智能体，请编辑既有配置");
      const id=randomUUID();
      await tx.$executeRaw`INSERT INTO "VoiceAgentProfile" (id,"ownerType","ownerId",name,persona,prompt,"voiceId","updatedAt") VALUES (${id},${ownerType},${ownerId},${name},${persona},'由受控文本会话入口提供固定安全指令','unconfigured',${new Date()})`;
      await this.registerOwned(tx,"agent",id);await this.audit(tx,"CREATE_OWN_AGENT",id,reauthorize);
      return {id,name,persona,status:"DRAFT",revision:1,voiceReady:false};
    });
  }
  async editAgent(id: string, value: unknown, reauthorize: () => Promise<unknown>) {
    const body=contentBody(value,["revision","name","persona"]),name=contentText(body.name,120),persona=contentText(body.persona,2000);
    return this.db.$transaction(async tx=>{
      const origin=await this.lockOwned(tx,"agent",id,body.revision);
      const changed=await tx.voiceAgentProfile.updateMany({where:{id},data:{name,persona,status:"DRAFT",activeVersion:null}});
      if(changed.count!==1)throw new NotFoundException("智能体不存在");
      await tx.managedLeaseResource.update({where:{id:origin.id},data:{revision:{increment:1}}});await this.audit(tx,"EDIT_OWN_AGENT",id,reauthorize);
      return {id,status:"DRAFT",revision:origin.revision+1,voiceReady:false};
    });
  }
  async publishAgent(id: string, value: unknown, reauthorize: () => Promise<unknown>, singleAgent: boolean, grantedIds: string[]) {
    const body=contentBody(value,["revision","status","reason"]),reason=contentText(body.reason,500);
    if(!["APPROVED","DISABLED"].includes(body.status as string)||reason.length<2)throw new BadRequestException("智能体状态或人工审核依据无效");
    return this.db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`managed-agent:${this.actor.customerId}:${this.actor.applicationId}`},0))`;
      const origin=await this.lockOwned(tx,"agent",id,body.revision);
      const own=await tx.managedLeaseResource.findMany({where:{customerId:this.actor.customerId,applicationId:this.actor.applicationId,kind:"agent"},select:{resourceId:true}});
      if(singleAgent&&body.status==="APPROVED"&&await tx.voiceAgentProfile.count({where:{id:{in:[...new Set([...grantedIds,...own.map(row=>row.resourceId)])],not:id},status:"APPROVED",activeVersion:{not:null}}})>0)throw new ForbiddenException("单智能体模板只能启用一个智能体，请先停用旧配置");
      const changed=await tx.voiceAgentProfile.updateMany({where:{id},data:{status:body.status as string,activeVersion:body.status==="APPROVED"?origin.revision+1:null}});
      if(changed.count!==1)throw new NotFoundException("智能体不存在");
      await tx.managedLeaseResource.update({where:{id:origin.id},data:{revision:{increment:1}}});await this.audit(tx,"REVIEW_OWN_AGENT",id,reauthorize,reason);
      return {id,status:body.status,revision:origin.revision+1,voiceReady:false};
    });
  }
  async list(kind: ManagedContentKind, cursor = "") {
    if(cursor)contentId(cursor);
    const origins=await this.db.managedLeaseResource.findMany({where:{customerId:this.actor.customerId,applicationId:this.actor.applicationId,kind,...(cursor?{id:{gt:cursor}}:{})},orderBy:{id:"asc"},take:51});
    const page=origins.slice(0,50),ids=page.map(row=>row.resourceId);
    const records=kind==='product'?await this.db.product.findMany({where:{id:{in:ids},deletedAt:null},select:{id:true,title:true,intro:true,detail:true,price:true,stock:true,status:true,images:true}}):kind==='course'?await this.db.course.findMany({where:{id:{in:ids},deletedAt:null},select:{id:true,title:true,intro:true,price:true,auditStatus:true,validityDays:true,cover:true}}):kind==='circle'?await this.db.circle.findMany({where:{id:{in:ids},deletedAt:null},select:{id:true,name:true,intro:true,status:true,needApproval:true,memberCount:true,postCount:true}}):await this.db.voiceAgentProfile.findMany({where:{id:{in:ids}},select:{id:true,name:true,persona:true,status:true,ownerType:true,ownerId:true,activeVersion:true}});
    return {items:page.flatMap(origin=>{const row=records.find(row=>row.id===origin.resourceId);return row?[{...row,revision:origin.revision}]:[];}),nextCursor:origins.length>50?page[page.length-1].id:null};
  }
}
