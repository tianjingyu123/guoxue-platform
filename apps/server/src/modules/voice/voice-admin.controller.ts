import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { Auditable } from "../../common/audit.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { VoiceQuotaService } from "./voice-quota.service";
import { XiaozhiMcpBridgeService } from "./xiaozhi-mcp-bridge.service";
import { VoiceSessionService } from "./voice-session.service";

export class GrantQuotaDto {
  @IsIn(["user", "circle"]) ownerType: "user" | "circle";
  @IsString() @MinLength(1) @MaxLength(64) ownerId: string;
  /** 发放分钟数（后台按分钟录入，服务端换算为秒） */
  @Type(() => Number) @IsInt() @Min(1) @Max(100000) minutes: number;
  @IsString() @MinLength(2) @MaxLength(200) reason: string;
  /** 前端生成的请求号：重复提交同一请求只发放一次 */
  @IsString() @MinLength(8) @MaxLength(80) requestId: string;
}

export class SessionQueryDto {
  @IsOptional() @IsString() @MaxLength(32) scene?: string;
  @IsOptional() @IsIn(["reserved", "active", "ending", "ended", "cancelled", "failed"]) status?: string;
  @IsOptional() @IsIn(["none", "pending", "vendor", "estimated", "unknown", "mock"]) usageState?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

/** 后台展示用户标识只到末 6 位：够客服对单，不够批量关联 */
export function maskId(id: string | null | undefined): string | null {
  return id ? `…${id.slice(-6)}` : null;
}

export class UsageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(90) days?: number;
}

/** 小卜 AI 在各业务里使用的模型网关场景 */
export const XIAOBU_SCENES = [
  "paipan_report",
  "paipan_report_dialogue",
  "classic_translate",
  "classic_punctuate",
  "classic_companion",
  "circle_assistant",
];

/**
 * 平台运营：小卜用量、成本与语音额度
 *
 * 权限矩阵（2026-09-21）：
 * - 查看用量/成本/额度/会话/异常：SUPER_ADMIN、OPERATION_ADMIN、FINANCE_ADMIN；客服只能看会话与异常（脱敏）
 * - 手工发放额度：SUPER_ADMIN、OPERATION_ADMIN（财务只读，发放与对账分离），写审计日志
 * - 不提供导出接口：会话与用量明细含用户行为数据，导出须另走数据导出审批流程
 */
