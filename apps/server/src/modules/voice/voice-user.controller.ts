import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { Type } from "class-transformer";
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { VoiceQuotaService } from "./voice-quota.service";
import { VoiceTrialService } from "./voice-trial.service";
import { quoteVoiceTopup, topupPacks, VOICE_TOPUP_ORDER_TYPE } from "./voice-topup";

export class FinishTrialDto {
  /** 本次试聊实际时长（秒）；服务端会截断到试聊上限，不信任客户端多报 */
  @Type(() => Number) @IsInt() @Min(0) @Max(3600) seconds: number;
}

export class AgentIdParam {
  @IsString() @MinLength(1) @MaxLength(64) agentId: string;
}

/**
 * 用户侧语音额度（2026-09-18）
 *
 * 此前只有后台能查额度，用户看不到自己还剩多少——
 * 29 元买一份报告附带 30 分钟语音，这是他花钱买的东西，不能只有运营看得见。
 *
 * 接口只读、只返回自己的额度，不暴露成本与供应商信息。
 */
@ApiTags("小卜·语音额度")
@Controller("voice")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VoiceUserController {
  constructor(
    private readonly quota: VoiceQuotaService,
    private readonly trial: VoiceTrialService,
  ) {}

  @Get("my-quota")
  @ApiOperation({ summary: "我的语音时长余额" })
  async myQuota(@Req() req: Request) {
    // 鉴权守卫注入的是 req.user.id（项目统一口径，不是 userId）
    const userId = (req as any).user?.id as string;
    const cfg = await this.quota.getConfig();
    const available = await this.quota.getAvailable("user", userId);

    return {
      /** 可用秒数（已扣除进行中会话的预留） */
      availableSeconds: available.availableSeconds,
      /** 折合分钟，向下取整——显示「还剩 12 分钟」比「12.7 分钟」更可信 */
      availableMinutes: Math.floor(available.availableSeconds / 60),
      reservedSeconds: available.reservedSeconds,
      /** 单次通话上限：额度再多，一次也不会无限聊下去 */
      sessionMaxSeconds: cfg.sessionMaxSeconds,
      /** 每份报告附带的时长，用于「用完了怎么办」的说明 */
      includedSecondsPerReport: cfg.pricing.reportIncludedSeconds,
      /** 续费单价（分）：2 元/分钟 */
      topUpPricePerMinuteCents: Math.round(cfg.pricing.userMicroPerMinute / 10_000),
      /**
       * 是否已开始计费。语音链路（小智商业 API）接通前一律 false：
       * 价格已定，但不能先把用户挡在付费墙后面。前端据此决定是否显示续费入口。
       */
      charging: cfg.chargeUsers,
      /** 未计费期间的单次体验上限 */
      freeSessionMaxSeconds: cfg.freeSessionMaxSeconds,
    };
  }

  /**
   * 语音时长充值档位（决策人 2026-09-21：报告赠送的时长用完后可充值继续用）。
   * 下单走平台订单：POST /shop/orders { type: "VOICE_MINUTES", targetId: "<分钟数>" }，价格以服务端为准。
   * 语音尚未开始计费时 canTopUp=false，页面不给充值入口（服务端下单同样拒绝）。
   */
  @Get("topup/packs")
  @ApiOperation({ summary: "语音时长充值档位与价格" })
  async topupPacks(@Req() req: Request) {
    const userId = (req as any).user?.id as string;
    const cfg = await this.quota.getConfig();
    const available = await this.quota.getAvailable("user", userId);
    return {
      canTopUp: cfg.chargeUsers,
      reason: cfg.chargeUsers ? null : "语音暂未开始计费，当前无需充值",
      orderType: VOICE_TOPUP_ORDER_TYPE,
      pricePerMinuteCents: Math.round(cfg.pricing.userMicroPerMinute / 10_000),
      availableMinutes: Math.floor(available.availableSeconds / 60),
      packs: topupPacks(cfg).map((m) => {
        const q = quoteVoiceTopup(cfg, m);
        return { minutes: m, amountYuan: q.amountYuan };
      }),
    };
  }

  @Get("trial/mine")
  @ApiOperation({ summary: "我试聊过哪些广场智能体" })
  async myTrials(@Req() req: Request) {
    return this.trial.mine((req as any).user?.id as string);
  }

  @Get("trial/:agentId")
  @ApiOperation({ summary: "某个广场智能体的试聊资格与剩余" })
  async trialStatus(@Param() p: AgentIdParam, @Req() req: Request) {
    return this.trial.status((req as any).user?.id as string, p.agentId);
  }

  @Post("trial/:agentId/start")
  @ApiOperation({ summary: "开始试聊（占用名额，返回本次可用时长）" })
  async startTrial(@Param() p: AgentIdParam, @Req() req: Request) {
    return this.trial.start((req as any).user?.id as string, p.agentId);
  }

  @Post("trial/:agentId/finish")
  @ApiOperation({ summary: "结束试聊（记录用量，并给出接下来怎么办）" })
  async finishTrial(@Param() p: AgentIdParam, @Body() dto: FinishTrialDto, @Req() req: Request) {
    return this.trial.finish((req as any).user?.id as string, p.agentId, dto.seconds);
  }
}
