import { HttpStatus, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { assertHumanForRedLine, ExecutorType, RedLine } from "../../common/red-lines";
import { CircleCapabilityEligibilityService } from "./circle-capability-eligibility.service";
import { CircleCapabilityRepository, CapabilitySubjectLocks } from "./circle-capability.repository";
import { ApplyCircleCapabilityDto, DirectCircleCapabilityDto, EnableCircleCapabilityDto, ListCircleCapabilitiesDto, ReviewCircleCapabilityDto } from "./circle-capability.dto";
import { CapabilityActor, CapabilityRuntimeContext, CapabilityTransitionInput, CIRCLE_CAPABILITIES,
  CircleCapability, EligibilityResult, evaluateCapabilityUse, planCapabilityApplication, planCapabilityTransition, planPlatformDirectGrant, readCircleCapabilityRule } from "./circle-capability.policy";

type RequestActor = { userId: string; executor: ExecutorType };
const REVIEW_ROLES = ["SUPER_ADMIN", "OPERATION_ADMIN"] as const;
const TX_OPTIONS = { maxWait: 5000, timeout: 15000 };
const conflict = (message: string) => new BusinessException(ErrorCode.CONFLICT, message, HttpStatus.CONFLICT);
const requireReason = (reason: unknown): string => {
  if (typeof reason !== "string" || !reason.trim() || reason.length > 500) throw new BusinessException(ErrorCode.BAD_REQUEST, "请填写不超过500字的申请或变更原因");
  return reason.trim();
};

@Injectable()
export class CircleCapabilityService {
  constructor(private readonly prisma: PrismaService, private readonly repo: CircleCapabilityRepository,
    private readonly eligibility: CircleCapabilityEligibilityService) {}

  private async actor(tx: Prisma.TransactionClient, input: RequestActor, locks?: CapabilitySubjectLocks): Promise<CapabilityActor> {
    if (locks && !locks.userIds.includes(input.userId)) throw new BusinessException(ErrorCode.FORBIDDEN, "账号状态已变化，请刷新后重试");
    const user = await tx.user.findUnique({ where: { id: input.userId }, select: { id: true, status: true, deletedAt: true } });
    if (!user || user.status !== "ACTIVE" || user.deletedAt) throw new BusinessException(ErrorCode.FORBIDDEN, "账号不可用");
    const roles = await tx.userRole.findMany({ where: { userId: input.userId, bindId: null, roleType: { in: [...REVIEW_ROLES] },
      ...(locks ? { id: { in: locks.roleIds } } : {}) }, select: { roleType: true } });
    return { userId: user.id, roles: roles.map(r => r.roleType), executor: input.executor };
  }

  private async load(tx: Prisma.TransactionClient, circleId: string, capability: CircleCapability, subjectUserId: string | null, actorId: string) {
    const scope = await this.repo.lockCircle(tx, circleId);
    if (scope.circleId !== circleId) throw new BusinessException(ErrorCode.NOT_FOUND, "圈子不存在");
    const circle = await tx.circle.findUnique({ where: { id: circleId }, select: { id: true, ownerId: true, status: true, deletedAt: true } });
    if (!circle) throw new BusinessException(ErrorCode.NOT_FOUND, "圈子不存在");
    const locks = await this.repo.lockPeople(tx, circleId, actorId, [circle.ownerId, ...(subjectUserId ? [subjectUserId] : [])]);
    // 取锁等待结束后的时间，不能用等待前的时间错误放过到期授权。
    const now = new Date();
    const [owner, ownerMember, row, providerMember] = await Promise.all([
      locks.userIds.includes(circle.ownerId) ? tx.user.findUnique({ where: { id: circle.ownerId }, select: { status: true, deletedAt: true, identityLevel: true } }) : null,
      tx.circleMember.findFirst({ where: { id: { in: locks.memberIds }, circleId, userId: circle.ownerId, role: "OWNER", OR: [{ expireAt: null }, { expireAt: { gt: now } }] }, select: { id: true } }),
      scope.configId ? tx.configSystem.findUnique({ where: { id: scope.configId } }) : null,
      subjectUserId && locks.userIds.includes(subjectUserId) ? tx.circleMember.findFirst({ where: { id: { in: locks.memberIds }, circleId, userId: subjectUserId },
        select: { userId: true, role: true, expireAt: true, user: { select: { status: true, deletedAt: true } } } }) : null,
    ]);
    const context: CapabilityRuntimeContext = { circleId, ownerId: circle.ownerId,
      circleActive: circle.status === "ACTIVE" && !circle.deletedAt, ownerActive: owner?.status === "ACTIVE" && !owner.deletedAt,
      ownerMembershipValid: !!ownerMember, ownerIdentity: owner?.identityLevel ?? "NONE" };
    if (providerMember) context.provider = { userId: providerMember.userId, role: providerMember.role,
      active: providerMember.user.status === "ACTIVE" && !providerMember.user.deletedAt,
      membershipValid: !providerMember.expireAt || providerMember.expireAt.getTime() > now.getTime() };
    return { context, policy: readCircleCapabilityRule(row?.configValue, capability), now, locks };
  }

  async getEligibility(circleId: string, input: RequestActor, capability: CircleCapability) {
    return this.prisma.$transaction(async tx => {
      await this.actor(tx, input);
      return this.eligibility.evaluateOwner(circleId, input.userId, capability, tx);
    }, TX_OPTIONS);
  }

  /** 圈主申请前的只读核对，使用与提交相同的计划器，不创建待审记录。 */
  async applicationContext(circleId: string, input: RequestActor, capability: CircleCapability, subjectUserId?: string) {
    if (!CIRCLE_CAPABILITIES.includes(capability)) throw new BusinessException(ErrorCode.BAD_REQUEST, "能力参数无效");
    return this.prisma.$transaction(async tx => {
      const subject = subjectUserId ?? null;
      const state = await this.load(tx, circleId, capability, subject, input.userId);
      const actor = await this.actor(tx, input, state.locks);
      if (actor.userId !== state.context.ownerId) throw new BusinessException(ErrorCode.FORBIDDEN, "只有当前圈主可以核对申请资格");
      const facts = await this.eligibility.evaluateOwner(circleId, actor.userId, capability, tx, state.now);
      const latest = await this.repo.latest(tx, circleId, capability, subject);
      const circleGrant = subject ? await this.repo.latest(tx, circleId, capability, null) : null;
      const plan = planCapabilityApplication({ id: randomUUID(), capability, subjectUserId: subject, actor,
        ...state, eligibility: facts.eligibility, latest: latest ? { grant: latest, updatedAt: latest.updatedAt } : null, circleGrant });
      return { circleId, capability, subjectUserId: subject, canApply: plan.allowed,
        reason: plan.allowed ? "ELIGIBLE_TO_APPLY" : plan.reason, progress: facts.eligibility.progress,
        grant: latest ? { id: latest.id, revision: latest.revision, state: latest.state, enabled: latest.enabled, expiresAt: latest.expiresAt } : null };
    }, TX_OPTIONS);
  }

  async apply(circleId: string, input: RequestActor, dto: ApplyCircleCapabilityDto) {
    assertHumanForRedLine(input.executor, [RedLine.EXTERNAL_PUBLISH]);
    const reason = requireReason(dto.reason);
    if (!CIRCLE_CAPABILITIES.includes(dto.capability)) throw new BusinessException(ErrorCode.BAD_REQUEST, "不支持的能力类型");
    return this.prisma.$transaction(async tx => {
      const subject = dto.subjectUserId ?? null;
      const state = await this.load(tx, circleId, dto.capability, subject, input.userId);
      const actor = await this.actor(tx, input, state.locks);
      if (actor.userId !== state.context.ownerId) throw new BusinessException(ErrorCode.FORBIDDEN, "只有当前圈主可以申请圈内能力");
      const facts = await this.eligibility.evaluateOwner(circleId, actor.userId, dto.capability, tx, state.now);
      const latest = await this.repo.latest(tx, circleId, dto.capability, subject);
      const circleGrant = subject ? await this.repo.latest(tx, circleId, dto.capability, null) : null;
      const plan = planCapabilityApplication({ id: randomUUID(), capability: dto.capability, subjectUserId: subject, actor,
        ...state, eligibility: facts.eligibility, latest: latest ? { grant: latest, updatedAt: latest.updatedAt } : null, circleGrant });
      if (!plan.allowed) this.rejectPlan(plan.reason);
      const sequence = (latest?.sequence ?? 0) + 1;
      if (!Number.isInteger(sequence) || sequence > 2147483647) throw conflict("申请历史序号已达上限，请联系管理员");
      const created = await this.repo.create(tx, plan.pending, sequence, facts, state.now);
      await this.repo.audit(tx, actor.userId, "APPLY", reason, null, created, state.now);
      return created;
    }, TX_OPTIONS);
  }

  async review(id: string, input: RequestActor, dto: ReviewCircleCapabilityDto) {
    if (!["APPROVE", "REJECT", "SUSPEND", "RESUME", "REVOKE"].includes(dto.action)) throw new BusinessException(ErrorCode.BAD_REQUEST, "不支持的审核动作");
    return this.change(id, input, dto.action, dto.expectedRevision, dto.reason, dto.action === "APPROVE" ? {
      expiresAt: new Date(dto.expiresAt ?? ""), maxUnits: dto.maxUnits!, maxConcurrent: dto.maxConcurrent!,
    } : undefined);
  }

  /** 平台人工定向直授；不跑圈主申请资格，所选对象之外不增加任何权限。 */
  async directGrantContext(circleId: string, input: RequestActor, capability: CircleCapability, subjectUserId?: string) {
    if (!CIRCLE_CAPABILITIES.includes(capability)) throw new BusinessException(ErrorCode.BAD_REQUEST, "不支持的能力类型");
    return this.prisma.$transaction(async tx => {
      const initial = await this.actor(tx, input);
      if (!initial.roles.some(role => REVIEW_ROLES.includes(role as typeof REVIEW_ROLES[number]))) throw new BusinessException(ErrorCode.FORBIDDEN, "需要平台审核权限");
      const subject = subjectUserId ?? null;
      const state = await this.load(tx, circleId, capability, subject, input.userId);
      const actor = await this.actor(tx, input, state.locks);
      if (!actor.roles.some(role => REVIEW_ROLES.includes(role as typeof REVIEW_ROLES[number]))) throw new BusinessException(ErrorCode.FORBIDDEN, "平台审核权限已变化");
      const latest = await this.repo.latest(tx, circleId, capability, subject);
      const [circle, target] = await Promise.all([
        tx.circle.findUnique({ where: { id: circleId }, select: { name: true } }),
        tx.user.findUnique({ where: { id: subject ?? state.context.ownerId }, select: { nickname: true } }),
      ]);
      return { circleId, capability, subjectUserId: subject, circleName: circle?.name ?? "圈子已不可用",
        subjectName: target?.nickname ?? "账号已不可用", scope: subject ? "PERSONAL" : "CIRCLE",
        expectedLatestId: latest?.id ?? null, expectedLatestRevision: latest?.revision ?? 0,
        latestState: latest?.state ?? null, latestSource: latest?.source ?? null,
        checkedAt: state.now.toISOString(),
        notice: "仅为本次确认快照，不代表已授权；提交时将重新核验对象、权限及最新版本" };
    }, TX_OPTIONS);
  }

  async directGrant(circleId: string, input: RequestActor, dto: DirectCircleCapabilityDto) {
    assertHumanForRedLine(input.executor, [RedLine.EXTERNAL_PUBLISH]);
    const reason = requireReason(dto.reason);
    if (!CIRCLE_CAPABILITIES.includes(dto.capability)) throw new BusinessException(ErrorCode.BAD_REQUEST, "不支持的能力类型");
    return this.prisma.$transaction(async tx => {
      const subject = dto.subjectUserId ?? null;
      const state = await this.load(tx, circleId, dto.capability, subject, input.userId);
      const actor = await this.actor(tx, input, state.locks);
      const plan = planPlatformDirectGrant({ id: randomUUID(), actor, capability: dto.capability, subjectUserId: subject,
        context: state.context, now: state.now, reason, expiresAt: new Date(dto.expiresAt), maxUnits: dto.maxUnits, maxConcurrent: dto.maxConcurrent });
      if (!plan.allowed) this.rejectPlan(plan.reason);
      const latest = await this.repo.latest(tx, circleId, dto.capability, subject);
      if (!Number.isInteger(dto.expectedLatestRevision) || (latest ? latest.id !== dto.expectedLatestId || latest.revision !== dto.expectedLatestRevision :
        dto.expectedLatestRevision !== 0 || dto.expectedLatestId !== undefined)) throw conflict("授权历史已变化，请刷新后确认");
      const sequence = (latest?.sequence ?? 0) + 1;
      if (!Number.isInteger(sequence) || sequence > 2147483647 || latest && latest.revision >= 2147483647) throw conflict("授权历史序号已达上限");
      if (latest && ["PENDING", "APPROVED", "SUSPENDED"].includes(latest.state)) {
        const revoked = await this.repo.compareAndSet(tx, latest, { ...latest, state: "REVOKED", enabled: false, revision: latest.revision + 1 }, state.now);
        if (!revoked) throw conflict("授权状态已变化");
        await this.repo.audit(tx, actor.userId, "SUPERSEDE_DIRECT", reason, latest, revoked, state.now);
      }
      const created = await this.repo.create(tx, plan.grant, sequence, { source: "PLATFORM_DIRECT", ruleBypass: "CIRCLE_APPLICATION_ONLY" }, state.now);
      await this.repo.audit(tx, actor.userId, "DIRECT_GRANT", reason, null, created, state.now);
      return created;
    }, TX_OPTIONS);
  }

  async setEnabled(id: string, input: RequestActor, dto: EnableCircleCapabilityDto) {
    if (typeof dto.enabled !== "boolean") throw new BusinessException(ErrorCode.BAD_REQUEST, "启用状态必须为布尔值");
    return this.change(id, input, dto.enabled ? "ENABLE" : "DISABLE", dto.expectedRevision, dto.reason);
  }

  private async change(id: string, input: RequestActor, action: CapabilityTransitionInput["action"], expectedRevision: number,
    rawReason: string, approval?: CapabilityTransitionInput["approval"]) {
    assertHumanForRedLine(input.executor, [RedLine.EXTERNAL_PUBLISH]);
    const reason = requireReason(rawReason);
    return this.prisma.$transaction(async tx => {
      const reference = await this.repo.byId(tx, id);
      if (!reference) throw new BusinessException(ErrorCode.NOT_FOUND, "能力申请不存在");
      const state = await this.load(tx, reference.circleId, reference.capability, reference.subjectUserId, input.userId);
      const actor = await this.actor(tx, input, state.locks);
      const latest = await this.repo.latest(tx, reference.circleId, reference.capability, reference.subjectUserId);
      if (!latest || latest.id !== id) throw conflict("该申请已被后续申请替代，请刷新");
      let eligibility: EligibilityResult = { eligible: false, reason: "NOT_REQUIRED", progress: [],
        scope: { circleId: state.context.circleId, ownerId: state.context.ownerId, capability: reference.capability, policyRevision: state.policy.ok ? state.policy.rule.revision : null } };
      if (reference.source !== "PLATFORM_DIRECT" && (action === "APPROVE" || action === "RESUME")) {
        eligibility = (await this.eligibility.evaluateOwner(reference.circleId, state.context.ownerId, reference.capability, tx, state.now)).eligibility;
      }
      const circleGrant = reference.subjectUserId ? await this.repo.latest(tx, reference.circleId, reference.capability, null) : null;
      const plan = planCapabilityTransition(latest, { action, actor, ...state, eligibility, expectedRevision, reason, approval, circleGrant });
      if (!plan.allowed) this.rejectPlan(plan.reason);
      const updated = await this.repo.compareAndSet(tx, latest, plan.next, state.now);
      if (!updated) throw conflict("申请状态已变化，请刷新后重试");
      await this.repo.audit(tx, actor.userId, action, reason, latest, updated, state.now);
      return updated;
    }, TX_OPTIONS);
  }

  /** 发布前只读提示，复用真实业务授权判定；不预留额度、不签发媒体凭据。 */
  async getPublishUseStatus(circleId: string, input: RequestActor, capability: CircleCapability) {
    if (capability !== "SHORT_VIDEO" && capability !== "LIVE") throw new BusinessException(ErrorCode.BAD_REQUEST, "此入口仅查询视频和直播发布资格");
    return this.prisma.$transaction(async tx => {
      await this.actor(tx, input);
      await this.repo.lockCircle(tx, circleId);
      const circle = await tx.circle.findUnique({ where: { id: circleId }, select: { ownerId: true } });
      if (!circle) throw new BusinessException(ErrorCode.NOT_FOUND, "圈子不存在");
      try {
        await this.assertAuthorizationInTransaction(tx, circleId, capability, input, circle.ownerId === input.userId ? null : input.userId);
        return { circleId, capability, canPublish: true };
      } catch (error) {
        // 配置/授权拒绝可展示未开通；数据库故障或其他异常不能伪装成正常资格结果。
        if (error instanceof BusinessException && error.getStatus() === HttpStatus.FORBIDDEN) return { circleId, capability, canPublish: false };
        throw error;
      }
    }, TX_OPTIONS);
  }

  /** 精确读取本人的当前授权，不让分页历史或其他成员记录决定启用对象。 */
  async currentOwn(circleId: string, input: RequestActor, capability: CircleCapability) {
    if (!CIRCLE_CAPABILITIES.includes(capability)) throw new BusinessException(ErrorCode.BAD_REQUEST, "能力参数无效");
    return this.prisma.$transaction(async tx => {
      await this.repo.lockCircle(tx, circleId);
      const circle = await tx.circle.findUnique({ where: { id: circleId }, select: { ownerId: true } });
      if (!circle) throw new BusinessException(ErrorCode.NOT_FOUND, "圈子不存在");
      const subject = circle.ownerId === input.userId && (capability === "SHORT_VIDEO" || capability === "LIVE") ? null : input.userId;
      const state = await this.load(tx, circleId, capability, subject, input.userId);
      await this.actor(tx, input, state.locks);
      const memberValid = subject === null ? state.context.ownerMembershipValid : state.context.provider?.membershipValid && state.context.provider.active;
      if (!state.context.circleActive || !memberValid) throw new BusinessException(ErrorCode.FORBIDDEN, "当前圈子成员资格不可用");
      const row = await this.repo.latest(tx, circleId, capability, subject);
      return { circleId, capability, grant: row ? { id: row.id, revision: row.revision, circleId: row.circleId,
        capability: row.capability, subjectUserId: row.subjectUserId, state: row.state, enabled: row.enabled,
        expiresAt: row.expiresAt, source: row.source ?? "CIRCLE_APPLICATION" } : null };
    }, TX_OPTIONS);
  }

  async listOwn(circleId: string, input: RequestActor, query: ListCircleCapabilitiesDto) {
    return this.prisma.$transaction(async tx => {
      await this.actor(tx, input);
      const circle = await tx.circle.findUnique({ where: { id: circleId }, select: { ownerId: true } });
      if (!circle) throw new BusinessException(ErrorCode.NOT_FOUND, "圈子不存在");
      const filters = { circleId, capability: query.capability, state: query.state,
        ...(circle.ownerId === input.userId ? {} : { subjectUserId: input.userId }) };
      return this.list(tx, filters, query);
    }, TX_OPTIONS);
  }

  async listAdmin(input: RequestActor, query: ListCircleCapabilitiesDto) {
    return this.prisma.$transaction(async tx => {
      const actor = await this.actor(tx, input);
      if (!actor.roles.some(r => REVIEW_ROLES.includes(r as typeof REVIEW_ROLES[number]))) throw new BusinessException(ErrorCode.FORBIDDEN, "需要平台审核权限");
      const result = await this.list(tx, { circleId: query.circleId, capability: query.capability, state: query.state }, query);
      if (!result.items.length) return result;
      // 每页批量取名称，不返回手机号、实名资料或其他账号字段；显示名不用于权限判定。
      const circleIds = [...new Set(result.items.map(row => row.circleId))];
      const userIds = [...new Set(result.items.flatMap(row => [row.ownerId, row.applicantId, row.subjectUserId].filter((id): id is string => !!id)))];
      const [circles, users] = await Promise.all([
        tx.circle.findMany({ where: { id: { in: circleIds } }, select: { id: true, name: true } }),
        tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nickname: true } }),
      ]);
      const circleNames = new Map(circles.map(row => [row.id, row.name]));
      const userNames = new Map(users.map(row => [row.id, row.nickname]));
      return { ...result, items: result.items.map(row => ({ ...row,
        display: { circleName: circleNames.get(row.circleId) ?? "圈子已不可用",
          ownerName: userNames.get(row.ownerId) ?? "账号已不可用",
          applicantName: userNames.get(row.applicantId) ?? "账号已不可用",
          subjectName: row.subjectUserId ? userNames.get(row.subjectUserId) ?? "账号已不可用" : "圈子整体授权" },
      })) };
    }, TX_OPTIONS);
  }

  private async list(tx: Prisma.TransactionClient, filters: Parameters<CircleCapabilityRepository["list"]>[1], query: ListCircleCapabilitiesDto) {
    const page = query.page ?? 1, pageSize = query.pageSize ?? 20;
    if (!Number.isInteger(page) || page < 1 || page > 1000000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) throw new BusinessException(ErrorCode.BAD_REQUEST, "分页参数无效");
    if (filters.capability && !CIRCLE_CAPABILITIES.includes(filters.capability) || filters.state && !["PENDING", "APPROVED", "REJECTED", "SUSPENDED", "REVOKED"].includes(filters.state)) throw new BusinessException(ErrorCode.BAD_REQUEST, "筛选参数无效");
    return { ...await this.repo.list(tx, filters, (page - 1) * pageSize, pageSize), page, pageSize };
  }

  /** 给后续资源事务复用：本方法只验证授权，不代表已原子预留额度或已创建直播/订单。 */
  async assertAuthorizationInTransaction(tx: Prisma.TransactionClient, circleId: string, capability: CircleCapability, input: RequestActor, subjectUserId: string | null) {
    assertHumanForRedLine(input.executor, [RedLine.EXTERNAL_PUBLISH]);
    const state = await this.load(tx, circleId, capability, subjectUserId, input.userId);
    await this.actor(tx, input, state.locks);
    if ((capability === "LIVE" || capability === "SHORT_VIDEO") && input.userId !== (subjectUserId ?? state.context.ownerId)) throw new BusinessException(ErrorCode.FORBIDDEN, "只有获准的业务主体可以创建此类业务");
    let circleGrant = await this.repo.latest(tx, circleId, capability, null);
    const providerGrant = subjectUserId ? await this.repo.latest(tx, circleId, capability, subjectUserId) : null;
    if ((capability === "LIVE" || capability === "SHORT_VIDEO") && subjectUserId && providerGrant?.source !== "PLATFORM_DIRECT") this.rejectPlan("DIRECT_GRANT_REQUIRED");
    // 个人直授使用自己的额度，不要求开通圈级授权，也不消耗/污染圈子申请额度。
    if (providerGrant?.source === "PLATFORM_DIRECT") circleGrant = null;
    const result = evaluateCapabilityUse(state.policy, capability, circleGrant, providerGrant, state.context, state.now);
    if (!result.allowed) this.rejectPlan(result.reason);
    return { circleGrant, providerGrant, checkedAt: state.now,
      authorization: { policy: state.policy, context: state.context, circleGrant, providerGrant,
        actor: { userId: input.userId, active: true, executor: input.executor } } };
  }

  private rejectPlan(reason: string): never {
    if (["EXISTING_APPLICATION", "STALE_REVISION", "INVALID_TRANSITION", "REAPPLY_COOLDOWN"].includes(reason)) throw conflict("申请或授权状态已更新，暂不能执行此操作");
    if (["INVALID_APPROVAL_LIMITS", "REASON_REQUIRED", "INVALID_APPLICATION", "UNSUPPORTED_CAPABILITY"].includes(reason)) throw new BusinessException(ErrorCode.BAD_REQUEST, "申请、有效期或额度参数无效");
    throw new BusinessException(ErrorCode.FORBIDDEN, "当前资格、授权或配置不满足操作条件");
  }
}
