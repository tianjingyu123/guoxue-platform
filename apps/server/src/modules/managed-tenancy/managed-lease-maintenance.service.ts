import { ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { managedCredential } from "./managed-credentials";
import { ManagedLeaseRuntime, verifyManagedDatabase } from "./managed-lease.runtime";
import { check,parseManagedDeployment } from "./managed-policy";

@Injectable()
export class ManagedLeaseMaintenanceService {
  constructor(private readonly control: PrismaService) {}
  /** 新库已经受控恢复、旧库已冻结后才能换绑定；不解冻旧源或重放任务。 */
  async cutover(customerId:string,payload:{expectedRevision:number;deployment:unknown;backupSha256:string;reason:string},actorId:string){
    check(payload&&Object.keys(payload).every(key=>["expectedRevision","deployment","backupSha256","reason"].includes(key))&&Number.isInteger(payload.expectedRevision)&&/^[a-f0-9]{64}$/.test(payload.backupSha256)&&typeof payload.reason==="string"&&payload.reason.trim().length>=2&&payload.reason.length<=500,"切换需要当前修订、已核对备份摘要与维护依据，不接受密码或任务指令");
    const binding=parseManagedDeployment(payload.deployment);
    const customer=await this.control.managedCustomer.findUnique({where:{id:customerId},include:{deployment:true}});
    if(!customer?.deployment||customer.mode!=="LEASE")throw new NotFoundException("独立客户原部署不存在");
    if(customer.revision!==payload.expectedRevision)throw new ConflictException("客户配置已变化");
    if(binding.databaseName===customer.deployment.databaseName||binding.databaseRole===customer.deployment.databaseRole||binding.spaceKey===customer.deployment.spaceKey||binding.credentialRef===customer.deployment.credentialRef||binding.authKeyFingerprint===customer.deployment.authKeyFingerprint)throw new ForbiddenException("切换须使用已恢复的新库、独立运行账号、空间与新认证密钥，不重新打开陈旧源库");
    const previousCredential=managedCredential(customer.deployment.credentialRef),nextCredential=managedCredential(binding.credentialRef);
    const previous=new PrismaClient({datasources:{db:{url:previousCredential.databaseUrl}}}),next=new PrismaClient({datasources:{db:{url:nextCredential.databaseUrl}}});
    try{
      await verifyManagedDatabase(this.control as unknown as PrismaClient,previous,customerId,previousCredential,{fenceState:"FROZEN"});
      await verifyManagedDatabase(this.control as unknown as PrismaClient,next,customerId,nextCredential,{binding});
      await previous.$transaction(async source=>{
        await source.$executeRaw`SELECT pg_advisory_xact_lock_shared(hashtextextended(${"managed-write-fence:"+customerId},0))`;
        const frozen=await source.$queryRaw<Array<{state:string;spaceKey:string;writerRole:string;authKeyFingerprint:string}>>`SELECT state,"spaceKey","writerRole","authKeyFingerprint" FROM "ManagedLeaseWriteFence" WHERE "customerId"=${customerId} FOR SHARE`;
        if(frozen[0]?.state!=="FROZEN"||frozen[0].spaceKey!==customer.deployment!.spaceKey||frozen[0].writerRole!==customer.deployment!.databaseRole||frozen[0].authKeyFingerprint!==customer.deployment!.authKeyFingerprint)throw new ConflictException("原写入者冻结状态或绑定已变化");
        await next.$transaction(async target=>{
          await target.$executeRaw`SELECT pg_advisory_xact_lock_shared(hashtextextended(${"managed-write-fence:"+customerId},0))`;
          const active=await target.$queryRaw<Array<{state:string;spaceKey:string;writerRole:string;authKeyFingerprint:string}>>`SELECT state,"spaceKey","writerRole","authKeyFingerprint" FROM "ManagedLeaseWriteFence" WHERE "customerId"=${customerId} FOR SHARE`;
          if(active[0]?.state!=="ACTIVE"||active[0].spaceKey!==binding.spaceKey||active[0].writerRole!==binding.databaseRole||active[0].authKeyFingerprint!==binding.authKeyFingerprint)throw new ConflictException("新写入者启用状态或绑定已变化");
          await this.control.$transaction(async tx=>{
            const current=await tx.managedCustomer.findUnique({where:{id:customerId},include:{deployment:true}});
            if(current?.revision!==payload.expectedRevision||JSON.stringify(current.deployment)!==JSON.stringify(customer.deployment))throw new ConflictException("切换期间合同或部署身份已变化");
            const changed=await tx.managedCustomer.updateMany({where:{id:customerId,revision:payload.expectedRevision},data:{revision:{increment:1}}});
            if(changed.count!==1)throw new ConflictException("客户配置已变化");
            await tx.managedDeployment.update({where:{customerId},data:{...binding,state:"READY",verifiedAt:new Date()}});
            await tx.managedAudit.create({data:{customerId,actorId,action:"CUTOVER_FROZEN_DATABASE",revision:payload.expectedRevision+1,reason:payload.reason+"；备份SHA-256="+payload.backupSha256}});
          });
        },{timeout:15000});
      },{timeout:20000});
      return {customerId,state:"READY",revision:payload.expectedRevision+1,previousWriter:"FROZEN",jobsReplayed:false};
    }catch(error){if(error instanceof ForbiddenException||error instanceof ConflictException)throw error;throw new ServiceUnavailableException("迁移切换未确认，请先核对当前部署与审计记录，不重发或解冻旧库");}
    finally{await Promise.all([previous.$disconnect(),next.$disconnect()]);}
  }
  async verify(customerId: string, payload: { expectedRevision: number; reason: string }, actorId: string) {
    check(payload && Object.keys(payload).every(key => ["expectedRevision", "reason"].includes(key)) && Number.isInteger(payload.expectedRevision) && typeof payload.reason === "string" && payload.reason.trim().length >= 2 && payload.reason.length <= 500, "请提供当前修订和维护核验依据，不接受连接密码");
    const customer = await this.control.managedCustomer.findUnique({ where: { id: customerId }, include: { deployment: true } });
    if (!customer?.deployment || customer.mode !== "LEASE") throw new NotFoundException("独立客户部署不存在");
    if (customer.revision !== payload.expectedRevision) throw new ConflictException("客户配置已变化");
    const credential = managedCredential(customer.deployment.credentialRef);
    const business = new PrismaClient({ datasources: { db: { url: credential.databaseUrl } } });
    try {
      await verifyManagedDatabase(this.control as unknown as PrismaClient, business, customerId, credential);
      await this.control.$transaction(async tx => {
        const current = await tx.managedCustomer.findUnique({ where: { id: customerId }, include: { deployment: true } });
        if (current?.revision !== payload.expectedRevision || JSON.stringify(current.deployment) !== JSON.stringify(customer.deployment)) throw new ConflictException("核验期间合同或部署身份已变化");
        await tx.managedDeployment.update({ where: { customerId }, data: { state: "READY", verifiedAt: new Date() } });
        await tx.managedAudit.create({ data: { customerId, actorId, action: "VERIFY_DATABASE_IDENTITY", reason: payload.reason, revision: current.revision } });
      });
      return { customerId, state: "READY", revision: payload.expectedRevision };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof ConflictException) throw error;
      throw new ServiceUnavailableException("客户实例连接核验失败，部署保持原状态");
    } finally { await business.$disconnect(); }
  }
  async session(clientKey: string, userId: string) {
    const registration = await this.control.appDistribution.findUnique({ where: { clientKey } });
    const application = registration ? await this.control.managedApplication.findUnique({ where: { applicationId: registration.applicationId }, include: { customer: { include: { deployment: true } } } }) : null;
    if (!registration?.enabled || !application?.enabled || application.customer.mode !== "LEASE" || !application.customer.deployment) throw new ForbiddenException("客户应用未启用");
    const credential = managedCredential(application.customer.deployment.credentialRef);
    const business = new PrismaClient({ datasources: { db: { url: credential.databaseUrl } } });
    try {
      const runtime = new ManagedLeaseRuntime(this.control as unknown as PrismaClient, business, application.customerId, credential);
      await runtime.initialize();
      return await runtime.issueSession(userId, clientKey);
    } finally { await business.$disconnect(); }
  }
}
