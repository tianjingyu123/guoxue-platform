import { Injectable, Logger, Optional } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../redis/redis.service";
import { NotificationService } from "../../notification/notification.service";
import { BusinessException } from "../../../common/business.exception";
import { ErrorCode } from "../../../common/error-codes";
import { safePagination } from "../../../common/pagination";
import { CircleSharedService } from "../services/circle-shared.service";
import {
  APPEAL_REPLY_HOURS,
  APPEAL_WINDOW_HOURS,
  CIRCLE_PERMISSIONS,
  DEFAULT_GOVERNANCE_CONFIG,
  EffectiveGovernanceConfig,
  MANAGED_ROLES,
  MUTE_DAY_OPTIONS,
  OFFICIAL_RULE_TEMPLATE,
  RolePermissionOverrides,
  SYSTEM_OPERATOR,
  resolvePermission,
} from "./circle-governance.constants";
import {
  CreateAppealDto,
  CreateRuleDto,
  ReorderRulesDto,
  ResolveAppealDto,
  SanctionDto,
  UpdateGovernanceConfigDto,
  UpdatePermissionMatrixDto,
  UpdateRuleDto,
} from "./circle-governance.dto";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * 圈子治理域（待办 #8-#14·2026-07-10）。
 * 职责：圈规条文 CRUD 与官方模板套用（#9/#14）/ 加入确认留痕（#9）/
 * 违规三级阶梯状态机（#10：警告 90 天清零→满 N 自动禁言→移出）/
 * 自动治理配置与发帖链路闸门（#11：敏感词转审+刷屏限流·其余 TODO）/
 * 申诉流（#12：72h 内可诉·平台仲裁·48h 答复超时自动成立）/
 * 治理记录留痕（#13：圈内匿名可查·本人完整通知）/ 权限矩阵（#8）。
 * 资金硬红线：移出付费成员只记状态与通知，退款结算走既有退款流（本批不动钱）。
 */
@Injectable()
export class CircleGovernanceService {
  private readonly logger = new Logger(CircleGovernanceService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private shared: CircleSharedService,
    @Optional() private notification?: NotificationService,
  ) {}

  // ═════════ 通用 ═════════

  /** 圈子生效配置（未落库回落默认值） */
  async getEffectiveConfig(circleId: string): Promise<EffectiveGovernanceConfig> {
    const row = await this.prisma.circleGovernanceConfig.findUnique({ where: { circleId } });
    if (!row) return { ...DEFAULT_GOVERNANCE_CONFIG };
    return {
      requireRuleAck: row.requireRuleAck,
      warningThreshold: row.warningThreshold,
      warningResetDays: row.warningResetDays,
      muteDays: row.muteDays,
      removeBanRejoin: row.removeBanRejoin,
      newMemberReviewEnabled: row.newMemberReviewEnabled,
      newMemberReviewDays: row.newMemberReviewDays,
      sensitiveWordsEnabled: row.sensitiveWordsEnabled,
      sensitiveWords: Array.isArray(row.sensitiveWords) ? (row.sensitiveWords as string[]) : [],
      postIntervalSeconds: row.postIntervalSeconds,
      reportAutoHideEnabled: row.reportAutoHideEnabled,
      reportAutoHideThreshold: row.reportAutoHideThreshold,
      rolePermissions: (row.rolePermissions as RolePermissionOverrides | null) ?? null,
    };
  }

  private notify(userId: string, payload: { type: string; title: string; content: string; targetType?: string; targetId?: string; circleId?: string }) {
    // 治理通知统一归入圈内通知中心「圈务 GOVERN」分类（V0 待办 #36）
    this.notification
      ?.send(userId, { category: "GOVERN", ...payload })
      .catch((err) => this.logger.warn(`治理通知发送失败 user=${userId}`, err));
  }

  private async getCircleName(circleId: string): Promise<string> {
    const circle = await this.prisma.circle.findUnique({ where: { id: circleId }, select: { name: true } });
    return circle?.name ?? "圈子";
  }

  // ═════════ 圈规条文（#9/#14） ═════════

