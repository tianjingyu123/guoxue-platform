import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from "class-validator";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { ThrottleGuard } from "../../common/throttle.guard";
import { SkipFormat } from "../../common/skip-format.decorator";
import { VoiceSessionService } from "./voice-session.service";
import { VOICE_SCENES, VoiceScene } from "./provider/voice-provider.types";

export class StartVoiceSessionDto {
  @IsIn(VOICE_SCENES.filter((s) => s !== "device")) scene: Exclude<VoiceScene, "device">;
  @IsOptional() @IsString() @MaxLength(64) contextId?: string;
  @IsOptional() @IsString() @Matches(/^s\d{1,3}$/) sectionId?: string;
  @IsOptional() @IsString() @MaxLength(300) selectedText?: string;
  @IsOptional() @IsIn(["explain", "ask"]) intent?: "explain" | "ask";
  /** 客户端请求号：同一次点击重试时复用 */
  @IsString() @MinLength(8) @MaxLength(64) @Matches(/^[A-Za-z0-9_-]+$/) clientRequestId: string;
}

export class EndVoiceSessionDto {
  @IsOptional() @IsIn(["user_hangup", "page_exit", "switch_context"]) reason?: "user_hangup" | "page_exit" | "switch_context";
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(7200) clientEstimatedSeconds?: number;
}

export class VoiceFeedbackDto {
  @IsIn(["satisfied", "neutral", "unsatisfied"]) satisfaction: "satisfied" | "neutral" | "unsatisfied";
}

export class ListVoiceSessionsQuery {
  @IsOptional() @IsIn(VOICE_SCENES as unknown as string[]) scene?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize?: number;
}

/**
 * 小卜实时语音会话（用户侧）。
 * 商业 API 未到位时，开始会话返回 available=false 与「暂未开放」，不建会话、不预留额度。
 */
@ApiTags("小卜·语音会话")
@Controller("voice")
export class VoiceSessionController {
  constructor(private readonly sessions: VoiceSessionService) {}

  @Get("capabilities")
  @ApiOperation({ summary: "语音入口是否开放（公开；不暴露供应商信息）" })
  async capabilities() {
    const c = await this.sessions.capabilities();
    return { available: c.available, isMock: c.isMock, userMessage: c.userMessage, scenes: c.scenes };
  }

  @Post("sessions")
  @UseGuards(JwtAuthGuard, ThrottleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "开始语音会话（幂等：同一 clientRequestId 只建一个）" })
  async start(@Req() req: Request, @Body() dto: StartVoiceSessionDto) {
    return this.sessions.start((req as any).user.id, dto);
  }

  @Get("sessions")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "我的语音记录（只含本人）" })
  async list(@Req() req: Request, @Query() q: ListVoiceSessionsQuery) {
    return this.sessions.listMine((req as any).user.id, q);
  }

  @Get("sessions/:id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async get(@Req() req: Request, @Param("id") id: string) {
    return this.sessions.getMine((req as any).user.id, id);
  }

  @Post("sessions/:id/end")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "结束语音会话（服务端请求供应商停止，幂等）" })
  async end(@Req() req: Request, @Param("id") id: string, @Body() dto: EndVoiceSessionDto) {
    return this.sessions.end((req as any).user.id, id, dto);
  }

  @Post("sessions/:id/cancel")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async cancel(@Req() req: Request, @Param("id") id: string) {
    return this.sessions.cancel((req as any).user.id, id);
  }

  @Post("sessions/:id/feedback")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async feedback(@Req() req: Request, @Param("id") id: string, @Body() dto: VoiceFeedbackDto) {
    return this.sessions.feedback((req as any).user.id, id, dto.satisfaction);
  }
}

/**
 * 供应商用量回调入口。无登录态，靠供应商适配器校验签名；未启用的供应商一律 404。
 * 路由按供应商区分，真实小智回调格式未知，届时由真实适配器实现 parseUsageCallback。
 */
@ApiTags("小卜·语音回调")
@Controller("voice/provider-callbacks")
export class VoiceProviderCallbackController {
  constructor(private readonly sessions: VoiceSessionService) {}

  @Post(":providerId/usage")
  @HttpCode(200)
  @SkipFormat()
  @UseGuards(ThrottleGuard)
  async usage(@Param("providerId") providerId: string, @Req() req: Request) {
    const raw: Buffer = (req as any).rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}), "utf8");
    return this.sessions.handleUsageCallback(providerId, req.headers as any, raw);
  }
}
