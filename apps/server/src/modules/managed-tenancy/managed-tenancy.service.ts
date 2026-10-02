import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { check, digest, operatingStatus, parseManagedInput, parseManagedGrant, parseTerm } from "./managed-policy";

const include = { applications: true, deployment: true, grant: true } as const;
@Injectable()
export class ManagedTenancyService {
  constructor(private readonly prisma: PrismaService) {}
  private present<T extends { remindAt: Date; endAt: Date; exportUntil: Date }>(row: T) {
    return { ...row, operatingStatus: operatingStatus(row), realPaymentEnabled: false };
  }
  async create(payload: unknown, actorId: string) {
    const input = parseManagedInput(payload);
    const requestDigest = digest(input);
    const existing = await this.prisma.managedCustomer.findUnique({ where: { requestKey: input.requestKey }, include });
    if (existing) {
      if (existing.requestDigest !== requestDigest) throw new ConflictException("开通请求已存在且配置不同");
      return this.present(existing);
    }
    try {
      const customer = await this.prisma.$transaction(async tx => {
        if (input.mode === "BRAND") {
          const platform = await tx.brandConfig.findUnique({ where: { id: "default" }, select: { companyName: true } });
          check(platform?.companyName && platform.companyName === input.tradingSubject, "交易主体必须等于已配置的平台协议主体");
          for (const app of input.applications) {
            const station = await tx.station.findUnique({ where: { id: app.stationId! }, select: { status: true } });
            check(station?.status === "ACTIVE", "品牌应用须绑定有效的既有分站");
          }
        }
        return tx.managedCustomer.create({ data: {
          requestKey: input.requestKey, requestDigest, name: input.name, mode: input.mode,
          tradingSubject: input.tradingSubject, maintenancePrice: input.maintenancePrice,
          remindAt: new Date(input.term.remindAt), endAt: new Date(input.term.endAt), exportUntil: new Date(input.term.exportUntil), downloadTtlSeconds: input.term.downloadTtlSeconds,
          createdBy: actorId,
          applications: { create: input.applications.map(app => ({ ...app, brand: app.brand as Prisma.InputJsonValue })) },
          ...(input.deployment ? { deployment: { create: input.deployment } } : {}),
          grant: { create: { modules: input.modules, resources: input.resources as Prisma.InputJsonValue, circleLimit: input.circleLimit } },
          audit: { create: { actorId, action: "CONFIGURE", reason: input.reason, revision: 1 } },
        }, include });
      });
      return this.present(customer);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const winner = await this.prisma.managedCustomer.findUnique({ where: { requestKey: input.requestKey }, include });
        if (winner?.requestDigest === requestDigest) return this.present(winner);
        throw new ConflictException("请求、应用、数据空间、数据库账号或认证密钥已被占用");
      }
      throw error;
    }
  }
  async list() {
    const rows = await this.prisma.managedCustomer.findMany({ include, orderBy: { createdAt: "desc" }, take: 200 });
    return rows.map(row => this.present(row));
  }
  async detail(id: string) {
    const row = await this.prisma.managedCustomer.findUnique({ where: { id }, include: { ...include, audit: { orderBy: { createdAt: "desc" }, take: 100 }, memberships: true } });
    if (!row) throw new NotFoundException("托管客户不存在");
    return this.present(row);
  }
  async renew(id: string, payload: { term: unknown; expectedRevision: number; reason: string }, actorId: string) {
    check(payload && Object.keys(payload).every(key => ["term", "expectedRevision", "reason"].includes(key)), "续费包含未知字段");
    const term = parseTerm(payload.term);
    check(Number.isInteger(payload.expectedRevision) && typeof payload.reason === "string" && payload.reason.trim().length >= 2 && payload.reason.length <= 500, "必须提供当前修订和续费依据");
    await this.prisma.$transaction(async tx => {
      const result = await tx.managedCustomer.updateMany({ where: { id, revision: payload.expectedRevision }, data: { remindAt: new Date(term.remindAt), endAt: new Date(term.endAt), exportUntil: new Date(term.exportUntil), downloadTtlSeconds: term.downloadTtlSeconds, revision: { increment: 1 } } });
      if (result.count !== 1) throw new ConflictException("客户配置已变化，请刷新重试");
      await tx.managedAudit.create({ data: { customerId: id, actorId, action: "RENEW_WITHOUT_JOB_REPLAY", reason: payload.reason, revision: payload.expectedRevision + 1 } });
    });
    // 只更新期限和认证修订；不调用支付或恢复旧扣款任务。
    return this.detail(id);
  }
  async membership(id: string, payload: { userId: string; role: string; enabled: boolean; reason: string }, actorId: string) {
    check(payload && Object.keys(payload).every(key => ["userId", "role", "enabled", "reason"].includes(key)), "成员配置包含未知字段");
    check(typeof payload.userId === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(payload.userId), "成员用户标识无效");
    check(["CUSTOMER_ADMIN", "CUSTOMER_SUPPORT", "USER"].includes(payload.role) && typeof payload.enabled === "boolean" && typeof payload.reason === "string" && payload.reason.trim().length >= 2 && payload.reason.length <= 500, "客户身份不能授平台角色");
    return this.prisma.$transaction(async tx => {
      const customer = await tx.managedCustomer.findUnique({ where: { id } });
      if (!customer || customer.mode !== "LEASE") throw new ForbiddenException("品牌站使用既有站长/运营商身份");
      const user = await tx.user.findUnique({ where: { id: payload.userId }, select: { id: true, status: true } });
      check(user?.status === "ACTIVE", "必须绑定本数据库有效用户");
      const member = await tx.managedMembership.upsert({ where: { customerId_userId: { customerId: id, userId: user.id } }, create: { customerId: id, userId: user.id, role: payload.role, enabled: payload.enabled }, update: { role: payload.role, enabled: payload.enabled, revision: { increment: 1 } } });
      await tx.managedAudit.create({ data: { customerId: id, actorId, action: "MEMBERSHIP_CHANGE", reason: payload.reason, revision: member.revision } });
      return member;
    });
  }
  async updateGrant(id: string, payload: { modules: string[]; resources: unknown; circleLimit: number; expectedRevision: number; reason: string }, actorId: string) {
    check(payload && Object.keys(payload).every(key => ["modules", "resources", "circleLimit", "expectedRevision", "reason"].includes(key)) && Number.isInteger(payload.expectedRevision) && typeof payload.reason === "string" && payload.reason.trim().length >= 2 && payload.reason.length <= 500, "授权变更须提供当前修订和依据");
    await this.prisma.$transaction(async tx => {
      const customer = await tx.managedCustomer.findUnique({ where: { id } });
      if (!customer) throw new NotFoundException("客户不存在");
      const grant = parseManagedGrant({ modules: payload.modules, resources: payload.resources, circleLimit: payload.circleLimit }, customer.mode as "LEASE" | "BRAND");
      const changed = await tx.managedCustomer.updateMany({ where: { id, revision: payload.expectedRevision }, data: { revision: { increment: 1 } } });
      if (changed.count !== 1) throw new ConflictException("客户配置已变化，请刷新重试");
      await tx.managedGrant.update({ where: { customerId: id }, data: { modules: grant.modules, resources: grant.resources as Prisma.InputJsonValue, circleLimit: grant.circleLimit, revision: { increment: 1 } } });
      await tx.managedAudit.create({ data: { customerId: id, actorId, action: "CHANGE_GRANT", reason: payload.reason, revision: payload.expectedRevision + 1 } });
    });
    return this.detail(id);
  }
  async enableApplication(id: string, actorId: string, reason: string) {
    check(typeof reason === "string" && reason.trim().length >= 2 && reason.length <= 500, "必须提供启用依据");
    return this.prisma.$transaction(async tx => {
      const app = await tx.managedApplication.findUnique({ where: { id }, include: { customer: { include: { deployment: true } } } });
      if (!app) throw new NotFoundException("应用不存在");
      if (app.customer.mode === "BRAND") {
        const platform = await tx.brandConfig.findUnique({ where: { id: "default" }, select: { companyName: true } });
        const station = app.stationId ? await tx.station.findUnique({ where: { id: app.stationId }, select: { status: true } }) : null;
        check(platform?.companyName === app.customer.tradingSubject && station?.status === "ACTIVE", "平台主体或分站状态已变化，请重新核验");
      }
      const registrations = await tx.appDistribution.findMany({ where: { applicationId: app.applicationId, enabled: true }, select: { platform: true } });
      check(app.allowedPlatforms.every(platform => registrations.some(r => r.platform === platform)), "应用渠道尚未完成公共登记");
      if (app.customer.mode === "LEASE" && app.customer.deployment?.state !== "READY") throw new ForbiddenException("客户实例尚未验证数据库、账号和认证身份");
      const result = await tx.managedApplication.update({ where: { id }, data: { enabled: true } });
      await tx.managedAudit.create({ data: { customerId: app.customerId, actorId, action: "ENABLE_APPLICATION", reason, revision: app.customer.revision } });
      return result;
    });
  }
  async disableApplication(id: string, actorId: string, reason: string) {
    check(typeof reason === "string" && reason.trim().length >= 2 && reason.length <= 500, "必须提供暂停依据");
    return this.prisma.$transaction(async tx => {
      const app = await tx.managedApplication.findUnique({ where: { id }, include: { customer: true } });
      if (!app) throw new NotFoundException("应用不存在");
      await tx.managedApplication.update({ where: { id }, data: { enabled: false } });
      await tx.managedAudit.create({ data: { customerId: app.customerId, actorId, action: "DISABLE_APPLICATION", reason, revision: app.customer.revision } });
      return { applicationId: app.applicationId, enabled: false };
    });
  }
  async publicApplication(clientKey: string) {
    check(typeof clientKey === "string" && clientKey.length > 0 && clientKey.length <= 80, "应用选择器无效");
    const registration = await this.prisma.appDistribution.findUnique({ where: { clientKey } });
    if (!registration?.enabled) throw new NotFoundException("应用未登记");
    const app = await this.prisma.managedApplication.findUnique({ where: { applicationId: registration.applicationId }, include: { customer: { include: { deployment: true } } } });
    if (!app?.enabled || !app.allowedPlatforms.includes(registration.platform)) throw new NotFoundException("托管应用未启用");
    if (app.customer.mode === "LEASE" && app.customer.deployment?.state !== "READY") throw new ForbiddenException("客户部署未通过核验或已暂停");
    if (app.customer.mode === "BRAND") {
      const platform = await this.prisma.brandConfig.findUnique({ where: { id: "default" }, select: { companyName: true } });
      const station = app.stationId ? await this.prisma.station.findUnique({ where: { id: app.stationId }, select: { status: true } }) : null;
      if (platform?.companyName !== app.customer.tradingSubject || station?.status !== "ACTIVE") throw new ForbiddenException("平台主体或分站状态已变化");
    }
    return { applicationId: app.applicationId, platform: registration.platform, channelId: registration.channelId, mode: app.customer.mode, applicationSubject: app.applicationSubject, tradingSubject: app.customer.tradingSubject, brand: app.brand, templateId: app.templateId, operatingStatus: operatingStatus(app.customer), revision: app.customer.revision };
  }
}