  /** 圈规列表（公开·加入预览页也要看） */
  async getRules(circleId: string) {
    const [rules, config] = await Promise.all([
      this.prisma.circleRule.findMany({ where: { circleId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      this.getEffectiveConfig(circleId),
    ]);
    return { rules, requireRuleAck: config.requireRuleAck };
  }

  async createRule(circleId: string, userId: string, dto: CreateRuleDto) {
    await this.shared.checkOwnership(circleId, userId);
    const max = await this.prisma.circleRule.aggregate({ where: { circleId }, _max: { sortOrder: true } });
    return this.prisma.circleRule.create({
      data: { circleId, text: dto.text.trim(), sortOrder: (max._max.sortOrder ?? 0) + 1, editedAt: new Date() },
    });
  }

  async updateRule(circleId: string, userId: string, ruleId: string, dto: UpdateRuleDto) {
    await this.shared.checkOwnership(circleId, userId);
    const rule = await this.prisma.circleRule.findUnique({ where: { id: ruleId } });
    if (!rule || rule.circleId !== circleId) throw new BusinessException(ErrorCode.NOT_FOUND, "条文不存在");
    // editedAt 标记手动修改·模板再次套用不覆盖（#14）
    return this.prisma.circleRule.update({ where: { id: ruleId }, data: { text: dto.text.trim(), editedAt: new Date() } });
  }

  async deleteRule(circleId: string, userId: string, ruleId: string) {
    await this.shared.checkOwnership(circleId, userId);
    const rule = await this.prisma.circleRule.findUnique({ where: { id: ruleId } });
    if (!rule || rule.circleId !== circleId) throw new BusinessException(ErrorCode.NOT_FOUND, "条文不存在");
    await this.prisma.circleRule.delete({ where: { id: ruleId } });
    return { success: true };
  }

  async reorderRules(circleId: string, userId: string, dto: ReorderRulesDto) {
    await this.shared.checkOwnership(circleId, userId);
    const rules = await this.prisma.circleRule.findMany({ where: { circleId }, select: { id: true } });
    const owned = new Set(rules.map((r) => r.id));
    const ordered = dto.ruleIds.filter((id) => owned.has(id));
    await this.prisma.$transaction(
      ordered.map((id, idx) => this.prisma.circleRule.update({ where: { id }, data: { sortOrder: idx + 1 } })),
    );
    return { success: true };
  }

  /**
   * 官方模板一键套用（#14）：templateKey 幂等——
   * 不存在则新建；存在且从未手改（editedAt=null）则同步官方文案；手改过的条目跳过不覆盖。
   * 治理配置仅在从未保存过时落默认（不覆盖圈主已保存的配置）。
   */
  async applyTemplate(circleId: string, userId: string) {
    await this.shared.checkOwnership(circleId, userId);
    const existing = await this.prisma.circleRule.findMany({ where: { circleId } });
    let sortBase = existing.reduce((m, r) => Math.max(m, r.sortOrder), 0);
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of OFFICIAL_RULE_TEMPLATE) {
      const match = existing.find((r) => r.templateKey === item.key);
      if (!match) {
        sortBase += 1;
        await this.prisma.circleRule.create({
          data: { circleId, text: item.text, templateKey: item.key, sortOrder: sortBase },
        });
        created += 1;
      } else if (!match.editedAt) {
        if (match.text !== item.text) {
          await this.prisma.circleRule.update({ where: { id: match.id }, data: { text: item.text } });
          updated += 1;
        }
      } else {
        skipped += 1; // 手动修改过·不覆盖
      }
    }

    // 配置：从未保存过才落模板默认（含「新成员加入须确认圈规」「新帖先审 7 天」）
    const hasConfig = await this.prisma.circleGovernanceConfig.findUnique({ where: { circleId }, select: { id: true } });
    if (!hasConfig) {
      await this.prisma.circleGovernanceConfig.create({
        data: { circleId, requireRuleAck: true, newMemberReviewEnabled: true, newMemberReviewDays: 7 },
      });
    }
    return { success: true, created, updated, skipped };
  }

  /**
   * 加入确认（#9）：记录用户对当前全部条文的逐条确认（快照留痕·重复确认覆盖为最新）。
   * ⚠️ 不要求已是成员——requireRuleAck 强制后（TODO#5·2026-07-11），加入确认页在建成员**之前**调用本端点。
   */
  async ackRules(circleId: string, userId: string) {
    const circle = await this.prisma.circle.findUnique({ where: { id: circleId }, select: { id: true } });
    if (!circle) throw new BusinessException(ErrorCode.CIRCLE_NOT_FOUND, "圈子不存在");
    const rules = await this.prisma.circleRule.findMany({
      where: { circleId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, text: true },
    });
    const snapshot = rules.map((r) => ({ id: r.id, text: r.text }));
    const ack = await this.prisma.circleRuleAck.upsert({
      where: { circleId_userId: { circleId, userId } },
      create: { circleId, userId, ruleIds: rules.map((r) => r.id), rulesSnapshot: snapshot },
      update: { ruleIds: rules.map((r) => r.id), rulesSnapshot: snapshot, ackAt: new Date() },
    });
    return { success: true, ackAt: ack.ackAt, ruleCount: rules.length };
  }

  async getMyAck(circleId: string, userId: string) {
    const ack = await this.prisma.circleRuleAck.findUnique({ where: { circleId_userId: { circleId, userId } } });
    return { acked: !!ack, ackAt: ack?.ackAt ?? null, rulesSnapshot: ack?.rulesSnapshot ?? null };
  }

  /**
   * requireRuleAck 服务端强制（TODO#5·2026-07-11）：圈子开启「加入须确认圈规」且存在生效圈规时，
   * 建成员前必须已有 CircleRuleAck 记录，否则拒绝加入。
   * 前端识别：errorCode=CIRCLE_JOIN_DENIED 且 message 含「RULE_ACK_REQUIRED」→ 引导至圈规确认页 ack 后重试。
   */
  async assertRuleAck(circleId: string, userId: string) {
    const cfg = await this.getEffectiveConfig(circleId);
    if (!cfg.requireRuleAck) return;
    const ruleCount = await this.prisma.circleRule.count({ where: { circleId } });
    if (ruleCount === 0) return; // 没有生效圈规则不强制
    const ack = await this.prisma.circleRuleAck.findUnique({
      where: { circleId_userId: { circleId, userId } },
      select: { id: true },
    });
    if (!ack) {
      throw new BusinessException(ErrorCode.CIRCLE_JOIN_DENIED, "RULE_ACK_REQUIRED：请先阅读并确认圈规");
    }
  }

  // ═════════ 治理配置与权限矩阵（#8/#11） ═════════

  async getConfig(circleId: string, userId: string) {
    await this.shared.checkOwnership(circleId, userId);
    return this.getEffectiveConfig(circleId);
  }

  async updateConfig(circleId: string, userId: string, dto: UpdateGovernanceConfigDto) {
    await this.shared.checkOwnership(circleId, userId);
    if (dto.sensitiveWords && dto.sensitiveWords.length > 200) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "圈内敏感词最多 200 个");
    }
    const data: Prisma.CircleGovernanceConfigUpsertArgs["update"] = {};
    for (const key of [
      "requireRuleAck",
      "warningThreshold",
      "warningResetDays",
      "muteDays",
      "removeBanRejoin",
      "newMemberReviewEnabled",
      "newMemberReviewDays",
      "sensitiveWordsEnabled",
      "postIntervalSeconds",
      "reportAutoHideEnabled",
      "reportAutoHideThreshold",
    ] as const) {
      if (dto[key] !== undefined) (data as Record<string, unknown>)[key] = dto[key];
    }
    if (dto.sensitiveWords !== undefined) {
      (data as Record<string, unknown>).sensitiveWords = dto.sensitiveWords.map((w) => w.trim()).filter(Boolean);
    }
    await this.prisma.circleGovernanceConfig.upsert({
      where: { circleId },
      create: { circleId, ...(data as object) },
      update: data,
    });
    return this.getEffectiveConfig(circleId);
  }

