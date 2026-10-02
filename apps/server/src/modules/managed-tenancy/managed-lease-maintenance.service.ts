import { ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { managedCredential } from "./managed-credentials";
import { ManagedLeaseRuntime, verifyManagedDatabase } from "./managed-lease.runtime";
import { check } from "./managed-policy";

@Injectable()
export class ManagedLeaseMaintenanceService {
  constructor(private readonly control: PrismaService) {}
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
