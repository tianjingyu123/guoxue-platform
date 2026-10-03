import { ForbiddenException, NotFoundException, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
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
import { createPagedLeaseExport,managedExportCollections } from "./managed-lease-export";
import { ManagedLeaseLearningService } from "./managed-lease-learning";
import { ManagedLeaseContentService, ManagedContentKind, contentId, managedAssetPath } from "./managed-lease-content";
import { ManagedLeaseCircleService } from "./managed-lease-circle";
import { verifyManagedOrderPolicies } from "./managed-order-policy";
import { ManagedLeaseCommerceService } from "./managed-lease-commerce";
import { ManagedLeaseChatService,ManagedChatProvider,ManagedChatScope } from "./managed-lease-chat";
import {ManagedCreationLimits} from "./managed-policy";
import {verifyManagedWriteFence} from "./managed-write-fence";
import {Request} from "express";
import {managedClientAddressResolver} from "./managed-client-address";

export type ManagedLeaseContext = Readonly<{ userId: string; role: string; applicationId: string; clientKey: string; revision: number; memberRevision: number; identityProvider: "PLATFORM" | "LOCAL"; credentialRevision?: number }>;
type Context = ManagedLeaseContext;
const moduleFor = { product: "shop", course: "course", circle: "circle", agent: "agent" } as const;
export type ManagedResourceKind = keyof typeof moduleFor;

/** 维护验证与启动均先核对实际连接身份，不能把连接成功当作身份正确。 */
export async function verifyManagedDatabase(control: PrismaClient, business: PrismaClient, customerId: string, credentials: ManagedCredential,maintenance?:{binding?:{databaseName:string;databaseRole:string;spaceKey:string;authKeyFingerprint:string};fenceState?:"ACTIVE"|"FROZEN"}) {
  const customer = await control.managedCustomer.findUnique({ where: { id: customerId }, include: { deployment: true, grant: true } });
  const deployment = maintenance?.binding||customer?.deployment;
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
  await verifyManagedOrderPolicies(business);
  await verifyManagedWriteFence(business,{customerId,spaceKey:deployment.spaceKey,databaseRole:deployment.databaseRole,authKeyFingerprint:deployment.authKeyFingerprint},maintenance?.fenceState);
  return customer;
}

/** 独立入口只挂载本模块的少量路由，不加载平台 AppModule、原始SQL、运维或支付控制器。 */
export class ManagedLeaseRuntime {
  private ready = false;
  private stopping = false;
  private shutdownPromise?: Promise<void>;
  private operations = 0;
  private operationWaiters: Array<() => void> = [];
  private identity: { databaseName: string; databaseRole: string; spaceKey: string; credentialRef: string };
  private readonly contexts = new WeakMap<object, string>();
  private readonly identities: ManagedLeaseIdentityService;
  private readonly addressResolver:ReturnType<typeof managedClientAddressResolver>;
  constructor(private readonly control: PrismaClient, private readonly business: PrismaClient, readonly customerId: string, private readonly credentials: ManagedCredential,private readonly chatProvider?:ManagedChatProvider) { this.identities = new ManagedLeaseIdentityService(business, customerId);this.addressResolver=managedClientAddressResolver(credentials.trustedProxyIps); }
  clientAddress(request:Request){return this.addressResolver(request);}
  get draining() { return this.stopping; }
  get activeOperations() { return this.operations; }
  /** 统计控制器执行而非HTTP连接，客户端断线也不能提前释放正在使用的数据库。 */
  beginOperation() {
    if (this.stopping) throw new ServiceUnavailableException("本机构入口正在结束，请先查询已有记录再重试");
    if (!this.ready) throw new ForbiddenException("实例未通过启动检查");
    this.operations += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.operations -= 1;
      if (this.operations === 0) for (const done of this.operationWaiters.splice(0)) done();
    };
  }
  private waitForOperations() {
    return this.operations === 0 ? Promise.resolve() : new Promise<void>(done => this.operationWaiters.push(done));
  }
  /** 先关闭新HTTP请求入口，已进入业务的请求仍逐次核身份并完成事务。 */
  beforeApplicationShutdown() { this.stopping = true; }
  /** Nest关闭HTTP连接后继续等待业务结束，包括客户端已经断线的操作。 */
  onApplicationShutdown() {
    if (!this.shutdownPromise) {
      this.stopping = true;
      this.shutdownPromise = this.waitForOperations().then(async () => {
        this.ready = false;
        const results = await Promise.allSettled([this.control.$disconnect(), this.business.$disconnect()]);
        if (results.some(result => result.status === "rejected")) throw new Error("独立客户连接释放失败，请核对本实例退出记录");
      });
    }
    return this.shutdownPromise;
  }
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
  async bootstrap(clientKey:string){
    const customer=await this.current(),{application,registration}=await this.application(clientKey);
    return {mode:"LEASE",applicationId:application.applicationId,platform:registration.platform,applicationSubject:application.applicationSubject,tradingSubject:customer.tradingSubject,brand:application.brand,templateId:application.templateId,operatingStatus:operatingStatus(customer),modules:customer.grant!.modules};
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
    const limits=customer.grant!.creationLimits as ManagedCreationLimits;
    const principal = await this.identities.register(value, clientKey, source,{userLimit:limits.users,reauthorize:async()=>{const latest=await this.current();await this.application(clientKey);if(latest.revision!==customer.revision||Date.now()>=latest.endAt.getTime())throw new ForbiddenException("注册期间合同或应用授权已变化");}});
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
    return { customerId: this.customerId, applicationId: context.applicationId, userId: context.userId, identityProvider: context.identityProvider, role: context.role, applicationSubject: application.applicationSubject, tradingSubject: customer.tradingSubject, brand: application.brand, templateId: application.templateId, operatingStatus: operatingStatus(customer), modules: customer.grant!.modules,chatReady:!!this.chatProvider?.ready(),paymentReady:false };
  }
  async presentation(context: Context, build: string, capabilities: string, resource: string) {
    const customer = await this.authorize(context, undefined, false);
    const { application, registration } = await this.application(context.clientKey);
    return managedPresentation(this.control as PrismaService, versionScope(registration), context.userId, customer.grant!, application.templateId, Date.now() < customer.endAt.getTime(), build, capabilities, resource);
  }
  private content(context: Context,limits:unknown={}) { return new ManagedLeaseContentService(this.business,{customerId:this.customerId,applicationId:context.applicationId,userId:context.userId},limits as ManagedCreationLimits); }
  private async resourceIds(context: Context, kind: ManagedResourceKind, resources: unknown) {
    const granted=(resources as Record<string,string[]>)[kind]||[];
    return [...new Set([...granted,...await this.content(context).ownedIds(kind)])];
  }
  private async contentAdmin(context: Context, kind?: ManagedContentKind, operating=true) {
    if(kind&&!Object.hasOwn(moduleFor,kind))throw new NotFoundException("内容类型不存在");
    const customer=await this.authorize(context,kind?moduleFor[kind]:undefined,operating);
    if(context.role!=="CUSTOMER_ADMIN")throw new ForbiddenException("仅客户管理员可以经营自建内容");return customer;
  }
  async manageList(context: Context, kind: ManagedContentKind, cursor = "") {
    await this.contentAdmin(context,kind,false);return this.content(context).list(kind,cursor);
  }
  async uploadAsset(context: Context, body: unknown) {
    const customer=await this.contentAdmin(context);return this.content(context,customer.grant!.creationLimits).uploadAsset(body,()=>this.contentAdmin(context));
  }
  async asset(context: Context, id: string) {
    contentId(id);const customer=await this.authorize(context,undefined,false);
    const row=await this.business.managedLeaseAsset.findFirst({where:{id,customerId:this.customerId,applicationId:context.applicationId},select:{id:true,contentType:true,size:true,sha256:true,dataBase64:true}});
    if(!row)throw new NotFoundException("本应用附件不存在");
    if(context.role!=="CUSTOMER_ADMIN"){
      await this.authorize(context);
      const path=managedAssetPath(id),productIds=customer.grant!.modules.includes("shop")?await this.resourceIds(context,"product",customer.grant!.resources):[],courseIds=customer.grant!.modules.includes("course")?await this.resourceIds(context,"course",customer.grant!.resources):[];
      const product=productIds.length?await this.business.product.findFirst({where:{id:{in:productIds},deletedAt:null,status:"ON_SALE",images:{has:path}},select:{id:true}}):null;
      const course=courseIds.length?await this.business.course.findFirst({where:{id:{in:courseIds},deletedAt:null,auditStatus:"APPROVED",cover:path},select:{id:true}}):null;
      if(!product&&!course)throw new NotFoundException("附件尚未用于本应用已发布内容");
      await this.authorize(context,product?"shop":"course");
    }else if(Date.now()>=customer.exportUntil.getTime())throw new ForbiddenException("附件导出授权已结束");
    return row;
  }
  async manageCreate(context: Context, kind: ManagedContentKind, body: unknown) {
    const customer=await this.contentAdmin(context,kind),service=this.content(context,customer.grant!.creationLimits),reauth=()=>this.contentAdmin(context,kind);
    if(kind==="product")return service.createProduct(body,reauth);
    if(kind==="course")return service.createCourse(body,reauth);
    if(kind==="agent")return service.createAgent(body,reauth,await this.resourceIds(context,"circle",customer.grant!.resources));
    return this.createCircle(context,body as {name:string;intro:string});
  }
  async manageEdit(context: Context, kind: ManagedContentKind, id: string, body: unknown) {
    await this.contentAdmin(context,kind);const service=this.content(context),reauth=()=>this.contentAdmin(context,kind);
    if(kind==="product")return service.editProduct(id,body,reauth);
    if(kind==="course")return service.editCourse(id,body,reauth);
    if(kind==="agent")return service.editAgent(id,body,reauth);
    throw new NotFoundException("圈子编辑请使用审核配置入口");
  }
  async managePublish(context: Context, kind: ManagedContentKind, id: string, body: unknown) {
    const customer=await this.contentAdmin(context,kind),service=this.content(context),reauth=()=>this.contentAdmin(context,kind);
    if(kind==="product")return service.publishProduct(id,body,reauth);
    if(kind==="course")return service.publishCourse(id,body,reauth);
    if(kind==="circle")return service.publishCircle(id,body,reauth);
    const {application}=await this.application(context.clientKey);
    return service.publishAgent(id,body,reauth,application.templateId==="single-agent",(customer.grant!.resources as Record<string,string[]>).agent||[]);
  }
  async manageChapters(context: Context, id: string) {
    await this.contentAdmin(context,"course",false);return this.content(context).chapters(id);
  }
  async manageSaveChapter(context: Context, id: string, body: unknown) {
    await this.contentAdmin(context,"course");return this.content(context).saveChapter(id,body,()=>this.contentAdmin(context,"course"));
  }
  private async resourceRows(context: Context, kind: ManagedResourceKind, query: string,cursor:string,take:number) {
    check(Object.hasOwn(moduleFor, kind) && typeof query === "string" && query.length <= 120, "资源类型或搜索无效");
    const customer = await this.authorize(context, moduleFor[kind]);
    const ids = await this.resourceIds(context,kind,customer.grant!.resources);
    const title = query ? { contains: query, mode: "insensitive" as const } : undefined;
    check(!cursor||/^[a-zA-Z0-9_-]{1,128}$/.test(cursor),"目录分页无效");
    const id={in:ids,...(cursor?{gt:cursor}:{})},orderBy={id:"asc" as const};
    let rows;
    if (kind === "product") rows = await this.business.product.findMany({ where: { id, deletedAt: null, status: "ON_SALE", title }, select: { id: true, title: true, intro: true, detail:true, price: true,images:true }, take,orderBy });
    else if (kind === "course") rows = await this.business.course.findMany({ where: { id, deletedAt: null, auditStatus: "APPROVED", title }, select: { id: true, title: true, intro: true, price: true,cover:true,validityDays:true }, take,orderBy });
    else if (kind === "agent") rows = await this.business.voiceAgentProfile.findMany({ where: { id, status: "APPROVED", activeVersion: { not: null }, name: title }, select: { id: true, name: true, ownerType: true, ownerId: true, activeVersion: true }, take,orderBy });
    else rows = await this.business.circle.findMany({ where: { id, deletedAt: null, status:"ACTIVE", name: title }, select: { id: true, name: true, intro: true, status: true }, take,orderBy });
    return rows;
  }
  async resources(context: Context, kind: ManagedResourceKind, query=""){
    const rows=await this.resourceRows(context,kind,query,"",1001);check(rows.length<=1000,"旧目录协议超过容量，请使用分页目录，不能截断授权");return rows;
  }
  async resourcesPage(context:Context,kind:ManagedResourceKind,query="",cursor=""){
    const rows=await this.resourceRows(context,kind,query,cursor,51);return {items:rows.slice(0,50),nextCursor:rows.length>50?rows[49].id:null};
  }
  private async learningScope(context: Context) {
    const customer = await this.authorize(context, "course");
    return this.resourceIds(context,"course",customer.grant!.resources);
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
      const circle = await tx.circle.create({ data: { name: body.name.trim(), intro: body.intro, tags: [], ownerId: context.userId,memberCount:1 }, select: { id: true, name: true, status: true } });
      await this.content(context).registerOwned(tx,"circle",circle.id);
      await tx.$executeRaw`INSERT INTO "CircleMember" (id,"circleId","userId",role) VALUES (${randomUUID()},${circle.id},${context.userId},'OWNER')`;
      await tx.managedLeaseAudit.create({data:{customerId:this.customerId,userId:context.userId,action:"CREATE_OWN_CIRCLE",entityId:circle.id}});
      await this.authorize(context, "circle");
      return { id: circle.id, name: circle.name, status: circle.status,revision:1 };
    }, { timeout: 15000, maxWait: 15000 });
  }
  async circleOperation(context: Context,id:string,action:"detail"|"join"|"leave"|"requests"|"reviewJoin"|"members"|"mute"|"posts"|"moderation"|"createPost"|"editPost"|"reviewPost",body?:unknown,target="",cursor="") {
    const scope=async()=>{const customer=await this.authorize(context,"circle");return this.resourceIds(context,"circle",customer.grant!.resources);};
    await scope();const circle=new ManagedLeaseCircleService(this.business,{customerId:this.customerId,applicationId:context.applicationId,userId:context.userId,role:context.role},scope);
    switch(action){
      case "detail":return circle.detail(id);
      case "join":return circle.join(id,body);
      case "leave":return circle.leave(id,body);
      case "requests":return circle.requests(id,cursor);
      case "reviewJoin":return circle.reviewJoin(id,target,body);
      case "members":return circle.members(id,cursor);
      case "mute":return circle.mute(id,target,body);
      case "posts":return circle.posts(id,cursor);
      case "moderation":return circle.posts(id,cursor,true);
      case "createPost":return circle.createPost(id,body);
      case "editPost":return circle.editPost(id,target,body);
      case "reviewPost":return circle.reviewPost(id,target,body);
    }
  }
  private commerce(context: Context) {
    return new ManagedLeaseCommerceService(this.business,{customerId:this.customerId,applicationId:context.applicationId,userId:context.userId},async kind=>{const customer=await this.authorize(context,moduleFor[kind]);return this.resourceIds(context,kind,customer.grant!.resources);},()=>this.authorize(context,undefined,false));
  }
  async order(context: Context, id: string) {return this.commerce(context).detail(id);}
  async orders(context: Context,cursor="") {return this.commerce(context).list(cursor);}
  async createOrder(context: Context,kind:"product"|"course",body:unknown) {return this.commerce(context).create(kind,body);}
  async cancelOrder(context: Context,id:string,body:unknown) {return this.commerce(context).cancel(id,body);}
  async addresses(context: Context) {return this.commerce(context).addresses();}
  async saveAddress(context: Context,body:unknown,id?:string) {return this.commerce(context).saveAddress(body,id);}
  async knowledge(context: Context, agentId: string, query: string) {
    check(typeof query === "string" && query.trim().length > 0 && query.length <= 200, "检索内容无效");
    const scope=await this.chatScope(context,agentId);
    if(!scope.circleId)throw new ForbiddenException("智能体没有已授权圈子知识域");
    // 只读当前独立数据库与指定圈子，禁止 global 兜底、外部库或跨客户向量搜索。
    return this.business.circleKnowledge.findMany({ where: { circleId: scope.circleId, scope: "circle", status: "active", content: { contains: query, mode: "insensitive" } }, select: { id: true, content: true, sourceType: true }, take: 20 });
  }
  private async chatScope(context:Context,agentId:string):Promise<ManagedChatScope>{
    contentId(agentId);const customer=await this.authorize(context,"agent"),ids=await this.resourceIds(context,"agent",customer.grant!.resources);
    if(!ids.includes(agentId))throw new NotFoundException("本应用智能体未授权");
    const agent=await this.business.voiceAgentProfile.findFirst({where:{id:agentId,status:"APPROVED",activeVersion:{not:null}},select:{id:true,name:true,persona:true,ownerType:true,ownerId:true}});
    if(!agent)throw new NotFoundException("智能体未审核启用");
    const {application}=await this.application(context.clientKey);
    if(application.templateId==="single-agent"&&await this.business.voiceAgentProfile.count({where:{id:{in:ids},status:"APPROVED",activeVersion:{not:null}}})!==1)throw new ForbiddenException("单智能体模板须由维护人员选定唯一有效角色");
    let circleId:string|null=null,knowledge:Array<{id:string;content:string}>=[];
    if(agent.ownerType==="circle"){
      await this.authorize(context,"circle");
      if(!(await this.resourceIds(context,"circle",customer.grant!.resources)).includes(agent.ownerId))throw new ForbiddenException("所属圈子未授权");
      const circle=await this.business.circle.findFirst({where:{id:agent.ownerId,status:"ACTIVE",deletedAt:null},select:{id:true,ownerId:true}});
      if(!circle)throw new NotFoundException("所属圈子未启用");
      if(circle.ownerId!==context.userId&&!await this.business.circleMember.findFirst({where:{circleId:circle.id,userId:context.userId,OR:[{expireAt:null},{expireAt:{gt:new Date()}}]},select:{id:true}}))throw new ForbiddenException("须为所属圈子有效成员才能调用知识域");
      circleId=circle.id;knowledge=await this.business.circleKnowledge.findMany({where:{circleId,scope:"circle",status:"active"},select:{id:true,content:true},orderBy:{id:"asc"},take:20});
    }else if(agent.ownerType==="managed"&&agent.ownerId!==context.applicationId)throw new ForbiddenException("角色来源不属于本应用");
    return {agentId:agent.id,circleId,name:agent.name,persona:agent.persona.slice(0,2000),knowledge};
  }
  private chats(context:Context){return new ManagedLeaseChatService(this.business,{customerId:this.customerId,applicationId:context.applicationId,userId:context.userId},id=>this.chatScope(context,id),()=>this.authorize(context,undefined,false),this.chatProvider);}
  async createChat(context:Context,body:unknown){return this.chats(context).create(body);}
  async chatList(context:Context,cursor=""){return this.chats(context).list(cursor);}
  async chatMessages(context:Context,id:string,after="0"){return this.chats(context).messages(id,after);}
  async sendChat(context:Context,id:string,body:unknown){return this.chats(context).send(id,body);}
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
    check(typeof pageValue === "string" && /^(0|[1-9][0-9]{0,5})$/.test(pageValue) && managedExportCollections.includes(collection) && typeof downloadToken === "string" && /^[a-zA-Z0-9_-]{43}$/.test(downloadToken), "导出分页或下载授权无效");
    return this.business.$transaction(async tx => {
      const row = await tx.managedLeaseExport.findFirst({ where: { id, customerId: this.customerId, userId: context.userId, expiresAt: { gt: new Date() } }, select: { tokenHash: true,manifest:true,expiresAt:true } });
      const hash = createHash("sha256").update(downloadToken).digest("hex");
      if (!row || (row.manifest as Prisma.JsonObject).applicationId!==context.applicationId || !timingSafeEqual(Buffer.from(hash), Buffer.from(row.tokenHash))) throw new NotFoundException("导出不存在、已过期或下载授权无效");
      const chunk = await tx.managedLeaseExportPage.findUnique({ where: { exportId_collection_page: { exportId: id, collection, page: Number(pageValue) } }, select: { payload: true, sha256: true } });
      if (!chunk) throw new NotFoundException("导出分页不存在");
      const frozen=(await tx.managedLeaseWriteFence.findUnique({where:{customerId:this.customerId}}))?.state==="FROZEN";
      if(!frozen){await tx.managedLeaseExport.update({ where: { id }, data: { downloadedAt: new Date() } });
      await tx.managedLeaseAudit.create({ data: { customerId: this.customerId, userId: context.userId, action: "DOWNLOAD_EXPORT_PAGE", entityId: `${id}:${collection}:${pageValue}` } });}
      const latest=await this.authorize(context, undefined, false);
      if(Date.now()>=latest.exportUntil.getTime()||Date.now()>=row.expiresAt.getTime())throw new ForbiddenException("读取期间导出授权已结束");
      return { collection, page: Number(pageValue), ...chunk,...(frozen?{maintenanceReadOnly:true,auditRecorded:false}:{}) };
    });
  }
  async downloadExport(context: Context, id: string, downloadToken: string) {
    const customer = await this.authorize(context, undefined, false);
    if (context.role !== "CUSTOMER_ADMIN" || Date.now() >= customer.exportUntil.getTime()) throw new ForbiddenException("导出授权已结束");
    check(typeof downloadToken === "string" && downloadToken.length > 0 && downloadToken.length <= 100, "下载授权无效");
    return this.business.$transaction(async tx => {
      const row = await tx.managedLeaseExport.findFirst({ where: { id, customerId: this.customerId, userId: context.userId, expiresAt: { gt: new Date() } } });
      const hash = createHash("sha256").update(downloadToken).digest("hex");
      if (!row || (row.manifest as Prisma.JsonObject).applicationId!==context.applicationId || !timingSafeEqual(Buffer.from(hash), Buffer.from(row.tokenHash))) throw new NotFoundException("导出不存在、已过期或下载授权无效");
      const frozen=(await tx.managedLeaseWriteFence.findUnique({where:{customerId:this.customerId}}))?.state==="FROZEN";
      if(!frozen){await tx.managedLeaseExport.update({ where: { id }, data: { downloadedAt: new Date() } });
      await tx.managedLeaseAudit.create({ data: { customerId: this.customerId, userId: context.userId, action: "DOWNLOAD_EXPORT", entityId: row.id } });}
      const latest=await this.authorize(context, undefined, false);
      if(Date.now()>=latest.exportUntil.getTime()||Date.now()>=row.expiresAt.getTime())throw new ForbiddenException("读取期间导出授权已结束");
      return frozen?{...(row.manifest as Prisma.JsonObject),maintenanceReadOnly:true,auditRecorded:false}:row.manifest;
    });
  }
}
