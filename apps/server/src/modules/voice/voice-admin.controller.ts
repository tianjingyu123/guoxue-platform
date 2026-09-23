import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { VoiceQuotaService } from "./voice-quota.service";
import { XiaozhiMcpBridgeService } from "./xiaozhi-mcp-bridge.service";

export class GrantQuotaDto {
  @IsIn(["user", "circle"]) ownerType: "user" | "circle";
  @IsString() @MinLength(1) @MaxLength(64) ownerId: string;
  /** 发放分钟数（后台按分钟录入，服务端换算为秒） */
  @Type(() => Number) @IsInt() @Min(1) @Max(100000) minutes: number;
  @IsString() @MinLength(2) @MaxLength(200) reason: string;
  /** 前端生成的请求号：重复提交同一请求只发放一次 */
  @IsString() @MinLength(8) @MaxLength(80) requestId: string;
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

/** 平台运营：小卜用量、成本与语音额度 */
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
  ) {}

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
  @ApiOperation({ summary: "发放语音额度（按分钟，幂等）" })
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