  /** 权限矩阵（含默认位/覆盖位/锁定标记·供前端整表渲染） */
  async getPermissionMatrix(circleId: string, userId: string) {
    await this.shared.checkOwnership(circleId, userId);
    const config = await this.getEffectiveConfig(circleId);
    return {
      roles: MANAGED_ROLES,
      permissions: CIRCLE_PERMISSIONS.map((p) => ({
        key: p.key,
        label: p.label,
        group: p.group,
        locked: !!p.locked,
        values: Object.fromEntries(MANAGED_ROLES.map((r) => [r, resolvePermission(r, p.key, config.rolePermissions)])),
      })),
    };
  }

  /** 保存权限矩阵覆盖位（锁定项静默忽略·资金/移出永远仅圈主） */
  async updatePermissionMatrix(circleId: string, userId: string, dto: UpdatePermissionMatrixDto) {
    await this.shared.checkOwnership(circleId, userId);
    const lockedKeys = new Set(CIRCLE_PERMISSIONS.filter((p) => p.locked).map((p) => p.key));
    const validKeys = new Set(CIRCLE_PERMISSIONS.map((p) => p.key));
    const sanitized: RolePermissionOverrides = {};
    for (const role of MANAGED_ROLES) {
      const bits = dto.permissions?.[role];
      if (!bits || typeof bits !== "object") continue;
      const clean: Record<string, boolean> = {};
      for (const [key, val] of Object.entries(bits)) {
        if (!validKeys.has(key) || lockedKeys.has(key) || typeof val !== "boolean") continue;
        clean[key] = val;
      }
      if (Object.keys(clean).length) sanitized[role] = clean;
    }
    await this.prisma.circleGovernanceConfig.upsert({
      where: { circleId },
      create: { circleId, rolePermissions: sanitized as Prisma.InputJsonValue },
      update: { rolePermissions: sanitized as Prisma.InputJsonValue },
    });
    return this.getPermissionMatrix(circleId, userId);
  }

  // ═════════ 违规阶梯状态机（#10） ═════════

  /** 当前生效禁言（供发帖/评论链路查询） */
  async getActiveMute(circleId: string, userId: string) {
    return this.prisma.circleViolation.findFirst({
      where: { circleId, userId, type: "MUTE", status: "ACTIVE", expiresAt: { gt: new Date() } },
      select: { id: true, expiresAt: true },
    });
  }

  private async countActiveWarnings(circleId: string, userId: string) {
    return this.prisma.circleViolation.count({
      where: { circleId, userId, type: "WARNING", status: "ACTIVE", expiresAt: { gt: new Date() } },
    });
  }

