import { ConflictException, HttpException, UnauthorizedException,ForbiddenException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "crypto";
import { check } from "./managed-policy";

export type LocalPrincipal = { id: string; userId: string; revision: number };
const hasControlCharacters = (value: string) => Array.from(value).some(character => character.charCodeAt(0) < 32);
function body(value: unknown, keys: string[]): Record<string, unknown> {
  check(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).every(key => keys.includes(key)), "认证请求包含未知字段");
  return value as Record<string, unknown>;
}
function password(value: unknown): string {
  check(typeof value === "string" && Array.from(value).length >= 12 && Buffer.byteLength(value, "utf8") <= 72 && !hasControlCharacters(value), "密码应至少12个字符且不超过72字节");
  return value;
}
function username(value: unknown): string {
  check(typeof value === "string" && /^[a-zA-Z][a-zA-Z0-9_.-]{2,63}$/.test(value), "账号应为3至64位字母、数字、点、短横线或下划线");
  return value.toLowerCase();
}
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

/** 客户库内的普通账号和凭据；角色提升只读取维护侧授权，注册没有角色参数。 */
export class ManagedLeaseIdentityService {
  private static dummyHash: Promise<string> | undefined;
  constructor(private readonly db: PrismaClient, private readonly customerId: string) {}
  async throttle(clientKey: string, source: string, action: "register" | "login" | "refresh" | "password", account?: string) {
    check(typeof source === "string" && source.length > 0 && source.length <= 100, "连接来源无效");
    const rules = [{ key: hash(`${clientKey}:${action}:connection:${source}`), limit: action === "register" ? 5 : action === "login" || action === "password" ? 30 : 60 }, ...(account ? [{ key: hash(`${clientKey}:${action}:account:${account}`), limit: 10 }] : [])];
    await this.db.$transaction(async tx => {
      for (const rule of rules.sort((a, b) => a.key.localeCompare(b.key))) {
        const now = new Date(), cutoff = new Date(now.getTime() - 10 * 60 * 1000);
        const rows = await tx.$queryRaw<Array<{ attempts: number }>>`INSERT INTO "ManagedLeaseLoginThrottle" ("key","windowStart","attempts","updatedAt") VALUES (${rule.key},${now},1,${now})
          ON CONFLICT ("key") DO UPDATE SET "attempts"=CASE WHEN "ManagedLeaseLoginThrottle"."windowStart" < ${cutoff} THEN 1 ELSE "ManagedLeaseLoginThrottle"."attempts"+1 END,
          "windowStart"=CASE WHEN "ManagedLeaseLoginThrottle"."windowStart" < ${cutoff} THEN ${now} ELSE "ManagedLeaseLoginThrottle"."windowStart" END,"updatedAt"=${now} RETURNING "attempts"`;
        if (rows[0].attempts > rule.limit) throw new HttpException("认证请求过于频繁，请稍后重试", 429);
      }
    });
  }
  async register(value: unknown, clientKey: string, source: string,options:{userLimit?:number;reauthorize?:()=>Promise<unknown>}={}): Promise<LocalPrincipal> {
    const input = body(value, ["username", "password", "nickname"]);
    const account = username(input.username), secret = password(input.password);
    check(typeof input.nickname === "string" && input.nickname.trim().length > 0 && input.nickname.length <= 60 && !/[<>]/.test(input.nickname) && !hasControlCharacters(input.nickname), "昵称无效");
    const nickname = input.nickname.trim();
    await this.throttle(clientKey, source, "register");
    const passwordHash = await bcrypt.hash(secret, 12);
    try {
      return await this.db.$transaction(async tx => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`managed-user-quota:${this.customerId}`},0))`;
        if(options.userLimit!==undefined&&await tx.user.count({where:{deletedAt:null}})>=options.userLimit)throw new ForbiddenException("已达到客户合同用户数量上限，不能新增注册");
        // 明确列出插入字段，账号状态/认证修订使用数据库默认值，运行账号不能指定它们。
        const userId = randomUUID(), identityId = randomUUID(), now = new Date();
        await tx.$executeRaw`INSERT INTO "User" (id,nickname,"updatedAt") VALUES (${userId},${nickname},${now})`;
        const identities = await tx.$queryRaw<LocalPrincipal[]>`INSERT INTO "ManagedLeaseIdentity" (id,"userId",username,"passwordHash","updatedAt") VALUES (${identityId},${userId},${account},${passwordHash},${now}) RETURNING id,"userId",revision`;
        const identity = identities[0];
        await tx.managedLeaseAudit.create({ data: { customerId: this.customerId, userId, action: "REGISTER_LOCAL_IDENTITY", entityId: identity.id } });
        await options.reauthorize?.();
        return identity;
      });
    } catch (error) {
      const known = error as { code?: string; meta?: { code?: string } };
      if (known.code === "P2002" || (known.code === "P2010" && known.meta?.code === "23505")) throw new ConflictException("账号不能用于注册，请选择其他账号");
      throw error;
    }
  }
  async login(value: unknown, clientKey: string, source: string): Promise<LocalPrincipal> {
    const input = body(value, ["username", "password"]);
    const account = username(input.username), secret = password(input.password);
    await this.throttle(clientKey, source, "login", account);
    const identity = await this.db.managedLeaseIdentity.findUnique({ where: { username: account }, select: { id: true, userId: true, revision: true, enabled: true, passwordHash: true } });
    // 已有及不存在账号都等待同成本的准备并执行比较，不用未知账号的快速返回泄露注册状态。
    const dummy = await (ManagedLeaseIdentityService.dummyHash ||= bcrypt.hash(randomBytes(32).toString("hex"), 12));
    const valid = await bcrypt.compare(secret, identity?.passwordHash || dummy);
    if (!identity?.enabled || !valid) throw new UnauthorizedException("登录信息无效");
    return this.principal(identity.userId, identity.revision);
  }
  async principal(userId: string, expectedRevision?: number): Promise<LocalPrincipal> {
    const identity = await this.db.managedLeaseIdentity.findUnique({ where: { userId }, select: { id: true, userId: true, revision: true, enabled: true, user: { select: { status: true, deletedAt: true } } } });
    if (!identity?.enabled || identity.user.status !== "ACTIVE" || identity.user.deletedAt || (expectedRevision !== undefined && identity.revision !== expectedRevision)) throw new UnauthorizedException("客户账号或会话已失效");
    return { id: identity.id, userId: identity.userId, revision: identity.revision };
  }
  async createRefresh(principal: LocalPrincipal, applicationId: string, clientKey: string) {
    const refreshToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.db.$transaction(async tx => {
      const identity = await tx.managedLeaseIdentity.findFirst({ where: { id: principal.id, revision: principal.revision, enabled: true }, select: { id: true } });
      if (!identity) throw new UnauthorizedException("客户账号修订已变化");
      await tx.managedLeaseRefresh.create({ data: { identityId: principal.id, applicationId, clientKey, tokenHash: hash(refreshToken), identityRevision: principal.revision, expiresAt }, select: { id: true } });
    });
    return { refreshToken, refreshExpiresAt: expiresAt };
  }
  async refresh(value: unknown, applicationId: string, clientKey: string, source: string) {
    const input = body(value, ["refreshToken"]);
    check(typeof input.refreshToken === "string" && /^[a-zA-Z0-9_-]{43}$/.test(input.refreshToken), "刷新凭据无效");
    await this.throttle(clientKey, source, "refresh");
    const digest = hash(input.refreshToken);
    const nextToken = randomBytes(32).toString("base64url"), expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const principal = await this.db.$transaction(async tx => {
      const row = await tx.managedLeaseRefresh.findUnique({ where: { tokenHash: digest }, include: { identity: { select: { id: true, userId: true, revision: true, enabled: true } } } });
      if (!row || row.applicationId !== applicationId || row.clientKey !== clientKey || !row.identity.enabled || row.identityRevision !== row.identity.revision) throw new UnauthorizedException("刷新凭据无效或已消费");
      const changed = await tx.managedLeaseRefresh.updateMany({ where: { id: row.id, revokedAt: null, expiresAt: { gt: new Date() } }, data: { revokedAt: new Date() } });
      if (changed.count !== 1) throw new UnauthorizedException("刷新凭据无效或已消费");
      await tx.managedLeaseRefresh.create({ data: { identityId: row.identityId, applicationId, clientKey, tokenHash: hash(nextToken), identityRevision: row.identityRevision, expiresAt }, select: { id: true } });
      return { id: row.identity.id, userId: row.identity.userId, revision: row.identity.revision };
    });
    return { principal, refreshToken: nextToken, refreshExpiresAt: expiresAt };
  }
  async invalidate(userId: string, expectedRevision: number, value?: unknown) {
    const principal = await this.principal(userId, expectedRevision);
    let passwordHash: string | undefined;
    if (value !== undefined) {
      const input = body(value, ["currentPassword", "newPassword"]);
      const currentPassword = password(input.currentPassword), newPassword = password(input.newPassword);
      const identity = await this.db.managedLeaseIdentity.findUnique({ where: { id: principal.id }, select: { passwordHash: true } });
      if (!identity || !await bcrypt.compare(currentPassword, identity.passwordHash)) throw new UnauthorizedException("当前密码无效");
      passwordHash = await bcrypt.hash(newPassword, 12);
    }
    await this.db.$transaction(async tx => {
      const changed = await tx.managedLeaseIdentity.updateMany({ where: { id: principal.id, revision: expectedRevision, enabled: true }, data: { revision: { increment: 1 }, ...(passwordHash ? { passwordHash } : {}) } });
      if (changed.count !== 1) throw new UnauthorizedException("客户账号修订已变化");
      await tx.managedLeaseRefresh.updateMany({ where: { identityId: principal.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.managedLeaseAudit.create({ data: { customerId: this.customerId, userId, action: passwordHash ? "CHANGE_LOCAL_PASSWORD" : "LOGOUT_LOCAL_IDENTITY", entityId: principal.id } });
    });
    return { revoked: true };
  }
}
