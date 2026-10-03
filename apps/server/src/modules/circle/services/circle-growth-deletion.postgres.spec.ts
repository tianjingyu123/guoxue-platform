import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { GrowthService } from "../../growth/growth.service";
import { UserService } from "../../user/user.service";
import { AuditService } from "../../audit/audit.service";
import { AuthService } from "../../auth/auth.service";
import { PushAudienceService } from "../../user/push-audience.service";

const testUrl = process.env.ENTITLEMENT_NOTICE_TEST_DATABASE_URL;
if (testUrl) {
  const u = new URL(testUrl);
  if (u.protocol !== "postgresql:" || u.hostname !== "127.0.0.1" || u.port !== "55462"
    || u.username !== "qa_voice" || !u.pathname.startsWith("/entitlement_notice_qa_")) throw new Error("审批注销只允许本机合成库");
}
jest.setTimeout(60000);
(testUrl ? describe : describe.skip)("增长审批与账号注销成员事实真实PG", () => {
  let db: PrismaClient;
  const users: string[] = [], circles: string[] = [];
  const redis = { clearCircleMembershipShared: async () => { throw new Error("synthetic Redis unavailable"); } };
  const fixture = async (member: boolean) => {
    const owner = await db.user.create({ data: { nickname: "合成审批注销圈主" } });
    const user = await db.user.create({ data: { nickname: "合成审批注销成员", deleteRequestedAt: new Date(Date.now() - 8 * 86400000), deleteScheduledAt: new Date(Date.now() - 86400000) } });
    users.push(owner.id, user.id);
    const circle = await db.circle.create({ data: { name: "合成审批注销圈", intro: "本机验收", tags: [], ownerId: owner.id, memberCount: member ? 2 : 1 } }); circles.push(circle.id);
    await db.circleMember.create({ data: { circleId: circle.id, userId: owner.id, role: "OWNER" } });
    if (member) await db.circleMember.create({ data: { circleId: circle.id, userId: user.id } });
    return { circleId: circle.id, ownerId: owner.id, userId: user.id };
  };
  const pending = (circleId: string) => db.circleMembershipCacheInvalidation.findMany({ where: { circleId }, select: { userId: true, clearedAt: true } });
  const userService = () => new UserService(db as unknown as PrismaService, redis as unknown as RedisService, {} as AuditService, {} as AuthService, {} as PushAudienceService);
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: testUrl! } } });
    const [id] = await db.$queryRaw<Array<{ name: string; port: number; role: string }>>`SELECT current_database() AS name, inet_server_port() AS port, current_user AS role`;
    if (!id.name.startsWith("entitlement_notice_qa_") || id.port !== 55462 || id.role !== "qa_voice") throw new Error("合成库身份不符");
  });
  afterEach(async () => {
    await db.auditLog.deleteMany({ where: { userId: { in: users } } });
    await db.circleJoinRequest.deleteMany({ where: { circleId: { in: circles } } });
    await db.circleMembershipCacheInvalidation.deleteMany({ where: { circleId: { in: circles } } });
    await db.circle.deleteMany({ where: { id: { in: circles.splice(0) } } });
    await db.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  });
  afterAll(async () => { await db.$disconnect(); });
  it("审批实际新增成员同事务留下缓存待办", async () => {
    const f = await fixture(false);const req = await db.circleJoinRequest.create({ data: { circleId: f.circleId, userId: f.userId } });
    await new GrowthService(db as unknown as PrismaService).reviewJoinRequest(f.circleId, req.id, f.ownerId, "approve");
    expect((await db.circleJoinRequest.findUniqueOrThrow({ where: { id: req.id } })).status).toBe("APPROVED");
    expect((await db.circle.findUniqueOrThrow({ where: { id: f.circleId } })).memberCount).toBe(2);
    expect(await pending(f.circleId)).toEqual([{ userId: f.userId, clearedAt: null }]);
  });
  it("注销移出成员时同步扣人数及保存缓存待办，并保留圈主", async () => {
    const f = await fixture(true);await userService().executeAccountDeletion(f.userId);
    expect((await db.user.findUniqueOrThrow({ where: { id: f.userId } })).status).toBe("DISABLED");
    expect(await db.circleMember.count({ where: { circleId: f.circleId } })).toBe(1);
    expect((await db.circle.findUniqueOrThrow({ where: { id: f.circleId } })).memberCount).toBe(1);
    expect(await pending(f.circleId)).toEqual([{ userId: f.userId, clearedAt: null }]);
  });
  it("注销两个圈子并发执行再重放时每圈仅扣一次人数、留一条待办和一条审计", async () => {
    const f = await fixture(true);
    const other = await db.circle.create({ data: { name: "合成第二圈", intro: "仅隔离验收", tags: [], ownerId: f.ownerId, memberCount: 2 } });circles.push(other.id);
    await db.circleMember.createMany({ data: [{circleId:other.id,userId:f.ownerId,role:"OWNER"},{circleId:other.id,userId:f.userId}] });
    await Promise.all([userService().executeAccountDeletion(f.userId),userService().executeAccountDeletion(f.userId)]);
    await userService().executeAccountDeletion(f.userId);
    for(const circleId of [f.circleId,other.id]) {
      expect((await db.circle.findUniqueOrThrow({where:{id:circleId}})).memberCount).toBe(1);
      expect(await db.circleMember.count({where:{circleId}})).toBe(1);
      expect(await pending(circleId)).toEqual([{userId:f.userId,clearedAt:null}]);
    }
    expect(await db.auditLog.count({where:{userId:f.userId,action:"ACCOUNT_DELETED"}})).toBe(1);
  });
  it("注销遇到人数低于真实移出数时整笔回滚，不匿名化、不删成员、不留待办或审计", async () => {
    const f=await fixture(true);await db.circle.update({where:{id:f.circleId},data:{memberCount:0}});
    await expect(userService().executeAccountDeletion(f.userId)).rejects.toThrow("圈子人数不一致");
    expect((await db.user.findUniqueOrThrow({where:{id:f.userId}})).status).toBe("ACTIVE");
    expect(await db.circleMember.count({where:{circleId:f.circleId,userId:f.userId}})).toBe(1);
    expect(await pending(f.circleId)).toEqual([]);expect(await db.auditLog.count({where:{userId:f.userId}})).toBe(0);
  });
  it.each(["审批","注销"])("%s缓存待办实际INSERT失败时整笔业务回滚", async (kind) => {
    const f=await fixture(kind==="注销");
    const req=kind==="审批" ? await db.circleJoinRequest.create({data:{circleId:f.circleId,userId:f.userId}}) : null;
    await db.$executeRawUnsafe("CREATE FUNCTION synthetic_cache_insert_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic cache insert failure'; END $$");
    await db.$executeRawUnsafe('CREATE TRIGGER synthetic_cache_insert_failure BEFORE INSERT ON "CircleMembershipCacheInvalidation" FOR EACH ROW EXECUTE FUNCTION synthetic_cache_insert_failure()');
    try {
      const work=kind==="审批" ? new GrowthService(db as unknown as PrismaService).reviewJoinRequest(f.circleId,req!.id,f.ownerId,"approve") : userService().executeAccountDeletion(f.userId);
      await expect(work).rejects.toThrow();
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER synthetic_cache_insert_failure ON "CircleMembershipCacheInvalidation"');
      await db.$executeRawUnsafe('DROP FUNCTION synthetic_cache_insert_failure()');
    }
    expect((await db.circle.findUniqueOrThrow({where:{id:f.circleId}})).memberCount).toBe(kind==="审批"?1:2);
    expect(await db.circleMember.count({where:{circleId:f.circleId,userId:f.userId}})).toBe(kind==="审批"?0:1);
    expect((await db.user.findUniqueOrThrow({where:{id:f.userId}})).status).toBe("ACTIVE");
    expect(await pending(f.circleId)).toEqual([]);expect(await db.auditLog.count({where:{userId:f.userId}})).toBe(0);
    if(req){expect((await db.circleJoinRequest.findUniqueOrThrow({where:{id:req.id}})).status).toBe("PENDING");expect(await db.notification.count({where:{userId:f.userId}})).toBe(0);}
  });
  it("审批提交后共享缓存故障仍返回成功，待办留存且没有重复成员或人数", async () => {
    const f=await fixture(false);const req=await db.circleJoinRequest.create({data:{circleId:f.circleId,userId:f.userId}});
    const clear=jest.fn().mockRejectedValue(new Error("synthetic Redis failure"));
    const svc=new GrowthService(db as unknown as PrismaService,undefined,{clearCircleMembershipShared:clear} as unknown as RedisService);
    await expect(svc.reviewJoinRequest(f.circleId,req.id,f.ownerId,"approve")).resolves.toMatchObject({success:true});
    expect(clear).toHaveBeenCalledTimes(1);expect((await db.circle.findUniqueOrThrow({where:{id:f.circleId}})).memberCount).toBe(2);
    expect(await pending(f.circleId)).toEqual([{userId:f.userId,clearedAt:null}]);
  });
  it("已注销账号的旧待审申请不能重新建立成员，申请和通知均保持", async () => {
    const f=await fixture(false);const req=await db.circleJoinRequest.create({data:{circleId:f.circleId,userId:f.userId}});
    await userService().executeAccountDeletion(f.userId);
    await expect(new GrowthService(db as unknown as PrismaService).reviewJoinRequest(f.circleId,req.id,f.ownerId,"approve")).rejects.toThrow("账号已禁用");
    expect((await db.circleJoinRequest.findUniqueOrThrow({where:{id:req.id}})).status).toBe("PENDING");
    expect(await db.circleMember.count({where:{circleId:f.circleId,userId:f.userId}})).toBe(0);
    expect((await db.circle.findUniqueOrThrow({where:{id:f.circleId}})).memberCount).toBe(1);
    expect(await pending(f.circleId)).toEqual([]);expect(await db.notification.count({where:{userId:f.userId}})).toBe(0);
  });
  it("注销圈子快照之后新加入另一个圈子时整笔保留，重试再完整移出两个圈子", async () => {
    const f=await fixture(true);const other=await db.circle.create({data:{name:"合成快照后第二圈",intro:"隔离验证",tags:[],ownerId:f.ownerId,memberCount:1}});circles.push(other.id);
    await db.circleMember.create({data:{circleId:other.id,userId:f.ownerId,role:"OWNER"}});
    let changed=false;
    const wrap=(tx:Prisma.TransactionClient)=>new Proxy(tx,{get(target,key){
      const value=Reflect.get(target,key);
      if(key==="circleMember")return new Proxy(value,{get(delegate,name){
        const method=Reflect.get(delegate,name);
        if(name==="findMany")return async(...args:unknown[])=>{
          const rows=await Reflect.apply(method,delegate,args);
          if(!changed){changed=true;await db.circleMember.create({data:{circleId:other.id,userId:f.userId}});await db.circle.update({where:{id:other.id},data:{memberCount:{increment:1}}});}
          return rows;
        };
        return typeof method==="function"?method.bind(delegate):method;
      }});
      return typeof value==="function"?value.bind(target):value;
    }});
    const client=new Proxy(db,{get(target,key){if(key==="$transaction")return(work:(tx:Prisma.TransactionClient)=>Promise<unknown>)=>db.$transaction(tx=>work(wrap(tx)));const value=Reflect.get(target,key);return typeof value==="function"?value.bind(target):value;}});
    const svc=new UserService(client as unknown as PrismaService,redis as unknown as RedisService,{} as AuditService,{} as AuthService,{} as PushAudienceService);
    await expect(svc.executeAccountDeletion(f.userId)).rejects.toThrow("成员关系已变化");
    expect((await db.user.findUniqueOrThrow({where:{id:f.userId}})).status).toBe("ACTIVE");
    expect(await db.circleMember.count({where:{userId:f.userId}})).toBe(2);
    expect(await db.auditLog.count({where:{userId:f.userId}})).toBe(0);
    for(const circleId of [f.circleId,other.id])expect(await pending(circleId)).toEqual([]);
    await userService().executeAccountDeletion(f.userId);
    for(const circleId of [f.circleId,other.id]){expect((await db.circle.findUniqueOrThrow({where:{id:circleId}})).memberCount).toBe(1);expect(await pending(circleId)).toEqual([{userId:f.userId,clearedAt:null}]);}
  });
});
