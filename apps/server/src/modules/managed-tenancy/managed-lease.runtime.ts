import { ForbiddenException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/client";
import { createHash, randomUUID, randomBytes, timingSafeEqual } from "crypto";
import * as jwt from "jsonwebtoken";
import { check, operatingStatus } from "./managed-policy";
import { ManagedCredential } from "./managed-credentials";
import { FeatureFlagService } from "../feature-flag/feature-flag.service";
import { DistributionService } from "../system/distribution.service";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { versionScope } from "../system/distribution.util";
import { managedPresentation } from "./managed-presentation";
import { managedLeasePermissions } from "./managed-lease-permissions";
import { ManagedLeaseIdentityService, LocalPrincipal } from "./managed-lease-identity";
import { createPagedLeaseExport } from "./managed-lease-export";
import { ManagedLeaseLearningService } from "./managed-lease-learning";

export type ManagedLeaseContext = Readonly<{ userId: string; role: string; applicationId: string; clientKey: string; revision: number; memberRevision: number; identityProvider: "PLATFORM" | "LOCAL"; credentialRevision?: number }>;
type Context = ManagedLeaseContext;
const moduleFor = { product: "shop", course: "course", circle: "circle", agent: "agent" } as const;
export type ManagedResourceKind = keyof typeof moduleFor;

/** 维护验证与启动均先核对实际连接身份，不能把连接成功当作身份正确。 */
export async function verifyManagedDatabase(control: PrismaClient, business: PrismaClient, customerId: string, credentials: ManagedCredential) {
  const customer = await control.managedCustomer.findUnique({ where: { id: customerId }, include: { deployment: true, grant: true } });
  const deployment = customer?.deployment;
  if (!customer || customer.mode !== "LEASE" || !deployment || !customer.grant) throw new ForbiddenException("独立客户部署未配置");
  const url = new URL(credentials.databaseUrl);
  if (decodeURIComponent(url.pathname.slice(1)) !== deployment.databaseName || decodeURIComponent(url.username) !== deployment.databaseRole || url.hostname !== credentials.host || Number(url.port || 5432) !== credentials.port || createHash("sha256").update(credentials.authKey).digest("hex") !== deployment.authKeyFingerprint) throw new ForbiddenException("固定实例配置与客户部署身份不一致");
  const rows = await business.$queryRaw<Array<{ db: string; actor: string; port: number; elevated: boolean; can_create: boolean }>>`SELECT current_database() db, current_user actor, inet_server_port() port,
    EXISTS(SELECT 1 FROM pg_roles r WHERE pg_has_role(current_user, r.oid, 'MEMBER') AND (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolbypassrls)) elevated,
    has_schema_privilege(current_user, 'public', 'CREATE') can_create`;
  const identity = rows[0];
  if (!identity || identity.db !== deployment.databaseName || identity.actor !== deployment.databaseRole || identity.port !== credentials.port || identity.elevated || identity.can_create) throw new ForbiddenException("客户数据库身份或最低权限校验失败");
  const permission = await business.$queryRaw<Array<{ excessive: boolean }>>`WITH allowed AS (SELECT ${JSON.stringify(managedLeasePermissions)}::jsonb rules)
    SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND p.prosecdef AND has_schema_privilege(current_user,n.oid,'USAGE') AND has_function_privilege(current_user,p.oid,'EXECUTE'))
    OR EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f') AND has_table_privilege(current_user,c.oid,'DELETE,TRUNCATE,REFERENCES,TRIGGER'))
    OR EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      JOIN pg_attribute a ON a.attrelid=c.oid CROSS JOIN allowed CROSS JOIN (VALUES ('select'),('insert'),('update')) operation(name)
      WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f') AND a.attnum>0 AND NOT a.attisdropped
        AND has_column_privilege(current_user,c.oid,a.attnum,upper(operation.name))
        AND NOT(coalesce(rules -> c.relname -> operation.name,'[]'::jsonb) ? '*' OR coalesce(rules -> c.relname -> operation.name,'[]'::jsonb) ? a.attname)) excessive`;
  if (permission[0]?.excessive !== false) throw new ForbiddenException("客户数据库账号超出已挂载业务所需权限");
  return customer;
}

/** 独立入口只挂载本模块的少量路由，不加载平台 AppModule、原始SQL、运维或支付控制器。 */
export class ManagedLeaseRuntime {
  private ready = false;
  private identity: { databaseName: string; databaseRole: string; spaceKey: string; credentialRef: string };
  private readonly contexts = new WeakMap<object, string>();
  private readonly identities: ManagedLeaseIdentityService;
  constructor(private readonly control: PrismaClient, private readonly business: PrismaClient, readonly customerId: string, private readonly credentials: ManagedCredential) { this.identities = new ManagedLeaseIdentityService(business, customerId); }
  async initialize() {
    const customer = await verifyManagedDatabase(this.control, this.business, this.customerId, this.credentials);
    if (customer.deployment?.state !== "READY" || !customer.deployment.verifiedAt) throw new ForbiddenException("部署尚未通过维护核验");
    this.identity = { databaseName: customer.deployment.databaseName, databaseRole: customer.deployment.databaseRole, spaceKey: customer.deployment.spaceKey, credentialRef: customer.deployment.credentialRef };
    this.ready = true;
  }
  private async current() {
    if (!this.ready) throw new ForbiddenException("实例未通过启动检查");
    const row = await this.control.managedCustomer.findUnique({ where: { id: this.customerId }, include: { deployment: true, grant: true } });
    if (!row?.grant || row.mode !== "LEASE" || row.deployment?.state !== "READY" || row.deployment.authKeyFingerprint !== createHash("sha256").update(this.credentials.authKey).digest("hex")) throw new ForbiddenException("实例部署已停用或认证密钥已变更");
    if (Object.entries(this.identity).some(([key, value]) => row.deployment![key] !== value)) throw new ForbiddenException("固定实例部署身份已变化，请重新核验启动");
    return row;
  }
  private async application(clientKey: string) {
    check(typeof clientKey === "string" && clientKey.length > 0 && clientKey.length <= 80, "应用选择器无效");
    const registration = await new DistributionService(this.control as PrismaService).resolve(clientKey);
    const application = registration ? await this.control.managedApplication.findUnique({ where: { applicationId: registration.applicationId } }) : null;
    if (!registration || !application?.enabled || application.customerId !== this.customerId || !application.allowedPlatforms.includes(registration.platform)) throw new UnauthorizedException("应用不属于当前实例或已停用");
    return { registration, application };
  }
  /** 仅由平台已验证的登录身份调用；不暴露无身份签发、代他人签发或平台角色继承。 */
  async issueSession(userId: string, clientKey: string) {
    const customer = await this.current();
    const { application } = await this.application(clientKey);
    const member = await this.control.managedMembership.findUnique({ where: { customerId_userId: { customerId: this.customerId, userId } } });
    const user = await this.business.user.findUnique({ where: { id: userId }, select: { status: true, deletedAt: true } });
    const platformUser = await this.control.user.findUnique({ where: { id: userId }, select: { status: true, deletedAt: true } });
    if (!member?.enabled || member.identityProvider !== "PLATFORM" || user?.status !== "ACTIVE" || user.deletedAt || platformUser?.status !== "ACTIVE" || platformUser.deletedAt) throw new UnauthorizedException("当前用户未获得此客户授权");
    return { accessToken: jwt.sign({ customerId: this.customerId, clientKey, revision: customer.revision, memberRevision: member.revision, identityProvider: "PLATFORM" }, this.credentials.authKey, { algorithm: "HS256", subject: userId, issuer: `managed:${this.customerId}:${customer.deployment!.spaceKey}`, audience: application.applicationId, expiresIn: "15m", jwtid: randomUUID() }), expiresIn: 900 };
  }
  private async localSession(principal: LocalPrincipal, clientKey: string) {
    const customer = await this.current();
    const { application } = await this.application(clientKey);
    await this.identities.principal(principal.userId, principal.revision);
    const member = await this.control.managedMembership.findUnique({ where: { customerId_userId: { customerId: this.customerId, userId: principal.userId } } });
    if (member && (!member.enabled || member.identityProvider !== "LOCAL")) throw new UnauthorizedException("客户授权已撤销或身份来源不一致");
    return { accessToken: jwt.sign({ customerId: this.customerId, clientKey, revision: customer.revision, memberRevision: member?.revision || 0, identityProvider: "LOCAL", credentialRevision: principal.revision }, this.credentials.authKey, { algorithm: "HS256", subject: principal.userId, issuer: `managed:${this.customerId}:${customer.deployment!.spaceKey}`, audience: application.applicationId, expiresIn: "15m", jwtid: randomUUID() }), expiresIn: 900, userId: principal.userId, role: member?.role || "USER" };
  }
  async registerLocal(clientKey: string, value: unknown, source: string) {
    const customer = await this.current();
    const { application } = await this.application(clientKey);
    if (Date.now() >= customer.endAt.getTime()) throw new ForbiddenException("合同已到期，暂停新增注册");
    const principal = await this.identities.register(value, clientKey, source);
    const session = await this.localSession(principal, clientKey);
    return { ...session, ...await this.identities.createRefresh(principal, application.applicationId, clientKey) };
  }
  async loginLocal(clientKey: string, value: unknown, source: string) {
    await this.current(); const { application } = await this.application(clientKey);
    const principal = await this.identities.login(value, clientKey, source);
    const session = await this.localSession(principal, clientKey);
    return { ...session, ...await this.identities.createRefresh(principal, application.applicationId, clientKey) };
  }
  async refreshLocal(clientKey: string, value: unknown, source: string) {
    await this.current(); const { application } = await this.application(clientKey);
    const next = await this.identities.refresh(value, application.applicationId, clientKey, source);
    return { ...await this.localSession(next.principal, clientKey), refreshToken: next.refreshToken, refreshExpiresAt: next.refreshExpiresAt };
  }
  async changeLocalPassword(context: Context, value: unknown, source: string) {
    await this.authorize(context, undefined, false);
    if (context.identityProvider !== "LOCAL" || !context.credentialRevision) throw new ForbiddenException("当前会话不是客户本地账号");
    await this.identities.throttle(context.clientKey, source, "password", context.userId);
    return this.identities.invalidate(context.userId, context.credentialRevision, value);
  }
  async logoutLocal(context: Context, value: unknown) {
    check(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0, "退出不接受指定用户或数据空间");
    await this.authorize(context, undefined, false);
    if (context.identityProvider !== "LOCAL" || !context.credentialRevision) throw new ForbiddenException("当前会话不是客户本地账号");
    return this.identities.invalidate(context.userId, context.credentialRevision);
  }
  async authenticate(token: string, clientKey: string): Promise<Context> {
    const customer = await this.current();
    const { application } = await this.application(clientKey);
    let claims: jwt.JwtPayload;
    try {
      const result = jwt.verify(token, this.credentials.authKey, { algorithms: ["HS256"], issuer: `managed:${this.customerId}:${customer.deployment!.spaceKey}`, audience: application.applicationId });
      if (typeof result === "string") throw new Error();
      claims = result;
    } catch { throw new UnauthorizedException("客户会话无效或已过期"); }
    if (typeof claims.sub !== "string" || !claims.sub || claims.customerId !== this.customerId || claims.clientKey !== clientKey || claims.revision !== customer.revision) throw new UnauthorizedException("客户身份或合同修订已变化");
    const member = await this.control.managedMembership.findUnique({ where: { customerId_userId: { customerId: this.customerId, userId: claims.sub } } });
    const user = await this.business.user.findUnique({ where: { id: claims.sub }, select: { status: true, deletedAt: true } });
    const provider = claims.identityProvider || "PLATFORM";
    let role: string, memberRevision: number;
    if (provider === "LOCAL") {
      if (!Number.isInteger(claims.credentialRevision) || claims.credentialRevision < 1) throw new UnauthorizedException("客户凭据修订无效");
      await this.identities.principal(claims.sub, claims.credentialRevision);
      if (member && (!member.enabled || member.identityProvider !== "LOCAL")) throw new UnauthorizedException("客户成员授权已撤销");
      role = member?.role || "USER"; memberRevision = member?.revision || 0;
      if (memberRevision !== claims.memberRevision) throw new UnauthorizedException("客户成员修订已变化");
    } else if (provider === "PLATFORM") {
      const platformUser = await this.control.user.findUnique({ where: { id: claims.sub }, select: { status: true, deletedAt: true } });
      if (!member?.enabled || member.identityProvider !== "PLATFORM" || member.revision !== claims.memberRevision || user?.status !== "ACTIVE" || user.deletedAt || platformUser?.status !== "ACTIVE" || platformUser.deletedAt) throw new UnauthorizedException("成员身份已撤销");
      role = member.role; memberRevision = member.revision;
    } else throw new UnauthorizedException("身份来源无效");
    const context = Object.freeze({ userId: claims.sub, role, applicationId: application.applicationId, clientKey, revision: customer.revision, memberRevision, identityProvider: provider as "LOCAL" | "PLATFORM", ...(provider === "LOCAL" ? { credentialRevision: claims.credentialRevision as number } : {}) });
    this.contexts.set(context, token); return context;
  }
  private async authorize(context: Context, module?: string, operating = true) {
    if (!context || !this.contexts.has(context)) throw new UnauthorizedException("业务上下文不是本实例签发");
    // 每次操作重新核对，不把长时间持有的上下文当作持续授权。
    await this.authenticate(this.contexts.get(context)!, context.clientKey);
    const customer = await this.current();
    if (operating && Date.now() >= customer.endAt.getTime()) throw new ForbiddenException("合同已到期，仅保留历史订单、售后与授权导出");
    if (module && !customer.grant!.modules.includes(module)) throw new ForbiddenException("合同未授权该模块");
    if (operating && module) {
      const { registration } = await this.application(context.clientKey);
      const flags = new FeatureFlagService(this.control as PrismaService, {} as RedisService);
      const operation = { shop: "shop_checkout", course: "client_course_purchase", circle: "client_circle_join", agent: "client_agent_purchase" }[module];
      if (!operation || await flags.getConfiguredOperationState(operation, context.userId, versionScope(registration)) !== "OPEN") throw new ForbiddenException("平台运营开关已限制此模块");
    }
    return customer;
  }
  async context(context: Context) {
    const customer = await this.authorize(context, undefined, false);
    const { application } = await this.application(context.clientKey);
    return { customerId: this.customerId, applicationId: context.applicationId, userId: context.userId, identityProvider: context.identityProvider, role: context.role, applicationSubject: application.applicationSubject, tradingSubject: customer.tradingSubject, brand: application.brand, templateId: application.templateId, operatingStatus: operatingStatus(customer), modules: customer.grant!.modules };
  }
  async presentation(context: Context, build: string, capabilities: string, resource: string) {
    const customer = await this.authorize(context, undefined, false);
    const { application, registration } = await this.application(context.clientKey);
    return managedPresentation(this.control as PrismaService, versionScope(registration), context.userId, customer.grant!, application.templateId, Date.now() < customer.endAt.getTime(), build, capabilities, resource);
  }
  async resources(context: Context, kind: ManagedResourceKind, query = "") {
    check(Object.hasOwn(moduleFor, kind) && typeof query === "string" && query.length <= 120, "资源类型或搜索无效");
    const customer = await this.authorize(context, moduleFor[kind]);
    const ids = ((customer.grant!.resources as Record<string, string[]>)[kind] || []);
    const title = query ? { contains: query, mode: "insensitive" as const } : undefined;
    if (kind === "product") return this.business.product.findMany({ where: { id: { in: ids }, deletedAt: null, status: "ON_SALE", title }, select: { id: true, title: true, intro: true, price: true }, take: 200 });
    if (kind === "course") return this.business.course.findMany({ where: { id: { in: ids }, deletedAt: null, auditStatus: "APPROVED", title }, select: { id: true, title: true, intro: true, price: true }, take: 200 });
    if (kind === "agent") return this.business.voiceAgentProfile.findMany({ where: { id: { in: ids }, status: "APPROVED", activeVersion: { not: null }, name: title }, select: { id: true, name: true, ownerType: true, ownerId: true, activeVersion: true }, take: 200 });
    return this.business.circle.findMany({ where: { id: { in: ids }, deletedAt: null, name: title }, select: { id: true, name: true, intro: true, status: true }, take: 200 });
  }
  private async learningScope(context: Context) {
    const customer = await this.authorize(context, "course");
    return (customer.grant!.resources as Record<string, string[]>).course || [];
  }
  async courseChapters(context: Context, courseId: string) {
    return new ManagedLeaseLearningService(this.business).chapters(context.userId, courseId, await this.learningScope(context));
  }
  async courseChapter(context: Context, courseId: string, chapterId: string) {
    return new ManagedLeaseLearningService(this.business).chapter(context.userId, courseId, chapterId, await this.learningScope(context));
  }
  async courseProgress(context: Context, courseId: string) {
    return new ManagedLeaseLearningService(this.business).progress(context.userId, courseId, await this.learningScope(context));
  }
  async updateCourseProgress(context: Context, courseId: string, chapterId: string, body: unknown) {
    const allowed = await this.learningScope(context);
    return new ManagedLeaseLearningService(this.business).updateProgress(context.userId, courseId, chapterId, allowed, body, () => this.learningScope(context));
  }
  async updateProducts(context: Context, body: unknown) {
    check(Array.isArray(body) && body.length > 0 && body.length <= 100, "商品更新需为1至100条");
    const customer = await this.authorize(context, "shop");
    if (context.role !== "CUSTOMER_ADMIN") throw new ForbiddenException("仅客户管理员可修改商品");
    const ids = (customer.grant!.resources as Record<string, string[]>).product || [];
    const entries = body.map(item => {
      check(item && Object.keys(item).every(key => ["id", "title"].includes(key)) && typeof item.id === "string" && ids.includes(item.id) && typeof item.title === "string" && item.title.trim().length > 0 && item.title.length <= 120 && !/[<>]/.test(item.title), "商品未授权或更新字段无效");
      return { id: item.id as string, title: item.title.trim() as string };
    });
    return this.business.$transaction(async tx => {
      for (const entry of entries) {
        const changed = await tx.product.updateMany({ where: { id: entry.id, deletedAt: null }, data: { title: entry.title } });
        if (changed.count !== 1) throw new NotFoundException("授权商品不存在");
      }
      await this.authorize(context, "shop");
      return { updated: entries.length };
    });
  }
  async createCircle(context: Context, body: { name: string; intro: string }) {
    check(body && Object.keys(body).every(key => ["name", "intro"].includes(key)) && typeof body.name === "string" && body.name.trim().length > 0 && body.name.length <= 120 && typeof body.intro === "string" && body.intro.length <= 1000 && !/[<>]/.test(body.name + body.intro), "圈子配置无效");
    if (context.role !== "CUSTOMER_ADMIN") throw new ForbiddenException("仅客户管理员可创建圈子");
    await this.authorize(context, "circle");
    return this.business.$transaction(async tx => {
      // 数据库事务锁覆盖同客户多个进程；不依赖进程内计数器。
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`managed-circle:${this.customerId}`}))`;
      const customer = await this.authorize(context, "circle");
      const count = await tx.circle.count({ where: { deletedAt: null } });
      if (count >= customer.grant!.circleLimit) throw new ForbiddenException("圈子数量已达到合同上限");
      const circle = await tx.circle.create({ data: { name: body.name.trim(), intro: body.intro, tags: [], ownerId: context.userId }, select: { id: true, name: true, status: true } });
      await this.authorize(context, "circle");
      return { id: circle.id, name: circle.name, status: circle.status };
    }, { timeout: 15000, maxWait: 15000 });
  }
  async order(context: Context, id: string) {
    await this.authorize(context, undefined, false);
    check(typeof id === "string" && id.length <= 80, "订单标识无效");
    const row = await this.business.order.findFirst({ where: { id, userId: context.userId }, select: { id: true, type: true, targetId: true, quantity: true, amount: true, status: true, paidAt: true, createdAt: true } });
    if (!row) throw new NotFoundException("订单不存在或无权限");
    return row;
  }
  async knowledge(context: Context, agentId: string, query: string) {
    const agents = await this.resources(context, "agent") as Array<{ id: string; ownerType: string; ownerId: string }>;
    const agent = agents.find(row => row.id === agentId);
    check(typeof query === "string" && query.trim().length > 0 && query.length <= 200, "检索内容无效");
    if (!agent || agent.ownerType !== "circle") throw new ForbiddenException("智能体知识域未授权");
    const customer = await this.authorize(context, "agent");
    if (!(customer.grant!.resources as Record<string, string[]>).circle.includes(agent.ownerId)) throw new ForbiddenException("智能体所属圈子未授权");
    // 只读当前独立数据库与指定圈子，禁止 global 兜底、外部库或跨客户向量搜索。
    return this.business.circleKnowledge.findMany({ where: { circleId: agent.ownerId, scope: "circle", status: "active", content: { contains: query, mode: "insensitive" } }, select: { id: true, content: true, sourceType: true }, take: 20 });
  }
  async aftercare(context: Context, body: { orderId: string; requestKey: string; reason: string }) {
    await this.authorize(context, undefined, false);
    check(body && Object.keys(body).every(key => ["orderId", "requestKey", "reason"].includes(key)) && typeof body.orderId === "string" && typeof body.requestKey === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(body.requestKey) && typeof body.reason === "string" && body.reason.trim().length >= 2 && body.reason.length <= 500, "售后申请内容无效");
    const order = await this.order(context, body.orderId);
    if (!["PAID", "SHIPPED", "COMPLETED", "REFUNDED"].includes(order.status)) throw new ForbiddenException("此订单没有可受理的已支付历史");
    return this.business.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`managed-aftercare:${context.userId}:${body.requestKey}`}))`;
      const existing = await tx.managedLeaseAftercare.findUnique({ where: { userId_requestKey: { userId: context.userId, requestKey: body.requestKey } } });
      if (existing) {
        check(existing.customerId === this.customerId && existing.orderId === body.orderId && existing.reason === body.reason.trim(), "售后重试键已对应其他内容");
        return { id: existing.id, status: existing.status };
      }
      const row = await tx.managedLeaseAftercare.create({ data: { customerId: this.customerId, userId: context.userId, orderId: body.orderId, requestKey: body.requestKey, reason: body.reason.trim() } });
      await tx.managedLeaseAudit.create({ data: { customerId: this.customerId, userId: context.userId, action: "REQUEST_AFTERCARE", entityId: row.id } });
      await this.authorize(context, undefined, false);
      return { id: row.id, status: row.status };
    });
  }
  async exportData(context: Context) {
    const customer = await this.authorize(context, undefined, false);
    if (context.role !== "CUSTOMER_ADMIN" || Date.now() >= customer.exportUntil.getTime()) throw new ForbiddenException("导出未获授权或合同导出期限已结束");
    const downloadToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Math.min(Date.now() + customer.downloadTtlSeconds * 1000, customer.exportUntil.getTime()));
    return this.business.$transaction(async tx => {
      const collections = {
        users: await tx.user.findMany({ select: { id: true, nickname: true, phone: true }, take: 5001 }),
        products: await tx.product.findMany({ select: { id: true, title: true, intro: true, price: true, stock: true, status: true }, take: 5001 }),
        courses: await tx.course.findMany({ select: { id: true, title: true, intro: true, price: true, auditStatus: true }, take: 5001 }),
        circles: await tx.circle.findMany({ select: { id: true, name: true, intro: true, ownerId: true, status: true }, take: 5001 }),
        orders: await tx.order.findMany({ select: { id: true, userId: true, type: true, targetId: true, quantity: true, amount: true, status: true, paidAt: true, createdAt: true }, take: 5001 }),
        aftercare: await tx.managedLeaseAftercare.findMany({ where: { customerId: this.customerId }, select: { id: true, userId: true, orderId: true, reason: true, status: true, createdAt: true }, take: 5001 }),
      };
      check(Object.values(collections).every(rows => rows.length <= 5000), "数据超过同步导出上限，需要维护人员使用受控分页导出，不能静默截断");
      const manifest = JSON.parse(JSON.stringify({ version: 1, customerId: this.customerId, applicationId: context.applicationId, revision: customer.revision, createdAt: new Date(), ...collections, users: collections.users.map(user => ({ ...user, phone: user.phone ? "***" + user.phone.slice(-4) : null })) })) as Prisma.InputJsonValue;
      const row = await tx.managedLeaseExport.create({ data: { customerId: this.customerId, userId: context.userId, tokenHash: createHash("sha256").update(downloadToken).digest("hex"), expiresAt, manifest } });
      await tx.managedLeaseAudit.create({ data: { customerId: this.customerId, userId: context.userId, action: "REQUEST_EXPORT", entityId: row.id } });
      await this.authorize(context, undefined, false);
      return { id: row.id, expiresAt: row.expiresAt, downloadToken };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 15000 });
  }
  async exportPaged(context: Context) {
    const customer = await this.authorize(context, undefined, false);
    if (context.role !== "CUSTOMER_ADMIN" || Date.now() >= customer.exportUntil.getTime()) throw new ForbiddenException("导出未获授权或合同导出期限已结束");
    const downloadToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Math.min(Date.now() + customer.downloadTtlSeconds * 1000, customer.exportUntil.getTime()));
    const exported = await createPagedLeaseExport(this.business, { customerId: this.customerId, applicationId: context.applicationId, userId: context.userId, revision: customer.revision, tokenHash: createHash("sha256").update(downloadToken).digest("hex"), expiresAt }, async () => {
      const latest = await this.authorize(context, undefined, false);
      if (Date.now() >= latest.exportUntil.getTime() || Date.now() >= expiresAt.getTime()) throw new ForbiddenException("快照建立期间导出授权已结束");
    });
    return { ...exported, downloadToken };
  }
  async downloadExportPage(context: Context, id: string, collection: string, pageValue: string, downloadToken: string) {
    const customer = await this.authorize(context, undefined, false);
    if (context.role !== "CUSTOMER_ADMIN" || Date.now() >= customer.exportUntil.getTime()) throw new ForbiddenException("导出授权已结束");
    check(typeof pageValue === "string" && /^(0|[1-9][0-9]{0,3})$/.test(pageValue) && ["users", "products", "courses", "chapters", "progress", "circles", "orders", "knowledge", "aftercare"].includes(collection) && typeof downloadToken === "string" && /^[a-zA-Z0-9_-]{43}$/.test(downloadToken), "导出分页或下载授权无效");
    return this.business.$transaction(async tx => {
      const row = await tx.managedLeaseExport.findFirst({ where: { id, customerId: this.customerId, userId: context.userId, expiresAt: { gt: new Date() } }, select: { tokenHash: true } });
      const hash = createHash("sha256").update(downloadToken).digest("hex");
      if (!row || !timingSafeEqual(Buffer.from(hash), Buffer.from(row.tokenHash))) throw new NotFoundException("导出不存在、已过期或下载授权无效");
      const chunk = await tx.managedLeaseExportPage.findUnique({ where: { exportId_collection_page: { exportId: id, collection, page: Number(pageValue) } }, select: { payload: true, sha256: true } });
      if (!chunk) throw new NotFoundException("导出分页不存在");
      await tx.managedLeaseExport.update({ where: { id }, data: { downloadedAt: new Date() } });
      await tx.managedLeaseAudit.create({ data: { customerId: this.customerId, userId: context.userId, action: "DOWNLOAD_EXPORT_PAGE", entityId: `${id}:${collection}:${pageValue}` } });
      await this.authorize(context, undefined, false);
      return { collection, page: Number(pageValue), ...chunk };
    });
  }
  async downloadExport(context: Context, id: string, downloadToken: string) {
    const customer = await this.authorize(context, undefined, false);
    if (context.role !== "CUSTOMER_ADMIN" || Date.now() >= customer.exportUntil.getTime()) throw new ForbiddenException("导出授权已结束");
    check(typeof downloadToken === "string" && downloadToken.length > 0 && downloadToken.length <= 100, "下载授权无效");
    return this.business.$transaction(async tx => {
      const row = await tx.managedLeaseExport.findFirst({ where: { id, customerId: this.customerId, userId: context.userId, expiresAt: { gt: new Date() } } });
      const hash = createHash("sha256").update(downloadToken).digest("hex");
      if (!row || !timingSafeEqual(Buffer.from(hash), Buffer.from(row.tokenHash))) throw new NotFoundException("导出不存在、已过期或下载授权无效");
      await tx.managedLeaseExport.update({ where: { id }, data: { downloadedAt: new Date() } });
      await tx.managedLeaseAudit.create({ data: { customerId: this.customerId, userId: context.userId, action: "DOWNLOAD_EXPORT", entityId: row.id } });
      await this.authorize(context, undefined, false);
      return row.manifest;
    });
  }
}