@ApiTags("小卜·运营（后台）")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN")
@Controller("admin/xiaobu")
export class VoiceAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quota: VoiceQuotaService,
    private readonly mcpBridge: XiaozhiMcpBridgeService,
    private readonly sessions: VoiceSessionService,
  ) {}

  @Get("provider")
  @ApiOperation({ summary: "实时语音供应商状态与能力探测（unknown=未经真实文档/联调确认）" })
  async provider() {
    const c = await this.sessions.capabilities();
    return {
      providerId: c.providerId,
      isMock: c.isMock,
      available: c.available,
      opsNote: c.opsNote,
      capabilities: c.capabilities,
      userRefStable: this.sessions.userRefStable,
    };
  }

  @Get("sessions")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN", "CUSTOMER_SERVICE")
  @ApiOperation({ summary: "语音会话列表（用户标识脱敏，不含上下文原文与凭据）" })
  async listSessions(@Query() q: SessionQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where: any = {};
    if (q.scene) where.scene = q.scene;
    if (q.status) where.status = q.status;
    if (q.usageState) where.usageState = q.usageState;
    const [total, rows] = await Promise.all([
      this.prisma.voiceSession.count({ where }),
      this.prisma.voiceSession.findMany({ where, orderBy: { startedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    return {
      total,
      page,
      pageSize,
      items: rows.map((r) => ({
        id: r.id,
        requestId: r.requestId,
        user: maskId(r.userId),
        scene: r.scene,
        provider: r.provider,
        isMock: r.providerIsMock,
        status: r.status,
        usageState: r.usageState,
        usedSeconds: r.usedSeconds,
        technicalOutcome: r.technicalOutcome,
        answerCompleteness: r.answerCompleteness,
        userSatisfaction: r.userSatisfaction,
        endReason: r.endReason,
        startedAt: r.startedAt,
        endedAt: r.endedAt,
      })),
    };
  }

  @Get("anomalies")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN", "FINANCE_ADMIN", "CUSTOMER_SERVICE")
  @ApiOperation({ summary: "语音异常：用量未知/待对账、供应商调用失败、未匹配回调、卡住的会话" })
  async anomalies(@Query() query: UsageQueryDto) {
    const since = new Date(Date.now() - (query.days ?? 7) * 86400_000);
    const [unknownUsage, estimated, failedAttempts, unmatchedEvents, stuck] = await Promise.all([
      this.prisma.voiceSession.count({ where: { startedAt: { gte: since }, usageState: "unknown", providerIsMock: false } }),
      this.prisma.voiceSession.count({ where: { startedAt: { gte: since }, usageState: "estimated", providerIsMock: false } }),
      this.prisma.voiceProviderAttempt.groupBy({
        by: ["operation", "outcome", "errorCode"],
        where: { createdAt: { gte: since }, outcome: { not: "success" } },
        _count: { _all: true },
      }),
      this.prisma.voiceUsageEvent.count({ where: { receivedAt: { gte: since }, sessionId: null } }),
      this.prisma.voiceSession.count({ where: { status: { in: ["reserved", "ending"] }, startedAt: { lt: new Date(Date.now() - 15 * 60_000) } } }),
    ]);
    return {
      since,
      /** 用量未知：供应商没给真实时长，未扣额度，需人工对账 */
      unknownUsageSessions: unknownUsage,
      /** 按客户端估算结算，待供应商账单核对 */
      estimatedUsageSessions: estimated,
      failedProviderAttempts: failedAttempts.map((a) => ({ operation: a.operation, outcome: a.outcome, errorCode: a.errorCode, count: a._count._all })),
      unmatchedUsageEvents: unmatchedEvents,
      stuckSessions: stuck,
    };
  }

  @Get("usage")
  @ApiOperation({ summary: "小卜各场景模型调用与语音会话统计" })
  async usage(@Query() query: UsageQueryDto) {
    const days = query.days ?? 7;
    const since = new Date(Date.now() - days * 86400_000);

    const byScene = await this.prisma.aiUsageRecord.groupBy({
      by: ["scene", "model"],
      where: { createdAt: { gte: since }, scene: { in: XIAOBU_SCENES } },
      _count: { _all: true },
      _sum: { promptTokens: true, completionTokens: true, totalTokens: true },
    });

    const sessions = await this.prisma.voiceSession.groupBy({
      by: ["scene", "tier", "usageSource", "status"],
      where: { startedAt: { gte: since } },
      _count: { _all: true },
      _sum: { usedSeconds: true, supplierCostMicro: true },
    });

    const reportDialogue = await this.prisma.reportDialogueTurn.groupBy({
      by: ["mode"],
      where: { createdAt: { gte: since }, role: "assistant" },
      _count: { _all: true },
    });

    const config = await this.quota.getConfig();
    return {
      days,
      since,
      billing: {
        chargeUsers: config.chargeUsers,
        version: config.version,
        freeSessionMaxSeconds: config.freeSessionMaxSeconds,
        supplierYuanPerMinute: {
          lite: config.supplierMicroPerMinute.lite / 1_000_000,
          standard: config.supplierMicroPerMinute.standard / 1_000_000,
        },
      },
      // 售价/成本/毛利概览与风险提示（决策人 2026-09-17 定价）
      pricing: (() => {
        const o = this.quota.pricingOverview(config);
        return {
          chargeUsers: o.chargeUsers,
          chargeCircleMembers: o.chargeCircleMembers,
          items: o.items.map((i) => ({
            key: i.key,
            label: i.label,
            priceYuan: i.priceMicro / 1_000_000,
            costYuan: i.costMicro / 1_000_000,
            marginPercent: i.marginPercent,
            note: i.note,
          })),
          circleGrantCostYuan: o.circleGrantCostMicro / 1_000_000,
          trialCostPerUserYuan: o.trialCostPerUserMicro / 1_000_000,
          warnings: o.warnings,
        };
      })(),
      modelCalls: byScene.map((r) => ({
        scene: r.scene,
        model: r.model,
        calls: r._count._all,
        promptTokens: r._sum.promptTokens ?? 0,
        completionTokens: r._sum.completionTokens ?? 0,
        totalTokens: r._sum.totalTokens ?? 0,
      })),
      voiceSessions: sessions.map((r) => ({
        scene: r.scene,
        tier: r.tier,
        usageSource: r.usageSource ?? "unsettled",
        status: r.status,
        sessions: r._count._all,
        usedSeconds: r._sum.usedSeconds ?? 0,
        // BigInt 不能直接 JSON 序列化：换算为元（6 位小数）字符串
        supplierCostYuan: ((Number(r._sum.supplierCostMicro ?? 0n)) / 1_000_000).toFixed(6),
      })),
      reportDialogue: reportDialogue.map((r) => ({ mode: r.mode ?? "unknown", answers: r._count._all })),
      mcpBridge: { status: this.mcpBridge.status, lastError: this.mcpBridge.lastError },
    };
  }

  @Get("quota/:ownerType/:ownerId")
  @ApiOperation({ summary: "查询语音额度与最近流水" })
  async getQuota(@Param("ownerType") ownerType: string, @Param("ownerId") ownerId: string) {
    if (ownerType !== "user" && ownerType !== "circle") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "额度归属类型只能是 user 或 circle");
    }
    const available = await this.quota.getAvailable(ownerType, ownerId);
    const account = await this.prisma.voiceQuotaAccount.findUnique({ where: { ownerType_ownerId: { ownerType, ownerId } } });
    const ledger = account
      ? await this.prisma.voiceQuotaLedger.findMany({ where: { accountId: account.id }, orderBy: { createdAt: "desc" }, take: 30 })
      : [];
    return { ...available, ledger };
  }

  @Post("quota/grant")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @Auditable({ action: "发放小卜语音额度", targetType: "VOICE_QUOTA" })
  @ApiOperation({ summary: "发放语音额度（按分钟，幂等；财务只读不可发放）" })
  async grant(@Body() dto: GrantQuotaDto, @Req() req: Request) {
    if (dto.ownerType === "user") {
      const exists = await this.prisma.user.findUnique({ where: { id: dto.ownerId }, select: { id: true } });
      if (!exists) throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");
    } else {
      const exists = await this.prisma.circle.findUnique({ where: { id: dto.ownerId }, select: { id: true } });
      if (!exists) throw new BusinessException(ErrorCode.NOT_FOUND, "圈子不存在");
    }
    const r = await this.quota.grant({
      ownerType: dto.ownerType,
      ownerId: dto.ownerId,
      seconds: dto.minutes * 60,
      idempotencyKey: `admin-grant:${dto.requestId}`,
      note: dto.reason,
      operatorId: req.user.id,
    });
    return { duplicated: r.duplicated, ledger: r.ledger };
  }
}
