import {BadRequestException,ForbiddenException,NotFoundException,ConflictException} from "@nestjs/common";
import {Prisma,PrismaClient} from "@prisma/client";
import {randomUUID} from "crypto";
import {contentBody,contentId,contentText,ManagedContentActor} from "./managed-lease-content";
import {digest} from "./managed-policy";

type Actor=ManagedContentActor&{role:string};
type CircleRow={id:string;ownerId:string;type:string;needApproval:boolean;memberCount:number;postCount:number};
const memberSelect={id:true,userId:true,role:true,joinedAt:true,expireAt:true} as const;
const postSelect={id:true,circleId:true,userId:true,title:true,content:true,status:true,createdAt:true,updatedAt:true} as const;
/** 免费圈和文本帖子在固定客户库中运行；付费成员不能由客户端参数产生。 */
export class ManagedLeaseCircleService {
  constructor(private readonly db:PrismaClient,private readonly actor:Actor,private readonly scope:()=>Promise<string[]>){ }
  private async circle(tx:Prisma.TransactionClient,id:string,lock=false):Promise<CircleRow>{
    contentId(id);if(!(await this.scope()).includes(id))throw new NotFoundException("本应用圈子不存在");
    if(lock)await tx.$queryRaw`SELECT id FROM "Circle" WHERE id=${id} FOR UPDATE`;
    const row=await tx.circle.findFirst({where:{id,status:"ACTIVE",deletedAt:null},select:{id:true,ownerId:true,type:true,needApproval:true,memberCount:true,postCount:true}});
    if(!row)throw new NotFoundException("圈子未启用");return row;
  }
  private async member(tx:Prisma.TransactionClient,circle:CircleRow,userId=this.actor.userId){
    const row=await tx.circleMember.findFirst({where:{circleId:circle.id,userId,OR:[{expireAt:null},{expireAt:{gt:new Date()}}]},select:memberSelect});
    if(!row)throw new ForbiddenException("须为本圈有效成员");return row;
  }
  private moderator(circle:CircleRow){if(this.actor.role!=="CUSTOMER_ADMIN"&&circle.ownerId!==this.actor.userId)throw new ForbiddenException("仅本客户管理员或圈主可审核");}
  private async canPost(tx:Prisma.TransactionClient,circle:CircleRow){
    await this.member(tx,circle);
    if(await tx.managedLeaseCircleMute.findFirst({where:{customerId:this.actor.customerId,circleId:circle.id,userId:this.actor.userId,until:{gt:new Date()}},select:{id:true}}))throw new ForbiddenException("当前处于本圈禁言期");
  }
  private async finish(tx:Prisma.TransactionClient,action:string,id:string,reason?:string){
    await tx.managedLeaseAudit.create({data:{customerId:this.actor.customerId,userId:this.actor.userId,action,entityId:id,reason}});await this.scope();
  }
  async detail(id:string){
    const circle=await this.circle(this.db,id),member=await this.db.circleMember.findFirst({where:{circleId:id,userId:this.actor.userId,OR:[{expireAt:null},{expireAt:{gt:new Date()}}]},select:memberSelect});
    const row=await this.db.circle.findUnique({where:{id},select:{id:true,name:true,intro:true,type:true,needApproval:true,memberCount:true,postCount:true}});
    return {...row,member:member?{role:member.role,expireAt:member.expireAt}:null,canModerate:this.actor.role==="CUSTOMER_ADMIN"||circle.ownerId===this.actor.userId};
  }
  async join(id:string,value:unknown){
    contentBody(value,[]);
    return this.db.$transaction(async tx=>{
      const circle=await this.circle(tx,id,true);
      if(circle.type!=="FREE")throw new ForbiddenException("付费圈加入须经本客户真实支付与履约");
      const existing=await tx.circleMember.findFirst({where:{circleId:id,userId:this.actor.userId},select:memberSelect});
      if(existing&&(!existing.expireAt||existing.expireAt.getTime()>Date.now())){await this.scope();return {status:"JOINED"};}
      if(circle.needApproval){
        let request=await tx.managedLeaseJoinRequest.findUnique({where:{customerId_circleId_userId:{customerId:this.actor.customerId,circleId:id,userId:this.actor.userId}}});
        if(request&&request.applicationId!==this.actor.applicationId)throw new ConflictException("既有申请属于另一应用，请在原申请入口处理");
        if(request?.status==="PENDING"){await this.scope();return {status:"PENDING",id:request.id};}
        request=request?await tx.managedLeaseJoinRequest.update({where:{id:request.id},data:{status:"PENDING",reviewedAt:null,reviewedBy:null,reason:null}}):await tx.managedLeaseJoinRequest.create({data:{...this.actorFields(),circleId:id}});
        await this.finish(tx,"REQUEST_OWN_CIRCLE_JOIN",request.id);return {id:request.id,status:"PENDING"};
      }
      await this.enroll(tx,circle,this.actor.userId,existing);
      await this.finish(tx,"JOIN_OWN_FREE_CIRCLE",id);return {status:"JOINED"};
    });
  }
  private actorFields(){return {customerId:this.actor.customerId,applicationId:this.actor.applicationId,userId:this.actor.userId};}
  private async enroll(tx:Prisma.TransactionClient,circle:CircleRow,userId:string,existing?:{id:string;expireAt:Date|null}|null){
    if(existing&&(!existing.expireAt||existing.expireAt.getTime()>Date.now()))return;
    if(existing)await tx.circleMember.updateMany({where:{id:existing.id},data:{role:"MEMBER",expireAt:null}});
    else await tx.$executeRaw`INSERT INTO "CircleMember" (id,"circleId","userId",role) VALUES (${randomUUID()},${circle.id},${userId},'MEMBER')`;
    await tx.circle.updateMany({where:{id:circle.id},data:{memberCount:{increment:1}}});
  }
  async leave(id:string,value:unknown){
    contentBody(value,[]);
    return this.db.$transaction(async tx=>{
      const circle=await this.circle(tx,id,true);if(circle.ownerId===this.actor.userId)throw new ForbiddenException("圈主须先由维护流程完成交接");
      const row=await tx.circleMember.findFirst({where:{circleId:id,userId:this.actor.userId,OR:[{expireAt:null},{expireAt:{gt:new Date()}}]},select:memberSelect});
      if(!row){await this.scope();return {status:"LEFT"};}
      await tx.circleMember.updateMany({where:{id:row.id},data:{expireAt:new Date()}});
      await tx.circle.updateMany({where:{id,memberCount:{gt:0}},data:{memberCount:{decrement:1}}});
      await this.finish(tx,"LEAVE_OWN_CIRCLE",id);return {status:"LEFT"};
    });
  }
  async requests(id:string,cursor=""){
    const circle=await this.circle(this.db,id);this.moderator(circle);if(cursor)contentId(cursor);
    const rows=await this.db.managedLeaseJoinRequest.findMany({where:{customerId:this.actor.customerId,applicationId:this.actor.applicationId,circleId:id,status:"PENDING",...(cursor?{id:{gt:cursor}}:{})},select:{id:true,userId:true,createdAt:true,status:true},orderBy:{id:"asc"},take:51});
    return {items:rows.slice(0,50),nextCursor:rows.length>50?rows[49].id:null};
  }
  async reviewJoin(id:string,requestId:string,value:unknown){
    contentId(requestId);const body=contentBody(value,["status","reason"]),reason=contentText(body.reason,500);
    if(!["APPROVED","REJECTED"].includes(body.status as string)||reason.length<2)throw new BadRequestException("入圈审核状态或依据无效");
    return this.db.$transaction(async tx=>{
      const circle=await this.circle(tx,id,true);this.moderator(circle);
      if(circle.type!=="FREE")throw new ForbiddenException("付费圈不使用免费入圈审核");
      const request=await tx.managedLeaseJoinRequest.findFirst({where:{id:requestId,customerId:this.actor.customerId,applicationId:this.actor.applicationId,circleId:id}});
      if(!request)throw new NotFoundException("本应用申请不存在");
      if(request.status!=="PENDING")throw new ConflictException("申请已处理");
      if(body.status==="APPROVED"){
        const user=await tx.user.findFirst({where:{id:request.userId,status:"ACTIVE",deletedAt:null},select:{id:true}});if(!user)throw new ForbiddenException("申请用户已停用");
        const existing=await tx.circleMember.findFirst({where:{circleId:id,userId:request.userId},select:memberSelect});await this.enroll(tx,circle,request.userId,existing);
      }
      await tx.managedLeaseJoinRequest.update({where:{id:request.id},data:{status:body.status as string,reason,reviewedBy:this.actor.userId,reviewedAt:new Date()}});
      await this.finish(tx,"REVIEW_OWN_CIRCLE_JOIN",request.id,reason);return {id:request.id,status:body.status};
    });
  }
  async members(id:string,cursor=""){
    const circle=await this.circle(this.db,id);this.moderator(circle);if(cursor)contentId(cursor);
    const rows=await this.db.circleMember.findMany({where:{circleId:id,OR:[{expireAt:null},{expireAt:{gt:new Date()}}],...(cursor?{id:{gt:cursor}}:{})},select:memberSelect,orderBy:{id:"asc"},take:51});
    return {items:rows.slice(0,50),nextCursor:rows.length>50?rows[49].id:null};
  }
  async mute(id:string,userId:string,value:unknown){
    contentId(userId);const body=contentBody(value,["minutes","reason"]),reason=contentText(body.reason,500);
    if(!Number.isSafeInteger(body.minutes)||Number(body.minutes)<0||Number(body.minutes)>43200||reason.length<2)throw new BadRequestException("禁言期限为0至43200分钟，需填写依据");
    return this.db.$transaction(async tx=>{
      const circle=await this.circle(tx,id,true);this.moderator(circle);await this.member(tx,circle,userId);
      if(userId===circle.ownerId||userId===this.actor.userId)throw new ForbiddenException("此入口不处理圈主或审核人自身禁言");
      const until=new Date(Date.now()+Number(body.minutes)*60000),where={customerId_circleId_userId:{customerId:this.actor.customerId,circleId:id,userId}};
      const existing=await tx.managedLeaseCircleMute.findUnique({where});
      const row=existing?await tx.managedLeaseCircleMute.update({where:{id:existing.id},data:{until,reason,moderatedBy:this.actor.userId}}):await tx.managedLeaseCircleMute.create({data:{customerId:this.actor.customerId,circleId:id,userId,until,reason,moderatedBy:this.actor.userId}});
      await this.finish(tx,"MODERATE_OWN_CIRCLE_MUTE",row.id,reason);return {userId,until};
    });
  }
  async posts(id:string,cursor="",moderation=false){
    const circle=await this.circle(this.db,id);if(moderation)this.moderator(circle);else await this.member(this.db,circle);if(cursor)contentId(cursor);
    const rows=await this.db.post.findMany({where:{circleId:id,...(cursor?{id:{gt:cursor}}:{}),OR:moderation?[{status:{in:["PUBLISHED","AUDITING","HIDDEN"]}},{userId:this.actor.userId}]:[{status:"PUBLISHED"},{userId:this.actor.userId}]},select:postSelect,orderBy:{id:"asc"},take:51});
    return {items:rows.slice(0,50),nextCursor:rows.length>50?rows[49].id:null};
  }
  async createPost(id:string,value:unknown){
    const body=contentBody(value,["title","content","draft","requestKey"]),title=contentText(body.title??"",120,true),content=contentText(body.content,12000),key=contentId(body.requestKey);
    if(key.length>80||typeof body.draft!=="boolean")throw new BadRequestException("发帖重试键或草稿标记无效");
    const fingerprint=digest({circleId:id,title,content,draft:body.draft});
    return this.db.$transaction(async tx=>{
      const circle=await this.circle(tx,id,true);await this.canPost(tx,circle);
      const previous=await tx.managedLeasePostRequest.findUnique({where:{customerId_applicationId_userId_requestKey:{...this.actorFields(),requestKey:key}}});
      if(previous){if(previous.requestDigest!==fingerprint)throw new ConflictException("重试键已对应其他帖子内容");await this.scope();return tx.post.findFirst({where:{id:previous.postId,circleId:id,userId:this.actor.userId},select:postSelect});}
      const postId=randomUUID(),status=body.draft?"DRAFT":"AUDITING";
      await tx.$executeRaw`INSERT INTO "Post" (id,"circleId","userId",title,content,status,"updatedAt") VALUES (${postId},${id},${this.actor.userId},${title},${content},${status},${new Date()})`;
      await tx.managedLeasePostRequest.create({data:{...this.actorFields(),requestKey:key,requestDigest:fingerprint,postId}});
      await this.finish(tx,"CREATE_OWN_CIRCLE_POST",postId);return tx.post.findFirst({where:{id:postId},select:postSelect});
    });
  }
  async editPost(id:string,postId:string,value:unknown){
    contentId(postId);const body=contentBody(value,["title","content","draft","updatedAt"]),title=contentText(body.title??"",120,true),content=contentText(body.content,12000);
    if(typeof body.draft!=="boolean"||typeof body.updatedAt!=="string"||!Number.isFinite(Date.parse(body.updatedAt)))throw new BadRequestException("草稿或修改时间无效");
    return this.db.$transaction(async tx=>{
      const circle=await this.circle(tx,id,true);await this.canPost(tx,circle);
      const post=await tx.post.findFirst({where:{id:postId,circleId:id,userId:this.actor.userId},select:postSelect});if(!post)throw new NotFoundException("本人帖子不存在");
      if(post.updatedAt.getTime()!==Date.parse(body.updatedAt as string))throw new ConflictException("帖子已修改，请刷新");
      if(post.status==="HIDDEN")throw new ForbiddenException("已隐藏帖子需先由审核人处理");
      await tx.post.updateMany({where:{id:postId},data:{title,content,status:body.draft?"DRAFT":"AUDITING"}});
      if(post.status==="PUBLISHED")await tx.circle.updateMany({where:{id,postCount:{gt:0}},data:{postCount:{decrement:1}}});
      await this.finish(tx,"EDIT_OWN_CIRCLE_POST",postId);return tx.post.findFirst({where:{id:postId},select:postSelect});
    });
  }
  async reviewPost(id:string,postId:string,value:unknown){
    contentId(postId);const body=contentBody(value,["status","reason","updatedAt"]),reason=contentText(body.reason,500);
    if(!["PUBLISHED","HIDDEN","AUDITING"].includes(body.status as string)||reason.length<2||typeof body.updatedAt!=="string"||!Number.isFinite(Date.parse(body.updatedAt)))throw new BadRequestException("帖子审核内容无效");
    return this.db.$transaction(async tx=>{
      const circle=await this.circle(tx,id,true);this.moderator(circle);
      const post=await tx.post.findFirst({where:{id:postId,circleId:id},select:postSelect});if(!post||post.status==="DRAFT")throw new NotFoundException("待审核帖子不存在");
      if(post.updatedAt.getTime()!==Date.parse(body.updatedAt as string))throw new ConflictException("帖子已修改，请刷新");
      if(body.status==="PUBLISHED"){
        await this.member(tx,circle,post.userId);
        if(!await tx.user.findFirst({where:{id:post.userId,status:"ACTIVE",deletedAt:null},select:{id:true}}))throw new ForbiddenException("发帖用户已停用");
      }
      await tx.post.updateMany({where:{id:postId},data:{status:body.status as string}});
      if(post.status!=="PUBLISHED"&&body.status==="PUBLISHED")await tx.circle.updateMany({where:{id},data:{postCount:{increment:1}}});
      if(post.status==="PUBLISHED"&&body.status!=="PUBLISHED")await tx.circle.updateMany({where:{id,postCount:{gt:0}},data:{postCount:{decrement:1}}});
      await this.finish(tx,"REVIEW_OWN_CIRCLE_POST",postId,reason);return tx.post.findFirst({where:{id:postId},select:postSelect});
    });
  }
}