  /**
   * 执行违规处理（圈主/被授权管理员）。
   * WARNING：记录+通知，满阈值自动升级禁言；MUTE：手动禁言；
   * REMOVE：仅圈主·须理由·删成员关系+禁入记录（付费退款结算走既有退款流·本批只记状态与通知）。
   */
  async sanction(circleId: string, operatorId: string, dto: SanctionDto) {
    if (dto.type === "REMOVE") {
      await this.shared.checkPermission(circleId, operatorId, "member.remove");
    } else {
      await this.shared.checkPermission(circleId, operatorId, "member.discipline");
    }

    const target = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId: dto.userId } },
    });
    if (!target) throw new BusinessException(ErrorCode.NOT_FOUND, "成员不存在");
    if (target.role === "OWNER") throw new BusinessException(ErrorCode.FORBIDDEN, "不能处理圈主");
    if (dto.userId === operatorId) throw new BusinessException(ErrorCode.FORBIDDEN, "不能处理自己");

    // 条文快照（执行时须选择违反的条文·可选但推荐）
    let ruleText: string | undefined;
    if (dto.ruleId) {
      const rule = await this.prisma.circleRule.findUnique({ where: { id: dto.ruleId } });
      if (!rule || rule.circleId !== circleId) throw new BusinessException(ErrorCode.NOT_FOUND, "圈规条文不存在");
      ruleText = rule.text;
    }

    const cfg = await this.getEffectiveConfig(circleId);
    const circleName = await this.getCircleName(circleId);
    const now = new Date();

    if (dto.type === "WARNING") {
      const strikeCount = (await this.countActiveWarnings(circleId, dto.userId)) + 1;
      const violation = await this.prisma.circleViolation.create({
        data: {
          circleId,
          userId: dto.userId,
          type: "WARNING",
          status: "ACTIVE",
          ruleId: dto.ruleId,
          ruleText,
          reason: dto.reason,
          evidence: dto.evidence,
          contentType: dto.contentType,
          contentId: dto.contentId,
          operatorId,
          strikeCount,
          expiresAt: new Date(now.getTime() + cfg.warningResetDays * DAY),
        },
      });
      this.notify(dto.userId, {
        type: "CIRCLE_GOVERNANCE",
        title: "你收到一次警告",
        content:
          `圈子「${circleName}」：${ruleText ? `违反圈规「${ruleText}」。` : ""}${dto.reason ? `处理说明：${dto.reason}。` : ""}` +
          `累计警告 ${strikeCount}/${cfg.warningThreshold} 次，满 ${cfg.warningThreshold} 次将自动禁言 ${cfg.muteDays} 天；` +
          `警告记录 ${cfg.warningResetDays} 天后自动清零。对处理有异议可在 ${APPEAL_WINDOW_HOURS} 小时内申诉，由平台仲裁复核。`,
        targetType: "CIRCLE_VIOLATION",
        targetId: violation.id,
        circleId,
      });

      // 满阈值自动升级禁言（阶梯第二级·已在禁言中不重复叠加）
      let autoMuted = false;
      if (strikeCount >= cfg.warningThreshold) {
        const activeMute = await this.getActiveMute(circleId, dto.userId);
        if (!activeMute) {
          await this.createMuteViolation(circleId, dto.userId, {
            operatorId: SYSTEM_OPERATOR,
            auto: true,
            days: cfg.muteDays,
            strikeCount,
            reason: `累计警告满 ${cfg.warningThreshold} 次，按圈规违规处理阶梯自动升级`,
            circleName,
            threshold: cfg.warningThreshold,
          });
          autoMuted = true;
        }
      }
      return { violation, strikeCount, threshold: cfg.warningThreshold, autoMuted };
    }

    if (dto.type === "MUTE") {
      const days = dto.muteDays ?? cfg.muteDays;
      if (!MUTE_DAY_OPTIONS.includes(days)) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "禁言天数仅支持 1/3/7/30 天");
      }
      const activeMute = await this.getActiveMute(circleId, dto.userId);
      if (activeMute) throw new BusinessException(ErrorCode.BAD_REQUEST, "该成员已在禁言中");
      const strikeCount = await this.countActiveWarnings(circleId, dto.userId);
      const violation = await this.createMuteViolation(circleId, dto.userId, {
        operatorId,
        auto: false,
        days,
        strikeCount,
        reason: dto.reason,
        ruleId: dto.ruleId,
        ruleText,
        evidence: dto.evidence,
        contentType: dto.contentType,
        contentId: dto.contentId,
        circleName,
        threshold: cfg.warningThreshold,
      });
      return { violation, strikeCount, threshold: cfg.warningThreshold, autoMuted: false };
    }

    // ── REMOVE：移出圈子（仅圈主·须填写理由·#10 第三级） ──
    if (!dto.reason?.trim()) throw new BusinessException(ErrorCode.BAD_REQUEST, "移出圈子须填写理由");

    const violation = await this.prisma.$transaction(async (tx) => {
      const v = await tx.circleViolation.create({
        data: {
          circleId,
          userId: dto.userId,
          type: "REMOVE",
          // removeBanRejoin 开：ACTIVE=禁止重新加入（可单独解除）；关：EXPIRED=仅记录在案不禁入
          status: cfg.removeBanRejoin ? "ACTIVE" : "EXPIRED",
          ruleId: dto.ruleId,
          ruleText,
          reason: dto.reason,
          evidence: dto.evidence,
          contentType: dto.contentType,
          contentId: dto.contentId,
          operatorId,
          strikeCount: await this.countActiveWarnings(circleId, dto.userId),
        },
      });
      await tx.circleMember.delete({ where: { circleId_userId: { circleId, userId: dto.userId } } });
      await tx.circle.update({ where: { id: circleId }, data: { memberCount: { decrement: 1 } } });
      return v;
    });
    await Promise.all([
      this.redis.del(`circles:member:${circleId}:${dto.userId}`),
      this.redis.del(`circles:detail:${circleId}`),
    ]);

    // TODO(资金硬红线·本批不碰钱)：付费成员按圈子退款规则结算剩余费用——
    // 复用现有圈子退款流（CircleRefund 双审核·退款到钱包余额），由圈主/成员在退款入口发起，此处仅通知告知。
    this.notify(dto.userId, {
      type: "CIRCLE_GOVERNANCE",
      title: "你已被移出圈子",
      content:
        `圈子「${circleName}」：${ruleText ? `违反圈规「${ruleText}」。` : ""}移出理由：${dto.reason.trim()}。` +
        (cfg.removeBanRejoin ? "移出后不可重新加入（圈主可单独解除）。" : "") +
        `付费成员剩余费用按圈子退款规则结算（不没收），可在退款入口申请。对处理有异议可在 ${APPEAL_WINDOW_HOURS} 小时内申诉，由平台仲裁复核。`,
      targetType: "CIRCLE_VIOLATION",
      targetId: violation.id,
      circleId,
    });
    return { violation, autoMuted: false };
  }

  private async createMuteViolation(
    circleId: string,
    userId: string,
    opts: {
      operatorId: string;
      auto: boolean;
      days: number;
      strikeCount: number;
      reason?: string;
      ruleId?: string;
      ruleText?: string;
      evidence?: string;
      contentType?: string;
      contentId?: string;
      circleName: string;
      threshold: number;
    },
  ) {
    const expiresAt = new Date(Date.now() + opts.days * DAY);
    const violation = await this.prisma.circleViolation.create({
      data: {
        circleId,
        userId,
        type: "MUTE",
        status: "ACTIVE",
        ruleId: opts.ruleId,
        ruleText: opts.ruleText,
        reason: opts.reason,
        evidence: opts.evidence,
        contentType: opts.contentType,
        contentId: opts.contentId,
        operatorId: opts.operatorId,
        auto: opts.auto,
        strikeCount: opts.strikeCount,
        expiresAt,
      },
    });
    const until = expiresAt.toISOString().slice(0, 16).replace("T", " ");
    this.notify(userId, {
      type: "CIRCLE_GOVERNANCE",
      title: `你已被禁言 ${opts.days} 天`,
      content:
        `圈子「${opts.circleName}」：${opts.reason ? `${opts.reason}。` : ""}${until}（UTC）自动解除。` +
        "禁言期间仍可浏览圈内内容、观看直播回放、学习已购课程，仅暂停发帖、评论与提问。" +
        `对处理有异议可在 ${APPEAL_WINDOW_HOURS} 小时内申诉，由平台仲裁复核（申诉期间处理照常生效）。`,
      targetType: "CIRCLE_VIOLATION",
      targetId: violation.id,
      circleId,
    });
    return violation;
  }

  /** 圈主提前解除（禁言提前解禁 / 移出解除禁入） */
  async liftViolation(circleId: string, operatorId: string, violationId: string) {
    await this.shared.checkPermission(circleId, operatorId, "member.remove");
    const violation = await this.prisma.circleViolation.findUnique({ where: { id: violationId } });
    if (!violation || violation.circleId !== circleId) throw new BusinessException(ErrorCode.NOT_FOUND, "处理记录不存在");
    if (violation.status !== "ACTIVE") throw new BusinessException(ErrorCode.BAD_REQUEST, "该记录已非生效状态");
    await this.prisma.circleViolation.update({ where: { id: violationId }, data: { status: "LIFTED" } });
    const circleName = await this.getCircleName(circleId);
    this.notify(violation.userId, {
      type: "CIRCLE_GOVERNANCE",
      title: violation.type === "MUTE" ? "禁言已提前解除" : violation.type === "REMOVE" ? "重新加入限制已解除" : "处理已解除",
      content: `圈子「${circleName}」的圈主已解除对你的${violation.type === "MUTE" ? "禁言" : violation.type === "REMOVE" ? "重新加入限制" : "处理"}。`,
      targetType: "CIRCLE_VIOLATION",
      targetId: violationId,
      circleId,
    });
    return { success: true };
  }

  /** 管理侧违规处理记录（完整明细·含处理人与依据条文·#13） */
  async listViolations(circleId: string, operatorId: string, rawPage = 1, rawPageSize = 20, status?: string) {
    await this.shared.checkPermission(circleId, operatorId, "member.discipline");
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.CircleViolationWhereInput = { circleId };
    if (status) where.status = status;
    const [items, total] = await Promise.all([
      this.prisma.circleViolation.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize }),
      this.prisma.circleViolation.count({ where }),
    ]);
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(items.map((v) => v.userId))] } },
      select: { id: true, nickname: true, avatar: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    const appeals = await this.prisma.circleAppeal.findMany({
      where: { violationId: { in: items.map((v) => v.id) } },
      select: { violationId: true, status: true },
    });
    const appealMap = new Map(appeals.map((a) => [a.violationId, a.status]));
    return {
      items: items.map((v) => ({ ...v, user: userMap.get(v.userId) ?? null, appealStatus: appealMap.get(v.id) ?? null })),
      total,
      page,
      pageSize,
    };
  }

  /** 圈内治理记录（成员可查·匿去细节：昵称打码/不含证据与说明·#13） */
  async getGovernanceLog(circleId: string, userId: string, rawPage = 1, rawPageSize = 20) {
    await this.shared.ensureMember(circleId, userId);
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.CircleViolationWhereInput = { circleId, status: { not: "REVOKED" } }; // 申诉成立=清记录·不再展示
    const [items, total] = await Promise.all([
      this.prisma.circleViolation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: { id: true, userId: true, type: true, status: true, ruleText: true, auto: true, createdAt: true },
      }),
      this.prisma.circleViolation.count({ where }),
    ]);
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(items.map((v) => v.userId))] } },
      select: { id: true, nickname: true },
    });
    const nickMap = new Map(users.map((u) => [u.id, u.nickname ?? ""]));
    const mask = (nick: string) => (nick ? `${nick.slice(0, 1)}**` : "某成员");
    return {
      items: items.map((v) => ({
        id: v.id,
        memberMasked: mask(nickMap.get(v.userId) ?? ""),
        type: v.type,
        status: v.status,
        ruleText: v.ruleText,
        auto: v.auto,
        createdAt: v.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  /** 我的处理通知（被处理者视角·完整明细+累计进度+申诉状态·#13） */
  async getMySanctions(userId: string, circleId?: string) {
    const where: Prisma.CircleViolationWhereInput = { userId };
    if (circleId) where.circleId = circleId;
    const items = await this.prisma.circleViolation.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 });
    const circleIds = [...new Set(items.map((v) => v.circleId))];
    const [circles, appeals] = await Promise.all([
      this.prisma.circle.findMany({ where: { id: { in: circleIds } }, select: { id: true, name: true } }),
      this.prisma.circleAppeal.findMany({ where: { violationId: { in: items.map((v) => v.id) } } }),
    ]);
    const circleMap = new Map(circles.map((c) => [c.id, c.name]));
    const appealMap = new Map(appeals.map((a) => [a.violationId, a]));
    const now = Date.now();
    const configs = new Map<string, EffectiveGovernanceConfig>();
    for (const cid of circleIds) configs.set(cid, await this.getEffectiveConfig(cid));
    return items.map((v) => {
      const appeal = appealMap.get(v.id) ?? null;
      return {
        ...v,
        circleName: circleMap.get(v.circleId) ?? "圈子",
        warningThreshold: configs.get(v.circleId)?.warningThreshold ?? DEFAULT_GOVERNANCE_CONFIG.warningThreshold,
        appeal: appeal
          ? { id: appeal.id, status: appeal.status, resolution: appeal.resolution, createdAt: appeal.createdAt, resolvedAt: appeal.resolvedAt }
          : null,
        appealable:
          !appeal && v.status !== "REVOKED" && now - v.createdAt.getTime() <= APPEAL_WINDOW_HOURS * HOUR,
      };
    });
  }

  // ═════════ 申诉流（#12·平台仲裁不经圈主） ═════════

  async createAppeal(violationId: string, userId: string, dto: CreateAppealDto) {
    const violation = await this.prisma.circleViolation.findUnique({ where: { id: violationId } });
    if (!violation || violation.userId !== userId) throw new BusinessException(ErrorCode.NOT_FOUND, "处理记录不存在");
    if (violation.status === "REVOKED") throw new BusinessException(ErrorCode.BAD_REQUEST, "该处理已撤销，无需申诉");
    if (Date.now() - violation.createdAt.getTime() > APPEAL_WINDOW_HOURS * HOUR) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, `已超过 ${APPEAL_WINDOW_HOURS} 小时申诉期`);
    }
    const existing = await this.prisma.circleAppeal.findUnique({ where: { violationId } });
    if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "每次处理仅可申诉一次");

    const appeal = await this.prisma.circleAppeal.create({
      data: {
        violationId,
        circleId: violation.circleId,
        userId,
        content: dto.content.trim(),
        deadlineAt: new Date(Date.now() + APPEAL_REPLY_HOURS * HOUR),
      },
    });
    return { appeal, replyHours: APPEAL_REPLY_HOURS };
  }

  /** 平台仲裁队列（SUPER_ADMIN/OPERATION_ADMIN） */
  async listAppeals(rawPage = 1, rawPageSize = 20, status = "PENDING") {
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.CircleAppealWhereInput = status ? { status } : {};
    const [items, total] = await Promise.all([
      this.prisma.circleAppeal.findMany({ where, orderBy: { deadlineAt: "asc" }, skip, take: pageSize }),
      this.prisma.circleAppeal.count({ where }),
    ]);
    const [violations, circles, users] = await Promise.all([
      this.prisma.circleViolation.findMany({ where: { id: { in: items.map((a) => a.violationId) } } }),
      this.prisma.circle.findMany({ where: { id: { in: [...new Set(items.map((a) => a.circleId))] } }, select: { id: true, name: true } }),
      this.prisma.user.findMany({ where: { id: { in: [...new Set(items.map((a) => a.userId))] } }, select: { id: true, nickname: true, avatar: true } }),
    ]);
    const vMap = new Map(violations.map((v) => [v.id, v]));
    const cMap = new Map(circles.map((c) => [c.id, c.name]));
    const uMap = new Map(users.map((u) => [u.id, u]));
    return {
      items: items.map((a) => ({
        ...a,
        violation: vMap.get(a.violationId) ?? null,
        circleName: cMap.get(a.circleId) ?? "圈子",
        user: uMap.get(a.userId) ?? null,
      })),
      total,
      page,
      pageSize,
    };
  }

  /** 平台裁决：成立=撤销处理并清记录（REVOKED）；不成立=处理维持·说明同步成员 */
  async resolveAppeal(appealId: string, reviewerId: string, dto: ResolveAppealDto) {
    const appeal = await this.prisma.circleAppeal.findUnique({ where: { id: appealId } });
    if (!appeal) throw new BusinessException(ErrorCode.NOT_FOUND, "申诉不存在");
    if (appeal.status !== "PENDING") throw new BusinessException(ErrorCode.BAD_REQUEST, "该申诉已裁决");

    await this.prisma.$transaction(async (tx) => {
      await tx.circleAppeal.update({
        where: { id: appealId },
        data: {
          status: dto.uphold ? "UPHELD" : "REJECTED",
          resolution: dto.resolution.trim(),
          reviewerId,
          resolvedAt: new Date(),
        },
      });
      if (dto.uphold) {
        // 撤销处理并清记录：REVOKED 不再计入累计、不再禁言/禁入、治理记录不展示
        await tx.circleViolation.update({ where: { id: appeal.violationId }, data: { status: "REVOKED" } });
      }
    });

    const circleName = await this.getCircleName(appeal.circleId);
    this.notify(appeal.userId, {
      type: "CIRCLE_GOVERNANCE",
      title: dto.uphold ? "申诉成立，处理已撤销" : "申诉未通过，处理维持",
      content: `圈子「${circleName}」的处理申诉仲裁结果：${dto.uphold ? "成立，相关处理已撤销并清除记录" : "不成立，处理维持"}。仲裁说明：${dto.resolution.trim()}`,
      targetType: "CIRCLE_VIOLATION",
      targetId: appeal.violationId,
      circleId: appeal.circleId,
    });
    // 被移出成员申诉成立仅解除禁入·不自动恢复成员关系（需自行重新加入）
    return { success: true, status: dto.uphold ? "UPHELD" : "REJECTED" };
  }

  // ═════════ 发帖链路闸门（#11·敏感词转审 + 刷屏限流 + 新成员先审） ═════════

  /**
   * 发帖前闸门：禁言拦截 + 刷屏间隔限流 + 新成员 N 天先审（TODO#2）+ 圈内敏感词命中转人工审核。
   * 返回 forceAudit=true 时调用方应把帖子落为 AUDITING（不直接展示）；auditReason 供日志区分来源。
   */
  async checkPostGate(
    circleId: string,
    userId: string,
    texts: (string | undefined)[],
  ): Promise<{ forceAudit: boolean; hitWords: string[]; auditReason?: "NEW_MEMBER_REVIEW" | "SENSITIVE_WORDS" }> {
    const mute = await this.getActiveMute(circleId, userId);
    if (mute) {
      const until = mute.expiresAt ? mute.expiresAt.toISOString().slice(0, 16).replace("T", " ") : "";
      throw new BusinessException(ErrorCode.FORBIDDEN, `你在本圈处于禁言期${until ? `（至 ${until}）` : ""}，暂不能发布`);
    }

    const cfg = await this.getEffectiveConfig(circleId);

    // 刷屏限制：同一成员发帖最小间隔
    if (cfg.postIntervalSeconds > 0) {
      const last = await this.prisma.post.findFirst({
        where: { circleId, userId, status: { not: "DRAFT" } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      if (last) {
        const elapsed = Date.now() - last.createdAt.getTime();
        if (elapsed < cfg.postIntervalSeconds * 1000) {
          const waitSec = Math.ceil((cfg.postIntervalSeconds * 1000 - elapsed) / 1000);
          throw new BusinessException(ErrorCode.RATE_LIMITED, `发帖太频繁，请 ${waitSec} 秒后再试`);
        }
      }
    }

    // 新成员先审：开启后加入不足 N 天的普通成员发帖一律先审后发（AUDITING）
    if (cfg.newMemberReviewEnabled) {
      const member = await this.prisma.circleMember.findUnique({
        where: { circleId_userId: { circleId, userId } },
        select: { joinedAt: true, role: true },
      });
      if (
        member?.role === "MEMBER" &&
        Date.now() - member.joinedAt.getTime() < cfg.newMemberReviewDays * DAY
      ) {
        return { forceAudit: true, hitWords: [], auditReason: "NEW_MEMBER_REVIEW" };
      }
    }

    // 圈内敏感词：命中不拒绝·转人工审核（AUDITING·不直接展示）
    if (cfg.sensitiveWordsEnabled && cfg.sensitiveWords.length) {
      const text = texts.filter(Boolean).join(" ");
      const hits = cfg.sensitiveWords.filter((w) => w && text.includes(w));
      if (hits.length) return { forceAudit: true, hitWords: hits, auditReason: "SENSITIVE_WORDS" };
    }
    return { forceAudit: false, hitWords: [] };
  }

  // ═════════ 待审帖子队列（新成员先审/敏感词转审的圈主审核侧·content.review 矩阵位） ═════════

  /** 待审帖子列表（status=AUDITING·按矩阵 content.review 鉴权） */
  async listPendingPosts(circleId: string, operatorId: string, rawPage = 1, rawPageSize = 20) {
    await this.shared.checkPermission(circleId, operatorId, "content.review");
    const { page, pageSize, skip } = safePagination(rawPage, rawPageSize);
    const where: Prisma.PostWhereInput = { circleId, status: "AUDITING" };
    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
        orderBy: { createdAt: "asc" },
        skip,
        take: pageSize,
      }),
      this.prisma.post.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /**
   * 审核待审帖子（content.review 矩阵位）：
   * 通过 → PUBLISHED + 圈子 postCount+1（创建时 AUDITING 未计数）+ 通知作者；
   * 驳回 → HIDDEN（Post 无 REJECTED 态·留档不删）+ 通知作者（附理由）。
   */
  async reviewPost(circleId: string, operatorId: string, postId: string, dto: { approve: boolean; reason?: string }) {
    await this.shared.checkPermission(circleId, operatorId, "content.review");
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, circleId: true, status: true, userId: true, title: true },
    });
    if (!post || post.circleId !== circleId) throw new BusinessException(ErrorCode.NOT_FOUND, "帖子不存在");
    if (post.status !== "AUDITING") throw new BusinessException(ErrorCode.BAD_REQUEST, "该帖子不在待审状态");

    const circleName = await this.getCircleName(circleId);
    if (dto.approve) {
      await this.prisma.$transaction([
        this.prisma.post.update({ where: { id: postId }, data: { status: "PUBLISHED" } }),
        this.prisma.circle.update({ where: { id: circleId }, data: { postCount: { increment: 1 } } }),
      ]);
      this.notify(post.userId, {
        type: "CIRCLE_GOVERNANCE",
        title: "帖子已通过审核",
        content: `你在圈子「${circleName}」的帖子「${post.title || "无标题"}」已通过审核并发布。`,
        targetType: "POST",
        targetId: postId,
      });
      return { success: true, status: "PUBLISHED" };
    }

    await this.prisma.post.update({ where: { id: postId }, data: { status: "HIDDEN" } });
    this.notify(post.userId, {
      type: "CIRCLE_GOVERNANCE",
      title: "帖子未通过审核",
      content:
        `你在圈子「${circleName}」的帖子「${post.title || "无标题"}」未通过审核。` +
        (dto.reason?.trim() ? `理由：${dto.reason.trim()}。` : "") +
        "可修改后重新发布，如有疑问可联系圈主。",
      targetType: "POST",
      targetId: postId,
    });
    return { success: true, status: "HIDDEN" };
  }

  // ═════════ Cron 状态机（多实例 redis 锁） ═════════

  /** 每小时：警告 90 天自动清零 + 禁言到期自动解除（含解除通知） */
  @Cron(CronExpression.EVERY_HOUR)
  async processExpiredViolations() {
    await this.redis.runExclusive("circle_governance_expire", 600, async () => {
      const now = new Date();
      // 警告清零：静默过期（设计稿「保持良好记录即可」·不打扰）
      const warnings = await this.prisma.circleViolation.updateMany({
        where: { type: "WARNING", status: "ACTIVE", expiresAt: { lt: now } },
        data: { status: "EXPIRED" },
      });
      // 禁言到期：解除并通知
      const mutes = await this.prisma.circleViolation.findMany({
        where: { type: "MUTE", status: "ACTIVE", expiresAt: { lt: now } },
        select: { id: true, userId: true, circleId: true },
        take: 200,
      });
      if (mutes.length) {
        await this.prisma.circleViolation.updateMany({
          where: { id: { in: mutes.map((m) => m.id) } },
          data: { status: "EXPIRED" },
        });
        for (const m of mutes) {
          const circleName = await this.getCircleName(m.circleId);
          this.notify(m.userId, {
            type: "CIRCLE_GOVERNANCE",
            title: "禁言已解除",
            content: `你在圈子「${circleName}」的禁言期已满，已恢复发言，欢迎回来。`,
            targetType: "CIRCLE_VIOLATION",
            targetId: m.id,
            circleId: m.circleId,
          });
        }
      }
      if (warnings.count || mutes.length) {
        this.logger.log(`治理状态机：警告清零 ${warnings.count} 条 · 禁言解除 ${mutes.length} 条`);
      }
    });
  }

  /** 每小时：申诉 48h 超时未裁——按「48 小时答复」承诺自动裁定成立并撤销处理（平台失职不由成员承担） */
  @Cron(CronExpression.EVERY_HOUR)
  async processOverdueAppeals() {
    await this.redis.runExclusive("circle_governance_appeals", 600, async () => {
      const overdue = await this.prisma.circleAppeal.findMany({
        where: { status: "PENDING", deadlineAt: { lt: new Date() } },
        take: 100,
      });
      for (const appeal of overdue) {
        try {
          await this.prisma.$transaction(async (tx) => {
            const updated = await tx.circleAppeal.updateMany({
              where: { id: appeal.id, status: "PENDING" },
              data: {
                status: "UPHELD",
                resolution: `平台未在 ${APPEAL_REPLY_HOURS} 小时内答复，按承诺自动撤销处理`,
                reviewerId: SYSTEM_OPERATOR,
                resolvedAt: new Date(),
              },
            });
            if (updated.count > 0) {
              await tx.circleViolation.update({ where: { id: appeal.violationId }, data: { status: "REVOKED" } });
            }
          });
          const circleName = await this.getCircleName(appeal.circleId);
          this.notify(appeal.userId, {
            type: "CIRCLE_GOVERNANCE",
            title: "申诉成立，处理已撤销",
            content: `你对圈子「${circleName}」处理的申诉超过 ${APPEAL_REPLY_HOURS} 小时未获平台答复，按承诺自动裁定成立，相关处理已撤销并清除记录。`,
            targetType: "CIRCLE_VIOLATION",
            targetId: appeal.violationId,
            circleId: appeal.circleId,
          });
        } catch (err) {
          this.logger.error(`申诉超时自动裁决失败 appeal=${appeal.id}`, err);
        }
      }
      if (overdue.length) this.logger.warn(`申诉超时自动裁决 ${overdue.length} 起（平台仲裁需提速）`);
    });
  }
}
